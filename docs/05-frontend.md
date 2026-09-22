# StayHub — Frontend

> **Module 5 of 6** · Load for any frontend / UI task.

---

## Context API (`appContext.jsx`)

### Global State

| State | Type | Description |
|---|---|---|
| `user` | Object \| null | Logged-in user (`id, username, email, image, role`) |
| `isOwner` | Boolean | `user.role === 'hotelOwner'` |
| `showHotelReg` | Boolean | Controls Hotel Registration modal visibility |
| `searchedCities` | String[] | Recent searched cities (max 3) |
| `rooms` | Array | All available rooms (pre-loaded on mount) |

### Exposed Values & Functions

| Name | Type | Description |
|---|---|---|
| `currency` | String | `VITE_CURRENCY` env var (e.g. `"$"`) |
| `navigate` | Function | React Router `useNavigate` |
| `toast` | Object | `react-hot-toast` instance |
| `axios` | Object | Axios instance — `baseURL=VITE_BACKEND_URL`, `withCredentials: true` |
| `login(userData)` | Function | Sets `user` + `isOwner` from login/OTP response |
| `logout()` | Function | `POST /api/auth/logout`, clears state, navigates to `/` |
| `fetchUser()` | Function | Re-fetches from `/api/user` (session restore) |
| `setUser` | Function | Direct state setter |
| `setIsOwner` | Function | Direct state setter |
| `setShowHotelReg` | Function | Toggles hotel reg modal |
| `setSearchedCities` | Function | Updates recent cities |
| `setRooms` | Function | Updates rooms list |

### Lifecycle Effects (on mount)
1. `fetchUser()` — restores session from cookie.
2. `fetchRooms()` — pre-loads all available rooms globally (`GET /api/rooms`).

---

## Routing (`App.jsx`)

| Path | Component | Auth Guard | Notes |
|---|---|---|---|
| `/` | `Home` | No | Hero + RecommendedHotels + FeaturedDestination |
| `/auth` | `Auth` | No | Login + Register + OTP |
| `/rooms` | `AllRooms` | No | Listing with filters + sorting |
| `/rooms/:id` | `RoomDetails` | No | Detail + multi-room booking form |
| `/my-bookings` | `MyBookings` | Soft (API → 401) | User booking history |
| `/loader/:nextUrl` | `Loader` | No | Post-Stripe redirect buffer |
| `/owner` | `Layout` (parent) | Yes (via Layout) | Owner area |
| `/owner` (index) | `Dashboard` | Yes | Stats + recent bookings |
| `/owner/Addroom` | `Addroom` | Yes | Add room type form |
| `/owner/Listroom` | `ListRoom` | Yes | All room types + toggle |

**Guard strategy:** `Layout.jsx` has `useEffect(() => { if (!isOwner) navigate('/') }, [isOwner])`. No ProtectedRoute HOC.

**Conditional layout:**
- `Navbar` hidden on all `/owner/*` paths.
- `HotelReg` modal rendered at App level when `showHotelReg === true`.
- `Footer` always rendered.

---

## Pages

### `Home.jsx`
Composition page: Hero → RecommendedHotels → FeaturedDestination. No local state.

---

### `Auth.jsx`
Multi-step auth page.

| State | Type | Description |
|---|---|---|
| `mode` | `"login"` \| `"register"` | Current form mode |
| `step` | 0 \| 1 \| 2 | 0=form, 1=OTP, 2=success |
| `name`, `email`, `password` | String | Form inputs |
| `showPassword` | Boolean | Toggle password visibility |
| `otp` | String[6] | 6 individual OTP digit inputs |
| `loading` | Boolean | Disables submit during API call |
| `resendCooldown` | Number | Seconds before OTP resend allowed |

Inline sub-components: `StepDot`, `Field`.

---

### `AllRooms.jsx`
Listing page with client-side filtering and sorting.

