import React, { useRef, useState, useEffect } from 'react'
import { assets } from '../../assets/assets'
import { Link, useNavigate } from 'react-router-dom'
import { useAppContext } from '../../context/appContext'

const NavBar = () => {
  const { user, logout } = useAppContext();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const avatarLetter = user?.username?.[0]?.toUpperCase() || '?';

  return (
    <div className='flex items-center justify-between px-4 md:px-8 border-b border-gray-300 py-3 bg-white transition-all duration-300'>
      <Link to='/'>
        <img src={assets.stayhublogo} alt="logo" className='h-14 invert opacity-80'/>
      </Link>

      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(v => !v)}
          className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow hover:bg-indigo-700 transition focus:outline-none"
        >
          {user?.image
            ? <img src={user.image} alt={user.username} className="w-full h-full rounded-full object-cover" />
            : avatarLetter}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="font-semibold text-gray-800 text-sm truncate">{user?.username}</p>
            </div>
            <button
              onClick={() => { setOpen(false); navigate('/my-bookings'); }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition"
            >
              My Bookings
            </button>
            <button
              onClick={() => { setOpen(false); logout(); }}
              className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default NavBar
