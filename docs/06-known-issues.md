# StayHub — Known Issues & TODOs

> **Module 6 of 6** · Load when fixing bugs or doing cleanup tasks.

---

## Active TODOs

- All active TODOs have been resolved.


---

## Uncommitted Work (in progress)

The following changes are staged but not yet committed. They form the **multi-room booking** feature:

| File | Change |
|---|---|
| `server/prisma/schema.prisma` | Added `numberOfRooms Int @default(1)` to `Booking`; removed `PAY_AT_HOTEL` from `PaymentMethod` enum |
| `server/controllers/roomController.js` | `getRooms` returns `availableCount`; new `blockRoomDates` controller |
| `server/controllers/bookingController.js` | Handles `numberOfRooms` in availability check and booking creation |
| `server/routes/roomRoutes.js` | New route `POST /api/rooms/block-dates` |
| `client/src/pages/RoomDetails.jsx` | "Number of Rooms" input, `isBooking` state, `resetAvailability()`, per-room capacity hint |
| `client/src/pages/MyBookings.jsx` | Shows `Rooms: {numberOfRooms}` in booking card |
| `client/src/pages/HotelOwner/ListRoom.jsx` | Shows `totalRooms` from inventory instead of physical unit count |
| `server/scripts/migrate-payment-method.js` | **(Untracked)** One-time script: converts all `PAY_AT_HOTEL` bookings to `STRIPE` |

**Before committing, run:**
```bash
# 1. Run the data migration
node server/scripts/migrate-payment-method.js

# 2. Apply the schema change
cd server && npx prisma migrate dev --name add-number-of-rooms-remove-pay-at-hotel
```

---

## Removed / Deprecated

| Item | Status | Replaced by |
|---|---|---|
| `Room` model (physical units) | **Removed from schema** | `RoomTypeInventory` (daily rows) |
| `roomId` / `room Room` on `Booking` | **Removed** | `roomTypeId` only |
| `SELECT ... FOR UPDATE` row lock in `createBooking` | **Removed** | Atomic `updateMany` on inventory |
| `EXCLUDE USING gist` constraint | **Removed** (was documented, never fully implemented) | Inventory count check |
| `PAY_AT_HOTEL` payment method | **Removed from enum** | `STRIPE` only |
| `Clerk` auth | **Never used** (env keys may still exist) | Self-hosted JWT + OTP |

---

## Code Smells / Notes

- `HotelCard.jsx` navigates to `/rooms/${room._id}` — uses `_id` (MongoDB style) but the DB uses `id` (UUID). Verify this doesn't break navigation.
- `Addroom.jsx` sends `amenities` as a JSON-stringified **object** (`{ "Free WiFi": true, ... }`); `roomController.js` normalizes this. Keep both in sync if adding new amenities.
- `RoomDetails.jsx` still has some inline `hotelDummyData` and `userDummyData` references in the host section — check if these are still present after the latest uncommitted changes.
- `openFilters` state in `AllRooms.jsx` is declared but appears unused in the render.
