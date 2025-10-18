import express from 'express';
import protect from '../middlewares/authMiddleware.js';
import { getUserData, storeRecentSearchedCities } from '../controllers/userController.js';

const userRouter = express.Router();

userRouter.get('/',protect, getUserData);
userRouter.post('/recent-searched-cities',protect,storeRecentSearchedCities);


export default userRouter;