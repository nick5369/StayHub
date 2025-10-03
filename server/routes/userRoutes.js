import express from 'express';
import { protect } from '../middlewares/authMiddleware';
import { getUserData, storeRecentSearchedCities } from '../controllers/userController';

const userRouter = express.Router();

userRouter.get('/',protect, getUserData);
userRouter.post('/recent-searched-cities',protect,storeRecentSearchedCities);


export default userRouter;