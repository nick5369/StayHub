import React, { useEffect, useState } from "react";
import Title from "../../components/Title";
import { useAppContext } from "../../context/appContext";
import toast from "react-hot-toast";

// ── Block Dates sub-form ──────────────────────────────────────────────────────
const BlockDatesForm = ({ room, axios, onClose }) => {
  const today = new Date().toISOString().split("T")[0];

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [unavailableRooms, setUnavailableRooms] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      return toast.error("Please select both start and end dates");
    }
    if (new Date(startDate) >= new Date(endDate)) {
      return toast.error("End date must be after start date");
    }
    setLoading(true);
    try {
      const { data } = await axios.post("/api/rooms/block-dates", {
        roomTypeId: room.id,
        startDate,
        endDate,
        unavailableRooms,
      });
      if (data.success) {
        toast.success(data.message);
        onClose();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Could not block dates");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-3 text-left">
      <h3 className="font-semibold text-amber-800 mb-3 text-sm">
        Block Rooms — <span className="font-normal">{room.name}</span>
      </h3>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Start Date</label>
          <input
            type="date"
            min={today}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">End Date <span className="text-gray-400">(exclusive)</span></label>
          <input
            type="date"
            min={startDate || today}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            disabled={!startDate}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Rooms to Block <span className="text-gray-400">(max {room.totalRooms ?? "?"})</span></label>
          <input
            type="number"
            min={1}
            max={room.totalRooms ?? 1}
            value={unavailableRooms}
            onChange={(e) => setUnavailableRooms(Math.max(1, Number(e.target.value)))}
            className="border rounded-lg px-3 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-60"
          >
            {loading ? "Blocking…" : "Block"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
      <p className="text-xs text-gray-400 mt-2">
        Blocked rooms won't be bookable for the selected date range. The end date is exclusive (e.g. select Dec 20 – Dec 25 to block 5 nights: Dec 20, 21, 22, 23, 24).
      </p>
    </div>
  );
};

// ── Main ListRoom component ───────────────────────────────────────────────────
const ListRoom = () => {
  const [ownerRooms, setOwnerRooms] = useState([]);
  const [blockingRoomId, setBlockingRoomId] = useState(null); // tracks which row's form is open
  const { axios, user, currency } = useAppContext();

  const fetchOwnerRooms = async () => {
    try {
      const { data } = await axios.get("/api/rooms/owner");
      if (data.success) {
        setOwnerRooms(data.rooms);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Could not fetch rooms");
    }
  };

  const getAmenitiesDisplay = (amenities) => {
    if (!amenities) return "No amenities";

    // If it's an object (like {Free WiFi: true, Pool: false})
    if (typeof amenities === "object" && !Array.isArray(amenities)) {
      const selected = Object.keys(amenities).filter((key) => amenities[key]);
      return selected.length > 0 ? selected.join(", ") : "No amenities";
    }

    // If it's an array
    if (Array.isArray(amenities)) {
      return amenities.length > 0 ? amenities.join(", ") : "No amenities";
    }

    return "No amenities";
  };

  const handleToggle = async (roomId) => {
    try {
      const { data } = await axios.post("/api/rooms/toggle-availability", { roomId });
      if (data.success) {
        fetchOwnerRooms();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Could not toggle room availability");
    }
  };

  useEffect(() => {
    if (user) {
      fetchOwnerRooms();
    }
  }, [user]);

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
              <React.Fragment key={room.id}>
                <tr className="border-b last:border-0 text-sm text-gray-600">
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
                    <div className="flex items-center justify-center gap-3">
                      {/* Availability toggle */}
                      <button
                        onClick={() => handleToggle(room.id)}
                        title={room.isAvailable ? "Click to hide from listings" : "Click to show in listings"}
                        className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
                          room.isAvailable ? "bg-blue-500" : "bg-gray-300"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 bg-white rounded-full shadow-md transform transition ${
                            room.isAvailable ? "translate-x-6" : "translate-x-0"
                          }`}
                        ></div>
                      </button>

                      {/* Block dates button */}
                      <button
                        onClick={() =>
                          setBlockingRoomId((prev) => (prev === room.id ? null : room.id))
                        }
                        title="Block specific dates"
                        className={`px-3 py-1 text-xs font-medium rounded-lg border transition ${
                          blockingRoomId === room.id
                            ? "bg-amber-100 border-amber-400 text-amber-700"
                            : "border-gray-300 text-gray-600 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700"
                        }`}
                      >
                        Block Dates
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Inline Block Dates form */}
                {blockingRoomId === room.id && (
                  <tr className="bg-amber-50">
                    <td colSpan={6} className="px-4 pb-4">
                      <BlockDatesForm
                        room={room}
                        axios={axios}
                        onClose={() => setBlockingRoomId(null)}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListRoom;
