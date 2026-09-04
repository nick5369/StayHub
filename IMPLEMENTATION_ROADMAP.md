# StayHub Inventory Architecture Upgrade Plan

This document outlines the sequential implementation plan to migrate the StayHub platform from a physical unit-based booking system to an industry-standard time-series inventory architecture.

## Phase 1: Database Schema Overhaul

The foundation of this upgrade requires removing the physical `Room` table and replacing it with a daily inventory tracker.

- **Remove Physical Room Model:** Delete the `Room` model from `server/prisma/schema.prisma`.

- **Create Inventory Model:** Add a new `RoomTypeInventory` model to `schema.prisma`. This table must include:
  - `date` (`DateTime`)
  - `roomTypeId` (`String`, FK to `RoomType`)
  - `totalRooms` (`Int`)
  - `bookedRooms` (`Int`, default `0`)

- **Update Booking Model:** Remove the `roomId` field and its relation to the `Room` table from the `Booking` model. Bookings will now strictly relate to the `roomTypeId`.

- **Remove Constraints:** Remove any documented plans or existing implementations of the PostgreSQL `EXCLUDE USING gist` constraint on the `Booking` table, as overlapping date logic will no longer be used.

- **Database Migration:** Run `npx prisma migrate dev` to apply the schema changes and clear out legacy physical room data.

## Phase 2: Inventory Generation & Management (Controllers)

With the schema updated, the logic for creating and querying rooms must shift from managing physical units to managing daily availability.

- **Update Room Creation (`createRoom`):** Modify `server/controllers/roomController.js`. When a hotel owner submits the `Addroom` form with a specified `quantity`, instead of looping to create individual `Room` records, run a Prisma bulk insert to generate **365 rows** in `RoomTypeInventory` for the upcoming year. Set `totalRooms` equal to the requested `quantity`.

- **Implement Rolling Inventory Cron Job:** Create a new background script in `server/scripts/` (e.g., using `node-cron`). This script must run daily at midnight to generate the `RoomTypeInventory` row for the date exactly one year in the future, ensuring the hotel is always bookable 365 days out.

- **Update Room Queries:** Modify `getRooms` and `getOwnerRooms` in `roomController.js`. These endpoints must now query `RoomTypeInventory` to determine how many units are available for the current date, rather than counting active physical `Room` records.

## Phase 3: Booking Engine Transformation

The concurrency strategy inside the booking engine must be completely rewritten to utilize atomic updates instead of row-level locking.

- **Rewrite Availability Checks (`checkAvailability`):** Modify the helper function in `server/controllers/bookingController.js`.
  - Delete the logic that searches for active physical rooms.
  - Remove the date-overlap calculation (`existingCheckIn <= newCheckOut...`).
  - Replace it with a single query verifying that `(totalRooms - bookedRooms) > 0` for every day between `checkInDate` and `checkOutDate` in the `RoomTypeInventory` table.

- **Rewrite Booking Creation (`createBooking`):**
  - Remove the logic that finds a free physical room.
  - Remove the `SELECT ... FOR UPDATE` raw SQL lock and the subsequent overlap re-check.
  - Implement an atomic update using Prisma `updateMany` on `RoomTypeInventory` to increment `bookedRooms` by `1` for the requested date range.
  - The update must strictly use a `WHERE (totalRooms - bookedRooms) > 0` condition.
  - If the updated row count matches the number of requested nights, create the `Booking` record.
  - If the update fails, throw the `RoomUnavailableError`.

- **Update Booking Retrieval:** Modify `getUserBookings` and `getHotelBookings`. Remove the nested select for `room.roomNumber`, as this internal unit reference no longer exists.

## Phase 4: Frontend Alignment

The React client requires minor adjustments to align with the new data structures, primarily removing physical room references.

- **Update Add Room UI:** In `client/src/pages/HotelOwner/Addroom.jsx`, update the UI tooltip or label for the `quantity` input to clarify that the owner is setting **"Daily Available Inventory"** rather than physical door numbers.

- **Update List Room UI:** In `client/src/pages/HotelOwner/ListRoom.jsx`, update the data table to display the base `totalRooms` inventory count instead of mapping over physical unit arrays.

- **Clean Up Dashboards:** In:
  - `client/src/pages/HotelOwner/Dashboard.jsx`
  - `client/src/pages/MyBookings.jsx`

  Ensure no table columns or cards attempt to render `room.roomNumber`.