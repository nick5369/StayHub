import express from 'express';
import { protect } from '../middlewares/authMiddleware';
import { checkAvailabilityApi, createBooking, getHotelBookings, getUserBookings } from '../controllers/bookingController';

const bookingRouter = express.Router();

bookingRouter.post('/check-availability',checkAvailabilityApi);
bookingRouter.post('/book',protect,createBooking);
bookingRouter.get('/user',protect,getUserBookings);
bookingRouter.get('/hotel',protect,getHotelBookings);

export default bookingRouter;
