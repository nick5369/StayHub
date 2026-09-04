// controllers/roomController.js
//
// Phase 3 — Core Inventory Redesign (Room vs. RoomType)
//
// RoomType  — marketing data; what the guest sees and books.
// Room      — physical inventory; the actual doors the hotel manages.
//             Guests NEVER see room numbers — they are internal only.
//
// When an owner adds a "room type" they supply a quantity (e.g., 5).
// We create 1 RoomType row + N Room rows automatically (numbered sequentially
// per hotel so numbers don't collide across different room types).

import prisma from "../configs/db.js";
import { v2 as cloudinary } from "cloudinary";

// ---------------------------------------------------------------------------
// POST /api/rooms
// Creates a RoomType + N physical Room records for the authenticated owner.
// Body (multipart/form-data):
//   name           — display name, e.g. "Luxury Suite"
//   pricePerNight  — number
//   amenities      — JSON string  { "Free WiFi": true, … }  or  ["Free WiFi"]
//   maxGuests      — integer (Task 8)
//   quantity       — integer >= 1, how many physical rooms to create
//   images         — up to 4 files
// ---------------------------------------------------------------------------
export const createRoom = async (req, res) => {
    try {
        const { name, pricePerNight, amenities, maxGuests = 2, quantity = 1 } = req.body;

        if (!name || !pricePerNight) {
            return res.status(400).json({ success: false, message: "Room name and price are required" });
        }

        const hotel = await prisma.hotel.findFirst({
            where: { ownerId: req.user.id },
        });

        if (!hotel) {
            return res.status(400).json({ success: false, message: "No hotel found for this owner" });
        }

        // ── Upload images to Cloudinary ───────────────────────────────────────
        const uploadImages = req.files.map(async (file) => {
            const response = await cloudinary.uploader.upload(file.path);
            return response.secure_url;
        });
        const images = await Promise.all(uploadImages);

        // ── Normalize amenities to a flat string[] ────────────────────────────
        let parsedAmenities = amenities;
        try {
            if (typeof amenities === 'string') {
                parsedAmenities = JSON.parse(amenities);
            }
        } catch (_) {
            // leave as-is; handled below
        }

        if (!Array.isArray(parsedAmenities)) {
            if (parsedAmenities && typeof parsedAmenities === 'object') {
                // { "Free WiFi": true, "Pool": false }  →  ["Free WiFi"]
                parsedAmenities = Object.keys(parsedAmenities).filter(k => Boolean(parsedAmenities[k]));
            } else if (typeof parsedAmenities === 'string') {
                parsedAmenities = parsedAmenities.split(',').map(s => s.trim()).filter(Boolean);
            } else {
                parsedAmenities = [];
            }
        }

        const qty = Math.max(1, parseInt(quantity, 10) || 1);
        const maxGuestsNum = Math.max(1, parseInt(maxGuests, 10) || 2);

        // ── Create RoomType + 365 Days of Inventory in a single transaction ───
        await prisma.$transaction(async (tx) => {
            const roomType = await tx.roomType.create({
                data: {
                    hotelId: hotel.id,
                    name,
                    pricePerNight: +pricePerNight,
                    amenities: parsedAmenities,
                    images,
                    maxGuests: maxGuestsNum,
                },
            });

            // Generate 365 days of inventory starting from today
            const inventoryData = [];
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);

            for (let i = 0; i < 365; i++) {
                const date = new Date(today);
                date.setUTCDate(today.getUTCDate() + i);

                inventoryData.push({
                    roomTypeId: roomType.id,
                    date: date,
                    totalRooms: qty,
                    bookedRooms: 0,
                });
            }

            await tx.roomTypeInventory.createMany({ data: inventoryData });
        });

        return res.json({ success: true, message: `Room type created with ${qty} unit(s)` });

    } catch (error) {
        console.error('createRoom error:', error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// ---------------------------------------------------------------------------
// GET /api/rooms
// Returns all available RoomTypes with at least one bookable physical Room.
// Response is normalized to preserve the existing frontend contract:
//   { id, roomType, pricePerNight, amenities, images, maxGuests,
//     isAvailable, availableCount, hotel }
//
// NOTE: `id` here is RoomType.id — used as `roomTypeId` in booking requests.
// ---------------------------------------------------------------------------
export const getRooms = async (req, res) => {
    try {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const roomTypes = await prisma.roomType.findMany({
            where: {
                isAvailable: true,
            },
            include: {
                hotel: {
                    include: {
                        owner: {
                            select: { id: true, image: true, username: true },
                        },
                    },
                },
                // Fetch today's inventory to determine availability
                inventory: {
                    where: { date: today },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Normalize to match the shape the frontend already consumes,
        // and filter out room types that have no availability today.
        const rooms = roomTypes
            .map(rt => {
                const todayInv = rt.inventory[0];
                const availableCount = todayInv ? todayInv.totalRooms - todayInv.bookedRooms : 0;

                return {
                    id: rt.id,                          // RoomType.id (= roomTypeId for bookings)
                    roomType: rt.name,                  // kept as "roomType" for backward compat
                    pricePerNight: rt.pricePerNight,
                    amenities: rt.amenities,
                    images: rt.images,
                    maxGuests: rt.maxGuests,            // NEW — Task 8
                    isAvailable: rt.isAvailable,
                    availableCount,                     // how many units are free today
                    hotel: rt.hotel,
                    createdAt: rt.createdAt,
                };
            })
            .filter(rt => rt.availableCount > 0);

        return res.json({ success: true, rooms });

    } catch (error) {
        console.error('getRooms error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ---------------------------------------------------------------------------
// GET /api/rooms/owner
// Returns all RoomTypes for the authenticated owner's hotel,
// including physical Room details (for the owner's ListRoom dashboard).
// ---------------------------------------------------------------------------
export const getOwnerRooms = async (req, res) => {
    try {
        const hotel = await prisma.hotel.findFirst({
            where: { ownerId: req.user.id },
        });

        if (!hotel) {
            return res.status(400).json({ success: false, message: "No hotel found" });
        }

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const roomTypes = await prisma.roomType.findMany({
            where: { hotelId: hotel.id },
            include: {
                hotel: true,
                // Include today's inventory so owner can see total unit count
                inventory: {
                    where: { date: today },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return res.json({ success: true, rooms: roomTypes });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ---------------------------------------------------------------------------
// POST /api/rooms/toggle-availability
// Toggles the isAvailable flag on a RoomType (which gates all its physical rooms).
// Body: { roomId }  — roomId here is the RoomType.id (legacy key name kept for
//                     backward compatibility with the existing frontend call).
// ---------------------------------------------------------------------------
export const toggleRoomAvailability = async (req, res) => {
    try {
        const { roomId } = req.body;

        const roomType = await prisma.roomType.findUnique({
            where: { id: roomId },
        });

        if (!roomType) {
            return res.status(404).json({ success: false, message: "Room type not found" });
        }

        await prisma.roomType.update({
            where: { id: roomId },
            data: { isAvailable: !roomType.isAvailable },
        });

        return res.json({ success: true, message: "Room availability updated" });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};