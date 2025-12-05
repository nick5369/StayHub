import React, { useState } from 'react'
import { assets, cities } from '../assets/assets'
import { useAppContext } from '../context/appContext.jsx';

function Hero() {
  const [destination,setDestination] = useState("");
  const {axios,getToken,setSearchedCities,navigate} = useAppContext();

  const onSearch = async(e) =>{
    e.preventDefault();
    navigate(`/rooms?destination=${destination}`);
    try {
      await axios.post('/api/user/recent-searched-cities',{recentSearchedCity:destination},{
        headers:{
          Authorization: `Bearer ${await getToken()}`
        }
      })
      setSearchedCities(prev => {
        const updated = [...prev, destination];
        if(updated.length > 3){
          updated.shift();
        }
        return updated;
      })
    } catch (error) {
      console.error('recent-searched-cities error', error.response || error.message || error);
    }
  }

  return (
    <div className='flex flex-col items-start justify-center px-6 md:px-16 lg:px-24 xl:px-32 text-white bg-[url("/src/assets/heroImage.png")] bg-no-repeat bg-cover bg-center h-screen w-full relative'>
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/30"></div>
      
      <div className="relative z-10">
        <div className='bg-[#49B9FF]/50 px-3.5 py-1 rounded-full mt-20 text-sm backdrop-blur-sm text-left w-fit'>
          The Ultimate Hotel Experience
        </div>
        <h1 className='font-playfair text-3xl md:text-5xl lg:text-6xl font-bold md:font-extrabold max-w-2xl mt-4 leading-tight text-left'>
          Discover Your Perfect Gateway Destination
        </h1>
        <p className='max-w-xl mt-4 text-sm md:text-base opacity-90 leading-relaxed text-left'>
          Unparalleled luxury and comfort await at the world's most exclusive hotels and resorts. Start your journey today.
        </p>


        <form onSubmit={onSearch} className='bg-white text-gray-500 rounded-lg px-6 py-4  flex flex-col md:flex-row max-md:items-start gap-4 max-md:mx-auto mt-8'>

            <div>
                <div className='flex items-center gap-2'>
                    <img src={assets.calenderIcon} className='h-4' />
                    <label htmlFor="destinationInput">Destination</label>
                </div>
                <input onChange={(e)=>setDestination(e.target.value)} value={destination} list='destinations' id="destinationInput" type="text" className=" rounded border border-gray-200 px-3 py-1.5 mt-1.5 text-sm outline-none" placeholder="Type here" required />
                <datalist id="destinations">
                  {cities.map((city,index)=>(
                    <option value={city} key={index}/>
                  ))}
                </datalist>
            </div>

            <div>
                <div className='flex items-center gap-2'>
                    <img src={assets.calenderIcon} className='h-4' />
                    <label htmlFor="checkIn">Check in</label>
                </div>
                <input id="checkIn" type="date" className=" rounded border border-gray-200 px-3 py-1.5 mt-1.5 text-sm outline-none" />
            </div>

            <div>
                <div className='flex items-center gap-2'>
                    <img src={assets.calenderIcon} className='h-4' />
                    <label htmlFor="checkOut">Check out</label>
                </div>
                <input id="checkOut" type="date" className=" rounded border border-gray-200 px-3 py-1.5 mt-1.5 text-sm outline-none" />
            </div>

            <div className='flex md:flex-col max-md:gap-2 max-md:items-center'>
                <label htmlFor="guests">Guests</label>
                <input min={1} max={4} id="guests" type="number" className=" rounded border border-gray-200 px-3 py-1.5 mt-1.5 text-sm outline-none  max-w-16" placeholder="0" />
            </div>

            <button type='submit' className='flex items-center justify-center gap-1 rounded-md bg-black py-3 px-4 text-white my-auto cursor-pointer max-md:w-full max-md:py-1' >
                <img src={assets.searchIcon} className='h-7' />
                <span>Search</span>
            </button>
        </form>
      </div>
    </div>
  );
};

export default Hero;