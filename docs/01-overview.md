# StayHub — Overview, Stack & Structure

> **Module 1 of 6** · Load this first for orientation on any task.

---

## 1. Project Overview

**StayHub** is a full-stack hotel booking platform with two user roles:

| Role | Capabilities |
|---|---|
| **User** | Browse/search rooms, view details, check availability, book rooms (multi-room support), pay via Stripe, view booking history |
| **Hotel Owner** | Register a hotel, add room types with images, manage availability, block dates for maintenance, view dashboard with revenue stats |

**Auth:** Self-hosted JWT + email OTP (no Clerk). Cookie-based sessions.  
**Payment:** Stripe Checkout only. `PAY_AT_HOTEL` has been fully removed.

---

## 2. Technology Stack

### Backend (`server/`)

| Category | Technology |
|---|---|
| Runtime | Node.js (ES Modules) |
| Framework | Express.js v5 |
| ORM | Prisma v6 |
| Database | PostgreSQL |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Cookie | cookie-parser |
| File uploads | Multer (disk storage) → Cloudinary v2 |
| Email | Nodemailer via Brevo SMTP |
| Payments | Stripe v20 |
| CORS | cors |
| Dev | Nodemon |
| Deploy | AWS EC2 |

### Frontend (`client/`)

| Category | Technology |
|---|---|
| Framework | React 19 + Vite 7 |
| Routing | React Router DOM v7 |
| Styling | TailwindCSS v4 |
| HTTP | Axios (`withCredentials: true`) |
| Notifications | react-hot-toast |
| Icons | react-icons, lucide-react |
| State | React Context API (single global context) |
| Deploy | AWS EC2 |

---

## 3. Project Structure

```
StayHub/
├── docs/                           # ← This modular documentation
│   ├── README.md                   # Index + quick architecture summary
│   ├── 01-overview.md              # Stack, structure, env vars (this file)
│   ├── 02-database.md              # Prisma schema & inventory model
│   ├── 03-backend-api.md           # Routes + controller logic
│   ├── 04-auth-and-payments.md     # Auth flow + Stripe flow
│   ├── 05-frontend.md              # Pages, components, context
│   └── 06-known-issues.md          # TODOs, bugs, dead code
│
├── client/                         # React frontend
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
│   │   │   └── appContext.jsx
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
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   └── package.json
│
└── server/                         # Express backend
    ├── configs/
    │   ├── cloudinary.js
    │   ├── db.js                   # Prisma client singleton
    │   └── nodemailer.js
    ├── controllers/
    │   ├── authController.js
    │   ├── bookingController.js
    │   ├── hotelController.js
    │   ├── roomController.js       # Includes blockRoomDates (owner date blocking)
    │   ├── stripeWebhooks.js
    │   └── userController.js
    ├── middlewares/
    │   ├── authMiddleware.js       # JWT cookie → req.user
    │   └── uploadMiddleware.js     # Multer config
    ├── prisma/
    │   ├── schema.prisma
    │   └── migrations/
    ├── routes/
    │   ├── authRoutes.js
    │   ├── bookingRoutes.js
    │   ├── hotelRoutes.js
    │   ├── roomRoutes.js
    │   └── userRoutes.js
    ├── scripts/
    │   └── migrate-payment-method.js   # One-time: PAY_AT_HOTEL → STRIPE migration
    ├── server.js
    ├── .env / .env.example
    └── package.json
```

---

## 4. Environment Variables

### Server (`server/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `SENDER_EMAIL` | From-address on outbound emails |
| `SMTP_USER` | Brevo SMTP username |
| `SMTP_PASS` | Brevo SMTP password |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `CLIENT_URL` | Frontend URL for CORS (default: `http://localhost:5173`) |
| `PORT` | Server port (default: 5000) |
| `NODE_ENV` | `development` or `production` (affects cookie security flags) |

> `CLERK_*` keys may still exist in `.env.example` but are not used anywhere in the codebase.

### Client (`client/.env`)

| Variable | Description |
|---|---|
| `VITE_BACKEND_URL` | Backend API base URL (e.g. `http://localhost:5000`) |
| `VITE_CURRENCY` | Currency symbol displayed in UI (e.g. `$`) |

---

## 5. Server Entry Point (`server/server.js`)

| Concern | Detail |
|---|---|
| CORS | `credentials: true`, origin: `CLIENT_URL` |
| Stripe webhook | Mounted **before** `express.json()` at `POST /api/stripe` (needs raw body) |
| Cookie parser | Parses HttpOnly JWT cookie for all other routes |
| Routes | `/api/auth`, `/api/user`, `/api/hotels`, `/api/rooms`, `/api/bookings` |
| Port | `process.env.PORT` or `5000` |

---

## 6. Configs

### `configs/db.js` — Prisma Singleton
- Single `PrismaClient` stored on `globalThis` to prevent connection pool exhaustion on hot-reloads.
- In production: only `warn`/`error` log levels. In development: all queries logged.

### `configs/cloudinary.js`
- Configures Cloudinary with `CLOUDINARY_*` env vars. `secure: true` enforces HTTPS URLs.

### `configs/nodemailer.js`
- Nodemailer transporter via **Brevo SMTP** (smtp-relay.brevo.com:587, STARTTLS).
- Used by: `authController` (OTP emails), `bookingController` (booking confirmation emails).

---

## 7. Middlewares

### `authMiddleware.js` — `protect`
1. Reads `req.cookies.token` → 401 if missing.
2. `jwt.verify(token, JWT_SECRET)` → 401 if invalid/expired.
3. `prisma.user.findUnique({ where: { id: decoded.id } })` → 401 if not found.
4. Sets `req.user = user`, calls `next()`.

**Cookie flags:** HttpOnly always. Production: `Secure + SameSite=Strict`. Development: `SameSite=Lax`.

### `uploadMiddleware.js` — `upload`
- Multer `diskStorage({})` → writes files to OS temp dir.
- Used as `upload.array('images', 4)` on room creation route.
- Controller then uploads each file to Cloudinary and collects `secure_url` values.
