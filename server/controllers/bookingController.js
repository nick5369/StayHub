// controllers/bookingController.js
//
// Phase 3 — Booking Engine Transformation (Inventory Architecture).
//
// Key changes:
//  • checkAvailability queries RoomTypeInventory to verify (totalRooms - bookedRooms) > 0
//    for every day in the requested date range. No physical Room lookups.
//  • createBooking uses an atomic updateMany on RoomTypeInventory to increment
//    bookedRooms by 1, guarded by a WHERE bookedRooms < totalRooms condition.
//    No SELECT ... FOR UPDATE row lock needed.
//  • Guest count validation: guests must not exceed roomType.maxGuests.
//  • getUserBookings / getHotelBookings include roomType nested data for display.

import prisma from "../configs/db.js";
import transporter from "../configs/nodemailer.js";
import stripe from "stripe";

// ---------------------------------------------------------------------------
// Helper: check if a RoomType has inventory available for every night in range.
//
// Queries RoomTypeInventory: counts rows where (totalRooms - bookedRooms) > 0
// for the given date range. If that count equals the number of requested nights,
// the room type is fully available.
//
// Returns boolean.
// ---------------------------------------------------------------------------
export const checkAvailability = async ({ checkInDate, checkOutDate, roomTypeId }) => {
    try {
        // Normalise to UTC midnight (Date-only — matches the @db.Date column)
        const inDate = new Date(checkInDate);
        inDate.setUTCHours(0, 0, 0, 0);

        const outDate = new Date(checkOutDate);
        outDate.setUTCHours(0, 0, 0, 0);

        const timeDiff = outDate.getTime() - inDate.getTime();
        const numberOfNights = Math.round(timeDiff / (1000 * 3600 * 24));

        if (numberOfNights <= 0) return false;

        // Count inventory rows that still have capacity for the requested range.
        // Uses raw SQL because Prisma does not support column-to-column comparisons
        // in `where` clauses (e.g. bookedRooms < totalRooms).
        const result = await prisma.$queryRaw`
            SELECT COUNT(*)::int AS available_nights
            FROM "RoomTypeInventory"
            WHERE "roomTypeId" = ${roomTypeId}
              AND date >= ${inDate}
              AND date < ${outDate}
              AND "bookedRooms" < "totalRooms"
        `;

        const availableNights = result[0]?.available_nights ?? 0;
        return availableNights === numberOfNights;

    } catch (error) {
        console.error('checkAvailability error:', error.message);
        return false;
    }
};

