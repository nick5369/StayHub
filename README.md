# StayHub - Hotel Booking Platform

🔗 **Live Demo:** [https://stay-hub-frontend.vercel.app/](https://stay-hub-frontend.vercel.app/)

A full-stack hotel booking application built with React, Node.js, Express, and MongoDB. StayHub allows users to browse hotels, book rooms, and manage bookings, while hotel owners can list and manage their properties.

## 🌟 Features

### For Users
- Browse available hotels and rooms
- Search rooms by destination
- Filter rooms by type and price range
- View detailed room information with amenities
- Book rooms with availability checking
- View booking history
- Secure authentication with Clerk
- Email notifications for bookings
- Stripe payment integration

### For Hotel Owners
- Register and manage hotels
- Add and list rooms with details
- Toggle room availability
- View dashboard with booking analytics
- Track total bookings and revenue

## 🛠️ Tech Stack

### Frontend
- **React** - UI framework
- **React Router** - Navigation
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Clerk** - Authentication
- **React Hot Toast** - Notifications
- **Lucide React** - Icons

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **Clerk Express** - Authentication middleware
- **Stripe** - Payment processing
- **Nodemailer** - Email service (Brevo SMTP)
- **Cloudinary** - Image storage
- **Multer** - File upload handling

## 📁 Project Structure

```
StayHub/
├── client/                 # Frontend application
│   ├── public/
│   ├── src/
│   │   ├── assets/        # Images and static files
│   │   ├── components/    # React components
│   │   ├── context/       # Context API for state management
│   │   ├── pages/         # Page components
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env               # Frontend environment variables
│   ├── package.json
│   └── vite.config.js
│
└── server/                # Backend application
    ├── configs/           # Configuration files
    │   ├── cloudinary.js
    │   ├── db.js
    │   └── nodemailer.js
    ├── controllers/       # Route controllers
    │   ├── bookingController.js
    │   ├── clerkWebhooks.js
    │   ├── hotelController.js
    │   ├── roomController.js
    │   ├── stripeWebhooks.js
    │   └── userController.js
    ├── middlewares/       # Custom middlewares
    │   ├── authMiddleware.js
    │   └── uploadMiddleware.js
    ├── models/            # Mongoose schemas
    │   ├── Booking.js
    │   ├── Hotel.js
    │   ├── Room.js
    │   └── User.js
    ├── routes/            # API routes
    │   ├── bookingRoutes.js
    │   ├── hotelRoutes.js
    │   ├── roomRoutes.js
    │   └── userRoutes.js
    ├── .env              # Backend environment variables
    ├── package.json
    └── server.js         # Entry point
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB Atlas account
- Clerk account
- Cloudinary account
- Brevo account (for emails)
- Stripe account

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/nick5369/StayHub.git
   cd StayHub
   ```

2. Install dependencies
   ```bash
   cd client && npm install
   cd ../server && npm install
   ```

3. Set up environment variables (see `.env.example` files)

4. Run the application
   ```bash
   # Backend
   cd server && npm run server
   
   # Frontend
   cd client && npm run dev
   ```

## 👤 Author

**Nick Patel**
- GitHub: [@nick5369](https://github.com/nick5369)

## ⭐ Show your support

Give a ⭐️ if you like this project!

Give a ⭐️ if this project helped you!
