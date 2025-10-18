import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { assets } from "../assets/assets";
import { useClerk, useUser, UserButton } from "@clerk/clerk-react";
import { useAppContext } from "../context/appContext.jsx";

const Navbar = () => {
  const BookIcon = () => (
    <svg
      className="w-4 h-4 text-gray-700"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M5 19V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v13H7a2 2 0 0 0-2 2Zm0 0a2 2 0 0 0 2 2h12M9 3v14m7 0v4"
      />
    </svg>
  );

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Hotels", path: "/rooms" },
    { name: "Experience", path: "/" },
    { name: "About", path: "/" },
  ];

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { openSignIn } = useClerk();
  // const { user } = useUser();

  const {user, navigate,isOwner,setShowHotelReg} = useAppContext();

  // const navigate = useNavigate();
  const location = useLocation();

  // 👉 hide navbar on dashboard
  if (location.pathname.startsWith("/owner")) {
    return null;
  }

  useEffect(() => {
    const handleScroll = () => {
      // only make transparent on home
      if (location.pathname === "/") {
        setIsScrolled(window.scrollY > 10);
      } else {
        setIsScrolled(true);
      }
    };

    handleScroll(); // run initially
    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname]);

  return (
    <nav
      className={`fixed top-0 left-0 w-full flex items-center justify-between px-4 md:px-16 lg:px-24 xl:px-32 transition-all duration-500 z-50 
      ${
        isScrolled
          ? "bg-white/90 shadow-md text-gray-700 backdrop-blur-lg py-3 md:py-4"
          : location.pathname === "/"
          ? "bg-transparent text-white py-4 md:py-6"
          : "bg-white text-gray-700 py-4 md:py-6 shadow"
      }`}
    >
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2">
        <img
          src={assets.stayhublogo}
          alt="logo"
          className={`h-15 ${isScrolled ? "invert opacity-80" : ""}`}
        />
      </Link>

      {/* Desktop Nav */}
      <div className="hidden md:flex items-center gap-4 lg:gap-8">
        {navLinks.map((link, i) => (
          <Link
            key={i}
            to={link.path}
            className={`group flex flex-col gap-0.5 text-lg font-medium`}
          >
            {link.name}
            <div
              className={`${
                isScrolled || location.pathname !== "/"
                  ? "bg-gray-700"
                  : "bg-white"
              } h-0.5 w-0 group-hover:w-full transition-all duration-300`}
            />
          </Link>
        ))}
        {user && (
          <button
            onClick={ () =>  isOwner? navigate("/owner") : setShowHotelReg(true) }
            className={`border px-4 py-1 text-lg font-medium rounded-full cursor-pointer ${
              isScrolled || location.pathname !== "/" ? "text-black" : "text-white"
            } transition-all`}
          >
            {isOwner ? "Dashboard": "List Your Hotel"}
          </button>
        )}
      </div>

      {/* Desktop Right */}
      <div className="hidden md:flex items-center gap-4">
        <img
          src={assets.searchIcon}
          alt="search"
          className={`${
            isScrolled || location.pathname !== "/" ? "invert" : ""
          } h-8 transition-all duration-500`}
        />
        {user ? (
          <UserButton>
            <UserButton.MenuItems>
              <UserButton.Action
                label="My Bookings"
                labelIcon={<BookIcon />}
                onClick={() => navigate("/my-bookings")}
              />
            </UserButton.MenuItems>
          </UserButton>
        ) : (
          <button
            onClick={openSignIn}
            className="px-8 py-2.5 rounded-full ml-4 text-lg font-medium transition-all duration-500 text-white bg-black"
          >
            Login
          </button>
        )}
      </div>

      {/* Mobile Menu Button */}
      <div className="flex items-center gap-3 md:hidden">
        {user && (
          <UserButton>
            <UserButton.MenuItems>
              <UserButton.Action
                label="My Bookings"
                labelIcon={<BookIcon />}
                onClick={() => navigate("/my-bookings")}
              />
            </UserButton.MenuItems>
          </UserButton>
        )}
        <img
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          src={assets.menuIcon}
          className={`${
            isScrolled || location.pathname !== "/" ? "invert" : ""
          } h-7 transition-all duration-500`}
        />
      </div>

      {/* Mobile Menu */}
      <div
        className={`fixed top-0 left-0 w-full h-screen bg-white text-xl flex flex-col md:hidden items-center justify-center gap-6 font-medium text-gray-800 transition-all duration-500 ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          className="absolute top-4 right-4"
          onClick={() => setIsMenuOpen(false)}
        >
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
            onClick={() => isOwner ? navigate("/owner") : setShowHotelReg(true)}
          >
            {isOwner ? "Dashboard" : "List Your Hotel"}
          </button>
        )}

        {!user && (
          <button
            onClick={openSignIn}
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
