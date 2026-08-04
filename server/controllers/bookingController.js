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
        const overlappingBookings = await prisma.booking.findMany({
            where: {
                roomId: room,
                AND: [
                    { checkInDate:  { lte: new Date(checkOutDate) } },
                    { checkOutDate: { gte: new Date(checkInDate) } },
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
        const isAvailable = await checkAvailability({ checkInDate, checkOutDate, room });
        return res.json({ success: true, isAvailable });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
}

// POST /api/bookings/create
// Creates a booking and sends a confirmation email.
//
// Field mapping note:
//   - booking._id (Mongo ObjectId hex) → booking.id (UUID string) — used in email body only.
//   - Response shape unchanged: { success, message }
export const createBooking = async (req, res) => {
    try {
        const { room, checkInDate, checkOutDate, guests } = req.body;

        // req.user.id is the internal UUID set by the JWT auth middleware.
        const userId = req.user.id;

        const isAvailable = await checkAvailability({ checkInDate, checkOutDate, room });
        if (!isAvailable) {
            return res.status(400).json({ success: false, message: "Room not available" });
        }

        // Load room + hotel in one query — replaces Room.findById(room).populate('hotel').
        const roomData = await prisma.room.findUnique({
            where: { id: room },
            include: { hotel: true },
        });

        if (!roomData) {
            return res.status(404).json({ success: false, message: "Room not found" });
        }

        const timeDiff = Math.abs(new Date(checkOutDate).getTime() - new Date(checkInDate).getTime());
        const numberOfNights = Math.ceil(timeDiff / (1000 * 3600 * 24));
        const totalPrice = roomData.pricePerNight * numberOfNights;

        const booking = await prisma.booking.create({
            data: {
                userId,
                roomId: room,
                hotelId: roomData.hotel.id,
                guests,
                checkInDate: new Date(checkInDate),
                checkOutDate: new Date(checkOutDate),
                totalPrice,
            },
        });

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

        return res.json({ success: true, message: "Booking successful" });

    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ success: false, message: "Server error" });
    }
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
        const totalRevenue = bookings.reduce((total, booking) => total + booking.totalPrice, 0);

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

        const totalPrice = booking.totalPrice;
        const { origin } = req.headers;

        const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

        const line_items = [
            {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: roomData.hotel.name,
                    },
                    unit_amount: totalPrice * 100,
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

        res.json({ success: true, url: session.url });

    } catch (error) {
        console.error('stripePayment error:', error.message);
        res.json({ success: false, message: "payment failed" });
    }
}