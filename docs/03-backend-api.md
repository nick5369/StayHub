# StayHub — Backend API Reference

> **Module 3 of 6** · Load for adding/modifying routes or controllers.

---

## Route Summary

### Auth Routes — `POST /api/auth`

| Method | Path | Handler | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | `register` | No |
| POST | `/api/auth/verify-otp` | `verifyOtp` | No |
| POST | `/api/auth/login` | `login` | No |
| POST | `/api/auth/logout` | `logout` | No |
| POST | `/api/auth/resend-otp` | `resendOtp` | No |

### User Routes — `/api/user`

| Method | Path | Handler | Auth |
|---|---|---|---|
| GET | `/api/user` | `getUserData` | Yes |
| POST | `/api/user/recent-searched-cities` | `storeRecentSearchedCities` | Yes |

### Hotel Routes — `/api/hotels`

| Method | Path | Handler | Auth |
|---|---|---|---|
| POST | `/api/hotels` | `registerHotel` | Yes |

### Room Routes — `/api/rooms`

| Method | Path | Handler | Auth | Extra |
|---|---|---|---|---|
| POST | `/api/rooms` | `createRoom` | Yes | `upload.array('images', 4)` |
| GET | `/api/rooms` | `getRooms` | No | — |
| GET | `/api/rooms/owner` | `getOwnerRooms` | Yes | — |
| POST | `/api/rooms/toggle-availability` | `toggleRoomAvailability` | Yes | — |
| POST | `/api/rooms/block-dates` | `blockRoomDates` | Yes | — |

### Booking Routes — `/api/bookings`

| Method | Path | Handler | Auth |
|---|---|---|---|
| POST | `/api/bookings/check-availability` | `checkAvailabilityApi` | No |
| POST | `/api/bookings/book` | `createBooking` | Yes |
| GET | `/api/bookings/user` | `getUserBookings` | Yes |
| GET | `/api/bookings/hotel` | `getHotelBookings` | Yes |
| POST | `/api/bookings/stripe-payment` | `stripePayment` | Yes |
| POST | `/api/bookings/:bookingId/confirm` | `confirmBooking` | Yes |
| POST | `/api/bookings/:bookingId/cancel` | `cancelBooking` | Yes |

### Stripe Webhook — `/api/stripe`

| Method | Path | Notes |
|---|---|---|
| POST | `/api/stripe` | Raw body required; mounted before `express.json()` |

---

## Controller: `authController.js`

### Constants / Helpers

| Helper | Description |
|---|---|
| `SALT_ROUNDS = 10` | bcrypt cost factor |
| `OTP_TTL_MS = 600000` | OTP valid 10 minutes |
| `JWT_MAX_AGE_S = 604800` | JWT valid 7 days |
| `generateOtp()` | Random 6-digit string (100000–999999) |
| `setTokenCookie(res, userId)` | Signs JWT, sets HttpOnly cookie |
| `sendOtpEmail(email, otp)` | HTML OTP email via Nodemailer |

### `register` — POST /api/auth/register
**Body:** `{ name, email, password }`
1. Validates presence; password ≥ 6 chars.
2. Existing + verified → 409. Existing + unverified → update record (re-registration). Not found → create.
3. Hash password + OTP; set `otpExpiry = now + 10 min`; send OTP email.

### `verifyOtp` — POST /api/auth/verify-otp
**Body:** `{ email, otp }`
1. Find user, check `otpExpiry > now`.
2. `bcrypt.compare(otp, user.otp)`.
3. Set `isVerified: true`, clear OTP fields, set JWT cookie, return profile.

### `login` — POST /api/auth/login
**Body:** `{ email, password }`
1. `bcrypt.compare` against `passwordHash`.
2. Unverified → fresh OTP + 403 `{ needsOtp: true }`.
3. Verified → JWT cookie + return profile.

### `logout` — POST /api/auth/logout
- Clears `token` cookie with matching flags.

### `resendOtp` — POST /api/auth/resend-otp
**Body:** `{ email }`
- Already verified → 400. Otherwise generate new OTP, update DB, resend email.

---

## Controller: `userController.js`

### `getUserData` — GET /api/user
- Returns `{ id, username, email, image, role, recentSearchedCities }` from `req.user`.

### `storeRecentSearchedCities` — POST /api/user/recent-searched-cities
**Body:** `{ recentSearchedCity }`
- FIFO array, max 3. Push new; if length ≥ 3, shift first then push.

---

## Controller: `hotelController.js`

### `registerHotel` — POST /api/hotels
**Body:** `{ name, address, contact, city }`
1. Check `prisma.hotel.findFirst({ where: { ownerId: req.user.id } })` → 400 if exists.
2. Create Hotel record.
3. **Promotes user:** `prisma.user.update({ data: { role: 'hotelOwner' } })`.

---

## Controller: `roomController.js`

