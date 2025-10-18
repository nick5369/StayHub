import React, { useState } from "react";
import { roomsDummyData } from "../assets/assets";
import Title from "../components/Title";
import HotelCard from "../components/HotelCard";
import Filters from "../components/AllRooms/Filters";
import DetailRoomInfo from "../components/AllRooms/DetailRoomInfo";
import { useAppContext } from "../context/appContext";
import { useSearchParams } from "react-router-dom";

const AllHotels = () => {

  const { rooms, currency } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [openFilters, setOpenFilters] = useState(false);
  // store selected room type strings, e.g. ["Single Bed", "Luxury Room"]
  const [popularFilters, setPopularFilters] = useState([]);

  const [priceRange, setPriceRange] = useState({
    p1: false,
    p2: false,
    p3: false,
    p4: false,
  });

  // State for radio
  const [sortBy, setSortBy] = useState("");

  // Clear all filters
  const clearFilters = () => {
    setPopularFilters([]);
    setPriceRange({ p1: false, p2: false, p3: false, p4: false });
    setSortBy("");
  };

  const matchesRoomType = (room) =>{
    // if no type filters selected, every room matches
    if (!Array.isArray(popularFilters) || popularFilters.length === 0) return true;
    // compare against the roomType property used across the app
    return popularFilters.includes(room.roomType);
  }

  

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
          {Array.isArray(roomsDummyData) && roomsDummyData.length > 0 ? (
            roomsDummyData.map((room, index) => (
              <DetailRoomInfo key={room._id} room={room} index={index} />
            ))
          ) : (
            <div className="text-gray-500">No rooms available.</div>
          )}
        </div>

        {/* Filters Sidebar */}
        <aside className="lg:col-span-1 bg-white rounded-xl shadow-sm border p-6 h-fit">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:underline"
            >
              Clear
            </button>
          </div>

          {/* Popular Filters */}
          <div className="mb-6">
            <p className="font-medium text-gray-700 mb-2">Popular filters</p>
            <div className="flex flex-col gap-2 text-sm text-gray-600">
              <label>
                <input
                  type="checkbox"
                  checked={popularFilters.includes('Single Bed')}
                  onChange={() => {
                    setPopularFilters((prev) =>
                      prev.includes('Single Bed') ? prev.filter(p => p !== 'Single Bed') : [...prev, 'Single Bed']
                    );
                  }}
                  className="mr-2"
                />
                Single Bed
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={popularFilters.includes('Double Bed')}
                  onChange={() => {
                    setPopularFilters((prev) =>
                      prev.includes('Double Bed') ? prev.filter(p => p !== 'Double Bed') : [...prev, 'Double Bed']
                    );
                  }}
                  className="mr-2"
                />
                Double Bed
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={popularFilters.includes('Luxury Room')}
                  onChange={() => {
                    setPopularFilters((prev) =>
                      prev.includes('Luxury Room') ? prev.filter(p => p !== 'Luxury Room') : [...prev, 'Luxury Room']
                    );
                  }}
                  className="mr-2"
                />
                Luxury Room
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={popularFilters.includes('Family Suite')}
                  onChange={() => {
                    setPopularFilters((prev) =>
                      prev.includes('Family Suite') ? prev.filter(p => p !== 'Family Suite') : [...prev, 'Family Suite']
                    );
                  }}
                  className="mr-2"
                />
                Family Suite
              </label>
            </div>
          </div>

          {/* Price Range */}
          <div className="mb-6">
            <p className="font-medium text-gray-700 mb-2">Price Range</p>
            <div className="flex flex-col gap-2 text-sm text-gray-600">
              <label>
                <input
                  type="checkbox"
                  checked={priceRange.p1}
                  onChange={() =>
                    setPriceRange((prev) => ({ ...prev, p1: !prev.p1 }))
                  }
                  className="mr-2"
                />
                $0 to 500
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={priceRange.p2}
                  onChange={() =>
                    setPriceRange((prev) => ({ ...prev, p2: !prev.p2 }))
                  }
                  className="mr-2"
                />
                $500 to 1000
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={priceRange.p3}
                  onChange={() =>
                    setPriceRange((prev) => ({ ...prev, p3: !prev.p3 }))
                  }
                  className="mr-2"
                />
                $1000 to 2000
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={priceRange.p4}
                  onChange={() =>
                    setPriceRange((prev) => ({ ...prev, p4: !prev.p4 }))
                  }
                  className="mr-2"
                />
                $2000 to 3000
              </label>
            </div>
          </div>

          {/* Sort By */}
          <div>
            <p className="font-medium text-gray-700 mb-2">Sort By</p>
            <div className="flex flex-col gap-2 text-sm text-gray-600">
              <label>
                <input
                  type="radio"
                  name="sort"
                  checked={sortBy === "low"}
                  onChange={() => setSortBy("low")}
                  className="mr-2"
                />
                Price Low to High
              </label>
              <label>
                <input
                  type="radio"
                  name="sort"
                  checked={sortBy === "high"}
                  onChange={() => setSortBy("high")}
                  className="mr-2"
                />
                Price High to Low
              </label>
              <label>
                <input
                  type="radio"
                  name="sort"
                  checked={sortBy === "new"}
                  onChange={() => setSortBy("new")}
                  className="mr-2"
                />
                Newest First
              </label>
            </div>
          </div>
        </aside>


      </div>
    </div>
  );
};

export default AllHotels;