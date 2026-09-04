// controllers/userController.js

import prisma from "../configs/db.js";

// GET /api/user
// Returns the current user's profile. req.user is set by authMiddleware.
// Phase 3: also returns firstName, lastName, phone (Task 8).
export const getUserData = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const { id, username, email, image, role, recentSearchedCities, firstName, lastName, phone } = req.user;
    res.json({ success: true, id, username, email, image, role, recentSearchedCities, firstName, lastName, phone });
  } catch (error) {
    console.error("getUserData error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/user/recent-searched-cities
// Keeps the last 3 searched cities (FIFO, max 3).
export const storeRecentSearchedCities = async (req, res) => {
  try {
    const { recentSearchedCity } = req.body;
    const user = req.user;

    let cities = [...user.recentSearchedCities];

    if (cities.length < 3) {
      cities.push(recentSearchedCity);
    } else {
      cities.shift();
      cities.push(recentSearchedCity);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { recentSearchedCities: cities },
    });

    res.json({ success: true, message: "city added" });
  } catch (error) {
    console.error("storeRecentSearchedCities error", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/user/profile
// Task 8: Allows a user to update their guest audit information.
// Body: { firstName, lastName, phone }
export const updateUserProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName  !== undefined && { lastName  }),
        ...(phone     !== undefined && { phone     }),
      },
    });

    res.json({
      success: true,
      message: "Profile updated",
      user: {
        firstName: updated.firstName,
        lastName:  updated.lastName,
        phone:     updated.phone,
      },
    });
  } catch (error) {
    console.error("updateUserProfile error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};