import React, { useState } from "react";
import { useParams } from "react-router-dom";

import { FaMapMarkerAlt, FaConciergeBell, FaMountain, FaSwimmer, FaWifi, FaCoffee } from "react-icons/fa";
import { hotelDummyData, roomsDummyData, userDummyData } from "../assets/assets";

const RoomDetails = () => {
    const { id } = useParams();
    const room = roomsDummyData.find((r) => String(r._id) === String(id));

    if (!room) {
        return (
            <div className="max-w-4xl mx-auto p-6 text-center">
                <h1 className="text-2xl font-bold text-red-600">Room not found</h1>
            </div>
        );
    }

    const [selectedImg, setSelectedImg] = useState(room.images[0]);

    return (
        <div className="max-w-6xl mx-auto p-6 mt-20 text-left">
            {/* Hotel Info */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold">
                    {hotelDummyData.name}{" "}
                    <span className="text-lg font-normal">({room.roomType})</span>
                </h1>

                {/* Reviews + Location */}
                <div className="flex items-center gap-4 mt-2 text-gray-600">
                    {/* Stars + Reviews */}
                    <div className="flex items-center gap-2">
                        <p className="text-orange-500 text-lg">★★★★☆</p>
                        <span>200+ reviews</span>
                    </div>

                    {/* Address */}
                    <div className="flex items-center gap-1">
                        <FaMapMarkerAlt className="text-orange-500" />
                        <p>{hotelDummyData.address}</p>
                    </div>
                </div>
            </div>




            {/* Image Gallery */}
            <div className="grid grid-cols-3 gap-4">
                {/* Big Image on the left (takes 2 columns) */}
                <div className="col-span-2">
                    <img
                        src={selectedImg}
                        alt="Room"
                        className="w-full h-[400px] object-cover rounded-xl"
                    />
                </div>

                {/* Thumbnails on the right (stacked in grid) */}
                <div className="grid grid-cols-2 gap-4">
                    {room.images.map((img, idx) => (
                        <img
                            key={idx}
                            src={img}
                            alt={`Room ${idx}`}
                            className={`w-full h-[190px] object-cover rounded-xl cursor-pointer ${selectedImg === img ? "ring-4 ring-orange-500" : ""
                                }`}
                            onClick={() => setSelectedImg(img)}
                        />
                    ))}
                </div>
            </div>


            {/* Price */}
            <div className="mt-4 text-2xl font-bold">${room.pricePerNight}/night</div>

            {/* Amenities */}
            <h2 className="text-xl font-semibold mt-6">Experience Luxury Like Never Before</h2>
            <div className="flex flex-wrap gap-3 mt-3">
                {room.amenities.map((amenity, idx) => (
                    <span
                        key={idx}
                        className="px-4 py-2 border rounded-lg text-gray-700 flex items-center gap-2"
                    >
                        {amenity === "Room Service" && <FaConciergeBell />}
                        {amenity === "Mountain View" && <FaMountain />}
                        {amenity === "Pool Access" && <FaSwimmer />}
                        {amenity === "Free WiFi" && <FaWifi />}
                        {amenity === "Free Breakfast" && <FaCoffee />}
                        {amenity}
                    </span>
                ))}
            </div>

            {/* Booking Form */}
            <div className="mt-6 bg-white shadow-md p-6 rounded-xl">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    {/* Check-In */}
                    <div className="flex flex-col flex-1">
                        <label className="text-gray-600 font-semibold mb-1">Check-In</label>
                        <input
                            type="date"
                            className="border rounded-lg p-2 w-full"
                            placeholder="dd/mm/yyyy"
                        />
                    </div>

                    {/* Divider */}
                    <div className="hidden md:block h-12 w-px bg-gray-300"></div>

                    {/* Check-Out */}
                    <div className="flex flex-col flex-1">
                        <label className="text-gray-600 font-semibold mb-1">Check-Out</label>
                        <input
                            type="date"
                            className="border rounded-lg p-2 w-full"
                            placeholder="dd/mm/yyyy"
                        />
                    </div>

                    {/* Divider */}
                    <div className="hidden md:block h-12 w-px bg-gray-300"></div>

                    {/* Guests */}
                    <div className="flex flex-col w-28">
                        <label className="text-gray-600 font-semibold mb-1">Guests</label>
                        <input
                            type="number"
                            min={1}
                            defaultValue={1}
                            className="border rounded-lg p-2"
                        />
                    </div>

                    {/* Button */}
                    <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 w-full md:w-auto">
                        Check Availability
                    </button>
                </div>
            </div>


            {/* Host Info */}
            <div className="mt-8 flex items-center justify-between p-4 border rounded-xl">
                <div className="flex items-center gap-4">
                    <img
                        src={userDummyData.image}
                        alt={userDummyData.username}
                        className="w-16 h-16 rounded-full"
                    />
                    <div>
                        <h3 className="font-semibold">Hosted by {hotelDummyData.name}</h3>
                        <p className="text-orange-500">★★★★☆ 200+ reviews</p>
                    </div>
                </div>
                <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                    Contact Now
                </button>
            </div>
        </div>
    );
}

export default RoomDetails;