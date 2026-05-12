import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const Footer = () => {
  const [year, setYear] = useState(2026);
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    
    setIsSubscribing(true);
    
    // Simulate API call - you can replace with actual backend endpoint
    setTimeout(() => {
      toast.success('🎉 Thanks for subscribing! Check your email for confirmation.');
      setEmail('');
      setIsSubscribing(false);
    }, 500);
  };

  return (
    <footer className="bg-gradient-to-r from-gray-900 to-gray-800 text-white mt-auto">
      {/* Newsletter Section */}
      <div className="border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-lg font-semibold flex items-center gap-2 justify-center md:justify-start">
                <i className="fas fa-newspaper text-green-400"></i>
                Stay Updated
              </h3>
              <p className="text-sm text-gray-400 mt-1">Get the latest waste collection news and updates</p>
            </div>
            
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <div className="relative">
                <i className="fas fa-envelope absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full sm:w-64 px-10 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isSubscribing}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubscribing ? (
                  <><i className="fas fa-spinner fa-spin"></i> Subscribing...</>
                ) : (
                  <><i className="fas fa-paper-plane"></i> Subscribe</>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
      
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <i className="fas fa-recycle text-white text-sm"></i>
              </div>
              <span className="font-bold text-lg">Lusaka Clean</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Empowering Lusaka residents to report waste issues and keep our community clean, together.
            </p>
            <div className="flex gap-3 mt-4">
              <a href="#" className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-green-600 transition group">
                <i className="fab fa-facebook-f text-gray-400 text-sm group-hover:text-white"></i>
              </a>
              <a href="#" className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-green-600 transition group">
                <i className="fab fa-twitter text-gray-400 text-sm group-hover:text-white"></i>
              </a>
              <a href="#" className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-green-600 transition group">
                <i className="fab fa-instagram text-gray-400 text-sm group-hover:text-white"></i>
              </a>
              <a href="#" className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-green-600 transition group">
                <i className="fab fa-github text-gray-400 text-sm group-hover:text-white"></i>
              </a>
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <i className="fas fa-link text-green-400 text-xs"></i>
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/dashboard" className="text-gray-400 hover:text-green-400 transition flex items-center gap-2"><i className="fas fa-chevron-right text-[10px]"></i> Dashboard</a></li>
              <li><a href="/report" className="text-gray-400 hover:text-green-400 transition flex items-center gap-2"><i className="fas fa-chevron-right text-[10px]"></i> Report Issue</a></li>
              <li><a href="/map" className="text-gray-400 hover:text-green-400 transition flex items-center gap-2"><i className="fas fa-chevron-right text-[10px]"></i> View Map</a></li>
              <li><a href="/about" className="text-gray-400 hover:text-green-400 transition flex items-center gap-2"><i className="fas fa-chevron-right text-[10px]"></i> About Us</a></li>
            </ul>
          </div>
          
          {/* Resources */}
          <div>
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <i className="fas fa-book text-green-400 text-xs"></i>
              Resources
            </h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/privacy" className="text-gray-400 hover:text-green-400 transition flex items-center gap-2"><i className="fas fa-chevron-right text-[10px]"></i> Privacy Policy</a></li>
              <li><a href="/terms" className="text-gray-400 hover:text-green-400 transition flex items-center gap-2"><i className="fas fa-chevron-right text-[10px]"></i> Terms of Service</a></li>
              <li><Link to="/faq"  className="text-gray-400 hover:text-green-400 transition flex items-center gap-2"><i className="fas fa-chevron-right text-[10px]"></i> FAQ</Link></li>
              <li><a href="/contact" className="text-gray-400 hover:text-green-400 transition flex items-center gap-2"><i className="fas fa-chevron-right text-[10px]"></i> Contact Support</a></li>
            </ul>
          </div>
          
          {/* Contact Info */}
          <div>
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <i className="fas fa-address-card text-green-400 text-xs"></i>
              Contact Us
            </h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-center gap-2">
                <i className="fas fa-map-marker-alt text-green-400 w-4"></i>
                <span>Lusaka, Zambia</span>
              </li>
              <li className="flex items-center gap-2">
                <i className="fas fa-envelope text-green-400 w-4"></i>
                <a href="mailto:info@lusakaclean.com" className="hover:text-green-400">info@lusakaclean.com</a>
              </li>
              <li className="flex items-center gap-2">
                <i className="fas fa-phone text-green-400 w-4"></i>
                <a href="tel:+260976846612" className="hover:text-green-400">+260 97 684 6612</a>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Divider */}
        <div className="border-t border-gray-700 my-6"></div>
        
        {/* Copyright & Credits */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <i className="fas fa-copyright"></i>
            <span>{year} Lusaka Clean. All rights reserved.</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span>Built by</span>
            <span className="text-green-400">Michael Matanda</span>
            <span>&</span>
            <span className="text-green-400">Joseph Mbayo</span>
          </div>
          
          <div className="flex items-center gap-1">
            <i className="fas fa-code"></i>
            <span>Cavendish University Zambia</span>
            <span className="text-gray-600">|</span>
            <i className="fas fa-heart text-red-500"></i>
            <span>v2.0.0</span>
          </div>
        </div>
        
        {/* Live Stats Bar */}
        <div className="mt-4 pt-3 border-t border-gray-700/50 flex flex-wrap justify-center gap-4 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <i className="fas fa-check-circle text-green-500 text-[8px]"></i>
            Real-time Reporting
          </span>
          <span className="flex items-center gap-1">
            <i className="fas fa-map-marker-alt text-blue-500 text-[8px]"></i>
            Live Location Tracking
          </span>
          <span className="flex items-center gap-1">
            <i className="fas fa-comments text-purple-500 text-[8px]"></i>
            Instant Chat
          </span>
          <span className="flex items-center gap-1">
            <i className="fas fa-chart-line text-orange-500 text-[8px]"></i>
            Analytics Dashboard
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;