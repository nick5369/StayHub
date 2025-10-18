import React from 'react'
import './App.css'
import Navbar from './components/Navbar'
import { Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Footer from './components/Footer'
import AllRooms from './pages/AllRooms'
import RoomDetails from './pages/RoomDetails'
import MyBookings from './pages/MyBookings'
import HotelReg from './components/HotelReg'
import Layout from './pages/HotelOwner/Layout'
import Dashboard from './pages/HotelOwner/Dashboard'
import Addroom from './pages/HotelOwner/Addroom'
import ListRoom from './pages/HotelOwner/ListRoom'
import { Toaster } from 'react-hot-toast'
import { useAppContext } from './context/appContext'

function App() {
  
  const isOwnerPath = useLocation().pathname.includes("owner")
  const {showHotelReg} = useAppContext();

  return (
    <>
    <Toaster/>
    <div className='min-h-screen flex flex-col bg-slate-50'>
      {!isOwnerPath && <Navbar/>}
      {showHotelReg && <HotelReg/>}
      <div className='flex-grow'>
        <Routes>
          <Route path='/' element={<Home/>} />
          <Route path='/rooms' element={<AllRooms/>} />
          <Route path='/rooms/:id' element={<RoomDetails />} />
          <Route path='/my-bookings' element={<MyBookings />} />
          <Route path='/owner' element={<Layout/>} >
            <Route index element={<Dashboard/>} />
            <Route path='Addroom' element={<Addroom/>} />
            <Route path='Listroom' element={<ListRoom/>} />
          </Route>
        </Routes>
      </div>
      <Footer/>
      </div>
    </>
  );
};

export default App;
