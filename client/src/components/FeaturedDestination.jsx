import React from 'react'
import { useNavigate } from 'react-router-dom'
import { roomsDummyData } from '../assets/assets'
import HotelCard from './HotelCard'
import Title from './Title'

const FeaturedDestination = () => {
  const navigate = useNavigate()

  const handleViewAll = () => {
    navigate('/rooms')
    scrollTo(0, 0)
  }

  return (
    <div className='flex flex-col items-center px-6 bg-slate-50 py-20'>
      <Title
        title='Featured Destination'
        subtitle='Discover our handpicked selection of exceptional properties around the world, offering unparalleled luxury and unforgettable experiences'
      />

      <div className='flex flex-wrap items-center justify-center gap-6 mt-20'>
        {roomsDummyData.slice(0, 4).map((room, index) => (
          <HotelCard key={room._id} room={room} index={index} />
        ))}
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
