import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2">
            <i className="fas fa-seedling text-2xl text-green-600"></i>
            <span className="font-bold text-lg">Lusaka Clean</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link to="/map" className="text-gray-600 hover:text-green-600">
              <i className="fas fa-map mr-1"></i> Map
            </Link>
            
            {user ? (
              <>
                <Link to="/dashboard" className="text-gray-600 hover:text-green-600">
                  <i className="fas fa-chart-line mr-1"></i> Dashboard
                </Link>
                {user.role === 'resident' && (
                  <Link to="/report" className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700">
                    <i className="fas fa-plus-circle mr-1"></i> Report
                  </Link>
                )}
                <Link to="/profile" className="text-gray-600 hover:text-green-600">
                  <i className="fas fa-user mr-1"></i> Profile
                </Link>
                <button onClick={handleLogout} className="text-red-600 hover:text-red-700">
                  <i className="fas fa-sign-out-alt mr-1"></i> Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="bg-green-600 text-white px-4 py-2 rounded-lg">
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;