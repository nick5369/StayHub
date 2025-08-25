import React from 'react'
import { assets } from '../assets/assets'

function Footer() {
  return (
    <footer className="w-full bg-gray-800 text-gray-300">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col items-center">
        {/* Logo */}
        <div className="flex items-center space-x-3 mb-4">
          <img
            alt="StayHub Logo"
            className="h-9"
            src={assets.stayhublogo}
          />
        </div>

        {/* Text */}
        <p className="text-center max-w-md text-sm leading-relaxed text-gray-400">
          Discover the world with StayHub. Curated stays, unforgettable
          experiences, and the comfort of home — anywhere you go.
        </p>

        {/* Social Links (optional) */}
        <div className="flex space-x-6 mt-4">
          <a href="#" className="hover:text-white transition-colors text-sm">
            Instagram
          </a>
          <a href="#" className="hover:text-white transition-colors text-sm">
            Twitter
          </a>
          <a href="#" className="hover:text-white transition-colors text-sm">
            Facebook
          </a>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-600">
        <div className="max-w-7xl mx-auto px-6 py-3 text-center text-xs text-gray-400">
          
            StayHub - Hotel Booking ©2025. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

export default Footer
