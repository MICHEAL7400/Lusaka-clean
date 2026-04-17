import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      // If user is already logged in, redirect to dashboard
      navigate('/dashboard');
    }
  }, [navigate]);

  // If user is logged in, don't show home page (redirect happens in useEffect)
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
      <div className="text-center p-8 max-w-2xl mx-auto">
        <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <i className="fas fa-seedling text-5xl text-white"></i>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-800 mb-4">Lusaka Clean</h1>
        <p className="text-lg text-gray-600 mb-8">Community Waste Management System</p>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          Report waste issues in your community. Workers get notified and respond quickly.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/login">
            <button className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition font-medium">
              Login
            </button>
          </Link>
          <Link to="/register">
            <button className="bg-gray-600 text-white px-8 py-3 rounded-lg hover:bg-gray-700 transition font-medium">
              Register
            </button>
          </Link>
        </div>
        <div className="mt-8 p-4 bg-white/50 rounded-lg">
          <p className="text-sm text-gray-600 font-medium mb-2">Demo Accounts:</p>
          <div className="text-xs text-gray-500 space-y-1">
            <p>📧 resident@test.com - Resident (Any password works)</p>
            <p>📧 worker@test.com - Waste Collector (Any password works)</p>
            <p>📧 admin@test.com - Administrator (Any password works)</p>
          </div>
        </div>
      </div>
      
      {/* Features Section */}
      <div className="bg-white py-12 w-full">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-camera text-2xl text-green-600"></i>
              </div>
              <h3 className="font-semibold text-lg mb-2">1. Report</h3>
              <p className="text-gray-500 text-sm">Take a photo and report waste issues in your area</p>
            </div>
            <div className="text-center p-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-truck text-2xl text-green-600"></i>
              </div>
              <h3 className="font-semibold text-lg mb-2">2. Respond</h3>
              <p className="text-gray-500 text-sm">Workers get notified and are assigned to collect</p>
            </div>
            <div className="text-center p-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-check-circle text-2xl text-green-600"></i>
              </div>
              <h3 className="font-semibold text-lg mb-2">3. Resolve</h3>
              <p className="text-gray-500 text-sm">Track progress and verify when waste is collected</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;