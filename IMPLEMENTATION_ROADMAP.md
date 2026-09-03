# StayHub Implementation Roadmap

This document outlines the structured sequence for executing the Future Improvements and Architectural Roadmap. The improvements have been grouped into logical phases to minimize breaking changes, reduce database migration overhead, and ensure dependent features are built on a solid foundation.

---

## Phase 1: Foundational Schema & Payments Reliability
**Goal:** Solidify the `Booking` model, enforce strict data types, and ensure financial traceability before tackling complex logic changes.
**Tasks to execute together:**
- **5. Enforce Strict Payment Types** (Convert `paymentMethod` to an Enum)
- **6. Expand the Booking State Machine** (Add `payment_pending`, `refunded`, etc., to `BookingStatus`)
- **4. Ensure Financial Traceability for Refunds** (Add `stripeSessionId` and `stripePaymentIntent` fields)

**Why together?** 
All three tasks require straightforward, non-breaking additions/modifications to the Prisma `Booking` model. Grouping them allows you to deploy a single database migration. Expanding the state machine (Task 6) is also a prerequisite for optimizing the database locks later.

---

## Phase 2: Booking Flow & Concurrency Optimization
**Goal:** Fix the "Ghost Booking" issue and optimize the database to handle high traffic without relying on slow application-level locks.
**Tasks to execute together:**
- **3. Prevent the "Ghost Booking" Trap** (Add `expiresAt` to pending bookings and update `checkAvailability` logic)
- **7. Optimize Database Race Condition Shields** (Update PostgreSQL `btree_gist` constraint to ignore expired or cancelled bookings using a `WHERE` clause)

**Why together?**
Task 7 directly depends on Task 3 and Task 6. The optimized PostgreSQL constraint needs to explicitly ignore bookings that have expired (Task 3) or are in specific statuses like `cancelled` or `refunded` (Task 6). By doing these together, you safely transition from application-level `SELECT ... FOR UPDATE` locks to highly efficient DB-level constraints.

---

## Phase 3: Core Inventory Redesign & Auditing
**Goal:** Separate marketing data from physical inventory to support real hotel operations, and enforce legal guest auditing.
**Tasks to execute together:**
- **1. Implement an Inventory Architecture (Room vs. RoomType)** (Split models, update frontend forms, redefine relationships)
- **8. Add Essential Guest Auditing** (Add `User.firstName`, `User.lastName`, `User.phone`, and `RoomType.maxGuests`)

**Why together?**
Task 1 is the largest architectural refactor in the roadmap. It will break the frontend room listing, the booking logic, and the dashboard. Task 8 relies heavily on the new `RoomType` model (specifically the `maxGuests` capacity field). Implementing guest validation simultaneously with the `RoomType` rollout saves you from having to rewrite the booking validation logic twice.

---

## Phase 4: Multi-Property Scaling
**Goal:** Enable property management companies and hotel chains to manage multiple branches under a single account.
**Tasks to execute together:**
- **2. Remove the 1:1 Hotel Ownership Limit** (Remove `@@unique([ownerId])`)

**Why together (and why last)?**
While the database change is trivial (deleting one line), the frontend implications are massive. You will need to build context switchers in the Owner Dashboard, aggregate revenue across multiple hotels, and update API routes to accept a specific `hotelId`. Doing this last ensures that the complex multi-property dashboard is built on top of the fully matured, robust inventory system finalized in Phase 3.
