import React from "react";
import { roomsDummyData } from "../assets/assets";
import Title from "../components/Title";
import HotelCard from "../components/HotelCard";
import Filters from "../components/AllRooms/Filters";
import DetailRoomInfo from "../components/AllRooms/DetailRoomInfo";
import { useNavigate } from "react-router-dom";

const AllHotels = () => {

  const navigate = useNavigate();
  return (
    <div className="px-6 md:px-16 lg:px-24 xl:px-32 py-24 pt-40 bg-slate-50">
      {/* Title Section */}
      <Title
        title="Hotel Rooms"
        subtitle="Take advantage of our limited-time offers and special packages to enhance your stay and create unforgettable memories."
        align="left"
      />



      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 mt-12">
        {/* Hotel Cards Section */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {roomsDummyData.map((room, index) => (
            <DetailRoomInfo key={room._id} room={room} index={index} />
          ))}
        </div>

        {/* Filters Sidebar */}
        <Filters />


      </div>
    </div>
  );
};

export default AllHotels;
