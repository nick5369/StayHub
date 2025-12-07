import React, { useEffect } from 'react'
import { useAppContext } from '../context/appContext'
import { useParams } from 'react-router-dom';

function Loader() {
  const { navigate } = useAppContext();
  const { nextUrl } = useParams();

  useEffect(() => {
    if (nextUrl) {
      setTimeout(() => {
        navigate(`/${nextUrl}`);
      }, 8000);
    }
  }, [nextUrl])

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <div className="w-12 h-12 border-4 border-black-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-lg font-semibold text-gray-700">Processing payment...</p>
    </div>
  )
}

export default Loader
