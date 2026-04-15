import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(user);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    } else {
      setCurrentUser(user);
    }
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    if (onLogout) onLogout();
    window.location.href = '/login';
  };

  const getDashboardLink = () => {
    if (!currentUser) return '/login';
    if (currentUser.role === 'admin') return '/admin';
    return '/dashboard';
  };

  if (!currentUser) {
    return (
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center gap-2">
              <i className="fas fa-seedling text-2xl text-green-600"></i>
              <span className="font-bold text-lg">Lusaka Clean</span>
            </Link>
            <Link to="/login" className="bg-green-600 text-white px-4 py-2 rounded-lg">Login</Link>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2">
            <i className="fas fa-seedling text-2xl text-green-600"></i>
            <span className="font-bold text-lg">Lusaka Clean</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link to="/map" className="text-gray-600 hover:text-green-600">Map</Link>
            <Link to={getDashboardLink()} className="text-gray-600 hover:text-green-600">Dashboard</Link>
            
            {currentUser.role === 'resident' && (
              <Link to="/report" className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700">Report</Link>
            )}
            
            <Link to="/profile" className="text-gray-600 hover:text-green-600">Profile</Link>
            
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-1 rounded-lg hover:bg-gray-100">
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-bold">
                  {currentUser.full_name?.[0] || currentUser.email?.[0] || 'U'}
                </div>
                <span className="text-gray-700 hidden md:inline">{currentUser.full_name?.split(' ')[0]}</span>
                <i className="fas fa-chevron-down text-xs text-gray-500"></i>
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border hidden group-hover:block">
                <div className="px-4 py-2 border-b">
                  <p className="text-sm font-medium">{currentUser.full_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{currentUser.role}</p>
                </div>
                <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Profile</Link>
                <Link to="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Settings</Link>
                <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">Logout</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;