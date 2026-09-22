import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { FaMapMarkerAlt, FaConciergeBell, FaMountain, FaSwimmer, FaWifi, FaCoffee, FaUserFriends, FaDoorOpen } from "react-icons/fa";

import { useAppContext } from "../context/appContext.jsx";
import toast from "react-hot-toast";

const RoomDetails = () => {
    const { id } = useParams();
    const { axios, rooms, navigate, user } = useAppContext();
    const [room, setRoom] = useState(null);
    const [selectedImg, setSelectedImg] = useState(null);
    const [checkInDate, setCheckInDate] = useState("");
    const [checkOutDate, setCheckOutDate] = useState("");
    const [guests, setGuests] = useState(1);
    const [numberOfRooms, setNumberOfRooms] = useState(1);
    const [isAvailable, setIsAvailable] = useState(false);
    const [availableRooms, setAvailableRooms] = useState(0);
    const [isBooking, setIsBooking] = useState(false);

    // Reset availability check whenever booking inputs change.
    const resetAvailability = () => {
        setIsAvailable(false);
        setAvailableRooms(0);
    };

    const checkAvailability = async () => {
        if (!checkInDate || !checkOutDate) {
            return toast.error("Please select check-in and check-out dates");
        }
        const maxGuests = room.maxGuests * numberOfRooms;
        if (guests > maxGuests) {
            return toast.error(`${numberOfRooms} room(s) accommodate a maximum of ${maxGuests} guests (${room.maxGuests} per room)`);
        }
        try {
            const { data } = await axios.post("/api/bookings/check-availability", {
                roomTypeId: id,
                checkInDate,
                checkOutDate,
                numberOfRooms,
            });
            if (data.success) {
                setAvailableRooms(data.availableRooms ?? 0);
                if (data.isAvailable) {
                    setIsAvailable(true);
                    toast.success(`${numberOfRooms} room(s) available — click Book Now to proceed`);
                } else if (data.availableRooms > 0) {
                    // Partial availability — ask user if they want fewer rooms.
                    setIsAvailable(false);
                    toast(
                        (t) => (
                            <div className="flex flex-col gap-2">
                                <p className="font-semibold text-gray-800">
                                    Only <span className="text-blue-600">{data.availableRooms}</span> room(s) available for these dates.
                                </p>
                                <p className="text-sm text-gray-600">Would you like to book {data.availableRooms} room(s) instead?</p>
                                <div className="flex gap-2 mt-1">
                                    <button
                                        className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                                        onClick={() => {
                                            toast.dismiss(t.id);
                                            setNumberOfRooms(data.availableRooms);
                                            setIsAvailable(true);
                                        }}
                                    >
                                        Yes, book {data.availableRooms}
                                    </button>
                                    <button
                                        className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                                        onClick={() => toast.dismiss(t.id)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ),
                        { duration: 10000 }
                    );
                } else {
                    setIsAvailable(false);
                    toast.error("No rooms available for the selected dates");
                }
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    const onSubmitHandler = async (e) => {
        e.preventDefault();
        if (!isAvailable) {
            return checkAvailability();
        }

        if (!user) {
            toast.error("Please log in to book a room");
            return navigate("/auth");
        }

        const maxGuests = room.maxGuests * numberOfRooms;
        if (guests > maxGuests) {
            return toast.error(`${numberOfRooms} room(s) accommodate a maximum of ${maxGuests} guests`);
        }

        setIsBooking(true);
        try {
            // Step 1: Create the booking (payment_pending status).
            const { data } = await axios.post("/api/bookings/book", {
                roomTypeId: id,
                checkInDate,
                checkOutDate,
                guests,
                numberOfRooms,
            });

            if (!data.success) {
                // Partial availability surfaced from the server side.
                if (data.availableRooms > 0) {
                    toast(
                        (t) => (
                            <div className="flex flex-col gap-2">
                                <p className="font-semibold text-gray-800">
                                    Only <span className="text-blue-600">{data.availableRooms}</span> room(s) left.
                                </p>
                                <p className="text-sm text-gray-600">Book {data.availableRooms} room(s) instead?</p>
                                <div className="flex gap-2 mt-1">
                                    <button
                                        className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                                        onClick={() => {
                                            toast.dismiss(t.id);
                                            setNumberOfRooms(data.availableRooms);
                                            setIsAvailable(true);
                                        }}
                                    >
                                        Yes, book {data.availableRooms}
                                    </button>
                                    <button
                                        className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                                        onClick={() => toast.dismiss(t.id)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ),
                        { duration: 10000 }
                    );
                } else {
                    toast.error(data.message);
                }
                return;
            }

            // Step 2: Redirect to Stripe checkout.
            const bookingId = data.booking?.id;
            if (!bookingId) {
                toast.error("Booking created but ID missing — contact support");
                return;
            }

            const { data: payData } = await axios.post("/api/bookings/stripe-payment", { bookingId });
            if (payData.success) {
                window.location.href = payData.url;
            } else {
                toast.error(payData.message || "Could not initiate payment");
                navigate("/my-bookings");
            }

        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsBooking(false);
        }
    };

    useEffect(() => {
        const temp = rooms.find((r) => String(r.id) === String(id));
        temp && setRoom(temp);
        temp && setSelectedImg(temp.images[0]);
    }, [rooms]);

    if (!room) {
        return (
            <div className="max-w-4xl mx-auto p-6 text-center">
                <h1 className="text-2xl font-bold text-red-600">Room not found</h1>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 mt-20 text-left">
            {/* Hotel Info */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold">
                    {room.hotel.name}{" "}
                    <span className="text-lg font-normal">({room.roomType})</span>
                </h1>

                {/* Reviews + Location */}
                <div className="flex items-center gap-4 mt-2 text-gray-600">
                    {/* Address */}
                    <div className="flex items-center gap-1">
                        <FaMapMarkerAlt className="text-orange-500" />
                        <p>{room.hotel.address}</p>
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
            <div className="mt-4 text-2xl font-bold">${Number(room.pricePerNight).toFixed(2)}/night per room</div>

            {/* Amenities & Capacity */}
            <h2 className="text-xl font-semibold mt-6">Experience Luxury Like Never Before</h2>
            <div className="flex flex-wrap gap-3 mt-3">
                <span className="px-4 py-2 border rounded-lg text-blue-700 bg-blue-50 flex items-center gap-2 font-medium">
                    <FaUserFriends /> Up to {room.maxGuests} Guests per Room
                </span>
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
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 flex-wrap">
                    {/* Check-In */}
                    <div className="flex flex-col flex-1 min-w-[130px]">
                        <label className="text-gray-600 font-semibold mb-1">Check-In</label>
                        <input
                            type="date"
                            className="border rounded-lg p-2 w-full"
                            onChange={(e) => { setCheckInDate(e.target.value); resetAvailability(); }}
                            value={checkInDate}
                            min={new Date().toISOString().split("T")[0]}
                        />
                    </div>

                    {/* Divider */}
                    <div className="hidden md:block h-12 w-px bg-gray-300"></div>

                    {/* Check-Out */}
                    <div className="flex flex-col flex-1 min-w-[130px]">
                        <label className="text-gray-600 font-semibold mb-1">Check-Out</label>
                        <input
                            type="date"
                            className="border rounded-lg p-2 w-full"
                            onChange={(e) => { setCheckOutDate(e.target.value); resetAvailability(); }}
                            min={checkInDate}
                            disabled={!checkInDate}
                            value={checkOutDate}
                        />
                    </div>

                    {/* Divider */}
                    <div className="hidden md:block h-12 w-px bg-gray-300"></div>

                    {/* Number of Rooms */}
                    <div className="flex flex-col w-32">
                        <label className="text-gray-600 font-semibold mb-1 flex items-center gap-1">
                            <FaDoorOpen className="text-gray-500" /> Rooms
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={room.availableCount || 20}
                            className="border rounded-lg p-2"
                            onChange={(e) => { setNumberOfRooms(Math.max(1, Number(e.target.value))); resetAvailability(); }}
                            value={numberOfRooms}
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
                            max={room.maxGuests * numberOfRooms}
                            className="border rounded-lg p-2"
                            onChange={(e) => setGuests(Number(e.target.value))}
                            value={guests}
                        />
                    </div>

                    {/* Button */}
                    <button
                        className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 w-full md:w-auto disabled:opacity-60 disabled:cursor-not-allowed"
                        onClick={onSubmitHandler}
                        disabled={isBooking}
                    >
                        {isBooking ? "Processing…" : isAvailable ? "Book Now & Pay" : "Check Availability"}
                    </button>
                </div>

                {/* Capacity hint */}
                <p className="text-xs text-gray-400 mt-3">
                    {numberOfRooms} room(s) × {room.maxGuests} max guests = up to {room.maxGuests * numberOfRooms} guests total
                    {" · "} ${(Number(room.pricePerNight) * numberOfRooms).toFixed(2)}/night total
                </p>
            </div>

            {/* Host Info */}
            <div className="mt-8 flex items-center justify-between p-4 border rounded-xl">
                <div className="flex items-center gap-4">
                    <img
                        src={room.hotel.owner.image}
                        alt={room.hotel.owner.username}
                        className="w-16 h-16 rounded-full"
                    />
                    <div>
                        <h3 className="font-semibold">Hosted by {room.hotel.owner.username}</h3>
                    </div>
                </div>
                <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                    Contact Now
                </button>
            </div>
        </div>
    );
};

export default RoomDetails;