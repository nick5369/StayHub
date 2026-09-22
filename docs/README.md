# StayHub — Project Documentation

> **Last updated:** 2026-09-15
> **Project type:** Full-stack Hotel Booking Web App
> **Repo root:** `e:/StayHub/`

This documentation is split into focused modules. Load only what is relevant to your task.

---

## Modules

| File | What's inside | Load when… |
|---|---|---|
| [01-overview.md](./01-overview.md) | Stack, project structure, environment variables | Starting a new task / orientation |
| [02-database.md](./02-database.md) | Full Prisma schema, all models & enums, inventory architecture | DB queries, schema changes, migrations |
| [03-backend-api.md](./03-backend-api.md) | All routes table, controller logic (auth, user, hotel, room, booking, webhooks) | Adding/modifying API endpoints |
| [04-auth-and-payments.md](./04-auth-and-payments.md) | Auth flow (register/login/OTP/session/logout), Stripe payment flow | Auth or payment work |
| [05-frontend.md](./05-frontend.md) | Context API, all pages & components, routing, static vs dynamic fields | Frontend / UI work |
| [06-known-issues.md](./06-known-issues.md) | TODOs, known bugs, dead code, static stubs | Bug fixes, cleanup tasks |

---

## Quick Architecture Summary

```
[React + Vite] ──axios──> [Express.js + Prisma] ──> [PostgreSQL]
      |                          |
  TailwindCSS v4           Cloudinary (images)
  React Router v7          Stripe (payments)
  Context API              Nodemailer/Brevo (email)
```

**Inventory model:** `RoomType` (marketing) → `RoomTypeInventory` (daily availability rows) → `Booking`  
Bookings use atomic `updateMany` on inventory — no physical `Room` rows exist anymore.

**Auth:** Self-hosted JWT in HttpOnly cookie + email OTP verification (no Clerk).

**Payment:** Stripe Checkout Session only — `PAY_AT_HOTEL` enum value has been removed.  
Webhook (`POST /api/stripe`) confirms booking after successful payment.

**Multi-room bookings:** A single `Booking` now holds `numberOfRooms` (default 1). Inventory is decremented by that count atomically.
