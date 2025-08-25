import React from "react";
import { roomsDummyData } from "../assets/assets";
import Title from "../components/Title";
import HotelCard from "../components/HotelCard";

const AllHotels = () => {
  return (
    <div className="px-6 py-24 bg-slate-50"> {/* extra top padding so title isn’t hidden */}
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
            <HotelCard key={room._id} room={room} index={index} />
          ))}
        </div>

        {/* Filters Sidebar */}
        <aside className="lg:col-span-1 bg-white rounded-xl shadow-sm border p-6 h-fit">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Filters</h3>

          {/* Example Filter Section */}
          <div className="mb-6">
            <p className="font-medium text-gray-700 mb-2">Popular Hotels</p>
            <div className="flex flex-col gap-2 text-sm text-gray-600">
              <label><input type="checkbox" className="mr-2" /> Grand Resort</label>
              <label><input type="checkbox" className="mr-2" /> Regal Palace</label>
              <label><input type="checkbox" className="mr-2" /> Skyline Luxe</label>
            </div>
          </div>

          <div>
            <p className="font-medium text-gray-700 mb-2">Price</p>
            <div className="flex flex-col gap-2 text-sm text-gray-600">
              <label><input type="checkbox" className="mr-2" /> $100 - $150</label>
              <label><input type="checkbox" className="mr-2" /> $150 - $200</label>
              <label><input type="checkbox" className="mr-2" /> $200 - $300</label>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AllHotels;
