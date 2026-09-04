import React, { useEffect, useState } from "react";
import Title from "../../components/Title";
import { useAppContext } from "../../context/appContext";
import toast from "react-hot-toast";

const ListRoom = () => {
  const [ownerRooms, setOwnerRooms] = useState([]);
  const {axios, user, currency} = useAppContext();

  const fetchOwnerRooms = async() => {
    try {
      const {data} = await axios.get('/api/rooms/owner')
      if(data.success){
        setOwnerRooms(data.rooms);
      }
      else{
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Could not fetch rooms" );
    }
  }

  const getAmenitiesDisplay = (amenities) => {
    if (!amenities) return "No amenities";
    
    // If it's an object (like {Free WiFi: true, Pool: false})
    if (typeof amenities === 'object' && !Array.isArray(amenities)) {
      const selected = Object.keys(amenities).filter(key => amenities[key]);
      return selected.length > 0 ? selected.join(", ") : "No amenities";
    }
    
    // If it's an array
    if (Array.isArray(amenities)) {
      return amenities.length > 0 ? amenities.join(", ") : "No amenities";
    }
    
    return "No amenities";
  }

  const handleToggle = async (roomId) => {
    try {
      const {data} = await axios.post('/api/rooms/toggle-availability',{roomId})
      if(data.success){
        fetchOwnerRooms();
      }
      else{
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Could not toggle room availability");
    }
  };

  useEffect(()=>{
    if(user){
      fetchOwnerRooms();
    }
  },[user])

  return (
    <div className="p-4">
      <Title
        title="Room Listings"
        align="left"
        font="outfit"
        subtitle="View, edit, or manage all listed rooms. Keep the information up-to-date to provide the best experience for users."
      />

      <div className="mt-6 overflow-x-auto">
        <table className="w-full table-fixed border-collapse bg-white rounded-lg shadow">
          <thead>
            <tr className="bg-gray-100 text-sm font-semibold text-gray-700">
              <th className="p-3 text-center">Name</th>
              <th className="p-3 text-center">Facility</th>
              <th className="p-3 text-center">Max Guests</th>
              <th className="p-3 text-center">Units</th>
              <th className="p-3 text-center">Price / night</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ownerRooms.map((room) => (
              <tr
                key={room.id}
                className="border-b last:border-0 text-sm text-gray-600"
              >
                <td className="p-3 text-center align-middle">{room.name}</td>
                <td className="p-3 text-center align-middle">
                  {getAmenitiesDisplay(room.amenities)}
                </td>
                <td className="p-3 text-center align-middle">{room.maxGuests}</td>
                <td className="p-3 text-center align-middle">{room.totalRooms ?? 0}</td>
                <td className="p-3 text-center align-middle">
                  {currency} {Number(room.pricePerNight).toFixed(2)}
                </td>
                <td className="p-3 text-center align-middle">
                  <button
                    onClick={() => handleToggle(room.id)}
                    className={`w-12 h-6 mx-auto flex items-center rounded-full p-1 transition ${
                      room.isAvailable ? "bg-blue-500" : "bg-gray-300"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full shadow-md transform transition ${
                        room.isAvailable ? "translate-x-6" : "translate-x-0"
                      }`}
                    ></div>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListRoom;
