#!/usr/bin/env node
// server/scripts/migrate-mongo-to-pg.js
//
// One-off migration script: reads all documents from MongoDB and inserts them
// into Postgres via Prisma in FK-safe order:
//   users → hotels → rooms → bookings
//
// Usage (from the server/ directory):
//   node scripts/migrate-mongo-to-pg.js
//
// Prerequisites:
//   1. Both MONGODB_URI and DATABASE_URL must be set in server/.env (or as env vars).
//   2. Postgres schema must already be migrated: npx prisma migrate deploy
//   3. Prisma client must be generated:          npx prisma generate
//
// This script is SAFE TO RUN multiple times — it uses upsert for users/hotels/rooms
// and skips bookings that already exist. Interrupt and re-run freely.

import "dotenv/config";
import mongoose from "mongoose";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// 1. Connect to MongoDB
// ---------------------------------------------------------------------------
await mongoose.connect(process.env.MONGODB_URI);
console.log("✅ Connected to MongoDB");

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// 2. Read raw documents from each collection
// ---------------------------------------------------------------------------

// Helper to get all docs from a collection without a Mongoose model.
const getAll = async (collectionName) => {
    const col = mongoose.connection.db.collection(collectionName);
    return col.find({}).toArray();
};

const mongoUsers    = await getAll("users");
const mongoHotels   = await getAll("hotels");
const mongoRooms    = await getAll("rooms");
const mongoBookings = await getAll("bookings");

console.log(`📦 Found: ${mongoUsers.length} users, ${mongoHotels.length} hotels, ${mongoRooms.length} rooms, ${mongoBookings.length} bookings`);

// ---------------------------------------------------------------------------
// 3. ID mapping tables
//    - Mongo User _id  = Clerk string  (e.g. "user_abc123") → new Postgres UUID
//    - Mongo Hotel _id = ObjectId       → new Postgres UUID
//    - Mongo Room  _id = ObjectId       → new Postgres UUID
// ---------------------------------------------------------------------------
const userClerkIdToUuid  = new Map(); // clerkId  → pg uuid
const hotelMongoIdToUuid = new Map(); // mongo hex → pg uuid
const roomMongoIdToUuid  = new Map(); // mongo hex → pg uuid

// ---------------------------------------------------------------------------
// 4. Migrate Users
//    Mongo User._id IS the Clerk ID string, so we preserve it as clerkId.
// ---------------------------------------------------------------------------
console.log("\n👤 Migrating users...");

for (const u of mongoUsers) {
    const clerkId = u._id.toString(); // already a string in this schema
    const pgId = randomUUID();
    userClerkIdToUuid.set(clerkId, pgId);

    await prisma.user.upsert({
        where:  { clerkId },
        update: {
            username:             (u.username || "").trim() || "Unknown",
            email:                u.email,
            image:                u.image || "",
            role:                 u.role  || "user",
            recentSearchedCities: u.recentSearchedCities || [],
            updatedAt:            u.updatedAt ? new Date(u.updatedAt) : new Date(),
        },
        create: {
            id:                   pgId,
            clerkId,
            username:             (u.username || "").trim() || "Unknown",
            email:                u.email,
            image:                u.image || "",
            role:                 u.role  || "user",
            recentSearchedCities: u.recentSearchedCities || [],
            createdAt:            u.createdAt ? new Date(u.createdAt) : new Date(),
            updatedAt:            u.updatedAt ? new Date(u.updatedAt) : new Date(),
        },
    });

    console.log(`  ✓ User ${clerkId}`);
}

// ---------------------------------------------------------------------------
// 5. Migrate Hotels
//    Hotel.owner is a Clerk user string — look up the Postgres UUID.
// ---------------------------------------------------------------------------
console.log("\n🏨 Migrating hotels...");

for (const h of mongoHotels) {
    const mongoHotelId = h._id.toString();
    const pgId         = randomUUID();
    hotelMongoIdToUuid.set(mongoHotelId, pgId);

    const ownerClerkId = h.owner ? h.owner.toString() : null;
    const ownerId      = ownerClerkId ? userClerkIdToUuid.get(ownerClerkId) : null;

    if (!ownerId) {
        console.warn(`  ⚠️  Hotel ${mongoHotelId}: owner ${ownerClerkId} not found in user map — skipping`);
        continue;
    }

    await prisma.hotel.upsert({
        where:  { id: pgId },
        update: { name: h.name, address: h.address, contact: h.contact, city: h.city },
        create: {
            id:        pgId,
            name:      h.name,
            address:   h.address,
            contact:   h.contact,
            city:      h.city,
            ownerId,
            createdAt: h.createdAt ? new Date(h.createdAt) : new Date(),
            updatedAt: h.updatedAt ? new Date(h.updatedAt) : new Date(),
        },
    });

    console.log(`  ✓ Hotel ${h.name} (${mongoHotelId})`);
}

