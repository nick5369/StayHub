import React, { useEffect, useState } from 'react';
import Title from '../components/Title';
import { facilityIcons } from '../assets/assets';
import { useAppContext } from '../context/appContext';
import toast from 'react-hot-toast';

// ── Status badge config ───────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:   { label: 'Pending',   classes: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confirmed', classes: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', classes: 'bg-gray-100  text-gray-500'  },
};

const BookIcon = () => (
  <svg
    className="w-6 h-6 text-gray-700"
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    fill="none"
    viewBox="0 0 24 24"
  >
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M5 19V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v13H7a2 2 0 0 0-2 2Zm0 0a2 2 0 0 0 2 2h12M9 3v14m7 0v4"
    />
  </svg>
);

const MyBookings = () => {

  const { axios, user } = useAppContext();
  const [bookings, setBookings] = useState([]);

  const fetchUserBookings = async () => {
    try {
      const { data } = await axios.get('/api/bookings/user')
      if (data.success) {
        setBookings(data.bookings)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handlePayment = async (bookingId) => {
    try {
      const {data} = await axios.post('/api/bookings/stripe-payment', {bookingId})
      if(data.success){
        window.location.href = data.url;
      }else{
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleCancel = async (bookingId) => {
    try {
      const { data } = await axios.post(`/api/bookings/${bookingId}/cancel`);
      if (data.success) {
        toast.success(data.message);
        fetchUserBookings();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserBookings();
    }
  }, [user])

  return (
    <div className="max-w-6xl mx-auto p-6 mt-20">
      <Title
        title="My Bookings"
        subtitle="Easily manage your past, current, and upcoming hotel reservations in one place. Plan your trips seamlessly with just a few clicks."
        align="left"
      />

      {bookings.length === 0 ? (
        <p className="text-gray-500">No bookings available.</p>
      ) : (
        <div className="space-y-6">
          {bookings.map((booking) => {
            const isCancelled = booking.status === 'cancelled';
            const statusCfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;

            return (
              <div
                key={booking.id}
                className={`flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 ${isCancelled ? 'opacity-60' : ''}`}
              >
                {/* Left section: Image */}
                <div className="w-full md:w-36 flex-shrink-0">
                  <img
                    src={booking.room.images[0]}
                    alt={booking.room.roomType}
                    className={`w-full h-28 md:h-36 object-cover rounded-lg ${isCancelled ? 'grayscale' : ''}`}
                  />
                </div>

                {/* Middle section: Booking info */}
                <div className="flex-1 mt-4 md:mt-0 md:ml-6 space-y-2">
                  <h3 className={`font-semibold text-lg ${isCancelled ? 'line-through text-gray-400' : ''}`}>
                    {booking.room.roomType}
                  </h3>
                  <p className="text-gray-700 font-medium">{booking.hotel.name}</p>
                  <p className="text-gray-500 text-sm">{booking.hotel.address}</p>
                  <p className="text-gray-500 text-sm">
                    Guests: <span className="font-medium">{booking.guests}</span> | Check-in:{" "}
                    <span className="font-medium">{new Date(booking.checkInDate).toLocaleDateString()}</span> | Check-out:{" "}
                    <span className="font-medium">{new Date(booking.checkOutDate).toLocaleDateString()}</span>
                  </p>

                  {/* Amenities Icons */}
                  <div className="flex items-center space-x-2 mt-1">
                    {booking.room.amenities.map((amenity) => (
                      <img
                        key={amenity}
                        src={facilityIcons[amenity]}
                        alt={amenity}
                        title={amenity}
                        className="w-6 h-6"
                      />
                    ))}
                  </div>
                </div>

                {/* Right section: Payment & status */}
                <div className="mt-4 md:mt-0 text-right flex flex-col items-end space-y-2">
                  <p className="font-semibold text-lg">Total: ${Number(booking.totalPrice).toFixed(2)}</p>

                  {/* Payment badge */}
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${booking.isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {booking.isPaid ? 'Paid' : 'Unpaid'}
                  </span>

                  {/* Booking status badge */}
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusCfg.classes}`}>
                    {statusCfg.label}
                  </span>

                  {/* Pay Now — hidden for cancelled bookings */}
                  {!booking.isPaid && !isCancelled && (
                    <button
                      id={`pay-now-${booking.id}`}
                      onClick={() => handlePayment(booking.id)}
                      className="mt-2 px-5 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
                    >
                      Pay Now
                    </button>
                  )}

                  {/* Cancel button — only for non-cancelled bookings */}
                  {!isCancelled && (
                    <button
                      id={`cancel-booking-${booking.id}`}
                      onClick={() => handleCancel(booking.id)}
                      className="px-5 py-2 border border-red-300 text-red-500 rounded-full hover:bg-red-50 transition text-sm"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyBookings;
