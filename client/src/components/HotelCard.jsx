import { FaStar } from "react-icons/fa";
import { Link } from "react-router-dom";

const HotelCard = ({ room, index }) => {
  return (
    <Link
      to={"/rooms/" + room._id}
      onClick={() => scrollTo(0, 0)}
      key={room._id}
      className="rounded-2xl overflow-hidden shadow-lg w-80 bg-white transform transition-transform duration-300 hover:scale-98 hover:shadow-md"
    >
      <div>
        {/* Hotel Image */}
        <img
          src={room.images[0]}
          alt={room.hotel.name}
          className="w-full h-48 object-cover"
        />

        <div className="p-4 space-y-3">
          {/* Hotel Name & Rating */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">
              {room.hotel.name}
            </h2>
            <div className="flex items-center text-orange-500">
              <FaStar className="w-4 h-4" />
              <span className="ml-1 text-sm font-medium">
                {room.hotel.rating}
              </span>
            </div>
          </div>

          {/* address */}
          <p className="text-gray-500 text-sm">{room.hotel.address}</p>

          {/* Price & Button */}
          <div className="flex justify-between items-center pt-2">
            <p className="text-lg font-bold text-gray-800">
              ${room.pricePerNight}
              <span className="text-sm text-gray-500"> / night</span>
            </p>
            <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-xl text-sm font-medium">
              View Details
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default HotelCard;
