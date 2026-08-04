import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL;
// Send the HttpOnly cookie on every request automatically
axios.defaults.withCredentials = true;

const Appcontext = createContext();

export const AppProvider = ({ children }) => {
  const currency = import.meta.env.VITE_CURRENCY;
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [showHotelReg, setShowHotelReg] = useState(false);
  const [searchedCities, setSearchedCities] = useState([]);
  const [rooms, setRooms] = useState([]);

  /** Called after a successful login / OTP verification */
  const login = (userData) => {
    setUser(userData);
    setIsOwner(userData.role === "hotelOwner");
  };

  /** Clears client state and asks the server to clear the cookie */
  const logout = async () => {
    try {
      await axios.post("/api/auth/logout");
    } catch (_) {
      // ignore network errors on logout
    }
    setUser(null);
    setIsOwner(false);
    setSearchedCities([]);
    navigate("/");
  };

  const fetchRooms = async () => {
    try {
      const { data } = await axios.get("/api/rooms");
      if (data?.success) {
        setRooms(Array.isArray(data.rooms) ? data.rooms : []);
      } else {
        toast.error(data?.message || "Could not fetch rooms");
      }
    } catch (error) {
      console.error("fetchRooms error", error);
      toast.error(error.message);
    }
  };

  const fetchUser = async () => {
    try {
      const { data } = await axios.get("/api/user");
      if (data.success) {
        setUser({
          id: data.id,
          username: data.username,
          email: data.email,
          image: data.image,
          role: data.role,
        });
        setIsOwner(data.role === "hotelOwner");
        setSearchedCities(data.recentSearchedCities);
      }
    } catch (error) {
      // 401 is expected when the user is not logged in — don't show toast
      if (error.response?.status !== 401) {
        console.error("fetchUser error:", error.message);
      }
    }
  };

  // Restore session on mount by hitting the protected /api/user endpoint.
  // If the HttpOnly cookie is still valid the server returns user data.
  useEffect(() => {
    fetchUser();
  }, []);

  // Fetch rooms once on mount
  useEffect(() => {
    fetchRooms();
  }, []);

  const value = {
    currency,
    user,
    setUser,
    isOwner,
    setIsOwner,
    showHotelReg,
    setShowHotelReg,
    toast,
    axios,
    navigate,
    login,
    logout,
    searchedCities,
    setSearchedCities,
    rooms,
    setRooms,
    fetchUser,
  };

  return <Appcontext.Provider value={value}>{children}</Appcontext.Provider>;
};

export const useAppContext = () => {
  return useContext(Appcontext);
};