// ---------------------------------------------------------------------------
// POST /api/bookings/check-availability
// Body: { roomTypeId, checkInDate, checkOutDate }
// Response: { success, isAvailable }
// ---------------------------------------------------------------------------
export const checkAvailabilityApi = async (req, res) => {
    try {
        const { roomTypeId, checkInDate, checkOutDate } = req.body;

        if (!checkInDate || !checkOutDate) {
            return res.status(400).json({ success: false, message: "Check-in and check-out dates are required" });
        }
        if (new Date(checkInDate) >= new Date(checkOutDate)) {
            return res.status(400).json({ success: false, message: "Check-out date must be after check-in date" });
        }

        const isAvailable = await checkAvailability({ checkInDate, checkOutDate, roomTypeId });
        return res.json({ success: true, isAvailable });

    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// ---------------------------------------------------------------------------
// Sentinel error thrown when inventory cannot be atomically reserved.
// ---------------------------------------------------------------------------
class RoomUnavailableError extends Error {
    constructor() {
        super("Room is no longer available for the selected dates.");
        this.name = "RoomUnavailableError";
    }
}

// ---------------------------------------------------------------------------
// POST /api/bookings/book  (createBooking)
//
// Body: { roomTypeId, checkInDate, checkOutDate, guests }
//
// Concurrency strategy — atomic inventory counter:
//  1. Cancel expired payment_pending bookings for this roomTypeId (lazy eval).
//  2. Load RoomType for price + maxGuests validation.
//  3. Validate guest count <= roomType.maxGuests.
//  4. Compute number of nights.
//  5. Atomic updateMany on RoomTypeInventory:
//       WHERE date IN range AND bookedRooms < totalRooms
//       SET bookedRooms += 1
//     If updatedCount !== numberOfNights → undo increments + throw RoomUnavailableError.
//  6. Create Booking record (no roomId — physical rooms no longer tracked).
// ---------------------------------------------------------------------------
export const createBooking = async (req, res) => {
    const { roomTypeId, checkInDate, checkOutDate, guests } = req.body;

    if (!checkInDate || !checkOutDate) {
        return res.status(400).json({ success: false, message: "Check-in and check-out dates are required" });
    }

    // Normalise to UTC midnight for inventory date comparisons
    const inDate = new Date(checkInDate);
    inDate.setUTCHours(0, 0, 0, 0);

    const outDate = new Date(checkOutDate);
    outDate.setUTCHours(0, 0, 0, 0);

    if (inDate >= outDate) {
        return res.status(400).json({ success: false, message: "Check-out date must be after check-in date" });
    }

    const timeDiff = outDate.getTime() - inDate.getTime();
    const numberOfNights = Math.round(timeDiff / (1000 * 3600 * 24));

    const userId = req.user.id;
    let booking;
    let roomTypeData;

    try {
        ({ booking, roomTypeData } = await prisma.$transaction(async (tx) => {

            // ── 1. Cancel expired payment_pending bookings for this roomTypeId ────
            await tx.booking.updateMany({
                where: {
                    roomTypeId,
                    status: 'payment_pending',
                    expiresAt: { lte: new Date() },
                },
                data: { status: 'cancelled' },
            });

            // ── 2. Load the RoomType for price + maxGuests validation ────────────
            const txRoomType = await tx.roomType.findUnique({
                where: { id: roomTypeId },
                include: { hotel: true },
            });

            if (!txRoomType) {
                throw Object.assign(new Error("Room type not found"), { status: 404 });
            }

            // ── 3. Validate guest count ───────────────────────────────────────────
            const guestCount = parseInt(guests, 10) || 1;
            if (guestCount > txRoomType.maxGuests) {
                throw Object.assign(
                    new Error(`This room type accommodates a maximum of ${txRoomType.maxGuests} guests.`),
                    { status: 400, isGuestError: true }
                );
            }

            // ── 4. Compute price (Decimal-safe) ──────────────────────────────────
            const totalPrice = txRoomType.pricePerNight.toNumber() * numberOfNights;

            // ── 5. Atomic inventory increment ────────────────────────────────────
            // Uses raw SQL UPDATE so PostgreSQL can evaluate the column-to-column
            // condition (bookedRooms < totalRooms) atomically per row under an
            // implicit row-level lock. Concurrent requests that race here will
            // only update rows that still have remaining capacity.
            const updateResult = await tx.$executeRaw`
                UPDATE "RoomTypeInventory"
                SET "bookedRooms" = "bookedRooms" + 1
                WHERE "roomTypeId" = ${roomTypeId}
                  AND date >= ${inDate}
                  AND date < ${outDate}
                  AND "bookedRooms" < "totalRooms"
            `;
            const updatedCount = updateResult;

            // If we couldn't update every night, some nights are fully booked.
            // Roll back the partial increments by decrementing the rows we touched.
            if (updatedCount !== numberOfNights) {
                if (updatedCount > 0) {
                    await tx.$executeRaw`
                        UPDATE "RoomTypeInventory"
                        SET "bookedRooms" = "bookedRooms" - 1
                        WHERE "roomTypeId" = ${roomTypeId}
                          AND date >= ${inDate}
                          AND date < ${outDate}
                    `;
                }
                throw new RoomUnavailableError();
            }

            // ── 6. Create Booking row ─────────────────────────────────────────────
            const txBooking = await tx.booking.create({
                data: {
                    userId,
                    roomTypeId,
                    hotelId: txRoomType.hotel.id,
                    guests: guestCount,
                    checkInDate: inDate,
                    checkOutDate: outDate,
                    totalPrice,
                    status: "payment_pending",
                    paymentMethod: "PAY_AT_HOTEL",
                    expiresAt: new Date(Date.now() + 15 * 60000),
                },
            });

            return { booking: txBooking, roomTypeData: txRoomType };
        }));

    } catch (error) {

        if (error instanceof RoomUnavailableError) {
            return res.status(400).json({ success: false, message: error.message });
        }

        // Guest count validation error
        if (error.isGuestError) {
            return res.status(400).json({ success: false, message: error.message });
        }

        if (error.status === 404) {
            return res.status(404).json({ success: false, message: error.message });
        }

        console.error("[createBooking] Unexpected error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }

    // ── Send confirmation email OUTSIDE the transaction ────────────────────
    try {
        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: req.user.email,
            subject: 'Hotel Booking Confirmation - StayHub',
            html: `
                <h1>Booking Confirmed!</h1>
                <p>Your booking for <strong>${roomTypeData.name}</strong> at ${roomTypeData.hotel.name} has been placed.</p>
                <h2>Booking Details:</h2>
                <ul>
                    <li><strong>Booking ID:</strong> ${booking.id}</li>
                    <li><strong>Hotel Name:</strong> ${roomTypeData.hotel.name}</li>
                    <li><strong>Room Type:</strong> ${roomTypeData.name}</li>
                    <li><strong>Location:</strong> ${roomTypeData.hotel.address}</li>
                    <li><strong>Check-In:</strong> ${booking.checkInDate.toDateString()}</li>
                    <li><strong>Check-Out:</strong> ${booking.checkOutDate.toDateString()}</li>
                    <li><strong>Guests:</strong> ${booking.guests}</li>
                    <li><strong>Total Amount:</strong> $${booking.totalPrice}</li>
                </ul>
                <p>We look forward to hosting you!</p>
            `
        };
        await transporter.sendMail(mailOptions);
    } catch (emailError) {
        console.error("[createBooking] Confirmation email failed:", emailError);
    }

    return res.json({ success: true, message: "Booking successful" });
};

// ---------------------------------------------------------------------------
// GET /api/bookings/user
// Returns all bookings for the current user, newest first.
// Includes roomType (for images/name/amenities) — guests never see roomNumber.
// ---------------------------------------------------------------------------
export const getUserBookings = async (req, res) => {
    try {
        const userId = req.user.id;

        const bookings = await prisma.booking.findMany({
            where: { userId },
            include: {
                roomType: {
                    select: {
                        id: true,
                        name: true,
                        pricePerNight: true,
                        amenities: true,
                        images: true,
                        maxGuests: true,
                    },
                },
                hotel: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        // Normalize: attach roomType data onto `room` object for frontend compatibility.
        // Frontend accesses booking.room.roomType, booking.room.images[0], etc.
        const normalized = bookings.map(b => ({
            ...b,
            room: {
                roomType: b.roomType.name,      // string e.g. "Luxury Suite"
                images: b.roomType.images,
                amenities: b.roomType.amenities,
                pricePerNight: b.roomType.pricePerNight,
                maxGuests: b.roomType.maxGuests,
            },
        }));

        return res.json({ success: true, bookings: normalized });

    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// ---------------------------------------------------------------------------
// GET /api/bookings/hotel
// Dashboard data for the hotel owner.
// Response: { success, dashboardData: { bookings, totalBookings, totalRevenue } }
// ---------------------------------------------------------------------------
export const getHotelBookings = async (req, res) => {
    try {
        const hotel = await prisma.hotel.findFirst({
            where: { ownerId: req.user.id },
        });

        if (!hotel) {
            return res.status(400).json({ success: false, message: "No hotel found" });
        }

        const bookings = await prisma.booking.findMany({
            where: { hotelId: hotel.id },
            include: {
                roomType: {
                    select: { id: true, name: true, pricePerNight: true },
                },
                hotel: true,
                user: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        // Normalize: attach roomType name onto room object so dashboard template
        // booking.room.roomType still works.
        const normalized = bookings.map(b => ({
            ...b,
            room: {
                roomType: b.roomType.name,
            },
        }));

        const totalBookings = bookings.length;
        const totalRevenue = bookings.reduce((total, b) => total + b.totalPrice.toNumber(), 0);

        return res.json({ success: true, dashboardData: { bookings: normalized, totalBookings, totalRevenue } });

    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ success: false, message: "Failed to fetch bookings" });
    }
};

// ---------------------------------------------------------------------------
// POST /api/bookings/stripe-payment
// Body: { bookingId }
// ---------------------------------------------------------------------------
export const stripePayment = async (req, res) => {
    try {
        const { bookingId } = req.body;

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                roomType: { include: { hotel: true } },
            },
        });

        if (!booking) {
            return res.json({ success: false, message: "Booking not found" });
        }

        const totalPrice = booking.totalPrice.toNumber();
        const { origin } = req.headers;

        const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

        const session = await stripeInstance.checkout.sessions.create({
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `${booking.roomType.hotel.name} — ${booking.roomType.name}`,
                        },
                        unit_amount: Math.round(totalPrice * 100),
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${origin}/loader/my-bookings`,
            cancel_url: `${origin}/my-bookings`,
            metadata: { bookingId },
        });

        await prisma.booking.update({
            where: { id: bookingId },
            data: {
                stripeSessionId: session.id,
                status: "payment_pending",
                expiresAt: new Date(Date.now() + 15 * 60000),
            },
        });

        res.json({ success: true, url: session.url });

    } catch (error) {
        console.error('stripePayment error:', error.message);
        res.json({ success: false, message: "Payment failed" });
    }
};

// ---------------------------------------------------------------------------
// POST /api/bookings/:bookingId/confirm
// ---------------------------------------------------------------------------
export const confirmBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const requesterId = req.user.id;

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { hotel: true },
        });

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        if (booking.hotel.ownerId !== requesterId) {
            return res.status(403).json({ success: false, message: "Not authorised to confirm this booking" });
        }

        if (booking.status === "confirmed") {
            return res.json({ success: true, message: "Booking is already confirmed" });
        }

        if (booking.status === "cancelled") {
            return res.status(400).json({ success: false, message: "Cannot confirm a cancelled booking" });
        }

        await prisma.booking.update({
            where: { id: bookingId },
            data: { status: "confirmed" },
        });

        return res.json({ success: true, message: "Booking confirmed" });

    } catch (error) {
        console.error("[confirmBooking] error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// ---------------------------------------------------------------------------
// POST /api/bookings/:bookingId/cancel
// ---------------------------------------------------------------------------
export const cancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const requesterId = req.user.id;

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { hotel: true },
        });

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        const isGuest = booking.userId === requesterId;
        const isOwner = booking.hotel.ownerId === requesterId;

        if (!isGuest && !isOwner) {
            return res.status(403).json({ success: false, message: "Not authorised to cancel this booking" });
        }

        if (booking.status === "cancelled") {
            return res.json({ success: true, message: "Booking is already cancelled" });
        }

        await prisma.booking.update({
            where: { id: bookingId },
            data: { status: "cancelled" },
        });

        return res.json({ success: true, message: "Booking cancelled" });

    } catch (error) {
        console.error("[cancelBooking] error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};