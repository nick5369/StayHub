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
// Returns all available RoomTypes that have at least 1 free room across
// their entire future inventory window.
//
// availableCount = MIN(totalRooms - bookedRooms) over all future inventory
// rows for each RoomType. This prevents a room type that's fully booked on
// any upcoming night from appearing as available.
//
// Response shape: { id, roomType, pricePerNight, amenities, images, maxGuests,
//                   isAvailable, availableCount, hotel }
// NOTE: `id` is RoomType.id — used as `roomTypeId` in booking requests.
// ---------------------------------------------------------------------------
export const getRooms = async (req, res) => {
    try {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        // Aggregate the minimum free-room count across all future inventory
        // rows per RoomType in a single query.
        const inventoryStats = await prisma.$queryRaw`
            SELECT
                "roomTypeId",
                MIN("totalRooms" - "bookedRooms")::int AS min_available
            FROM "RoomTypeInventory"
            WHERE date >= ${today}
            GROUP BY "roomTypeId"
        `;

        // Build a fast lookup map: roomTypeId → minAvailable
        const availabilityMap = new Map(
            inventoryStats.map(row => [row.roomTypeId, row.min_available ?? 0])
        );

        const roomTypes = await prisma.roomType.findMany({
            where: { isAvailable: true },
            include: {
                hotel: {
                    include: {
                        owner: {
                            select: { id: true, image: true, username: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Normalize and filter: only include room types with at least 1
        // free room across their entire future inventory window.
        const rooms = roomTypes
            .map(rt => {
                const availableCount = availabilityMap.get(rt.id) ?? 0;
                return {
                    id:            rt.id,
                    roomType:      rt.name,
                    pricePerNight: rt.pricePerNight,
                    amenities:     rt.amenities,
                    images:        rt.images,
                    maxGuests:     rt.maxGuests,
                    isAvailable:   rt.isAvailable,
                    availableCount,
                    hotel:         rt.hotel,
                    createdAt:     rt.createdAt,
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

        // Normalize: expose totalRooms from today's inventory row instead of the
        // raw Prisma object (which no longer has a physical rooms[] relation).
        const normalized = roomTypes.map(rt => {
            const todayInv = rt.inventory[0];
            return {
                id:            rt.id,
                name:          rt.name,
                pricePerNight: rt.pricePerNight,
                amenities:     rt.amenities,
                images:        rt.images,
                maxGuests:     rt.maxGuests,
                isAvailable:   rt.isAvailable,
                totalRooms:    todayInv ? todayInv.totalRooms : 0,   // units from inventory
                createdAt:     rt.createdAt,
            };
        });

        return res.json({ success: true, rooms: normalized });

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

// ---------------------------------------------------------------------------
// POST /api/rooms/block-dates
// Allows a hotel owner to mark a specific number of rooms as unavailable
// for a given date range (e.g. maintenance, renovation).
//
// Body: { roomTypeId, startDate, endDate, unavailableRooms }
//   roomTypeId       — RoomType.id to block
//   startDate        — first blocked night (inclusive, "YYYY-MM-DD")
//   endDate          — last blocked night (exclusive, "YYYY-MM-DD")
//   unavailableRooms — number of rooms to block (must be >= 1)
//
// The endpoint increments bookedRooms by `unavailableRooms` for each
// inventory row in the range, capped at totalRooms so it never goes negative
// or exceeds capacity.
// ---------------------------------------------------------------------------
export const blockRoomDates = async (req, res) => {
    try {
        const { roomTypeId, startDate, endDate, unavailableRooms } = req.body;

        if (!roomTypeId || !startDate || !endDate || !unavailableRooms) {
            return res.status(400).json({
                success: false,
                message: "roomTypeId, startDate, endDate, and unavailableRooms are required",
            });
        }

        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setUTCHours(0, 0, 0, 0);

        if (start >= end) {
            return res.status(400).json({
                success: false,
                message: "endDate must be after startDate",
            });
        }

        const blockedRooms = Math.max(1, parseInt(unavailableRooms, 10) || 1);

        // Verify the room type belongs to the authenticated owner's hotel.
        const roomType = await prisma.roomType.findFirst({
            where: {
                id: roomTypeId,
                hotel: { ownerId: req.user.id },
            },
            include: { inventory: { where: { date: start }, take: 1 } },
        });

        if (!roomType) {
            return res.status(404).json({
                success: false,
                message: "Room type not found or you do not own this hotel",
            });
        }

        // Check that blockedRooms does not exceed totalRooms for this type.
        const sampleInv = roomType.inventory[0];
        if (sampleInv && blockedRooms > sampleInv.totalRooms) {
            return res.status(400).json({
                success: false,
                message: `Cannot block more than the total ${sampleInv.totalRooms} room(s) for this type`,
            });
        }

        // Increment bookedRooms, capped at totalRooms (LEAST prevents overflow).
        const updatedCount = await prisma.$executeRaw`
            UPDATE "RoomTypeInventory"
            SET "bookedRooms" = LEAST("totalRooms", "bookedRooms" + ${blockedRooms})
            WHERE "roomTypeId" = ${roomTypeId}
              AND date >= ${start}
              AND date <  ${end}
        `;

        return res.json({
            success: true,
            message: `Blocked ${blockedRooms} room(s) for ${updatedCount} night(s)`,
            updatedNights: updatedCount,
        });

    } catch (error) {
        console.error('blockRoomDates error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};