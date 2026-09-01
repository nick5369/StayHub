// controllers/hotelController.js

import prisma from "../configs/db.js";

// POST /api/hotels/register
// Creates a hotel for the authenticated user and promotes them to hotelOwner.
// Response shape unchanged: { success, message }
export const registerHotel = async (req, res) => {
    try {
        const { name, address, contact, city } = req.body;

        // req.user.id is the internal UUID (set by authMiddleware via Prisma lookup).
        const ownerId = req.user.id;

        // One hotel per owner constraint — mirrors original Hotel.findOne({ owner }).
        const existing = await prisma.hotel.findFirst({
            where: { ownerId },
        });

        if (existing) {
            return res.status(400).json({ success: false, message: "Hotel Already Registered" });
        }

        await prisma.hotel.create({
            data: { name, address, contact, city, ownerId },
        });

        // Promote user role to hotelOwner — mirrors original User.findByIdAndUpdate(owner, { role: 'hotelOwner' }).
        await prisma.user.update({
            where: { id: ownerId },
            data: { role: "hotelOwner" },
        });

        res.json({ success: true, message: "Hotel Registered Successfully" });

    } catch (error) {
        if (error.code === 'P2002' && error.meta?.target?.includes('ownerId')) {
            return res.status(400).json({ success: false, message: "Hotel Already Registered" });
        }
        res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
}
