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

        // ── Find the highest existing room number for this hotel ──────────────
        // so new rooms get unique sequential numbers across all room types.
        const existingRooms = await prisma.room.findMany({
            where: { hotelId: hotel.id },
            select: { roomNumber: true },
        });

        // Parse existing numbers; default to 100 so first room = 101.
        const existingNums = existingRooms.map(r => parseInt(r.roomNumber, 10)).filter(n => !isNaN(n));
        const startNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 101;

        // ── Create RoomType + physical Rooms in a single transaction ──────────
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

            // Bulk-create N physical Room rows.
            const roomData = Array.from({ length: qty }, (_, i) => ({
                roomTypeId: roomType.id,
                hotelId: hotel.id,
                roomNumber: String(startNum + i),
            }));

            await tx.room.createMany({ data: roomData });
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
        const roomTypes = await prisma.roomType.findMany({
            where: {
                isAvailable: true,
                // Only include types that have at least one physically available room.
                rooms: {
                    some: { isAvailable: true, isUnderMaintenance: false },
                },
            },
            include: {
                hotel: {
                    include: {
                        owner: {
                            select: { id: true, image: true, username: true },
                        },
                    },
                },
                // Count available rooms for the listing badge.
                rooms: {
                    where: { isAvailable: true, isUnderMaintenance: false },
                    select: { id: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Normalize to match the shape the frontend already consumes.
        const rooms = roomTypes.map(rt => ({
            id: rt.id,                          // RoomType.id (= roomTypeId for bookings)
            roomType: rt.name,                  // kept as "roomType" for backward compat
            pricePerNight: rt.pricePerNight,
            amenities: rt.amenities,
            images: rt.images,
            maxGuests: rt.maxGuests,            // NEW — Task 8
            isAvailable: rt.isAvailable,
            availableCount: rt.rooms.length,    // how many units are free
            hotel: rt.hotel,
            createdAt: rt.createdAt,
        }));

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

        const roomTypes = await prisma.roomType.findMany({
            where: { hotelId: hotel.id },
            include: {
                hotel: true,
                // Include physical rooms so owner can see individual unit status.
                rooms: {
                    orderBy: { roomNumber: 'asc' },
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