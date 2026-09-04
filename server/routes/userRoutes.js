import express from 'express';
import protect from '../middlewares/authMiddleware.js';
import { getUserData, storeRecentSearchedCities, updateUserProfile } from '../controllers/userController.js';

const userRouter = express.Router();

userRouter.get('/', protect, getUserData);
userRouter.post('/recent-searched-cities', protect, storeRecentSearchedCities);
// Task 8: update guest audit fields (firstName, lastName, phone)
userRouter.put('/profile', protect, updateUserProfile);

export default userRouter;