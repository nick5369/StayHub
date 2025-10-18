import React, { useState } from "react";
import Title from "../../components/Title";
import { X } from "lucide-react";
import { useAppContext } from "../../context/appContext";
import toast from "react-hot-toast";

const Addroom = () => {

  const {axios,getToken} = useAppContext();
  const [isLoading,setIsLoading] = useState(false)
  const [Images, setImages] = useState({
    1: null,
    2: null,
    3: null,
    4: null,
  });

  const [Inputs, setInputs] = useState({
    roomType: "",
    pricePerNight: "",
    amenities: {
      "Free WiFi": false,
      "Free Breakfast": false,
      "Room Service": false,
      "Mountain View": false,
      "Pool Access": false,
    },
  });

  const handleInputChange = (e) => {
    const {name,value} = e.target;
    setInputs((prev)=> ({...prev, [name]:value}))
  };

  const handleAmenityChange = (e) => {
    const { name, checked } = e.target;
    setInputs((prev) => ({
      ...prev,
      amenities: {
        ...prev.amenities,
        [name]: checked,
      },
    }));
  };

  const handleImageChange = (e, index) => {
    const file = e.target.files[0];
    if (file) {
      setImages((prev) => ({ ...prev, [index]: file }));
    }
  };

  const removeImage = (index) => {
    setImages((prev) => ({ ...prev, [index]: null }));
  };

  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("roomType", Inputs.roomType);
      formData.append("pricePerNight", Inputs.pricePerNight);
      formData.append("amenities", JSON.stringify(Inputs.amenities));
      Object.values(Images).forEach((img, idx) => {
        if (img) {
          formData.append("images", img);
        }
      });
      // Submit formData to backend using axios or fetch
      const {data} = await axios.post('/api/rooms',formData,{
        headers : {
          Authorization : `Bearer ${await getToken()}`
        }
      })

      if(data.success){
        setInputs({
          roomType: "",
          pricePerNight: "",
          amenities: {
            "Free WiFi": false,
            "Free Breakfast": false,
            "Room Service": false,
            "Mountain View": false,
            "Pool Access": false,
          },
        })
        setImages({
          1: null,
          2: null,
          3: null,
          4: null,  
        })
        toast.success("Room added successfully");
      }
      else{
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Error adding room:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to add room");
    } finally{
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-lg space-y-8"
    >
      <Title
        title="Add Room"
        align="left"
        font="outfit"
        subtitle="Provide accurate room details, pricing, and amenities to enhance the booking experience."
      />

      {/* Room Type & Price */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Room Type
          </label>
          <select
            name="roomType"
            value={Inputs.roomType}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Select Room Type</option>
            <option value="Single Bed">Single Bed</option>
            <option value="Double Room">Double Room</option>
            <option value="Luxury Room">Luxury Room</option>
            <option value="Family Suite">Family Suite</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Price Per Night (₹)
          </label>
          <input
            type="text"
            name="pricePerNight"
            value={Inputs.pricePerNight}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="0"
            required
          />
        </div>
      </div>

      {/* Amenities */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Amenities
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.keys(Inputs.amenities).map((amenity, idx) => (
            <label
              key={idx}
              className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg hover:bg-gray-100 cursor-pointer"
            >
              <input
                type="checkbox"
                name={amenity}
                checked={Inputs.amenities[amenity]}
                onChange={handleAmenityChange}
                className="accent-blue-600"
              />
              <span className="text-gray-700">{amenity}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Images */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Room Images (Max 4)
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((index) => (
            <div
              key={index}
              className="relative w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 hover:bg-gray-100"
            >
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageChange(e, index)}
                className="hidden"
                id={`image-${index}`}
              />
              <label
                htmlFor={`image-${index}`}
                className="cursor-pointer text-gray-500 text-sm"
              >
                {Images[index] ? (
                  <img
                    src={URL.createObjectURL(Images[index])}
                    alt={`Room ${index}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  "Upload"
                )}
              </label>
              {Images[index] && (
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-md"
        >
          { isLoading ? "Adding Room..." : "Add Room"}
        </button>
      </div>
    </form>
  );
};

export default Addroom;