### `createRoom` — POST /api/rooms (multipart/form-data)
**Fields:** `name`, `pricePerNight`, `amenities` (JSON string), `maxGuests`, `quantity`, `images` (≤4 files)
1. Find owner's hotel.
2. Upload each file to Cloudinary; collect `secure_url[]`.
3. Normalize amenities (JSON string | array | object → string[]).
4. **In a transaction:**
   - Create `RoomType` record.
   - Bulk-insert `quantity × 365` rows into `RoomTypeInventory` for the upcoming year.

### `getRooms` — GET /api/rooms
- Queries `RoomType` where `isAvailable: true`.
- For each type, looks up today's `RoomTypeInventory` row; computes `availableCount = totalRooms - bookedRooms`.
- Filters out types with `availableCount ≤ 0`.
- Returns normalized array (each item shaped like a `room` for the frontend).

### `getOwnerRooms` — GET /api/rooms/owner
- Finds owner's hotel; returns all `RoomType`s with today's inventory row.
- Normalizes: exposes `totalRooms` from `inventory[0]` instead of a physical rooms array.

### `toggleRoomAvailability` — POST /api/rooms/toggle-availability
**Body:** `{ roomId }` ← `roomId` is actually `RoomType.id` (legacy key name kept for frontend compat)
- Flips `isAvailable` on the `RoomType`.

### `blockRoomDates` — POST /api/rooms/block-dates ← **new endpoint**
**Body:** `{ roomTypeId, startDate, endDate, unavailableRooms }`
- Owner-only; verifies room type belongs to authenticated owner's hotel.
- Validates `unavailableRooms ≤ totalRooms`.
- Raw SQL update:
  ```sql
  UPDATE "RoomTypeInventory"
  SET "bookedRooms" = LEAST("totalRooms", "bookedRooms" + :n)
  WHERE "roomTypeId" = :id AND date >= :start AND date < :end
  ```
- Returns `{ updatedNights }` count.

---

## Controller: `bookingController.js`

### `checkAvailability` (internal helper)
**Params:** `{ roomTypeId, checkInDate, checkOutDate, numberOfRooms = 1 }`
- Queries `RoomTypeInventory` for every date in `[checkIn, checkOut)`.
- Returns `true` only if **all** dates have `(totalRooms - bookedRooms) >= numberOfRooms`.

### `checkAvailabilityApi` — POST /api/bookings/check-availability
**Body:** `{ roomTypeId, checkInDate, checkOutDate, numberOfRooms? }`
- Wraps helper; returns `{ success: true, isAvailable: boolean }`.

### `createBooking` — POST /api/bookings/book
**Body:** `{ roomTypeId, checkInDate, checkOutDate, guests, numberOfRooms? }`
1. Cancel expired `payment_pending` bookings (lazy cleanup).
2. Load `RoomType`; validate `guests <= maxGuests * numberOfRooms`.
3. Atomic inventory update:
   ```js
   prisma.roomTypeInventory.updateMany({
     where: { roomTypeId, date: { gte: checkIn, lt: checkOut },
               bookedRooms: { lte: { totalRooms - numberOfRooms } } },
     data: { bookedRooms: { increment: numberOfRooms } }
   })
   ```
4. If `updatedCount !== numberOfNights` → throw `RoomUnavailableError`.
5. Create `Booking` with `status: 'payment_pending'`, `expiresAt: now + 15min`.
6. Send confirmation email (outside transaction).

### `getUserBookings` — GET /api/bookings/user
- Returns bookings for `req.user.id` newest first.
- Includes `roomType` and `hotel`. Exposes `numberOfRooms` in response.
- No `room.roomNumber` — physical rooms are gone.

### `getHotelBookings` — GET /api/bookings/hotel
- Owner's hotel bookings with nested `roomType`, `hotel`, `user` data.
- Computes `totalBookings` (count) and `totalRevenue` (sum of `totalPrice`).

### `stripePayment` — POST /api/bookings/stripe-payment
**Body:** `{ bookingId }`
1. Find booking.
2. Create Stripe Checkout Session (`metadata.bookingId`).
3. Set `status: 'payment_pending'`, extend `expiresAt` +15 min.
4. Return `{ url }` for redirect.

### `confirmBooking` — POST /api/bookings/:bookingId/confirm
- Owner-only: sets `status: 'confirmed'`.

### `cancelBooking` — POST /api/bookings/:bookingId/cancel
- Owner or guest: sets `status: 'cancelled'`.

---

## Controller: `stripeWebhooks.js`

### `stripeWebhooks` — POST /api/stripe
1. Verify signature with `STRIPE_WEBHOOK_SECRET`.
2. On `checkout.session.completed`:
   - Extract `bookingId` from `session.metadata`.
   - Idempotency check (skip if `isPaid && status === 'confirmed'`).
   - Update Booking: `isPaid: true`, `paymentMethod: 'STRIPE'`, `status: 'confirmed'`.
3. Other event types: log and ignore.
