import React from 'react'
import HotelCard from './HotelCard'
import Title from './Title'
import { useAppContext } from '../context/appContext.jsx'

const FeaturedDestination = () => {
  const { rooms, navigate } = useAppContext();

  // Debug: log rooms so we can inspect the value at runtime
  // console.log('FeaturedDestination rooms', rooms);

  const handleViewAll = () => {
    navigate('/rooms');
    scrollTo(0, 0);
  };

  return rooms.length>0 && (
    <div className='flex flex-col items-center px-6 bg-slate-50 py-20'>
      <Title
        title='Featured Destination'
        subtitle='Discover our handpicked selection of exceptional properties around the world, offering unparalleled luxury and unforgettable experiences'
        align='center'
      />

      <div className='flex flex-wrap items-center justify-center gap-6 mt-20'>
        {Array.isArray(rooms) && rooms.length > 0 ? (
          rooms.slice(0, 4).map((room, index) => (
            <HotelCard key={room._id} room={room} index={index} />
          ))
        ) : (
          <div className='text-gray-500 py-8'>No featured rooms to display right now.</div>
        )}
      </div>

      {/* View All Button */}
      <button
        onClick={handleViewAll}
        className="mt-12 bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-xl text-sm font-medium shadow-md transition-transform transform hover:scale-105"
      >
        View All Destinations
      </button>
    </div>
  )
}

export default FeaturedDestination
