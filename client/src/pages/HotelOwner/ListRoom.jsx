import React, { useState } from "react";
import { roomsDummyData } from "../../assets/assets";
import Title from "../../components/Title";

const ListRoom = () => {
  const [rooms, setRooms] = useState(roomsDummyData);

  const handleToggle = (id) => {
    setRooms((prev) =>
      prev.map((room) =>
        room._id === id ? { ...room, isAvailable: !room.isAvailable } : room
      )
    );
  };

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
              <th className="p-3 text-center w-1/4">Name</th>
              <th className="p-3 text-center w-1/3">Facility</th>
              <th className="p-3 text-center w-1/4">Price / night</th>
              {/* removed w-24 so column width auto fits */}
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr
                key={room._id}
                className="border-b last:border-0 text-sm text-gray-600"
              >
                <td className="p-3 text-center align-middle">{room.roomType}</td>
                <td className="p-3 text-center align-middle">
                  {room.amenities.join(", ")}
                </td>
                <td className="p-3 text-center align-middle">
                  {room.pricePerNight}
                </td>
                <td className="p-3 text-center align-middle">
                  <button
                    onClick={() => handleToggle(room._id)}
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
