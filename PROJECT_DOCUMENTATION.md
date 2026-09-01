# StayHub — Complete Project Documentation

> **Generated:** 2026-08-31  
> **Project type:** Full-stack Hotel Booking Web App  
> **Repo root:** `e:/StayHub/`

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Environment Variables](#4-environment-variables)
5. [Database Schema (Prisma / PostgreSQL)](#5-database-schema-prisma--postgresql)
6. [Backend — Server Entry Point](#6-backend--server-entry-point)
7. [Backend — Configs](#7-backend--configs)
8. [Backend — Middlewares](#8-backend--middlewares)
9. [Backend — Routes](#9-backend--routes)
10. [Backend — Controllers](#10-backend--controllers)
11. [Authentication Flow](#11-authentication-flow)
12. [Stripe Payment Flow](#12-stripe-payment-flow)
13. [Frontend — Overview and Dependencies](#13-frontend--overview-and-dependencies)
14. [Frontend — Context API (appContext)](#14-frontend--context-api-appcontext)
15. [Frontend — Routes (App.jsx)](#15-frontend--routes-appjsx)
16. [Frontend — Pages](#16-frontend--pages)
17. [Frontend — Components](#17-frontend--components)
18. [Static vs Dynamic Fields Summary](#18-static-vs-dynamic-fields-summary)
19. [Known Issues / TODOs](#19-known-issues--todos)

---

## 1. Project Overview

**StayHub** is a full-stack hotel booking platform with two distinct user roles:

| Role | Capabilities |
|---|---|
| **User** | Browse and search rooms, view room details, check availability, make bookings, pay via Stripe or "Pay at Hotel", view booking history |
| **Hotel Owner** | Register a hotel, add rooms (with images uploaded to Cloudinary), manage room availability, view booking dashboard with revenue stats |

The system uses **self-hosted JWT authentication** with **email OTP verification** (no third-party auth like Clerk — though env example still shows old Clerk keys).

---

## 2. Technology Stack

### Backend (server/)

| Category | Technology |
|---|---|
| Runtime | Node.js (ES Modules) |
| Framework | Express.js v5 |
| ORM | Prisma v6 |
| Database | PostgreSQL |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Cookie management | cookie-parser |
| File uploads | Multer (disk storage) |
| Image hosting | Cloudinary v2 |
| Email | Nodemailer via Brevo SMTP |
| Payments | Stripe v20 |
| CORS | cors |
| Dev tool | Nodemon |
| Deployment | aws ec2 |

### Frontend (client/)

| Category | Technology |
|---|---|
| Framework | React 19 + Vite 7 |
| Routing | React Router DOM v7 |
| Styling | TailwindCSS v4 |
| HTTP client | Axios (withCredentials: true) |
| Notifications | react-hot-toast |
| Icons | react-icons, lucide-react |
| State | React Context API (single global context) |
| Deployment | aws ec2 |

---

## 3. Project Structure

```
StayHub/
├── client/                         # React frontend
│   ├── public/
│   ├── src/
│   │   ├── assets/                 # Images, icons, dummy data
│   │   ├── components/
│   │   │   ├── AllRooms/
│   │   │   │   ├── DetailRoomInfo.jsx
│   │   │   │   └── Filters.jsx
│   │   │   ├── HotelOwner/
│   │   │   │   ├── NavBar.jsx
│   │   │   │   └── SideBar.jsx
│   │   │   ├── FeaturedDestination.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── Hero.jsx
│   │   │   ├── HotelCard.jsx
│   │   │   ├── HotelReg.jsx
│   │   │   ├── Loader.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── RecommendedHotels.jsx
│   │   │   └── Title.jsx
│   │   ├── context/
│   │   │   └── appContext.jsx       # Global state
│   │   ├── pages/
│   │   │   ├── HotelOwner/
│   │   │   │   ├── Addroom.jsx
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── Layout.jsx
│   │   │   │   └── ListRoom.jsx
│   │   │   ├── AllRooms.jsx
│   │   │   ├── Auth.jsx
│   │   │   ├── Home.jsx
│   │   │   ├── MyBookings.jsx
│   │   │   └── RoomDetails.jsx
│   │   ├── App.jsx                  # Router definition
│   │   ├── main.jsx                 # Entry point
│   │   └── index.css
│   ├── index.html
│   └── package.json
│
└── server/                         # Express backend
    ├── configs/
    │   ├── cloudinary.js            # Cloudinary setup
    │   ├── db.js                    # Prisma client singleton
    │   └── nodemailer.js            # SMTP transporter
    ├── controllers/
    │   ├── authController.js        # Register, login, OTP, logout
    │   ├── bookingController.js     # Bookings + Stripe session
    │   ├── hotelController.js       # Hotel registration
    │   ├── roomController.js        # Room CRUD + availability toggle
    │   ├── stripeWebhooks.js        # Stripe webhook handler
    │   └── userController.js        # Profile + recent cities
    ├── middlewares/
    │   ├── authMiddleware.js        # JWT cookie verify -> req.user
    │   └── uploadMiddleware.js      # Multer config
    ├── prisma/
    │   ├── schema.prisma            # DB schema
    │   └── migrations/
    ├── routes/
    │   ├── authRoutes.js
    │   ├── bookingRoutes.js
    │   ├── hotelRoutes.js
    │   ├── roomRoutes.js
    │   └── userRoutes.js
    ├── scripts/
    ├── server.js                    # App entry point
    ├── .env / .env.example
    ├── package.json
    └── vercel.json
```

---

## 4. Environment Variables

### Server (server/.env)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for signing JWTs |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `SENDER_EMAIL` | Email address shown as sender |
| `SMTP_USER` | Brevo SMTP username |
| `SMTP_PASS` | Brevo SMTP password |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PUBLISHABLE_KEY` | (reference only, not used server-side) |
| `CLIENT_URL` | Frontend URL for CORS (default: http://localhost:5173) |
| `PORT` | Server port (default: 5000) |
| `NODE_ENV` | development or production (affects cookie security flags) |
| `CLERK_*` | Legacy keys — no longer used in current codebase |

### Client (client/.env)

| Variable | Description |
|---|---|
| `VITE_BACKEND_URL` | Backend API base URL (e.g. http://localhost:5000) |
| `VITE_CURRENCY` | Currency symbol displayed in UI (e.g. $) |

---

## 5. Database Schema (Prisma / PostgreSQL)

**File:** `server/prisma/schema.prisma`

### Enums

```
UserRole:
  user        -- default; regular guest
  admin       -- reserved, no admin routes yet
  hotelOwner  -- promoted after hotel registration

BookingStatus:
  pending     -- default
  confirmed
  cancelled
```

### Model: User

| Field | Type | Notes |
|---|---|---|
| `id` | String (UUID) | Primary key, auto-generated |
| `username` | String | Display name |
| `email` | String (unique) | Login identifier |
| `image` | String | Profile picture URL (default "") |
| `role` | UserRole | Default: user; becomes hotelOwner after hotel registration |
| `passwordHash` | String | bcrypt hash of password |
| `isVerified` | Boolean | false until OTP verified |
| `otp` | String? | bcrypt hash of 6-digit OTP (nullable) |
| `otpExpiry` | DateTime? | OTP expiry (10 min from send) |
| `recentSearchedCities` | String[] | Last 3 searched cities (FIFO, max 3) |
| `createdAt` | DateTime | Auto-set |
| `updatedAt` | DateTime | Auto-updated |
| **Relations** | `hotels Hotel[]` | One user can own one hotel (enforced in app logic) |
| | `bookings Booking[]` | All bookings made by this user |

### Model: Hotel

| Field | Type | Notes |
|---|---|---|
| `id` | String (UUID) | Primary key |
| `name` | String | Hotel name |
| `address` | String | Full address |
| `contact` | String | Phone/contact info |
| `city` | String | City (used for search filtering) |
| `ownerId` | String | FK -> User.id |
| `createdAt` / `updatedAt` | DateTime | Timestamps |
| **Relations** | `owner User` | The owning user |
| | `rooms Room[]` | All rooms under this hotel |
| | `bookings Booking[]` | All bookings for this hotel |

### Model: Room

| Field | Type | Notes |
|---|---|---|
| `id` | String (UUID) | Primary key |
| `hotelId` | String | FK -> Hotel.id |
| `roomType` | String | e.g. Single Bed, Double Bed, Luxury Room, Family Suite |
| `pricePerNight` | Float | Nightly rate in USD |
| `amenities` | String[] | Array of amenity strings (e.g. ["Free WiFi", "Pool Access"]) |
| `images` | String[] | Array of Cloudinary secure URLs (max 4) |
| `isAvailable` | Boolean | Default true; toggled by hotel owner |
| `createdAt` / `updatedAt` | DateTime | Timestamps |
| **Relations** | `hotel Hotel` | Parent hotel |
| | `bookings Booking[]` | All bookings for this room |

### Model: Booking

| Field | Type | Notes |
|---|---|---|
| `id` | String (UUID) | Primary key |
| `userId` | String | FK -> User.id |
| `roomId` | String | FK -> Room.id |
| `hotelId` | String | FK -> Hotel.id (denormalized for query efficiency) |
| `checkInDate` | DateTime | Check-in date |
| `checkOutDate` | DateTime | Check-out date |
| `totalPrice` | Float | pricePerNight x numberOfNights |
| `guests` | Int | Number of guests |
| `status` | BookingStatus | Default: pending |
| `paymentMethod` | String | Default: "Pay At Hotel"; becomes "Stripe" after webhook |
| `isPaid` | Boolean | Default false; set to true by Stripe webhook |
| `createdAt` / `updatedAt` | DateTime | Timestamps |
| **Relations** | `user User` | Guest who booked |
| | `room Room` | The booked room |
| | `hotel Hotel` | The hotel |

### Entity Relationships

```
User ─────────── Hotel ──────────── Room
  |  (ownerId)        |  (hotelId)       |  (roomId)
  |                   |                  |
  └───────────── Booking ────────────────┘
       (userId)   (hotelId)   (roomId)
```

### Overlap Prevention Logic

Bookings are prevented from overlapping at the **application layer** inside `checkAvailability()`:

```
existingCheckIn  <= newCheckOut   AND
existingCheckOut >= newCheckIn
```

A PostgreSQL `EXCLUDE USING gist` constraint is documented in schema comments as an optional DB-level upgrade.

---

## 6. Backend — Server Entry Point

**File:** `server/server.js`

| Concern | Detail |
|---|---|
| CORS | Allows credentials (cookies) from CLIENT_URL (default http://localhost:5173) |
| Stripe webhook route | Mounted BEFORE express.json() at POST /api/stripe to receive raw body |
| Cookie parser | Parses HTTP-Only JWT cookie from all other requests |
| Route mounting | /api/auth, /api/user, /api/hotels, /api/rooms, /api/bookings |
| Port | process.env.PORT or 5000 |

---

## 7. Backend — Configs

### configs/db.js — Prisma Singleton

- Creates a single PrismaClient instance stored on `globalThis` to prevent connection pool exhaustion during hot-reloads in development.
- In production mode only warn and error log levels are enabled; in development all queries are also logged.
- Prisma connects **lazily** on first query — no explicit connect() call needed.

### configs/cloudinary.js — Cloudinary Setup

- Calls `cloudinary.config(...)` with CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.
- `secure: true` ensures all URLs use HTTPS.
- Called once at server startup in server.js.

### configs/nodemailer.js — Email Transporter

- Creates a Nodemailer transporter connected to **Brevo SMTP** (smtp-relay.brevo.com:587, STARTTLS).
- Authenticated via SMTP_USER / SMTP_PASS.
- Used by authController (OTP emails) and bookingController (booking confirmation emails).

---

## 8. Backend — Middlewares

### middlewares/authMiddleware.js — protect

**Purpose:** Guards protected routes. Reads the JWT from the HttpOnly cookie, verifies it, and attaches the full Prisma User object to `req.user`.

**How it works:**

1. Reads `req.cookies.token` — if missing -> 401 "Not authorized".
2. Calls `jwt.verify(token, JWT_SECRET)` — if invalid/expired -> 401 "Session expired".
3. Queries `prisma.user.findUnique({ where: { id: decoded.id } })` — if not found -> 401.
4. Sets `req.user = user` and calls `next()`.

**Security properties:**
- JWT is **never** accessible from JavaScript (HttpOnly cookie).
- In production, cookie is Secure + SameSite=Strict.
- In development, cookie is SameSite=Lax (allows cross-origin dev server).

### middlewares/uploadMiddleware.js — upload

**Purpose:** Handles multipart/form-data file uploads for room images.

- Uses multer with `diskStorage({})` — files are written to the OS temp directory.
- Exported as `upload` (a Multer instance); used as `upload.array('images', 4)` in the room creation route to accept up to 4 images.
- After Multer writes files to disk, the room controller uploads each file to Cloudinary and collects the returned secure_url values.

---

## 9. Backend — Routes

### Auth Routes (/api/auth)

| Method | Path | Handler | Auth Required |
|---|---|---|---|
| POST | /api/auth/register | register | No |
| POST | /api/auth/verify-otp | verifyOtp | No |
| POST | /api/auth/login | login | No |
| POST | /api/auth/logout | logout | No |
| POST | /api/auth/resend-otp | resendOtp | No |

### User Routes (/api/user)

| Method | Path | Handler | Auth Required |
|---|---|---|---|
| GET | /api/user | getUserData | Yes (protect) |
| POST | /api/user/recent-searched-cities | storeRecentSearchedCities | Yes (protect) |

### Hotel Routes (/api/hotels)

| Method | Path | Handler | Auth Required |
|---|---|---|---|
| POST | /api/hotels | registerHotel | Yes (protect) |

### Room Routes (/api/rooms)

| Method | Path | Handler | Auth Required | Extra Middleware |
|---|---|---|---|---|
| POST | /api/rooms | createRoom | Yes (protect) | upload.array('images', 4) |
| GET | /api/rooms | getRooms | No | — |
| GET | /api/rooms/owner | getOwnerRooms | Yes (protect) | — |
| POST | /api/rooms/toggle-availability | toggleRoomAvailability | Yes (protect) | — |

### Booking Routes (/api/bookings)

| Method | Path | Handler | Auth Required |
|---|---|---|---|
| POST | /api/bookings/check-availability | checkAvailabilityApi | No |
| POST | /api/bookings/book | createBooking | Yes (protect) |
| GET | /api/bookings/user | getUserBookings | Yes (protect) |
| GET | /api/bookings/hotel | getHotelBookings | Yes (protect) |
| POST | /api/bookings/stripe-payment | stripePayment | Yes (protect) |

### Stripe Webhook (/api/stripe)

| Method | Path | Handler | Notes |
|---|---|---|---|
| POST | /api/stripe | stripeWebhooks | Raw body required; no express.json() applied |

---

## 10. Backend — Controllers

### authController.js

#### Constants and Helpers

| Helper | Description |
|---|---|
| SALT_ROUNDS = 10 | bcrypt cost factor |
| OTP_TTL_MS = 600000 | OTP valid for 10 minutes |
| JWT_MAX_AGE_S = 604800 | JWT valid for 7 days |
| generateOtp() | Returns a random 6-digit string (100000 to 999999) |
| setTokenCookie(res, userId) | Signs JWT and sets it as HttpOnly cookie on response |
| sendOtpEmail(email, otp) | Sends formatted HTML OTP email via Nodemailer |

#### register — POST /api/auth/register

**Body:** { name, email, password }

**Business Logic:**
1. Validates name, email, password are present; password must be >= 6 characters.
2. Looks up existing user by email.
   - Found AND already verified -> 409 "Email already registered."
   - Found AND NOT verified -> updates existing record with new credentials + fresh OTP (re-registration).
   - Not found -> creates new User record with isVerified: false.
3. Hashes password with bcrypt; generates and hashes OTP; sets otpExpiry to now + 10 min.
4. Sends OTP email.
5. Returns { success: true, message: "OTP sent..." }.

#### verifyOtp — POST /api/auth/verify-otp

**Body:** { email, otp }

**Business Logic:**
1. Validates email and otp present.
2. Finds user; checks otp and otpExpiry exist.
3. Checks otpExpiry > now; if expired -> 400.
4. Uses bcrypt.compare(otp, user.otp) to verify; if mismatch -> 400.
5. Updates user: isVerified: true, clears otp and otpExpiry.
6. Sets JWT cookie via setTokenCookie.
7. Returns user profile (id, username, email, image, role).

#### login — POST /api/auth/login

**Body:** { email, password }

**Business Logic:**
1. Validates email + password.
2. Finds user; compares password with bcrypt.compare. Wrong credentials -> 401.
3. If user exists but isVerified = false: generates fresh OTP, updates DB, sends email, returns 403 with needsOtp: true flag.
4. If verified: sets JWT cookie and returns user profile.

#### logout — POST /api/auth/logout

- Calls `res.clearCookie("token", {...})` with matching security flags.
- Returns { success: true, message: "Logged out successfully" }.

#### resendOtp — POST /api/auth/resend-otp

**Body:** { email }

**Business Logic:**
1. Validates email present.
2. Finds user; if already verified -> 400.
3. Generates new OTP + hash + expiry; updates DB; resends email.

---

### userController.js

#### getUserData — GET /api/user

- Returns selected fields from req.user (set by protect middleware):
  `id`, `username`, `email`, `image`, `role`, `recentSearchedCities`.

#### storeRecentSearchedCities — POST /api/user/recent-searched-cities

**Body:** { recentSearchedCity }

**Business Logic:**
- Maintains a FIFO array of max 3 recently searched cities.
- If cities.length < 3 -> push new city.
- If cities.length >= 3 -> shift (remove oldest) and push new city.
- Updates recentSearchedCities array in DB.

---

### hotelController.js

#### registerHotel — POST /api/hotels

**Body:** { name, address, contact, city }

**Business Logic:**
1. Checks if user already has a hotel (findFirst by ownerId). If yes -> 400 "Hotel Already Registered".
2. Creates Hotel record with name, address, contact, city, ownerId.
3. **Promotes user role:** updates User.role to "hotelOwner".
4. Returns { success: true, message: "Hotel Registered Successfully" }.

**Side effect:** User role in DB changes from user -> hotelOwner.

---

### roomController.js

#### createRoom — POST /api/rooms

**Body:** multipart/form-data with fields: roomType, pricePerNight, amenities (JSON string), images (up to 4 files)

**Business Logic:**
1. Finds the authenticated user's hotel.
2. Uploads each image file in req.files to Cloudinary; collects secure_url array.
3. Normalizes amenities input (may arrive as JSON string, array, or object from FormData):
   - JSON string -> parsed to array or object.
   - Object { "Free WiFi": true, "Pool": false } -> keys with truthy values.
   - Comma-separated string -> split + trim.
4. Creates Room record with hotelId, roomType, pricePerNight, amenities[], images[].

#### getRooms — GET /api/rooms

- Returns all rooms where isAvailable: true, ordered by createdAt DESC.
- Each room includes nested hotel with nested owner (only id, image, username).

#### getOwnerRooms — GET /api/rooms/owner

- Finds the authenticated user's hotel; returns all rooms for that hotel (including hotel data).
- Does NOT filter by isAvailable — shows all rooms including unavailable ones.

#### toggleRoomAvailability — POST /api/rooms/toggle-availability

**Body:** { roomId }

- Reads current isAvailable value; flips it to the opposite.
- Returns { success: true, message: "Room availability updated" }.

---

### bookingController.js

#### checkAvailability (helper function, not exported as route)

- Queries for any booking on the same roomId where:
  checkInDate <= newCheckOut AND checkOutDate >= newCheckIn
- Returns true if no overlap found; false otherwise.

#### checkAvailabilityApi — POST /api/bookings/check-availability

**Body:** { checkInDate, checkOutDate, room }

- Wraps the helper and returns { success: true, isAvailable: boolean }.

#### createBooking — POST /api/bookings/book

**Body:** { room (roomId), checkInDate, checkOutDate, guests }

**Business Logic:**
1. Calls checkAvailability; if not available -> 400.
2. Loads room + hotel via prisma.room.findUnique with include hotel.
3. Calculates numberOfNights = ceil(|checkOut - checkIn| / 86400000).
4. Calculates totalPrice = pricePerNight x numberOfNights.
5. Creates Booking record.
6. Sends booking confirmation email to req.user.email with booking details (ID, hotel name, address, date, amount).

#### getUserBookings — GET /api/bookings/user

- Returns all bookings for req.user.id, newest first.
- Each booking includes nested room and hotel data.

#### getHotelBookings — GET /api/bookings/hotel

- Finds authenticated user's hotel; returns all bookings for it.
- Each booking includes nested room, hotel, and user data.
- Computes totalBookings (count) and totalRevenue (sum of totalPrice).
- Returns { success: true, dashboardData: { bookings, totalBookings, totalRevenue } }.

#### stripePayment — POST /api/bookings/stripe-payment

**Body:** { bookingId }

**Business Logic:**
1. Finds booking by bookingId.
2. Loads room + hotel.
3. Creates a Stripe Checkout Session with:
   - Product name: hotel name.
   - Amount: booking.totalPrice * 100 (in cents).
   - success_url: {origin}/loader/my-bookings
   - cancel_url: {origin}/my-bookings
   - metadata.bookingId: UUID (used by webhook to update DB).
4. Returns { success: true, url: session.url }.

---

### stripeWebhooks.js

#### stripeWebhooks — POST /api/stripe

**Business Logic:**
1. Verifies Stripe webhook signature using STRIPE_WEBHOOK_SECRET.
2. Handles checkout.session.completed event:
   - Extracts bookingId from session.metadata.
   - Updates Booking record: isPaid: true, paymentMethod: "Stripe".
3. All other event types are logged and ignored.

---

## 11. Authentication Flow

### Registration Flow

```
User submits (name, email, password)
        |
POST /api/auth/register
        |
Server: hash password, generate OTP, hash OTP, save user (isVerified=false)
        |
Send OTP email (6-digit code, 10-min expiry)
        |
User submits OTP
        |
POST /api/auth/verify-otp
        |
Server: verify OTP hash, check expiry, mark isVerified=true, clear OTP fields
        |
Set JWT in HttpOnly cookie (7-day expiry)
        |
Return user profile -> client login()
```

### Login Flow

```
User submits (email, password)
        |
POST /api/auth/login
        |
Server: compare bcrypt hash
        |
(if not verified)
Generate new OTP, send email -> return 403 with needsOtp:true
        |
(if verified)
Set JWT in HttpOnly cookie
        |
Return user profile -> client login()
```

### Session Restore (on app mount)

```
App loads -> AppProvider useEffect
        |
GET /api/user  (cookie sent automatically via withCredentials)
        |
(cookie valid)
Return user data -> setUser(), setIsOwner(), setSearchedCities()
        |
(cookie invalid / 401)
Silently ignore -> user stays null
```

### Logout Flow

```
User clicks Logout
        |
POST /api/auth/logout
        |
Server: clearCookie("token")
        |
Client: setUser(null), navigate("/")
```

---

## 12. Stripe Payment Flow

```
User clicks "Pay Now" on MyBookings page
        |
POST /api/bookings/stripe-payment  { bookingId }
        |
Server creates Stripe Checkout Session
        |
Return { url: "https://checkout.stripe.com/..." }
        |
window.location.href = url  (redirect to Stripe)
        |
User pays on Stripe-hosted page
        |
(on payment success)
Redirect to /loader/my-bookings
Loader waits 8 seconds then navigates to /my-bookings
        |
(Stripe sends webhook to server)
POST /api/stripe (raw body)
Server verifies signature -> updates Booking: isPaid=true, paymentMethod="Stripe"
```

---

## 13. Frontend — Overview and Dependencies

**Framework:** React 19 + Vite 7  
**Build command:** npm run build  
**Dev server:** npm run dev (default port 5173)

### Key Dependencies

| Package | Purpose |
|---|---|
| react-router-dom v7 | Client-side routing |
| axios | HTTP client (global withCredentials: true) |
| react-hot-toast | Toast notifications |
| tailwindcss v4 | Utility-first CSS |
| lucide-react | SVG icons (Building2, DollarSign, MapPin, X) |
| react-icons | Additional icons (FaStar, FaMapMarkerAlt, etc.) |

---

## 14. Frontend — Context API (appContext)

**File:** `client/src/context/appContext.jsx`

### Global State

| State | Type | Description |
|---|---|---|
| `user` | Object or null | Current logged-in user (id, username, email, image, role) |
| `isOwner` | Boolean | Derived from user.role === "hotelOwner" |
| `showHotelReg` | Boolean | Controls visibility of Hotel Registration modal |
| `searchedCities` | String[] | Recent searched cities (max 3, synced with API) |
| `rooms` | Array | All available rooms fetched from API on mount |

### Exposed Functions and Values

| Value | Type | Description |
|---|---|---|
| `currency` | String | From VITE_CURRENCY env var (e.g. "$") |
| `navigate` | Function | React Router navigate function |
| `toast` | Object | react-hot-toast instance |
| `axios` | Object | Configured Axios instance |
| `login(userData)` | Function | Sets user + isOwner from login/OTP response |
| `logout()` | Function | Calls POST /api/auth/logout, clears state, navigates to / |
| `fetchUser()` | Function | Re-fetches user from /api/user (for session restore) |
| `setUser` | Function | Direct state setter |
| `setIsOwner` | Function | Direct state setter |
| `setShowHotelReg` | Function | Toggles hotel registration modal |
| `setSearchedCities` | Function | Updates recent cities |
| `setRooms` | Function | Updates rooms list |

### Axios Configuration

- baseURL = VITE_BACKEND_URL (from env)
- withCredentials = true (ensures HttpOnly cookie is sent on every request)

### Lifecycle Effects

1. **On mount:** fetchUser() — restores session from cookie if valid.
2. **On mount:** fetchRooms() — pre-loads all available rooms globally.

---

## 15. Frontend — Routes (App.jsx)

| Path | Component | Auth Guard | Notes |
|---|---|---|---|
| / | Home | No | Landing page with Hero, RecommendedHotels, FeaturedDestination |
| /auth | Auth | No | Login + Register + OTP verification |
| /rooms | AllRooms | No | Room listing with filters + sorting |
| /rooms/:id | RoomDetails | No | Room detail page + booking form |
| /my-bookings | MyBookings | Soft (API returns 401) | User booking history |
| /loader/:nextUrl | Loader | No | Post-Stripe payment loading screen |
| /owner | Layout (parent) | Soft (isOwner check in Layout) | Hotel owner area |
| /owner (index) | Dashboard | Yes via Layout | Stats + recent bookings table |
| /owner/Addroom | Addroom | Yes via Layout | Add new room form |
| /owner/Listroom | ListRoom | Yes via Layout | All owner rooms + toggle availability |

### Route Guard Strategy

- /owner* routes use Layout.jsx which contains a useEffect that calls navigate('/') if !isOwner.
- No true ProtectedRoute HOC — guarding is done at page level.

### Conditional Layout Elements

- Navbar is hidden on all /owner/* paths (checked via useLocation().pathname.includes("owner")).
- HotelReg modal is rendered at App level, shown when showHotelReg === true.
- Footer is always rendered (even on owner pages).

---

## 16. Frontend — Pages

### Home.jsx

Composition page — renders: Hero -> RecommendedHotels -> FeaturedDestination

No local state; all data comes from context.

---

### Auth.jsx

Multi-step authentication page (Login + Register + OTP).

**Local State:**

| State | Type | Description |
|---|---|---|
| `mode` | "login" or "register" | Current form mode |
| `step` | 0, 1, or 2 | 0=form, 1=OTP, 2=success |
| `name` | String | Registration: full name |
| `email` | String | Login/Register: email |
| `password` | String | Login/Register: password |
| `showPassword` | Boolean | Toggle password visibility |
| `otp` | String[6] | 6 individual OTP digit boxes |
| `loading` | Boolean | Disables submit button during API call |
| `resendCooldown` | Number | Countdown (seconds) before OTP resend allowed |

**API calls:**
- Register: POST /api/auth/register
- OTP verify: POST /api/auth/verify-otp
- Login: POST /api/auth/login
- Resend OTP: POST /api/auth/resend-otp

**Sub-components (inline):**
- StepDot — progress indicator dot (Active/Done states styled differently)
- Field — reusable input with label

---

### AllRooms.jsx

Room listing page with client-side filtering and sorting.

**Local State:**

| State | Type | Description |
|---|---|---|
| `openFilters` | Boolean | Declared but not used in current render |
| `popularFilters` | String[] | Selected room types to filter by |
| `priceRange` | String[] | Selected price ranges (e.g. ["0 to 500"]) |
| `sortBy` | String | "" or "low" or "high" or "new" |

**Filtering Logic (via useMemo):**
- filterDestination: filters by room.hotel.city matching URL ?destination= param.
- matchesRoomType: filters by popularFilters array (room type checkbox).
- matchesPriceRange: filters by pricePerNight within selected ranges.
- sortRooms: sorts by price (low-to-high, high-to-low) or creation date (newest).

**URL integration:** Reads destination from useSearchParams() for city-based filtering from homepage search.

**Room types available for filter:** Single Bed, Double Bed, Luxury Room, Family Suite  
**Price ranges:** $0-$500, $500-$1000, $1000-$2000, $2000-$3000

---

### RoomDetails.jsx

Detailed room view with image gallery and booking form.

**Route parameter:** :id (room UUID)

**Local State:**

| State | Type | Description |
|---|---|---|
| `room` | Object or null | Room data (found in context rooms array by id) |
| `selectedImg` | String or null | Currently displayed large image URL |
| `checkInDate` | String | ISO date string |
| `checkOutDate` | String | ISO date string |
| `guests` | Number | Default: 1 |
| `isAvailable` | Boolean | Whether availability has been confirmed |

**Two-step booking UX:**
1. First submit -> calls POST /api/bookings/check-availability -> if available, isAvailable = true.
2. Second submit (button becomes "Book Now") -> calls POST /api/bookings/book.

> NOTE: Hotel name in header uses hotelDummyData.name (static dummy) instead of room.hotel.name. Host section also uses userDummyData. Star rating is hardcoded.

---

### MyBookings.jsx

User's booking history page.

**Local State:**

| State | Type | Description |
|---|---|---|
| `bookings` | Array | Fetched from GET /api/bookings/user |

**Fetched on:** user state change (requires login).

**Features:**
- Displays room image, room type, hotel name and address, guest count, dates.
- Shows amenity icons.
- Shows total price + paid/unpaid badge.
- "Pay Now" button -> Stripe payment session -> redirects to Stripe checkout.

> NOTE: handlePayment function is declared but empty (dead code). handlePayNow is the real handler.

---

### HotelOwner/Layout.jsx

Parent layout for all /owner/* routes.

**Auth guard:** `useEffect(() => { if (!isOwner) navigate('/'); }, [isOwner])`

**Structure:** NavBar (top) + Sidebar (left) + Outlet (main content area)

---

### HotelOwner/Dashboard.jsx

Hotel owner statistics overview.

**Local State:**

| State | Default | Description |
|---|---|---|
| DashboardData.totalBookings | 0 | Total booking count |
| DashboardData.totalRevenue | 0 | Sum of all booking prices |
| DashboardData.bookings | [] | Recent bookings array |

**Fetched from:** GET /api/bookings/hotel

**Displays:** 2 stat cards (Total Bookings, Total Revenue) + recent bookings table (User Name, Room Type, Amount, Payment Status).

---

### HotelOwner/Addroom.jsx

Form to add a new room to the owner's hotel.

**Local State:**

| State | Description |
|---|---|
| isLoading | Submit button loading state |
| Images | Object {1: File or null, 2: ..., 3: ..., 4: ...} — up to 4 image files |
| Inputs.roomType | Selected room type |
| Inputs.pricePerNight | Price input (string, converted to number on submit) |
| Inputs.amenities | Object { "Free WiFi": bool, "Free Breakfast": bool, "Room Service": bool, "Mountain View": bool, "Pool Access": bool } |

**Submission:** Sends multipart/form-data via POST /api/rooms:
- roomType (string)
- pricePerNight (string)
- amenities (JSON stringified object)
- images (file array, up to 4)

**Room types:** Single Bed, Double Room, Luxury Room, Family Suite  
**Amenities:** Free WiFi, Free Breakfast, Room Service, Mountain View, Pool Access

---

### HotelOwner/ListRoom.jsx

Table of all owner's rooms with availability toggle.

**Local State:**

| State | Description |
|---|---|
| ownerRooms | Array from GET /api/rooms/owner |

**Features:**
- Displays: Room Type, Amenities (joined string), Price/night, toggle switch.
- Toggle calls POST /api/rooms/toggle-availability { roomId } then re-fetches.
- getAmenitiesDisplay() normalizes both array and object amenity formats.

---

## 17. Frontend — Components

### Navbar.jsx

Main navigation bar for non-owner pages.

**Hidden on:** /owner/* paths (returns null).

**Dynamic behavior:**
- On homepage /: transparent background when not scrolled; white + shadow when scrolled.
- On other pages: always white with shadow.
- Shows "List Your Hotel" button for logged-in non-owners; "Dashboard" for owners.
- Avatar: first letter of user.username (indigo circle) or user image if set.
- Dropdown menu: My Bookings + (Dashboard for owners) + Logout.
- Mobile: hamburger menu with full-screen overlay.

**Static elements:** Nav links (Home, Hotels, Experience, About), logo, login button label.  
**Dynamic elements:** Avatar, username/email in dropdown, "Dashboard"/"List Your Hotel" toggle.

---

### Hero.jsx

Full-screen hero section with search form.

**Local State:**
- `destination` — text input value

**On search submit:**
1. Navigates to /rooms?destination={destination}.
2. Calls POST /api/user/recent-searched-cities to save searched city (if logged in).
3. Updates searchedCities in context.

**Static elements:** Background image, headline text, subtext, form labels.  
**Dynamic elements:** Destination input (with datalist of cities from assets).

> NOTE: Check-in, check-out, and guests fields in the hero form are NOT connected to booking logic — they are UI decorations only (no value binding, no submission handling).

---

### FeaturedDestination.jsx

Displays first 4 available rooms as cards. Only renders if rooms.length > 0.

**Data source:** rooms from context.  
**Static:** Title, subtitle, "View All Destinations" button.  
**Dynamic:** Room cards (hotel name, image, price, address).

---

### RecommendedHotels.jsx

Displays rooms filtered by recently searched cities. Only renders if recommended.length > 0.

**Data source:** rooms filtered by searchedCities from context.  
**Static:** Title, subtitle.  
**Dynamic:** Filtered room cards.

---

### HotelCard.jsx

Reusable card for displaying a single room/hotel.

| Field | Static/Dynamic |
|---|---|
| Hotel image | DYNAMIC — room.images[0] |
| Hotel name | DYNAMIC — room.hotel.name |
| Rating | DYNAMIC — room.hotel.rating (field NOT in DB schema — will be undefined) |
| Address | DYNAMIC — room.hotel.address |
| Price | DYNAMIC — room.pricePerNight |
| "View Details" button | STATIC |

**Navigation:** Links to /rooms/${room._id}.

---

### HotelReg.jsx

Modal overlay for registering a hotel. Shown when showHotelReg === true in context.

**Form fields (all dynamic / user-input):** name, contact, address, city

**On submit:** POST /api/hotels -> sets isOwner(true) and closes modal.

**Static:** Title, labels, button text, success message template.  
**Dynamic:** formData.name in success message.

---

### Loader.jsx

Full-screen loading spinner shown after Stripe payment redirect.

- Reads nextUrl from route params (/loader/:nextUrl).
- Waits 8 seconds then navigates to /{nextUrl}.
- Used specifically for post-payment redirect: /loader/my-bookings -> waits -> navigates to /my-bookings.

---

### components/AllRooms/DetailRoomInfo.jsx

Horizontal room card used in the AllRooms listing page.

| Field | Static/Dynamic |
|---|---|
| Room image | DYNAMIC — room.images[0] |
| City | DYNAMIC — room.hotel.city |
| Index number | DYNAMIC — index + 1 |
| Hotel name | DYNAMIC — room.hotel.name |
| Address | DYNAMIC — room.hotel.address |
| Amenities | DYNAMIC — normalized from room.amenities |
| Price | DYNAMIC — room.pricePerNight |

**Navigation:** onClick -> navigate to /rooms/${room._id}.

---

### components/HotelOwner/NavBar.jsx

Top navigation bar for the hotel owner dashboard.

**Static:** Logo.  
**Dynamic:** Avatar (first letter of username or user image), dropdown with username, "My Bookings" link, Logout button.

---

### components/HotelOwner/SideBar.jsx

Left sidebar for the hotel owner area.

**Navigation links (all static):**
- Dashboard -> /owner
- Add Room -> /owner/Addroom
- List Room -> /owner/Listroom

Uses NavLink for active/inactive styling. No dynamic data.

---

### components/Title.jsx

Reusable section title component.

**Props:** title, subtitle, align ("left" or "center"), font

All props are DYNAMIC (passed by parent). No hardcoded text.

---

### components/Footer.jsx

Site-wide footer. Entirely STATIC.

- Logo
- Description text
- Social links (Instagram, Twitter, Facebook — all href="#")
- Copyright: hardcoded as "2025"

---

## 18. Static vs Dynamic Fields Summary

### Backend API Responses — What's Dynamic

All API responses are dynamically computed from the database. Key dynamic fields returned to frontend:

| Endpoint | Key Dynamic Fields |
|---|---|
| GET /api/user | username, email, image, role, recentSearchedCities |
| GET /api/rooms | Full room objects with nested hotel and owner data |
| GET /api/bookings/user | Booking list with room, hotel data |
| GET /api/bookings/hotel | totalBookings, totalRevenue, booking list |

### Frontend Fields by Type

#### DYNAMIC (data-driven from API/state)

- All room images (room.images[0], gallery thumbnails)
- Hotel names, addresses, cities
- Room types, prices, amenities
- User username, email (navbar dropdown, owner navbar)
- Booking details (dates, guests, amount, payment status)
- Dashboard stats (totalBookings, totalRevenue)
- Recent bookings table rows
- Recommended hotels (filtered by searched cities)
- Featured destinations (first 4 rooms from API)
- Room availability toggle state
- Auth flow (email shown in OTP step, OTP digit inputs)
- OTP resend countdown timer

#### STATIC (hardcoded in source)

- Navigation links (Home, Hotels, Experience, About)
- Hero headline and subtext
- Room type options in Addroom form: Single Bed, Double Room, Luxury Room, Family Suite
- Amenity options in Addroom form: Free WiFi, Free Breakfast, Room Service, Mountain View, Pool Access
- Filter options in AllRooms: same 4 room types, 4 price ranges
- Star rating display in RoomDetails ("4 stars, 200+ reviews") — HARDCODED
- Host info section in RoomDetails — uses hotelDummyData and userDummyData — HARDCODED
- Hero check-in, check-out, guests fields — NOT functionally wired
- Footer copyright year (hardcoded as 2025)
- Social links in footer (href="#")
- HotelCard star rating — uses room.hotel.rating which doesn't exist in DB schema

---

## 19. Known Issues / TODOs

| # | Location | Issue |
|---|---|---|
| 1 | RoomDetails.jsx (line 90, 105, 221-232) | Hotel name header, star rating, and host section use hotelDummyData / userDummyData instead of real API data |
| 2 | RoomDetails.jsx (line 71) | Uses room._id for lookup but Prisma returns room.id (UUID) — may fail to find room |
| 3 | MyBookings.jsx (line 46-47) | handlePayment function is declared but empty (dead code) |
| 4 | MyBookings.jsx (line 82, 105, 130) | Uses booking._id but Prisma returns booking.id — all Mongo ObjectId references should be .id |
| 5 | ListRoom.jsx (line 105) | Uses room._id for toggle — Prisma returns room.id |
| 6 | HotelCard.jsx (line 29) | Renders room.hotel.rating which doesn't exist in the DB schema |
| 7 | Hero.jsx | Check-in, check-out, guests inputs in hero search form are not wired to booking logic |
| 8 | Footer.jsx | Copyright year hardcoded as 2025; social links are href="#" |
| 9 | AllRooms.jsx (line 87) | Uses room._id as key instead of room.id |
| 10 | server/.env.example | Still contains old Clerk keys (CLERK_*) — legacy from pre-migration |
| 11 | server/scripts/ | Scripts directory exists but content not explored in this documentation |
| 12 | Booking status | BookingStatus enum (pending, confirmed, cancelled) exists but booking status is never updated beyond pending in current code |
| 13 | Admin role | UserRole.admin exists in schema but no admin routes or UI exist |
| 14 | Loader.jsx | 8-second wait is arbitrary; Stripe webhook processing time is not guaranteed |
| 15 | openFilters state | Declared in AllRooms.jsx but never used in the JSX render |
