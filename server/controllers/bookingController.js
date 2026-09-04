// controllers/bookingController.js
//
// Phase 3 — Updated for RoomType / Room split.
//
// Key changes:
//  • checkAvailability now operates on roomTypeId: finds ANY free physical Room
//    of that type for the requested date range.
//  • createBooking receives roomTypeId, picks a free physical Room inside the
//    transaction (row-locks it), and stores both roomId + roomTypeId on Booking.
//  • Guest count validation: guests must not exceed roomType.maxGuests (Task 8).
//  • getUserBookings / getHotelBookings include roomType nested data for display.

import prisma from "../configs/db.js";
import transporter from "../configs/nodemailer.js";
import stripe from "stripe";

// ---------------------------------------------------------------------------
// Helper: check if a RoomType has ANY available physical Room for a date range.
//
// Returns { isAvailable: boolean, availableRoomId: string|null }
// ---------------------------------------------------------------------------
export const checkAvailability = async ({ checkInDate, checkOutDate, roomTypeId }) => {
    try {
        const inDate = new Date(checkInDate);
        inDate.setUTCHours(11, 0, 0, 0);

        const outDate = new Date(checkOutDate);
        outDate.setUTCHours(10, 0, 0, 0);

        // Find all physical rooms for this type that are active.
        const physicalRooms = await prisma.room.findMany({
            where: {
                roomTypeId,
                isAvailable: true,
                isUnderMaintenance: false,
                roomType: { isAvailable: true }, // respect owner-level toggle
            },
            select: { id: true },
        });

        if (physicalRooms.length === 0) return false;

        // Find rooms that DO have an overlapping booking (busy rooms).
        const busyRoomIds = await prisma.booking.findMany({
            where: {
                roomId: { in: physicalRooms.map(r => r.id) },
                status: { notIn: ['cancelled', 'refunded'] },
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } },
                ],
                AND: [
                    { checkInDate: { lt: outDate } },
                    { checkOutDate: { gt: inDate } },
                ],
            },
            select: { roomId: true },
        });

        const busyIds = new Set(busyRoomIds.map(b => b.roomId));

        // A room is available if it is NOT in the busy set.
        const freeRoom = physicalRooms.find(r => !busyIds.has(r.id));
        return freeRoom ? true : false;

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
// Sentinel error thrown when no physical room is free for the requested dates.
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
// Concurrency strategy (same three layers as before, now per physical Room):
//  1. Cancel expired payment_pending bookings for this roomTypeId (lazy eval).
//  2. Find a free physical Room for the date range.
//  3. Row-lock that specific Room (SELECT … FOR UPDATE).
//  4. Re-check availability inside the lock.
//  5. Validate guests <= roomType.maxGuests  (Task 8).
//  6. Create Booking with roomId (physical) + roomTypeId (for display).
// ---------------------------------------------------------------------------
export const createBooking = async (req, res) => {
    const { roomTypeId, checkInDate, checkOutDate, guests } = req.body;

    if (!checkInDate || !checkOutDate) {
        return res.status(400).json({ success: false, message: "Check-in and check-out dates are required" });
    }

    const inDate = new Date(checkInDate);
    inDate.setUTCHours(11, 0, 0, 0);

    const outDate = new Date(checkOutDate);
    outDate.setUTCHours(10, 0, 0, 0);

    if (inDate >= outDate) {
        return res.status(400).json({ success: false, message: "Check-out date must be after check-in date" });
    }

    const userId = req.user.id;
    let booking;
    let roomTypeData;

    try {
        ({ booking, roomTypeData } = await prisma.$transaction(async (tx) => {

            // ── 1. Cancel expired payment_pending bookings for any room of this type ─
            const activeRoomIds = (await tx.room.findMany({
                where: { roomTypeId },
                select: { id: true },
            })).map(r => r.id);

            if (activeRoomIds.length > 0) {
                await tx.booking.updateMany({
                    where: {
                        roomId: { in: activeRoomIds },
                        status: 'payment_pending',
                        expiresAt: { lte: new Date() },
                    },
                    data: { status: 'cancelled' },
                });
            }

            // ── 2. Load the RoomType for price + maxGuests validation ────────────
            const txRoomType = await tx.roomType.findUnique({
                where: { id: roomTypeId },
                include: { hotel: true },
            });

            if (!txRoomType) {
                throw Object.assign(new Error("Room type not found"), { status: 404 });
            }

            // ── Task 8: Validate guest count ─────────────────────────────────────
            const guestCount = parseInt(guests, 10) || 1;
            if (guestCount > txRoomType.maxGuests) {
                throw Object.assign(
                    new Error(`This room type accommodates a maximum of ${txRoomType.maxGuests} guests.`),
                    { status: 400, isGuestError: true }
                );
            }

            // ── 3. Find a free physical Room (not overlapping) ───────────────────
            const physicalRooms = await tx.room.findMany({
                where: {
                    roomTypeId,
                    isAvailable: true,
                    isUnderMaintenance: false,
                },
                select: { id: true },
            });

            if (physicalRooms.length === 0) {
                throw new RoomUnavailableError();
            }

            // Find rooms with overlapping bookings.
            const busyBookings = await tx.booking.findMany({
                where: {
                    roomId: { in: physicalRooms.map(r => r.id) },
                    status: { notIn: ['cancelled', 'refunded'] },
                    OR: [
                        { expiresAt: null },
                        { expiresAt: { gt: new Date() } },
                    ],
                    AND: [
                        { checkInDate: { lt: outDate } },
                        { checkOutDate: { gt: inDate } },
                    ],
                },
                select: { roomId: true },
            });

            const busyIds = new Set(busyBookings.map(b => b.roomId));
            const freeRoom = physicalRooms.find(r => !busyIds.has(r.id));

            if (!freeRoom) {
                throw new RoomUnavailableError();
            }

            // ── 4. Row-lock the chosen physical Room ─────────────────────────────
            await tx.$queryRaw`SELECT id FROM "Room" WHERE id = ${freeRoom.id} FOR UPDATE`;

            // ── 5. Re-check just this room inside the lock ───────────────────────
            const overlapCheck = await tx.booking.findFirst({
                where: {
                    roomId: freeRoom.id,
                    status: { notIn: ['cancelled', 'refunded'] },
                    OR: [
                        { expiresAt: null },
                        { expiresAt: { gt: new Date() } },
                    ],
                    AND: [
                        { checkInDate: { lt: outDate } },
                        { checkOutDate: { gt: inDate } },
                    ],
                },
            });

            if (overlapCheck) {
                throw new RoomUnavailableError();
            }

            // ── 6. Compute price (Decimal-safe) ──────────────────────────────────
            const timeDiff = Math.abs(
                new Date(checkOutDate).setUTCHours(0, 0, 0, 0) - new Date(checkInDate).setUTCHours(0, 0, 0, 0)
            );
            const numberOfNights = Math.round(timeDiff / (1000 * 3600 * 24));
            const totalPrice = txRoomType.pricePerNight.toNumber() * numberOfNights;

            // ── 7. Create Booking row ─────────────────────────────────────────────
            const txBooking = await tx.booking.create({
                data: {
                    userId,
                    roomId: freeRoom.id,         // physical Room assigned by backend
                    roomTypeId,                  // for display queries
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

        if (error.code === "23P01") {
            console.error("[createBooking] Exclusion constraint fired:", error);
            return res.status(400).json({ success: false, message: "Room is no longer available for the selected dates." });
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