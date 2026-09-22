# StayHub — Database Schema

> **Module 2 of 6** · Load for any task involving DB queries, schema changes, or migrations.

---

## Enums

```
UserRole:       user | admin | hotelOwner
PaymentMethod:  STRIPE                        ← PAY_AT_HOTEL removed
BookingStatus:  pending | payment_pending | confirmed | cancelled | refunded
```

---

## Model: User

| Field | Type | Notes |
|---|---|---|
| `id` | String (UUID) | PK, auto-generated |
| `username` | String | Display name |
| `email` | String (unique) | Login identifier |
| `image` | String | Profile picture URL (default `""`) |
| `role` | UserRole | Default `user`; becomes `hotelOwner` after hotel registration |
| `passwordHash` | String | bcrypt hash |
| `isVerified` | Boolean | `false` until OTP confirmed |
| `otp` | String? | bcrypt hash of 6-digit OTP |
| `otpExpiry` | DateTime? | OTP expiry (10 min) |
| `recentSearchedCities` | String[] | FIFO, max 3, managed in app logic |
| `firstName` | String? | Optional; collected before booking |
| `lastName` | String? | Optional |
| `phone` | String? | Optional |
| `createdAt` / `updatedAt` | DateTime | Auto timestamps |
| **Relations** | `hotels Hotel[]` | One user → one hotel (enforced in app logic) |
| | `bookings Booking[]` | All bookings by this user |

---

## Model: Hotel

| Field | Type | Notes |
|---|---|---|
| `id` | String (UUID) | PK |
| `name` | String | Hotel name |
| `address` | String | Full address |
| `contact` | String | Phone / contact info |
| `city` | String | Used for search filtering (`@@index([city])`) |
| `ownerId` | String | FK → User.id; `@@unique` (one hotel per owner) |
| **Relations** | `owner User` | Owning user |
| | `roomTypes RoomType[]` | All room types under this hotel |
| | `bookings Booking[]` | All bookings for this hotel |

> ⚠️ The old `rooms Room[]` relation and the physical `Room` model have been **removed** from the schema. Only `RoomType` and `RoomTypeInventory` remain.

---

## Model: RoomType (Marketing Data)

| Field | Type | Notes |
|---|---|---|
| `id` | String (UUID) | PK |
| `hotelId` | String | FK → Hotel.id |
| `name` | String | e.g. `Single Bed`, `Luxury Suite` |
| `pricePerNight` | Decimal (10,2) | Nightly rate per room |
| `amenities` | String[] | e.g. `["Free WiFi", "Pool Access"]` |
| `images` | String[] | Cloudinary secure URLs (max 4) |
| `maxGuests` | Int | Max guests **per room** (default 2) |
| `isAvailable` | Boolean | Owner toggle; hides type from listings |
| `createdAt` / `updatedAt` | DateTime | |
| **Relations** | `inventory RoomTypeInventory[]` | Daily availability rows |
| | `bookings Booking[]` | Bookings for this type |

---

## Model: RoomTypeInventory (Daily Availability)

This is the core of the inventory architecture — one row per `(roomTypeId, date)`.

| Field | Type | Notes |
|---|---|---|
| `id` | String (UUID) | PK |
| `date` | DateTime (`@db.Date`) | The calendar date this row covers |
| `roomTypeId` | String | FK → RoomType.id (cascade delete) |
| `totalRooms` | Int | How many physical units exist for this type |
| `bookedRooms` | Int | How many are consumed (booked + blocked). Default 0 |

**Unique constraint:** `@@unique([date, roomTypeId])` — one row per date per type.

**Available rooms for a date:** `totalRooms - bookedRooms`

### How inventory is written
- **On room creation** (`createRoom`): 365 rows bulk-inserted for the upcoming year.
- **Cron job** (`server.js`): runs daily at midnight, inserts the row for exactly 1 year out (rolling window).
- **On booking** (`createBooking`): atomic `updateMany` increments `bookedRooms` by `numberOfRooms` for every date in `[checkIn, checkOut)`.
- **On date blocking** (`blockRoomDates`): raw SQL `UPDATE … SET bookedRooms = LEAST(totalRooms, bookedRooms + N)` for the given range.

---

## Model: Booking

| Field | Type | Notes |
|---|---|---|
| `id` | String (UUID) | PK |
| `userId` | String | FK → User.id |
| `roomTypeId` | String | FK → RoomType.id |
| `hotelId` | String | FK → Hotel.id (denormalized for query efficiency) |
| `checkInDate` | DateTime | Check-in date |
| `checkOutDate` | DateTime | Check-out date |
| `totalPrice` | Decimal (10,2) | `pricePerNight × nights × numberOfRooms` |
| `guests` | Int | Total guests across all booked rooms |
| `numberOfRooms` | Int | How many rooms booked (default 1) ← **new field** |
| `status` | BookingStatus | Default `pending` |
| `paymentMethod` | PaymentMethod | Default `STRIPE` |
| `isPaid` | Boolean | Set to `true` by Stripe webhook |
| `stripeSessionId` | String? | Stripe checkout session ID |
| `stripePaymentIntent` | String? | Stripe payment intent ID |
| `expiresAt` | DateTime? | Payment hold expiry |
| `createdAt` / `updatedAt` | DateTime | |

> ⚠️ There is **no** `roomId` / `room Room` relation — physical rooms are gone.

---

## Entity Relationships

```
User ──(ownerId)──> Hotel ──(hotelId)──> RoomType ──> RoomTypeInventory
 |                   |                       |               (date rows)
 |                   |                       |
 └──(userId)──> Booking <──(roomTypeId)──────┘
                (hotelId)──────────────────────> Hotel
```

---

## Concurrency Strategy

Bookings are protected by **atomic inventory updates**, not row-level locks:

```sql
-- Inside createBooking (via Prisma updateMany):
UPDATE "RoomTypeInventory"
SET "bookedRooms" = "bookedRooms" + :numberOfRooms
WHERE "roomTypeId" = :roomTypeId
  AND date >= :checkIn
  AND date <  :checkOut
  AND ("totalRooms" - "bookedRooms") >= :numberOfRooms
```

If `updatedCount !== numberOfNights`, availability was lost mid-transaction → throw `RoomUnavailableError`.

> The old `SELECT ... FOR UPDATE` row-level lock and `EXCLUDE USING gist` constraint are **gone**.

---

## Migrations

```bash
# From server/ directory:
npx prisma migrate dev --name <migration-name>

# After pulling schema changes:
npx prisma generate

# One-time data migration (PAY_AT_HOTEL → STRIPE):
node scripts/migrate-payment-method.js
```
