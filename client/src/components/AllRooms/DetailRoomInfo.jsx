import React from "react";
import { MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

function DetailRoomInfo({ room, index }) {
  const navigate = useNavigate();

  

  return (
    <div
      className="flex flex-col md:flex-row gap-6 bg-white rounded-2xl shadow-md overflow-hidden p-4 cursor-pointer hover:shadow-lg transition"
      onClick={()=> navigate(`/rooms/${room._id}`)}
    >
      {/* Left Column: Image */}
      <div className="w-full md:w-1/2">
        <img
          src={room.images[0]}
          alt={room.hotel.name}
          className="w-full h-60 object-cover rounded-xl"
        />
      </div>

      {/* Right Column: Info */}
      <div className="flex flex-col justify-between flex-1 text-left">
        <div className="space-y-3">
          {/* City */}
          <p className="text-sm text-gray-500">{room.hotel.city}</p>

          {/* Hotel Name */}
          <h2 className="text-xl font-semibold text-gray-800">
            {index + 1}. {room.hotel.name}
          </h2>

          {/* Rating */}
          {/* <div className="flex items-center gap-2 text-sm">
            <span className="text-orange-500">
              {"★".repeat(room.rating)}{"☆".repeat(5 - room.rating)}
            </span>
            <span className="text-gray-600">{room.reviews}+ reviews</span>
          </div> */}

          {/* Address */}
          <div className="flex items-center gap-2 text-gray-600 text-sm">
            <MapPin size={16} />
            <span>{room.hotel.address}</span>
          </div>

          {/* Amenities */}
          <div className="flex flex-wrap gap-2">
            {room.amenities.map((item, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg border"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Price */}
        <p className="mt-5 text-lg font-semibold text-gray-900">
          ${room.pricePerNight}{" "}
          <span className="text-sm font-normal text-gray-600">/night</span>
        </p>
      </div>
    </div>
  );
}

export default DetailRoomInfo;
