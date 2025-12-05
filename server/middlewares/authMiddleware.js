import User from "../models/User.js";

const protect = async (req, res, next) => {
  try {
    // Clerk's middleware may attach `req.auth` as a function `req.auth()`
    // or as an object depending on versions/config. Handle both.
    let authInfo = null;
    if (typeof req.auth === 'function') {
      // Some Clerk versions provide req.auth() as a sync function
      try {
        authInfo = req.auth();
      } catch (e) {
        // If it throws or requires async, fall back to awaiting if it's async
        authInfo = await req.auth();
      }
    } else {
      authInfo = req.auth;
    }

    const { userId } = authInfo || {};
    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    const user = await User.findById(userId);
    req.user = user;
    next();
  } catch (err) {
    console.error('authMiddleware error', err && err.message ? err.message : err);
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }
};

export default protect;