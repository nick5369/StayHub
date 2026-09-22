# StayHub — Auth & Payments

> **Module 4 of 6** · Load for any auth or payment-related task.

---

## Authentication Flow

### Registration

```
User submits { name, email, password }
        ↓
POST /api/auth/register
        ↓
Hash password → generate OTP → hash OTP → save User (isVerified=false)
        ↓
Send OTP email (6-digit, 10-min expiry)
        ↓
User submits OTP
        ↓
POST /api/auth/verify-otp
        ↓
bcrypt.compare(otp, user.otp) + check otpExpiry
        ↓
Set isVerified=true, clear OTP fields
        ↓
Set JWT in HttpOnly cookie (7-day) → return user profile → client login()
```

### Login

```
User submits { email, password }
        ↓
POST /api/auth/login → bcrypt.compare(password, passwordHash)
        ↓
[Not verified] → fresh OTP + send email → 403 { needsOtp: true }
[Verified]     → Set JWT cookie → return user profile → client login()
```

### Session Restore (on app mount)

```
AppProvider useEffect
        ↓
GET /api/user  (cookie sent automatically via withCredentials)
        ↓
[Cookie valid]   → setUser(), setIsOwner(), setSearchedCities()
[Cookie invalid] → silently ignore, user stays null
```

### Logout

```
User clicks Logout
        ↓
POST /api/auth/logout → server: clearCookie("token")
        ↓
Client: setUser(null) → navigate("/")
```

---

## JWT Details

| Property | Value |
|---|---|
| Storage | HttpOnly cookie named `token` |
| Expiry | 7 days (`JWT_MAX_AGE_S = 604800`) |
| Payload | `{ id: user.id }` |
| Production flags | `Secure: true`, `SameSite: Strict` |
| Development flags | `SameSite: Lax` (allows cross-origin dev server) |

---

## OTP Details

| Property | Value |
|---|---|
| Format | 6-digit numeric string (100000–999999) |
| Stored as | bcrypt hash (`SALT_ROUNDS = 10`) |
| Expiry | 10 minutes (`OTP_TTL_MS = 600_000`) |
| Transport | HTML email via Nodemailer/Brevo |
| Resend | `POST /api/auth/resend-otp` — generates fresh OTP, resets expiry |

---

## Stripe Payment Flow

```
1. User reviews booking on MyBookings (status: payment_pending)
        ↓
2. Clicks "Pay Now"
        ↓
3. POST /api/bookings/stripe-payment { bookingId }
        ↓
4. Server creates Stripe Checkout Session
   - product name, amount in cents (totalPrice × 100)
   - metadata.bookingId = bookingId
   - success_url: CLIENT_URL/loader/my-bookings
   - cancel_url:  CLIENT_URL/my-bookings
        ↓
5. Server updates Booking: status='payment_pending', expiresAt=now+15min
        ↓
6. Return { url: "https://checkout.stripe.com/..." }
        ↓
7. Client: window.location.href = url (redirect to Stripe)
        ↓
8. User pays on Stripe-hosted checkout
        ↓
   [On success]
9. Stripe redirects to /loader/my-bookings
   Loader waits 8 seconds then navigates to /my-bookings
        ↓
10. Stripe webhook fires: POST /api/stripe (raw body)
    Server: verify signature → extract bookingId from metadata
    Idempotency: skip if already isPaid + confirmed
    Update Booking: isPaid=true, paymentMethod='STRIPE', status='confirmed'
```

### Important: Webhook Race Condition
The 8-second Loader delay exists to give the Stripe webhook time to fire and update the booking status before the user lands on `/my-bookings`. This is intentional.

---

## Payment Method Notes

- `PAY_AT_HOTEL` has been **removed** from the `PaymentMethod` enum.
- All existing bookings with `PAY_AT_HOTEL` should be migrated using:
  ```bash
  node server/scripts/migrate-payment-method.js
  ```
- The default for all new bookings is now `STRIPE`.
- The Stripe webhook is the **only** mechanism that marks a booking as `isPaid: true`.