| State | Type | Description |
|---|---|---|
| `popularFilters` | String[] | Selected room type checkboxes |
| `priceRange` | String[] | Selected price ranges |
| `sortBy` | String | `""` \| `"low"` \| `"high"` \| `"new"` |

Filtering via `useMemo`:
- `filterDestination`: matches `room.hotel.city` vs `?destination=` URL param.
- `matchesRoomType`: matches selected `popularFilters`.
- `matchesPriceRange`: matches `pricePerNight` within ranges.
- `sortRooms`: price asc/desc or newest first.

**Room type filter options:** Single Bed, Double Bed, Luxury Room, Family Suite  
**Price range options:** $0–$500, $500–$1000, $1000–$2000, $2000–$3000

---

### `RoomDetails.jsx`
Room detail page with image gallery and booking form.

**Route param:** `:id` (RoomType UUID)

| State | Type | Description |
|---|---|---|
| `room` | Object \| null | Found in context `rooms` array by id |
| `selectedImg` | String \| null | Currently displayed large image |
| `checkInDate` | String | ISO date |
| `checkOutDate` | String | ISO date |
| `numberOfRooms` | Number | Default 1; bounds `[1, room.availableCount]` ← **new** |
| `guests` | Number | Default 1; max = `room.maxGuests × numberOfRooms` |
| `isAvailable` | Boolean | Whether availability confirmed |
| `isBooking` | Boolean | True while booking API call is in-flight ← **new** |

**Two-step booking UX:**
1. First submit → `POST /api/bookings/check-availability` → if available, `isAvailable = true`.
2. Second submit (button shows "Book Now & Pay") → `POST /api/bookings/book`.

**Capacity hint** displayed below booking form:
> `{numberOfRooms} room(s) × {maxGuests} max guests = up to {total} guests · ${pricePerNight × numberOfRooms}/night total`

**`resetAvailability()`** is called on any date or room count change (clears `isAvailable`).

---

### `MyBookings.jsx`
User booking history.

| State | Description |
|---|---|
| `bookings` | Fetched from `GET /api/bookings/user` on `user` state change |

**Displays per booking:** room image, room type, hotel name/address, **rooms count** (`numberOfRooms ?? 1`), guest count, dates, total price, paid/unpaid badge, status badge.

**Actions:**
- **Pay Now** → `POST /api/bookings/stripe-payment` → redirect to Stripe. Hidden for cancelled.
- **Cancel** → `POST /api/bookings/:id/cancel`. Hidden for already cancelled.

---

### `HotelOwner/Layout.jsx`
Parent wrapper for all `/owner/*` routes.  
**Guard:** `if (!isOwner) navigate('/')`.  
**Structure:** NavBar (top) + SideBar (left) + `<Outlet />`.

---

### `HotelOwner/Dashboard.jsx`
Owner stats overview.

**Fetched from:** `GET /api/bookings/hotel`

**Displays:** Total Bookings card, Total Revenue card, recent bookings table (User Name, Room Type, Amount, Payment Status).

---

### `HotelOwner/Addroom.jsx`
Form to add a room type.

| State | Description |
|---|---|
| `isLoading` | Submit button loading state |
| `Images` | `{ 1: File\|null, 2, 3, 4 }` — up to 4 images |
| `Inputs.name` | Room type display name |
| `Inputs.pricePerNight` | Nightly rate per room |
| `Inputs.maxGuests` | Max guests per room (default 2) |
| `Inputs.quantity` | Daily inventory count (not physical unit count) |
| `Inputs.amenities` | `{ "Free WiFi": bool, … }` |

**Quantity label:** "Daily Available Inventory" (not "physical rooms").  
**Submits:** `multipart/form-data POST /api/rooms`.  
**Room types:** Single Bed, Double Room, Luxury Room, Family Suite  
**Amenities:** Free WiFi, Free Breakfast, Room Service, Mountain View, Pool Access

---

### `HotelOwner/ListRoom.jsx`
Table of owner's room types.

