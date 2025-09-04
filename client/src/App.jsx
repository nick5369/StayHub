import React from 'react'
import './App.css'
import Navbar from './components/Navbar'
import { Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Footer from './components/Footer'
import AllRooms from './pages/AllRooms'
import RoomDetails from './pages/RoomDetails'

function App() {
  
  const isOwnerPath = useLocation().pathname.includes("owner")

  return (
    <>
    <div className='min-h-screen flex flex-col bg-slate-50'>
      {!isOwnerPath && <Navbar/>}
      <div className='flex-grow'>
        <Routes>
          <Route path='/' element={<Home/>} />
          <Route path='/rooms' element={<AllRooms/>} />
          <Route path='/rooms/:id' element={<RoomDetails />} />
        </Routes>
      </div>
      <Footer/>
      </div>
    </>
  );
};

export default App
