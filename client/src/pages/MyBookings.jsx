import React, { useEffect, useState } from 'react';
import Title from '../components/Title';
import { userBookingsDummyData, facilityIcons } from '../assets/assets';
import { useAppContext } from '../context/appContext';
import toast from 'react-hot-toast';

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

  const {axios,getToken, user} = useAppContext();
  const [bookings, setBookings] = useState([]);

  const fetchUserBookings = async()=>{
    try {
      const {data} = await axios.get('/api/bookings/user',{
        headers : {
          Authorization : `Bearer ${await getToken()}`
        }
      })
      if(data.success){
        setBookings(data.bookings)
      } else{
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(()=>{
    if(user){
      fetchUserBookings();
    }
  }, [user])

  const handlePayNow = (bookingId) => {
    alert(`Redirecting to payment for booking ID: ${bookingId}`);
  };

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
          {bookings.map((booking) => (
            <div
              key={booking._id}
              className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300"
            >
              {/* Left section: Image */}
              <div className="w-full md:w-36 flex-shrink-0">
                <img
                  src={booking.room.images[0]}
                  alt={booking.room.roomType}
                  className="w-full h-28 md:h-36 object-cover rounded-lg"
                />
              </div>

              {/* Middle section: Booking info */}
              <div className="flex-1 mt-4 md:mt-0 md:ml-6 space-y-2">
                <h3 className="font-semibold text-lg">{booking.room.roomType}</h3>
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
                <p className="font-semibold text-lg">Total: ${booking.totalPrice}</p>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    booking.isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {booking.isPaid ? "Paid" : "Unpaid"}
                </span>
                {!booking.isPaid && (
                  <button
                    onClick={() => handlePayNow(booking._id)}
                    className="mt-2 px-5 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
                  >
                    Pay Now
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookings;
