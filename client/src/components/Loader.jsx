import React, { useEffect } from 'react'
import { useAppContext } from '../context/appContext'
import { useParams } from 'react-router-dom';

function Loader() {
  const { navigate, axios } = useAppContext();
  const { nextUrl } = useParams();

  useEffect(() => {
    if (nextUrl) {
      let attempts = 0;
      const maxAttempts = 10;
      
      const poll = async () => {
        attempts++;
        try {
          const { data } = await axios.get('/api/bookings/user');
          if (data.success && data.bookings && data.bookings.length > 0) {
            const latestBooking = data.bookings[0];
            if (latestBooking.isPaid) {
              clearInterval(intervalId);
              navigate(`/${nextUrl}`);
              return;
            }
          }
        } catch (error) {
          console.error("Polling error", error);
        }
        
        if (attempts >= maxAttempts) {
          clearInterval(intervalId);
          navigate(`/${nextUrl}`);
        }
      };

      poll();
      const intervalId = setInterval(poll, 2000);

      return () => clearInterval(intervalId);
    }
  }, [nextUrl, navigate, axios]);

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <div className="w-12 h-12 border-4 border-black-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-lg font-semibold text-gray-700">Processing payment...</p>
    </div>
  )
}

export default Loader
