import express from 'express';
import protect from '../middlewares/authMiddleware.js';
import {
    checkAvailabilityApi,
    createBooking,
    getHotelBookings,
    getUserBookings,
    stripePayment,
    confirmBooking,
    cancelBooking,
} from '../controllers/bookingController.js';

const bookingRouter = express.Router();

bookingRouter.post('/check-availability', checkAvailabilityApi);
bookingRouter.post('/book', protect, createBooking);
bookingRouter.get('/user', protect, getUserBookings);
bookingRouter.get('/hotel', protect, getHotelBookings);
bookingRouter.post('/stripe-payment', protect, stripePayment);

// Booking status lifecycle transitions
bookingRouter.post('/:bookingId/confirm', protect, confirmBooking);
bookingRouter.post('/:bookingId/cancel', protect, cancelBooking);

export default bookingRouter;
