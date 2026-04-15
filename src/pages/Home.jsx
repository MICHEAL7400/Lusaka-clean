import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
      <div className="text-center p-8">
        <i className="fas fa-seedling text-6xl text-green-600 mb-4"></i>
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Lusaka Clean</h1>
        <p className="text-gray-600 mb-6">Community Waste Management System</p>
        <div className="flex gap-4 justify-center">
          <Link to="/login">
            <button className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
              Login
            </button>
          </Link>
          <Link to="/register">
            <button className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700">
              Register
            </button>
          </Link>
        </div>
        <div className="mt-8 text-sm text-gray-500">
          <p>Demo Accounts: resident@test.com | worker@test.com | admin@test.com</p>
          <p>Any password works</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
