import React, { useState } from 'react';

// Helper component for form input fields to reduce repetition
const FormInput = ({ id, name, label, type = 'text', value, onChange, placeholder, icon }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
      {label}
    </label>
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        {icon}
      </div>
      <input
        type={type}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required
        className="block w-full rounded-lg border-gray-300 bg-gray-50/50 pl-10 pr-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition duration-150 ease-in-out"
      />
    </div>
  </div>
);



// Main Hotel Registration Form Component
function HotelReg({ onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    address: '',
    city: '',
  });

  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form Submitted:', formData);
    setIsSubmitted(true);
    // In a real application, you would send this data to a server.
  };
  
  // To use this component, you would control its visibility in a parent component's state.
  // Example in your App.jsx:
  // const [showRegForm, setShowRegForm] = useState(true); // or false
  // {showRegForm && <HotelReg onClose={() => setShowRegForm(false)} />}

  return (
    // Transparent backdrop to center the modal. No dark overlay.
    <div className="fixed inset-0 backdrop-blur-lg bg-black/60 flex items-center justify-center p-4 z-50" style={{ fontFamily: "'Inter', sans-serif"}}>
      
      {/* Success Message */}
      {isSubmitted ? (
        <div className="w-full max-w-md m-4 text-center bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-8 transform transition-all duration-500 ease-in-out scale-100">
           <svg className="w-16 h-16 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
           <h2 className="text-2xl font-bold text-gray-800 mt-4">Registration Successful!</h2>
           <p className="text-gray-600 mt-2">Thank you, <span className="font-semibold">{formData.name}</span>. Your property is now listed with us.</p>
           <button 
             onClick={onClose}
             className="mt-6 w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300"
           >
             Done
           </button>
        </div>
      ) : (
        // Main translucent modal container
        <div className="relative w-full max-w-md bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 space-y-6 transform transition-all duration-500 ease-in-out hover:shadow-2xl">
          {/* Close Button */}
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition-colors z-10">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
          
          {/* Form Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Register Hotel</h1>
            <p className="text-gray-500 mt-2">Fill in the details below to list your property.</p>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
             <FormInput
              id="name"
              name="name"
              label="Name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., The Grand Palace"
              icon={<svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" /></svg>}
            />
            
            <FormInput
              id="contact"
              name="contact"
              label="Contact"
              type="tel"
              value={formData.contact}
              onChange={handleChange}
              placeholder="(123) 456-7890"
              icon={<svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>}
            />

            <FormInput
              id="address"
              name="address"
              label="Address"
              value={formData.address}
              onChange={handleChange}
              placeholder="123 Main Street"
              icon={<svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>}
            />

            <FormInput
              id="city"
              name="city"
              label="City"
              value={formData.city}
              onChange={handleChange}
              placeholder="Ahmedabad"
              icon={<svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>}
            />
            
            {/* Submit Button */}
            <div>
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform transition-transform duration-300 hover:scale-105 shadow-lg"
              >
                Register My Hotel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default HotelReg;

