import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { assets } from "../assets/assets";
import { useAppContext } from "../context/appContext.jsx";

const Navbar = () => {
  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Hotels", path: "/rooms" },
    { name: "Experience", path: "/" },
    { name: "About", path: "/" },
  ];

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const { user, navigate, isOwner, setShowHotelReg, logout } = useAppContext();
  const location = useLocation();

  // ── ALL hooks must come before any conditional return ──────────────────────

  useEffect(() => {
    const handleScroll = () => {
      if (location.pathname === "/") {
        setIsScrolled(window.scrollY > 10);
      } else {
        setIsScrolled(true);
      }
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Hide navbar on hotel-owner dashboard pages (AFTER all hooks)
  if (location.pathname.startsWith("/owner")) return null;

  const navbarClass = `fixed top-0 left-0 w-full flex items-center justify-between px-4 md:px-16 lg:px-24 xl:px-32 transition-all duration-500 z-50 ${
    isScrolled
      ? "bg-white/90 shadow-md text-gray-700 backdrop-blur-lg py-3 md:py-4"
      : location.pathname === "/"
      ? "bg-transparent text-white py-4 md:py-6"
      : "bg-white text-gray-700 py-4 md:py-6 shadow"
  }`;

  const avatarLetter = user?.username?.[0]?.toUpperCase() || "?";

  return (
    <nav className={navbarClass}>
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2">
        <img
          src={assets.stayhublogo}
          alt="logo"
          className={`h-15 ${isScrolled ? "invert opacity-80" : ""}`}
        />
      </Link>

      {/* Desktop Nav Links */}
      <div className="hidden md:flex items-center gap-4 lg:gap-8">
        {navLinks.map((link, i) => (
          <Link
            key={i}
            to={link.path}
            className="group flex flex-col gap-0.5 text-lg font-medium"
          >
            {link.name}
            <div
              className={`${
                isScrolled || location.pathname !== "/" ? "bg-gray-700" : "bg-white"
              } h-0.5 w-0 group-hover:w-full transition-all duration-300`}
            />
          </Link>
        ))}
        {user && (
          <button
            onClick={() => (isOwner ? navigate("/owner") : setShowHotelReg(true))}
            className={`border px-4 py-1 text-lg font-medium rounded-full cursor-pointer ${
              isScrolled || location.pathname !== "/" ? "text-black" : "text-white"
            } transition-all`}
          >
            {isOwner ? "Dashboard" : "List Your Hotel"}
          </button>
        )}
      </div>

      {/* Desktop Right */}
      <div className="hidden md:flex items-center gap-4">
        <img
          src={assets.searchIcon}
          alt="search"
          className={`${isScrolled || location.pathname !== "/" ? "invert" : ""} h-8 transition-all duration-500`}
        />
        {user ? (
          /* ── User avatar + dropdown (single instance, single ref) ── */
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen((v) => !v)}
              className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-md hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-400"
              title={user?.username}
            >
              {user?.image ? (
                <img src={user.image} alt={user.username} className="w-full h-full rounded-full object-cover" />
              ) : (
                avatarLetter
              )}
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="font-semibold text-gray-800 text-sm truncate">{user?.username}</p>
                  <p className="text-gray-400 text-xs truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => { setIsDropdownOpen(false); navigate("/my-bookings"); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19V4a1 1 0 011-1h12a1 1 0 011 1v13H7a2 2 0 00-2 2zm0 0a2 2 0 002 2h12M9 3v14m7 0v4" />
                  </svg>
                  My Bookings
                </button>
                {isOwner && (
                  <button
                    onClick={() => { setIsDropdownOpen(false); navigate("/owner"); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Dashboard
                  </button>
                )}
                <div className="border-t border-gray-100 mt-1">
                  <button
                    onClick={() => { setIsDropdownOpen(false); logout(); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => navigate("/auth")}
            className="px-8 py-2.5 rounded-full ml-4 text-lg font-medium transition-all duration-500 text-white bg-black"
          >
            Login
          </button>
        )}
      </div>

      {/* Mobile Menu Button */}
      <div className="flex items-center gap-3 md:hidden">
        {user && (
          <button
            onClick={() => setIsDropdownOpen((v) => !v)}
            className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-md hover:bg-indigo-700 transition"
          >
            {user?.image ? (
              <img src={user.image} alt={user.username} className="w-full h-full rounded-full object-cover" />
            ) : (
              avatarLetter
            )}
          </button>
        )}
        <img
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          src={assets.menuIcon}
          className={`${isScrolled || location.pathname !== "/" ? "invert" : ""} h-7 transition-all duration-500`}
        />
      </div>

      {/* Mobile Menu */}
      <div
        className={`fixed top-0 left-0 w-full h-screen bg-white text-xl flex flex-col md:hidden items-center justify-center gap-6 font-medium text-gray-800 transition-all duration-500 ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button className="absolute top-4 right-4" onClick={() => setIsMenuOpen(false)}>
          <img src={assets.closeIcon} className="h-6.5" />
        </button>

        {navLinks.map((link, i) => (
          <Link
            key={i}
            to={link.path}
            onClick={() => setIsMenuOpen(false)}
            className="text-xl font-medium"
          >
            {link.name}
          </Link>
        ))}

        {user && (
          <button
            className="border px-4 py-1 text-lg font-medium rounded-full cursor-pointer transition-all"
            onClick={() => { setIsMenuOpen(false); isOwner ? navigate("/owner") : setShowHotelReg(true); }}
          >
            {isOwner ? "Dashboard" : "List Your Hotel"}
          </button>
        )}

        {user && (
          <button
            onClick={() => { setIsMenuOpen(false); navigate("/my-bookings"); }}
            className="text-gray-600 text-lg"
          >
            My Bookings
          </button>
        )}

        {user && (
          <button
            onClick={() => { setIsMenuOpen(false); logout(); }}
            className="text-red-500 text-lg"
          >
            Logout
          </button>
        )}

        {!user && (
          <button
            onClick={() => { setIsMenuOpen(false); navigate("/auth"); }}
            className="bg-black text-white px-8 py-2.5 rounded-full text-lg font-medium transition-all duration-500"
          >
            Login
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
