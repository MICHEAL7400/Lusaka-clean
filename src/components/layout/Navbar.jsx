import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Get user directly from localStorage every time
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
    setMobileMenuOpen(false);
    window.location.reload(); // Force refresh to update navbar
  };

  // If NO user is logged in - show ONLY Login and Register
  if (!user) {
    return (
      <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16 items-center">
            <Link to="/" className="flex items-center gap-2">
              <i className="fas fa-seedling text-xl sm:text-2xl text-green-600"></i>
              <span className="font-bold text-base sm:text-lg">Lusaka Clean</span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link to="/login" className="bg-green-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm hover:bg-green-700">
                Login
              </Link>
              <Link to="/register" className="border border-green-600 text-green-600 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm hover:bg-green-50">
                Register
              </Link>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // User IS logged in - show full menu
  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 sm:h-16 items-center">
          <Link to="/" className="flex items-center gap-2">
            <i className="fas fa-seedling text-xl sm:text-2xl text-green-600"></i>
            <span className="font-bold text-base sm:text-lg">Lusaka Clean</span>
          </Link>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-4">
            <Link to="/map" className="text-gray-600 hover:text-green-600 text-sm">Map</Link>
            <Link to="/dashboard" className="text-gray-600 hover:text-green-600 text-sm">Dashboard</Link>
            {user.role === 'resident' && (
              <Link to="/report" className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 text-sm">Report</Link>
            )}
            <Link to="/profile" className="text-gray-600 hover:text-green-600 text-sm">Profile</Link>
            <button onClick={handleLogout} className="text-red-600 hover:text-red-700 text-sm">Logout</button>
          </div>
          
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'} text-gray-600 text-xl`}></i>
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t py-2 px-4 space-y-2 bg-white">
          <Link to="/map" className="block py-2 text-gray-600" onClick={() => setMobileMenuOpen(false)}>Map</Link>
          <Link to="/dashboard" className="block py-2 text-gray-600" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
          {user.role === 'resident' && (
            <Link to="/report" className="block py-2 text-green-600" onClick={() => setMobileMenuOpen(false)}>Report Waste</Link>
          )}
          <Link to="/profile" className="block py-2 text-gray-600" onClick={() => setMobileMenuOpen(false)}>Profile</Link>
          <button onClick={handleLogout} className="block w-full text-left py-2 text-red-600">Logout</button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;