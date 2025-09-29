import React from 'react'
import NavBar from '../../components/HotelOwner/NavBar'
import { Outlet } from 'react-router-dom'
import Sidebar from '../../components/HotelOwner/SideBar'

const Layout = () => {
  return (
    <>
     <div className="flex flex-col h-screen">
      {/* Navbar at top */}
      <NavBar />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 p-4 pt-10 md:px-10 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
    </>
  )
}

export default Layout;
