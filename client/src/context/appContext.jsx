import axios from "axios";
import {  createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// import {useUser,useAuth} from "./userContext.jsx";
import toast from "react-hot-toast";
import { useAuth, useUser } from "@clerk/clerk-react";

axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL;

const Appcontext = createContext();

export const AppProvider = ({children}) => {
    const currency = import.meta.env.VITE_CURRENCY;
    const navigate = useNavigate();
    const {user} = useUser();
    const {getToken} = useAuth();
    
    const [isOwner,setIsOwner] = useState(false);
    const [showHotelReg, setShowHotelReg] = useState(false);
    const [searchedCities, setSearchedCities] = useState([]);
    const [rooms, setRooms] = useState([]);

    const fetchRooms = async()=>{
        try {
            const { data } = await axios.get('/api/rooms', {
                headers: {
                    Authorization: `Bearer ${await getToken()}`
                }
            });

            // Debug: log the response so we can confirm the shape and contents
            // console.log('fetchRooms response', data);

            if (data?.success) {
                setRooms(Array.isArray(data.rooms) ? data.rooms : []);
            } else {
                toast.error(data?.message || 'Could not fetch rooms');
            }

        } catch (error) {
            console.error('fetchRooms error', error);
            toast.error(error.message);
        }
    }

    const fetchUser = async()=> {
        try {
            const {data} = await axios.get('/api/user',{
                headers: {
                    Authorization: `Bearer ${await getToken()}`
                }
            });
            if(data.success){
                setIsOwner(data.role === 'hotelOwner');
                setSearchedCities(data.recentSearchedCities);
            }else{
                setTimeout(()=>{
                    fetchUser
                },5000);
            }
        } catch (error) {
            toast.error("Could not fetch user data" + error.message)
        }
    }

    useEffect(()=>{
        // initial fetch
        fetchRooms();

    // Poll for updates every 10 seconds so clients see new rooms without a manual reload
    const POLL_INTERVAL = 10000; // ms
        const intervalId = setInterval(() => {
            fetchRooms();
        }, POLL_INTERVAL);

        return () => clearInterval(intervalId);
    },[])

    useEffect(()=>{
        if(user){
            fetchUser();
        }
    },[user])


    const value = {
        currency,
        isOwner,
        setIsOwner,
        showHotelReg,
        setShowHotelReg,
        toast,
        axios,
        navigate,
        user,
        getToken,
        searchedCities,
        setSearchedCities,
        rooms,
        setRooms
    }

    return (
        <Appcontext.Provider value={value}>
            {children}
        </Appcontext.Provider>
    )
}

export const useAppContext = () => {
    return useContext(Appcontext);
}