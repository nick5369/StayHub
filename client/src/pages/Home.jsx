import React from 'react'
import Hero from '../components/Hero'
import HotelCard from '../components/HotelCard'
import FeaturedDestination from '../components/FeaturedDestination'
import Footer from '../components/Footer'
import RecommendedHotels from '../components/RecommendedHotels'

function Home() {
  return (
    <>
      <Hero />
      <RecommendedHotels />
      <FeaturedDestination />
    </>
  )
}

export default Home
