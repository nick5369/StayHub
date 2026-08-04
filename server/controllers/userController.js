// controllers/userController.js

import prisma from "../configs/db.js";

// GET /api/user
// Returns the current user's profile. req.user is set by authMiddleware.
export const getUserData = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const { id, username, email, image, role, recentSearchedCities } = req.user;
    res.json({ success: true, id, username, email, image, role, recentSearchedCities });
  } catch (error) {
    console.error("getUserData error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/user/store-recent-cities
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