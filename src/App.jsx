import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Provider } from 'react-redux';
import { store } from './store';

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
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import AdminAnalytics from './pages/AdminAnalytics';

// Components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import { AuthProvider } from './contexts/AuthContext';

function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Navbar user={user} onLogout={handleLogout} />
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/about" element={<About />} />
            <Route path="/map" element={<Map />} />
            
            {/* Resident Routes */}
            {user && user.role === 'resident' && (
              <>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/report" element={<Report />} />
                <Route path="/report/:id" element={<ReportDetails />} />
                <Route path="/my-reports" element={<MyReports />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/settings" element={<Settings />} />
              </>
            )}
            
            {/* Worker Routes */}
            {user && user.role === 'worker' && (
              <>
                <Route path="/dashboard" element={<Worker user={user} />} />
                <Route path="/report/:id" element={<ReportDetails />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/settings" element={<Settings />} />
              </>
            )}
            
            {/* Admin Routes */}
            {user && user.role === 'admin' && (
              <>
                <Route path="/dashboard" element={<Admin />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/analytics" element={<AdminAnalytics />} />
                <Route path="/report/:id" element={<ReportDetails />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/settings" element={<Settings />} />
              </>
            )}
            
            {/* Catch all route */}
            <Route path="*" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
          </Routes>
        </div>
      </main>
      <Footer />
      <Toaster position="top-right" />
    </div>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </Provider>
  );
}

export default App;