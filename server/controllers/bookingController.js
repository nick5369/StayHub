// controllers/bookingController.js
//
// Phase 4 — Multi-Room Booking + Inventory Integrity
//
// Key changes from Phase 3:
//  • checkAvailability now accepts `numberOfRooms` and checks
//    (totalRooms - bookedRooms) >= numberOfRooms for every night.
//    Returns { isAvailable, availableRooms } instead of a bare boolean.
//  • createBooking accepts `numberOfRooms` (default 1).
//  • Step 1 (expired booking cleanup): fetches each expired booking's date
//    range and numberOfRooms BEFORE cancelling and decrements bookedRooms
//    correctly — fixing the inventory leak.
//  • Step 5 (atomic increment): increments by numberOfRooms, guards with
//    (totalRooms - bookedRooms) >= numberOfRooms. The manual fallback
//    decrement block has been REMOVED — Prisma's $transaction rolls back
//    partial changes automatically when RoomUnavailableError is thrown.
//  • PAY_AT_HOTEL removed — STRIPE is the only payment method.

import prisma from "../configs/db.js";
import transporter from "../configs/nodemailer.js";
import stripe from "stripe";
import { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Helper: check availability for a given numberOfRooms across the date range.
//
// Returns { isAvailable: boolean, availableRooms: number }
//   isAvailable  — true only if ALL nights have >= numberOfRooms free.
//   availableRooms — the minimum free slots across any single night in range
//                    (useful for the "only X rooms available" prompt).
// ---------------------------------------------------------------------------
export const checkAvailability = async ({ checkInDate, checkOutDate, roomTypeId, numberOfRooms = 1 }) => {
    try {
        const inDate = new Date(checkInDate);
        inDate.setUTCHours(0, 0, 0, 0);

        const outDate = new Date(checkOutDate);
        outDate.setUTCHours(0, 0, 0, 0);

        const timeDiff = outDate.getTime() - inDate.getTime();
        const numberOfNights = Math.round(timeDiff / (1000 * 3600 * 24));

        if (numberOfNights <= 0) return { isAvailable: false, availableRooms: 0 };

        const numRooms = Math.max(1, parseInt(numberOfRooms, 10) || 1);

        // Fetch min free slots across all nights in the range.
        // We use raw SQL because Prisma does not support column-to-column
        // comparisons in where clauses.
        const result = await prisma.$queryRaw`
            SELECT
                COUNT(*)::int                                           AS total_nights,
                COALESCE(MIN("totalRooms" - "bookedRooms"), 0)::int    AS min_available
            FROM "RoomTypeInventory"
            WHERE "roomTypeId" = ${roomTypeId}
              AND date >= ${inDate}
              AND date <  ${outDate}
        `;

        const totalNights   = result[0]?.total_nights  ?? 0;
        const minAvailable  = result[0]?.min_available ?? 0;

        // Inventory rows must exist for every requested night.
        if (totalNights !== numberOfNights) {
            return { isAvailable: false, availableRooms: 0 };
        }

        const isAvailable = minAvailable >= numRooms;
        return { isAvailable, availableRooms: minAvailable };

    } catch (error) {
        console.error('checkAvailability error:', error.message);
        return { isAvailable: false, availableRooms: 0 };
    }
};

// ---------------------------------------------------------------------------
// POST /api/bookings/check-availability
// Body: { roomTypeId, checkInDate, checkOutDate, numberOfRooms? }
// Response: { success, isAvailable, availableRooms }
// ---------------------------------------------------------------------------
export const checkAvailabilityApi = async (req, res) => {
    try {
        const { roomTypeId, checkInDate, checkOutDate, numberOfRooms = 1, destination, guests } = req.body;

        if (!checkInDate || !checkOutDate) {
            return res.status(400).json({ success: false, message: "Check-in and check-out dates are required" });
        }
        if (new Date(checkInDate) >= new Date(checkOutDate)) {
            return res.status(400).json({ success: false, message: "Check-out date must be after check-in date" });
        }

        // If specific roomTypeId is provided, use the existing single-room logic
        if (roomTypeId) {
            const { isAvailable, availableRooms } = await checkAvailability({
                checkInDate,
                checkOutDate,
                roomTypeId,
                numberOfRooms,
            });
            return res.json({ success: true, isAvailable, availableRooms });
        }

        // Batch search logic
        const inDate = new Date(checkInDate);
        inDate.setUTCHours(0, 0, 0, 0);

        const outDate = new Date(checkOutDate);
        outDate.setUTCHours(0, 0, 0, 0);

        const timeDiff = outDate.getTime() - inDate.getTime();
        const numberOfNights = Math.round(timeDiff / (1000 * 3600 * 24));

        if (numberOfNights <= 0) return res.json({ success: true, results: [] });

        const numRooms = Math.max(1, parseInt(numberOfRooms, 10) || 1);

        // 1. Build filtering for roomTypes
        let roomTypeWhere = { isAvailable: true };
        if (guests) {
            roomTypeWhere.maxGuests = { gte: parseInt(guests, 10) };
        }
        if (destination) {
            roomTypeWhere.hotel = {
                OR: [
                    { city: { contains: destination, mode: 'insensitive' } },
                    { address: { contains: destination, mode: 'insensitive' } },
                    { name: { contains: destination, mode: 'insensitive' } }
                ]
            };
        }

        console.log("[checkAvailabilityApi] Batch Search - Where Clause:", JSON.stringify(roomTypeWhere, null, 2));

        const roomTypes = await prisma.roomType.findMany({
            where: roomTypeWhere,
            select: { id: true }
        });

        console.log(`[checkAvailabilityApi] Found ${roomTypes.length} matching room types before inventory check.`);

        if (roomTypes.length === 0) {
            return res.json({ success: true, results: [] });
        }

        const roomTypeIds = roomTypes.map(rt => rt.id);

        // 2. Single raw query to check inventory for all matching rooms
        const inventoryStats = await prisma.$queryRaw`
            SELECT
                "roomTypeId",
                COUNT(*)::int                                           AS total_nights,
                COALESCE(MIN("totalRooms" - "bookedRooms"), 0)::int    AS min_available
            FROM "RoomTypeInventory"
            WHERE "roomTypeId" IN (${Prisma.join(roomTypeIds)})
              AND date >= ${inDate}
              AND date <  ${outDate}
            GROUP BY "roomTypeId"
        `;

        // 3. Process results
        const results = inventoryStats.map(stat => ({
            id: stat.roomTypeId,
            isAvailable: stat.total_nights === numberOfNights && stat.min_available >= numRooms,
            availableRooms: stat.min_available
        })).filter(r => r.isAvailable);

        console.log(`[checkAvailabilityApi] Returning ${results.length} available room types.`);
        
        return res.json({ success: true, results });

    } catch (error) {
        console.error('checkAvailabilityApi error:', error);
        return res.json({ success: false, message: error.message });
    }
};

// ---------------------------------------------------------------------------
// Sentinel error thrown when inventory cannot be atomically reserved.
// ---------------------------------------------------------------------------
class RoomUnavailableError extends Error {
    constructor(availableRooms = 0) {
        super("Rooms are no longer available for the selected dates.");
        this.name = "RoomUnavailableError";
        this.availableRooms = availableRooms;
    }
}

// ---------------------------------------------------------------------------
// POST /api/bookings/book  (createBooking)
//
// Body: { roomTypeId, checkInDate, checkOutDate, guests, numberOfRooms? }
//
// Concurrency strategy — atomic inventory counter:
//  1. Cancel expired payment_pending bookings for this roomTypeId.
//     BEFORE cancelling: fetch their dates + numberOfRooms and decrement
//     bookedRooms for those date ranges (inventory leak fix).
//  2. Load RoomType for price + maxGuests validation.
//  3. Validate guests <= roomType.maxGuests * numberOfRooms.
//  4. Compute total price = pricePerNight * numberOfNights * numberOfRooms.
//  5. Atomic updateMany on RoomTypeInventory:
//       WHERE date IN range AND (totalRooms - bookedRooms) >= numberOfRooms
//       SET bookedRooms += numberOfRooms
//     If updatedCount !== numberOfNights → throw RoomUnavailableError.
//     (No manual rollback — Prisma $transaction handles it automatically.)
//  6. Create Booking record with numberOfRooms stored.
// ---------------------------------------------------------------------------
export const createBooking = async (req, res) => {
    const { roomTypeId, checkInDate, checkOutDate, guests, numberOfRooms = 1 } = req.body;

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
    const numRooms = Math.max(1, parseInt(numberOfRooms, 10) || 1);

    const userId = req.user.id;
    let booking;
    let roomTypeData;

    try {
        ({ booking, roomTypeData } = await prisma.$transaction(async (tx) => {

            // ── 1. Fix inventory leak: release rooms from expired bookings ─────
            // Fetch expired payment_pending bookings for this roomType BEFORE
            // cancelling them, so we can decrement bookedRooms for each one.
            const expiredBookings = await tx.booking.findMany({
                where: {
                    roomTypeId,
                    status: 'payment_pending',
                    expiresAt: { lte: new Date() },
                },
                select: {
                    id: true,
                    checkInDate: true,
                    checkOutDate: true,
                    numberOfRooms: true,
                },
            });

            // Release inventory for each expired booking before cancelling.
            for (const expiredBooking of expiredBookings) {
                const expIn  = new Date(expiredBooking.checkInDate);
                const expOut = new Date(expiredBooking.checkOutDate);
                const expRooms = expiredBooking.numberOfRooms ?? 1;

                await tx.$executeRaw`
                    UPDATE "RoomTypeInventory"
                    SET "bookedRooms" = GREATEST(0, "bookedRooms" - ${expRooms})
                    WHERE "roomTypeId" = ${roomTypeId}
                      AND date >= ${expIn}
                      AND date <  ${expOut}
                `;
            }

            // Now cancel all expired bookings for this roomType.
            if (expiredBookings.length > 0) {
                await tx.booking.updateMany({
                    where: {
                        id: { in: expiredBookings.map(b => b.id) },
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

            // ── 3. Validate guest count across all requested rooms ─────────────
            const guestCount = parseInt(guests, 10) || 1;
            const maxTotalGuests = txRoomType.maxGuests * numRooms;
            if (guestCount > maxTotalGuests) {
                throw Object.assign(
                    new Error(`${numRooms} room(s) of this type accommodate a maximum of ${maxTotalGuests} guests (${txRoomType.maxGuests} per room).`),
                    { status: 400, isGuestError: true }
                );
            }

            // ── 4. Compute price (Decimal-safe) ──────────────────────────────────
            const totalPrice = txRoomType.pricePerNight.toNumber() * numberOfNights * numRooms;

            // ── 5. Atomic inventory increment ────────────────────────────────────
            // Guard: (totalRooms - bookedRooms) >= numRooms so we only update
            // rows that actually have enough capacity for the full request.
            // Throwing RoomUnavailableError here causes Prisma to automatically
            // roll back any partial increments — NO manual decrement needed.
            const updatedCount = await tx.$executeRaw`
                UPDATE "RoomTypeInventory"
                SET "bookedRooms" = "bookedRooms" + ${numRooms}
                WHERE "roomTypeId" = ${roomTypeId}
                  AND date >= ${inDate}
                  AND date <  ${outDate}
                  AND ("totalRooms" - "bookedRooms") >= ${numRooms}
            `;

            if (updatedCount !== numberOfNights) {
                // Some nights don't have enough capacity.
                // Query the current minimum available to surface to the user.
                const avail = await tx.$queryRaw`
                    SELECT COALESCE(MIN("totalRooms" - "bookedRooms"), 0)::int AS min_available
                    FROM "RoomTypeInventory"
                    WHERE "roomTypeId" = ${roomTypeId}
                      AND date >= ${inDate}
                      AND date <  ${outDate}
                `;
                const availableRooms = avail[0]?.min_available ?? 0;
                throw new RoomUnavailableError(availableRooms);
            }

            // ── 6. Create Booking row ─────────────────────────────────────────────
            const txBooking = await tx.booking.create({
                data: {
                    userId,
                    roomTypeId,
                    hotelId: txRoomType.hotel.id,
                    guests: guestCount,
                    numberOfRooms: numRooms,
                    checkInDate: inDate,
                    checkOutDate: outDate,
                    totalPrice,
                    status: "payment_pending",
                    paymentMethod: "STRIPE",
                    expiresAt: new Date(Date.now() + 15 * 60000),
                },
            });

            return { booking: txBooking, roomTypeData: txRoomType };
        }));

    } catch (error) {

        if (error instanceof RoomUnavailableError) {
            return res.status(400).json({
                success: false,
                message: error.message,
                availableRooms: error.availableRooms,
            });
        }

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
                    <li><strong>Number of Rooms:</strong> ${booking.numberOfRooms}</li>
                    <li><strong>Location:</strong> ${roomTypeData.hotel.address}</li>
                    <li><strong>Check-In:</strong> ${booking.checkInDate.toDateString()}</li>
                    <li><strong>Check-Out:</strong> ${booking.checkOutDate.toDateString()}</li>
                    <li><strong>Guests:</strong> ${booking.guests}</li>
                    <li><strong>Total Amount:</strong> $${booking.totalPrice}</li>
                </ul>
                <p>Please complete your payment to confirm the reservation. We look forward to hosting you!</p>
            `
        };
        await transporter.sendMail(mailOptions);
    } catch (emailError) {
        console.error("[createBooking] Confirmation email failed:", emailError);
    }

    return res.json({ success: true, message: "Booking created — complete payment to confirm", booking });
};

// ---------------------------------------------------------------------------
// GET /api/bookings/user
// Returns all bookings for the current user, newest first.
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

        // Normalize: attach roomType data onto `room` for frontend compatibility.
        const normalized = bookings.map(b => ({
            ...b,
            room: {
                roomType: b.roomType.name,
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

        const roomLabel = booking.numberOfRooms > 1
            ? `${booking.numberOfRooms}x ${booking.roomType.name}`
            : booking.roomType.name;

        const session = await stripeInstance.checkout.sessions.create({
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `${booking.roomType.hotel.name} — ${roomLabel}`,
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