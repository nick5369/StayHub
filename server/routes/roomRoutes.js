import express from 'express';
import { createRoom, getRooms, toggleRoomAvailability } from '../controllers/roomController';
import { protect } from '../middlewares/authMiddleware';
import upload from '../middlewares/uploadMiddleware';
import { get } from 'mongoose';

const roomRouter = express.Router();

roomRouter.post('/',upload.array('images',4),protect,createRoom);
roomRouter.get('/',getRooms);
roomRouter.get('/owner',protect,getOwnerRooms);
roomRouter.post('/toggle-availability',protect,toggleRoomAvailability);

export default roomRouter;