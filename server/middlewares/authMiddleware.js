// middlewares/authMiddleware.js
//
// Reads the JWT from the HttpOnly cookie named "token" and looks up the user
// in the database. Sets req.user to the Prisma User object on success.

import jwt from "jsonwebtoken";
import prisma from "../configs/db.js";

const protect = async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ success: false, message: "Not authorized — please log in" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: "Session expired — please log in again" });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("authMiddleware error:", err.message);
    return res.status(401).json({ success: false, message: "Not authorized" });
  }
};

export default protect;