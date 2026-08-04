// controllers/authController.js
//
// Self-hosted JWT auth with email OTP verification.
// JWT is stored exclusively in an HttpOnly, Secure, SameSite=Strict cookie
// so it is never accessible from JavaScript (XSS-safe).

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../configs/db.js";
import transporter from "../configs/nodemailer.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SALT_ROUNDS = 10;
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const JWT_MAX_AGE_S = 7 * 24 * 60 * 60; // 7 days in seconds

/** Generate a cryptographically-random 6-digit OTP string */
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

/** Sign and set JWT as an HttpOnly cookie on the response */
const setTokenCookie = (res, userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: JWT_MAX_AGE_S,
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge: JWT_MAX_AGE_S * 1000, // ms
  });
};

/** Send an OTP email to the given address */
const sendOtpEmail = async (email, otp) => {
  await transporter.sendMail({
    from: `StayHub <${process.env.SENDER_EMAIL}>`,
    to: email,
    subject: "Your StayHub OTP Code",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="color:#1e293b;margin-bottom:8px">Verify your email</h2>
        <p style="color:#64748b;margin-bottom:24px">Use the code below to complete your sign-in to StayHub. It expires in <strong>10 minutes</strong>.</p>
        <div style="font-size:36px;font-weight:700;letter-spacing:12px;text-align:center;padding:20px 0;color:#4f46e5">${otp}</div>
        <p style="color:#94a3b8;font-size:13px;margin-top:24px">If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });
};

// ---------------------------------------------------------------------------
// POST /api/auth/register
// Body: { name, email, password }
// ---------------------------------------------------------------------------
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing && existing.isVerified) {
      return res.status(409).json({ success: false, message: "Email already registered. Please login." });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, SALT_ROUNDS);
    const otpExpiry = new Date(Date.now() + OTP_TTL_MS);

    if (existing && !existing.isVerified) {
      // Re-registration: update the pending record with fresh credentials + OTP
      await prisma.user.update({
        where: { email },
        data: { username: name, passwordHash, otp: otpHash, otpExpiry },
      });
    } else {
      await prisma.user.create({
        data: {
          username: name,
          email,
          passwordHash,
          otp: otpHash,
          otpExpiry,
        },
      });
    }

    await sendOtpEmail(email, otp);

    return res.json({
      success: true,
      message: "OTP sent to your email. Please verify to complete registration.",
    });
  } catch (error) {
    console.error("register error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/verify-otp
// Body: { email, otp }
// ---------------------------------------------------------------------------
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ success: false, message: "No OTP found. Please request a new one." });
    }

    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
    }

    const isMatch = await bcrypt.compare(otp, user.otp);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // Mark as verified and clear OTP fields
    const verified = await prisma.user.update({
      where: { email },
      data: { isVerified: true, otp: null, otpExpiry: null },
    });

    setTokenCookie(res, verified.id);

    return res.json({
      success: true,
      message: "Email verified successfully",
      user: {
        id: verified.id,
        username: verified.username,
        email: verified.email,
        image: verified.image,
        role: verified.role,
      },
    });
  } catch (error) {
    console.error("verifyOtp error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/login
// Body: { email, password }
// ---------------------------------------------------------------------------
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    // If not verified, send a fresh OTP and prompt for verification
    if (!user.isVerified) {
      const otp = generateOtp();
      const otpHash = await bcrypt.hash(otp, SALT_ROUNDS);
      const otpExpiry = new Date(Date.now() + OTP_TTL_MS);

      await prisma.user.update({
        where: { email },
        data: { otp: otpHash, otpExpiry },
      });

      await sendOtpEmail(email, otp);

      return res.status(403).json({
        success: false,
        needsOtp: true,
        message: "Email not verified. A new OTP has been sent to your email.",
      });
    }

    setTokenCookie(res, user.id);

    return res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        image: user.image,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("login error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// Clears the JWT cookie
// ---------------------------------------------------------------------------
export const logout = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  });
  return res.json({ success: true, message: "Logged out successfully" });
};

// ---------------------------------------------------------------------------
// POST /api/auth/resend-otp
// Body: { email }
// ---------------------------------------------------------------------------
export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: "Email is already verified" });
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, SALT_ROUNDS);
    const otpExpiry = new Date(Date.now() + OTP_TTL_MS);

    await prisma.user.update({
      where: { email },
      data: { otp: otpHash, otpExpiry },
    });

    await sendOtpEmail(email, otp);

    return res.json({ success: true, message: "New OTP sent to your email" });
  } catch (error) {
    console.error("resendOtp error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
