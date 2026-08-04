import express from "express";
import { register, verifyOtp, login, logout, resendOtp } from "../controllers/authController.js";

const authRouter = express.Router();

authRouter.post("/register", register);
authRouter.post("/verify-otp", verifyOtp);
authRouter.post("/login", login);
authRouter.post("/logout", logout);
authRouter.post("/resend-otp", resendOtp);

export default authRouter;