// ---------------------------------------------------------------------------
// 6. Migrate Rooms
//    Room.hotel is an ObjectId → look up the Postgres hotel UUID.
// ---------------------------------------------------------------------------
console.log("\n🛏️  Migrating rooms...");

for (const r of mongoRooms) {
    const mongoRoomId  = r._id.toString();
    const mongoHotelId = r.hotel ? r.hotel.toString() : null;
    const hotelId      = mongoHotelId ? hotelMongoIdToUuid.get(mongoHotelId) : null;

    if (!hotelId) {
        console.warn(`  ⚠️  Room ${mongoRoomId}: hotel ${mongoHotelId} not found in hotel map — skipping`);
        continue;
    }

    const pgId = randomUUID();
    roomMongoIdToUuid.set(mongoRoomId, pgId);

    await prisma.room.upsert({
        where:  { id: pgId },
        update: {
            roomType:      r.roomType,
            pricePerNight: Number(r.pricePerNight),
            amenities:     Array.isArray(r.amenities) ? r.amenities : [],
            images:        Array.isArray(r.images)    ? r.images    : [],
            isAvailable:   r.isAvailable !== undefined ? r.isAvailable : true,
        },
        create: {
            id:            pgId,
            hotelId,
            roomType:      r.roomType,
            pricePerNight: Number(r.pricePerNight),
            amenities:     Array.isArray(r.amenities) ? r.amenities : [],
            images:        Array.isArray(r.images)    ? r.images    : [],
            isAvailable:   r.isAvailable !== undefined ? r.isAvailable : true,
            createdAt:     r.createdAt ? new Date(r.createdAt) : new Date(),
            updatedAt:     r.updatedAt ? new Date(r.updatedAt) : new Date(),
        },
    });

    console.log(`  ✓ Room ${r.roomType} (${mongoRoomId})`);
}

// ---------------------------------------------------------------------------
// 7. Migrate Bookings
//    Booking.user  = Clerk string  → pg user UUID
//    Booking.room  = ObjectId      → pg room UUID
//    Booking.hotel = ObjectId      → pg hotel UUID
// ---------------------------------------------------------------------------
console.log("\n📅 Migrating bookings...");

let skipped = 0;

for (const b of mongoBookings) {
    const mongoBookingId = b._id.toString();

    const userClerkId  = b.user  ? b.user.toString()  : null;
    const mongoRoomId  = b.room  ? b.room.toString()  : null;
    const mongoHotelId = b.hotel ? b.hotel.toString() : null;

    const userId  = userClerkId  ? userClerkIdToUuid.get(userClerkId)   : null;
    const roomId  = mongoRoomId  ? roomMongoIdToUuid.get(mongoRoomId)   : null;
    const hotelId = mongoHotelId ? hotelMongoIdToUuid.get(mongoHotelId) : null;

    if (!userId || !roomId || !hotelId) {
        console.warn(`  ⚠️  Booking ${mongoBookingId}: missing FK mapping (user:${userId}, room:${roomId}, hotel:${hotelId}) — skipping`);
        skipped++;
        continue;
    }

    const pgId = randomUUID();

    // Use createMany-safe pattern: check for duplicates via a known unique combination
    // (same userId + roomId + checkInDate) to avoid re-inserting on re-run.
    const existing = await prisma.booking.findFirst({
        where: {
            userId,
            roomId,
            checkInDate: new Date(b.checkInDate),
        },
    });

    if (existing) {
        console.log(`  ⏭️  Booking ${mongoBookingId} already migrated — skipping`);
        continue;
    }

    const validStatuses = ["pending", "confirmed", "cancelled"];
    const status = validStatuses.includes(b.status) ? b.status : "pending";

    await prisma.booking.create({
        data: {
            id:            pgId,
            userId,
            roomId,
            hotelId,
            checkInDate:   new Date(b.checkInDate),
            checkOutDate:  new Date(b.checkOutDate),
            totalPrice:    Number(b.totalPrice),
            guests:        Number(b.guests) || 1,
            status,
            paymentMethod: b.paymentMethod || "Pay At Hotel",
            isPaid:        b.isPaid || false,
            createdAt:     b.createdAt ? new Date(b.createdAt) : new Date(),
            updatedAt:     b.updatedAt ? new Date(b.updatedAt) : new Date(),
        },
    });

    console.log(`  ✓ Booking ${mongoBookingId} → ${pgId}`);
}

// ---------------------------------------------------------------------------
// 8. Summary
// ---------------------------------------------------------------------------
console.log("\n🎉 Migration complete!");
console.log(`   Users:    ${mongoUsers.length}`);
console.log(`   Hotels:   ${mongoHotels.length}`);
console.log(`   Rooms:    ${mongoRooms.length}`);
console.log(`   Bookings: ${mongoBookings.length - skipped} migrated, ${skipped} skipped`);

await prisma.$disconnect();
await mongoose.disconnect();