**Fetched from:** `GET /api/rooms/owner`

**Columns:** Room Type Name, Amenities, Max Guests, Total Rooms (`totalRooms` from today's inventory), Price/night, Availability toggle.

**Toggle:** `POST /api/rooms/toggle-availability { roomId }` → re-fetch.  
**`getAmenitiesDisplay()`** normalizes both array and object amenity formats.

---

## Components

### `Navbar.jsx`
- Hidden on `/owner/*` (returns `null`).
- Transparent on `/` when not scrolled; white + shadow when scrolled or on other pages.
- Shows "List Your Hotel" (non-owners) or "Dashboard" (owners).
- Avatar: first letter of `user.username` or `user.image`.
- Dropdown: My Bookings + Dashboard (owners) + Logout.
- Mobile: hamburger + full-screen overlay.

### `Hero.jsx`
- Local state: `destination` (text input).
- On submit: `navigate(/rooms?destination=...)` + `POST /api/user/recent-searched-cities`.
- Check-in, check-out, and guests inputs are wired to URL query params and filter results in AllRooms.

### `FeaturedDestination.jsx`
- Renders first 4 rooms from context. Only renders if `rooms.length > 0`.

### `RecommendedHotels.jsx`
- Renders rooms filtered by `searchedCities` from context. Only renders if results exist.

### `HotelCard.jsx`
- Reusable card: `room.images[0]`, `room.hotel.name`, `room.hotel.address`, `room.pricePerNight`.
- Renders a static 4.5 star rating UI since ratings are not in the schema.
- Links to `/rooms/${room._id}`.

### `HotelReg.jsx`
- Modal overlay, shown when `showHotelReg === true`.
- Fields: `name, contact, address, city`.
- `POST /api/hotels` → sets `isOwner(true)`, closes modal.

### `Loader.jsx`
- Reads `nextUrl` from `/loader/:nextUrl`.
- Waits 8 seconds, then navigates to `/${nextUrl}`.
- Used for post-Stripe redirect buffer.

### `components/AllRooms/DetailRoomInfo.jsx`
Horizontal room card in AllRooms listing. Fields: image, city, hotel name, address, amenities (normalized), price. Links to `/rooms/${room._id}`.

### `components/HotelOwner/NavBar.jsx`
Owner dashboard top nav. Avatar + dropdown (username, My Bookings, Logout).

### `components/HotelOwner/SideBar.jsx`
Owner left sidebar. NavLinks: Dashboard (`/owner`), Add Room (`/owner/Addroom`), List Room (`/owner/Listroom`).

### `components/Title.jsx`
Props: `title`, `subtitle`, `align` ("left" | "center"), `font`. All dynamic.

### `components/Footer.jsx`
Entirely static. Social links `href="#"`. Copyright hardcoded as "2025".

---

## Static vs Dynamic Field Reference

### Dynamic (API-driven)
- Room images, hotel names, addresses, cities
- Room types, prices, amenities
- User username, email (navbars, dropdowns)
- Booking details (dates, guests, rooms count, amount, status, payment status)
- Dashboard stats (totalBookings, totalRevenue), recent bookings table
- Recommended hotels (filtered by searched cities)
- Featured destinations (first 4 rooms from API)
- Room availability toggle state, `availableCount`
- Auth flow (email in OTP step, OTP digits, cooldown timer)

### Static (hardcoded in source)
- Nav links: Home, Hotels, Experience, About
- Hero headline and subtext
- Room type options in Addroom form
- Amenity options in Addroom form
- Filter options in AllRooms
- Star rating in RoomDetails (`"4 stars, 200+ reviews"`) — **hardcoded**
- Footer copyright year (`"2025"`)
- Social links in footer (`href="#"`)
- `HotelCard` star rating uses `room.hotel.rating` — **not in DB schema**
- Hero check-in, check-out, guests inputs — **not functionally wired**
