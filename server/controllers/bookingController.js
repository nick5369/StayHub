// controllers/bookingController.js

import prisma from "../configs/db.js";
import transporter from "../configs/nodemailer.js";
import stripe from "stripe";

// ---------------------------------------------------------------------------
// Helper: check if a room is available for the given date range.
//
// Replaces Mongoose:
//   Booking.find({ room, checkInDate: { $lte: checkOutDate }, checkOutDate: { $gte: checkInDate } })
//
// Prisma date-range overlap condition:
//   existingCheckIn  <= newCheckOut  AND  existingCheckOut >= newCheckIn
// ---------------------------------------------------------------------------
export const checkAvailability = async ({ checkInDate, checkOutDate, room }) => {
    try {
        const inDate = new Date(checkInDate);
        inDate.setUTCHours(11, 0, 0, 0);

        const outDate = new Date(checkOutDate);
        outDate.setUTCHours(10, 0, 0, 0);

        const overlappingBookings = await prisma.booking.findMany({
            where: {
                roomId: room,
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

        return overlappingBookings.length === 0;
    } catch (error) {
        console.error(error.message);
        return false;
    }
}

// POST /api/bookings/check-availability
// Response shape unchanged: { success, isAvailable }
export const checkAvailabilityApi = async (req, res) => {
    try {
        const { checkInDate, checkOutDate, room } = req.body;

        if (!checkInDate || !checkOutDate) {
            return res.status(400).json({ success: false, message: "Check-in and check-out dates are required" });
        }
        if (new Date(checkInDate) >= new Date(checkOutDate)) {
            return res.status(400).json({ success: false, message: "Check-out date must be after check-in date" });
        }

        const isAvailable = await checkAvailability({ checkInDate, checkOutDate, room });
        return res.json({ success: true, isAvailable });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
}

// ---------------------------------------------------------------------------
// POST /api/bookings/book  (createBooking)
//
// Concurrency-safety strategy
// ───────────────────────────
// Problem: two simultaneous requests for the same room + overlapping dates can
// both pass the application-level availability check before either has written
// its Booking row, producing a double-booking.
//
// Solution — three layers of defence:
//
//  1. FOR UPDATE row lock on Room (this function, step A below)
//     SELECT … FOR UPDATE on the Room row serialises all concurrent requests
//     for the *same* room.  A second transaction trying to lock the same room
//     will block at that SELECT until the first transaction commits or rolls
//     back.  Requests for *different* rooms are unaffected and proceed in
//     parallel.
//
//  2. Overlap re-check inside the lock (step B below)
//     The availability query is re-run inside the transaction after the lock
//     is held, using the same `tx` client, so it reads with full visibility of
//     any rows committed just before us.  This is the authoritative check.
//
//  3. Exclusion constraint on Booking (defense-in-depth backstop)
//     The DB-level constraint (booking_no_overlap, added in the 20260901
//     migration) rejects any INSERT that would produce an overlap even if the
//     application-level check somehow misses a race.  We catch Postgres error
//     code 23P01 and return the same 400 so the client never sees a raw SQL
//     error.
//
// Nothing slow (Cloudinary, email) runs inside the transaction so the Postgres
// row lock is held for the minimum possible time.
// ---------------------------------------------------------------------------

/** Sentinel error thrown when the room is already booked for the requested dates. */
class RoomUnavailableError extends Error {
    constructor() {
        super("Room is no longer available for the selected dates.");
        this.name = "RoomUnavailableError";
    }
}

// POST /api/bookings/book
// Creates a booking and sends a confirmation email.
//
// Field mapping note:
//   - booking._id (Mongo ObjectId hex) → booking.id (UUID string) — used in email body only.
//   - Response shape unchanged: { success, message }
export const createBooking = async (req, res) => {
    const { room: roomId, checkInDate, checkOutDate, guests } = req.body;

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

    // req.user.id is the internal UUID set by the JWT auth middleware.
    const userId = req.user.id;

    let booking;
    let roomData;

    try {
        // ── Run the critical section inside a single Postgres transaction ──────
        ({ booking, roomData } = await prisma.$transaction(async (tx) => {

            // ── A. Row lock on Room ──────────────────────────────────────────
            // FOR UPDATE on the Room row serialises concurrent requests for
            // the same room.  A second tx requesting the same roomId blocks
            // here until we commit/rollback.  Different rooms are unaffected.
            await tx.$queryRaw`SELECT id FROM "Room" WHERE id = ${roomId} FOR UPDATE`;

            // ── CANCEL EXPIRED BOOKINGS (Lazy Evaluation) ────────────────────
            await tx.booking.updateMany({
                where: {
                    roomId,
                    status: 'payment_pending',
                    expiresAt: { lte: new Date() }
                },
                data: { status: 'cancelled' }
            });

            // ── B. Overlap check (re-run inside the lock) ────────────────────
            // Must use `tx`, not the top-level `prisma`, so the query runs
            // within the locked transaction scope and sees the latest state.
            const overlapping = await tx.booking.findMany({
                where: {
                    roomId,
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

            if (overlapping.length > 0) {
                throw new RoomUnavailableError();
            }

            // ── C. Load room + hotel ─────────────────────────────────────────
            const txRoomData = await tx.room.findUnique({
                where: { id: roomId },
                include: { hotel: true },
            });

            if (!txRoomData) {
                throw Object.assign(new Error("Room not found"), { status: 404 });
            }

            // ── D. Compute price (Decimal-safe) ──────────────────────────────
            const timeDiff = Math.abs(
                new Date(checkOutDate).setUTCHours(0, 0, 0, 0) - new Date(checkInDate).setUTCHours(0, 0, 0, 0)
            );
            const numberOfNights = Math.round(timeDiff / (1000 * 3600 * 24));
            const totalPrice = txRoomData.pricePerNight.toNumber() * numberOfNights;

            // ── E. Create Booking row ────────────────────────────────────────
            const txBooking = await tx.booking.create({
                data: {
                    userId,
                    roomId,
                    hotelId: txRoomData.hotel.id,
                    guests,
                    checkInDate: inDate,
                    checkOutDate: outDate,
                    totalPrice,
                    status: "payment_pending",
                    paymentMethod: "STRIPE",
                    expiresAt: new Date(Date.now() + 15 * 60000),
                },
            });

            // No Cloudinary uploads, no email calls here — those would hold
            // the Postgres lock unnecessarily and could roll back the booking
            // if they failed.
            return { booking: txBooking, roomData: txRoomData };
        }));

    } catch (error) {

        // ── Room not available (application-level check) ─────────────────────
        if (error instanceof RoomUnavailableError) {
            return res
                .status(400)
                .json({ success: false, message: error.message });
        }

        // ── Exclusion-constraint violation (DB-level backstop) ───────────────
        // Postgres error code 23P01 = exclusion_violation.
        // This fires only if the application-level overlap check above somehow
        // missed a race; log the raw detail server-side for investigation but
        // don't leak SQL info to the client.
        if (error.code === "23P01") {
            console.error("[createBooking] Exclusion constraint fired (race condition):", error);
            return res
                .status(400)
                .json({ success: false, message: "Room is no longer available for the selected dates." });
        }

        // ── Room not found ───────────────────────────────────────────────────
        if (error.status === 404) {
            return res.status(404).json({ success: false, message: error.message });
        }

        // ── Unexpected error ─────────────────────────────────────────────────
        console.error("[createBooking] Unexpected error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }

    // ── Send confirmation email OUTSIDE the transaction ────────────────────
    // The booking is already committed at this point.  Email failure must NOT
    // roll back the booking or return an error to the client — we just log it.
    try {
        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: req.user.email,
            subject: 'Hotel Bookings Details - StayHub',
            html: `
                <h1>Booking Confirmed!</h1>
                <p>Your booking for the room at ${roomData.hotel.name} has been confirmed.</p>
                <h2>Booking Details:</h2>
                <ul>
                    <li><strong> Booking ID : </strong> ${booking.id}</li>
                    <li><strong> Hotel Name :</strong> ${roomData.hotel.name} </li>
                    <li> <strong> Location : </strong> ${roomData.hotel.address} </li>
                    <li> <strong> Date : </strong> ${booking.checkInDate.toDateString()} </li>
                    <li> <strong> Booking Amount : </strong> ${'$'} ${booking.totalPrice} /night</li>
                </ul>
                <p>We look forward to hosting you!</p>
            `
        };

        await transporter.sendMail(mailOptions);
    } catch (emailError) {
        // Booking succeeded; email failure is non-fatal.
        console.error("[createBooking] Confirmation email failed (booking still committed):", emailError);
    }

    return res.json({ success: true, message: "Booking successful" });
}

// GET /api/bookings/user
// Returns all bookings for the current user, with room and hotel data.
// Response shape unchanged: { success, bookings }
// Each booking now includes room and hotel as nested objects (same as Mongoose populate).
export const getUserBookings = async (req, res) => {
    try {
        const userId = req.user.id;

        const bookings = await prisma.booking.findMany({
            where: { userId },
            include: {
                room: true,
                hotel: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return res.json({ success: true, bookings });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

// GET /api/bookings/hotel
// Returns dashboard data for the hotel owner: all bookings with totals.
// Response shape unchanged: { success, dashboardData: { bookings, totalBookings, totalRevenue } }
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
                room: true,
                hotel: true,
                user: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        const totalBookings = bookings.length;
        const totalRevenue = bookings.reduce((total, booking) => total + booking.totalPrice.toNumber(), 0);

        return res.json({ success: true, dashboardData: { bookings, totalBookings, totalRevenue } });

    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ success: false, message: "Failed to fetch bookings" });
    }
}

// POST /api/bookings/stripe-payment
// Creates a Stripe Checkout session for a booking.
// bookingId in session.metadata is now a UUID string (not a Mongo ObjectId).
// Response shape unchanged: { success, url }
export const stripePayment = async (req, res) => {
    try {
        const { bookingId } = req.body;

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
        });

        if (!booking) {
            return res.json({ success: false, message: "Booking not found" });
        }

        const roomData = await prisma.room.findUnique({
            where: { id: booking.roomId },
            include: { hotel: true },
        });

        const totalPrice = booking.totalPrice.toNumber();
        const { origin } = req.headers;

        const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

        const line_items = [
            {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: roomData.hotel.name,
                    },
                    unit_amount: Math.round(Number(totalPrice) * 100),
                },
                quantity: 1,
            }
        ];

        const session = await stripeInstance.checkout.sessions.create({
            line_items,
            mode: "payment",
            success_url: `${origin}/loader/my-bookings`,
            cancel_url: `${origin}/my-bookings`,
            metadata: {
                bookingId,  // UUID string — Stripe webhook will use this to look up the row
            }
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
        res.json({ success: false, message: "payment failed" });
    }
}

// ---------------------------------------------------------------------------
// POST /api/bookings/:bookingId/confirm
//
// Allows a hotel owner to confirm a "Pay At Hotel" booking.
// Only the owner of the hotel the booking belongs to may call this.
// Idempotent: calling on an already-confirmed booking returns 200.
// ---------------------------------------------------------------------------
export const confirmBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const requesterId = req.user.id;

        // ── 1. Load booking ──────────────────────────────────────────────────
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { hotel: true },
        });

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        // ── 2. Authorise: requester must be the hotel owner ──────────────────
        if (booking.hotel.ownerId !== requesterId) {
            return res.status(403).json({ success: false, message: "Not authorised to confirm this booking" });
        }

        // ── 3. Idempotency guard ─────────────────────────────────────────────
        if (booking.status === "confirmed") {
            console.log(`[confirmBooking] Booking ${bookingId} already confirmed — no-op.`);
            return res.json({ success: true, message: "Booking is already confirmed" });
        }

        if (booking.status === "cancelled") {
            return res.status(400).json({ success: false, message: "Cannot confirm a cancelled booking" });
        }

        // ── 4. Confirm ───────────────────────────────────────────────────────
        await prisma.booking.update({
            where: { id: bookingId },
            data: { status: "confirmed" },
        });

        console.log(`[confirmBooking] Booking ${bookingId} confirmed by owner ${requesterId}.`);
        return res.json({ success: true, message: "Booking confirmed" });

    } catch (error) {
        console.error("[confirmBooking] Unexpected error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// ---------------------------------------------------------------------------
// POST /api/bookings/:bookingId/cancel
//
// Allows either the booking's own user OR the hotel owner to cancel a booking.
// Idempotent: calling on an already-cancelled booking returns 200.
// Cancelling frees the date range for other bookings because the DB exclusion
// constraint (booking_no_overlap) explicitly excludes cancelled bookings.
// ---------------------------------------------------------------------------
export const cancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const requesterId = req.user.id;

        // ── 1. Load booking ──────────────────────────────────────────────────
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { hotel: true },
        });

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        // ── 2. Authorise: requester must be the guest OR the hotel owner ─────
        const isGuest = booking.userId === requesterId;
        const isOwner = booking.hotel.ownerId === requesterId;

        if (!isGuest && !isOwner) {
            return res.status(403).json({ success: false, message: "Not authorised to cancel this booking" });
        }

        // ── 3. Idempotency guard ─────────────────────────────────────────────
        if (booking.status === "cancelled") {
            console.log(`[cancelBooking] Booking ${bookingId} already cancelled — no-op.`);
            return res.json({ success: true, message: "Booking is already cancelled" });
        }

        // ── 4. Cancel ────────────────────────────────────────────────────────
        await prisma.booking.update({
            where: { id: bookingId },
            data: { status: "cancelled" },
        });

        console.log(`[cancelBooking] Booking ${bookingId} cancelled by user ${requesterId}.`);
        return res.json({ success: true, message: "Booking cancelled" });

    } catch (error) {
        console.error("[cancelBooking] Unexpected error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};