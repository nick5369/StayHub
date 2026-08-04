import express from "express";
import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectCloudinary from "./configs/cloudinary.js";
import authRouter from "./routes/authRoutes.js";
import userRouter from "./routes/userRoutes.js";
import hotelRouter from "./routes/hotelRoutes.js";
import roomRouter from "./routes/roomRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import { stripeWebhooks } from "./controllers/stripeWebhooks.js";

// Prisma connects lazily on first query — no explicit connect call needed.
connectCloudinary();

const app = express();

// Allow credentials (cookies) to be sent cross-origin from the client dev server.
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Stripe webhook must receive the raw body — mount BEFORE express.json()
app.post("/api/stripe", express.raw({ type: "application/json" }), stripeWebhooks);

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => res.send("API is working !!"));

app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/hotels", hotelRouter);
app.use("/api/rooms", roomRouter);
app.use("/api/bookings", bookingRouter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`server is running on port ${PORT}`));
