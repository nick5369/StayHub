import React from 'react'
import './App.css'
import Navbar from './components/Navbar'
import { Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home'

function App() {
  
  const isOwnerPath = useLocation().pathname.includes("owner")

  return (
    <>
      {!isOwnerPath && <Navbar/>}
      <div>
        <Routes>
          <Route path='/' element={<Home/>} />
        </Routes>
      </div>
    </>
  );
};

export default App
