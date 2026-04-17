import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Worker from './pages/Worker';
import Report from './pages/Report';
import ReportDetails from './pages/ReportDetails';
import MyReports from './pages/MyReports';
import Profile from './pages/Profile';
import Map from './pages/Map';
import About from './pages/About';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <Routes>
              {/* Public Routes - Available to everyone */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/about" element={<About />} />
              <Route path="/map" element={<Map />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              
              {/* Protected Routes - Only when user is logged in */}
              {user && user.role === 'resident' && (
                <Route path="/dashboard" element={<Dashboard />} />
              )}
              {user && user.role === 'worker' && (
                <Route path="/dashboard" element={<Worker user={user} />} />
              )}
              {user && user.role === 'admin' && (
                <Route path="/dashboard" element={<Admin />} />
              )}
              {user && user.role === 'admin' && (
                <Route path="/admin" element={<Admin />} />
              )}
              
              {/* Common protected routes for all logged-in users */}
              {user && (
                <>
                  <Route path="/report" element={<Report />} />
                  <Route path="/report/:id" element={<ReportDetails />} />
                  <Route path="/my-reports" element={<MyReports />} />
                  <Route path="/profile" element={<Profile />} />
                </>
              )}
              
              {/* Redirect to dashboard if logged in, otherwise to login */}
              <Route path="*" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
            </Routes>
          </div>
        </main>
        <Footer />
        <Toaster position="top-right" />
      </div>
    </Router>
  );
}

export default App;