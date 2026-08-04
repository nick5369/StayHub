// controllers/roomController.js

import prisma from "../configs/db.js";
import { v2 as cloudinary } from "cloudinary";

// POST /api/rooms/create
// Creates a new room under the authenticated user's hotel.
// Response shape unchanged: { success, message }
export const createRoom = async (req, res) => {
    try {
        const { roomType, pricePerNight, amenities } = req.body;

        const hotel = await prisma.hotel.findFirst({
            where: { ownerId: req.user.id },
        });

        if (!hotel) {
            return res.status(400).json({ success: false, message: "No hotel found for this owner" });
        }

        // Upload each file to Cloudinary and collect the secure URLs.
        const uploadImages = req.files.map(async (file) => {
            const response = await cloudinary.uploader.upload(file.path);
            return response.secure_url;
        });

        const images = await Promise.all(uploadImages);

        // Normalize amenities to an array of strings.
        // amenities may be a JSON string when sent via multipart/form-data.
        let parsedAmenities = amenities;
        try {
            if (typeof amenities === 'string') {
                parsedAmenities = JSON.parse(amenities);
            }
        } catch (err) {
            // leave parsedAmenities as the original string; handled below
        }

        if (!Array.isArray(parsedAmenities)) {
            if (parsedAmenities && typeof parsedAmenities === 'object') {
                // object like {"Free WiFi": true, "Pool": false}
                parsedAmenities = Object.keys(parsedAmenities).filter(k => Boolean(parsedAmenities[k]));
            } else if (typeof parsedAmenities === 'string') {
                parsedAmenities = parsedAmenities.split(',').map(s => s.trim()).filter(Boolean);
            } else {
                parsedAmenities = [];
            }
        }

        await prisma.room.create({
            data: {
                hotelId: hotel.id,
                roomType,
                pricePerNight: +pricePerNight,
                amenities: parsedAmenities,
                images,
            },
        });

        return res.json({ success: true, message: "Room created successfully" });

    } catch (error) {
        console.error('createRoom error:', error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

// GET /api/rooms
// Returns all available rooms with their hotel and hotel owner info.
//
// Response shape is equivalent to the Mongoose .populate({ path: 'hotel', populate: { path: 'owner' } }) result:
//   room.hotel.owner.image  →  room.hotel.owner.image   ✓
//   room.hotel.owner.name   →  room.hotel.owner.username (NOTE: Mongo model used 'username', frontend should use 'username')
//
// NOTE: Mongoose selected `name` but the User model field is actually `username`.
// The Prisma response uses `username` — consistent with the Mongoose model definition.
export const getRooms = async (req, res) => {
    try {
        console.log('🔍 getRooms: Fetching available rooms...');

        const rooms = await prisma.room.findMany({
            where: { isAvailable: true },
            include: {
                hotel: {
                    include: {
                        owner: {
                            select: {
                                id: true,
                                image: true,
                                username: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        console.log(`✅ getRooms: Found ${rooms.length} rooms`);
        return res.json({ success: true, rooms });

    } catch (error) {
        console.error('❌ getRooms Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
}

// GET /api/rooms/owner
// Returns all rooms belonging to the authenticated user's hotel.
// Response shape unchanged: { success, rooms } where each room includes hotel data.
export const getOwnerRooms = async (req, res) => {
    try {
        const hotel = await prisma.hotel.findFirst({
            where: { ownerId: req.user.id },
        });

        if (!hotel) {
            return res.status(400).json({ success: false, message: "No hotel found" });
        }

        const rooms = await prisma.room.findMany({
            where: { hotelId: hotel.id },
            include: { hotel: true },
        });

        return res.json({ success: true, rooms });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

// POST /api/rooms/toggle-availability
// Flips a room's isAvailable flag.
// Response shape unchanged: { success, message }
export const toggleRoomAvailability = async (req, res) => {
    try {
        const { roomId } = req.body;

        // Fetch current value then flip — mirrors the original room.isAvailable = !room.isAvailable logic.
        const room = await prisma.room.findUnique({
            where: { id: roomId },
        });

        if (!room) {
            return res.status(404).json({ success: false, message: "Room not found" });
        }

        await prisma.room.update({
            where: { id: roomId },
            data: { isAvailable: !room.isAvailable },
        });

        return res.json({ success: true, message: "Room availability updated" });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}