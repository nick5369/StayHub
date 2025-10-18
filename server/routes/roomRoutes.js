import express from 'express';
import { createRoom, getRooms, toggleRoomAvailability, getOwnerRooms } from '../controllers/roomController.js';
import  protect  from '../middlewares/authMiddleware.js';
import upload from '../middlewares/uploadMiddleware.js';
import { get } from 'mongoose';

const roomRouter = express.Router();

roomRouter.post('/',protect,upload.array('images',4),createRoom);
roomRouter.get('/',getRooms);
roomRouter.get('/owner',protect,getOwnerRooms);
roomRouter.post('/toggle-availability',protect,toggleRoomAvailability);

export default roomRouter;