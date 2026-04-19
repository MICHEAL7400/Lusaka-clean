import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loadedImages, setLoadedImages] = useState({});

  const slides = [
    {
      image: "https://vsizambia.org/wp-content/uploads/2022/06/279195450_1441759432960816_8209831642092064898_n.jpg",
      overlay: "rgba(15, 70, 35, 0.55)",
      icon: "fas fa-leaf",
      title: "Keep Lusaka Clean",
      description: "Report waste issues in your community and help us maintain a clean environment"
    },
    {
      image: "https://miro.medium.com/v2/resize:fit:1200/1*AGdi4-w-n1G25LL6aq5FcQ.jpeg",
      overlay: "rgba(20, 60, 120, 0.55)",
      icon: "fas fa-truck-fast",
      title: "Quick Response",
      description: "Workers are notified immediately and respond to your reports promptly"
    },
    {
      image: "https://accrabrewery.com.gh/wp-content/uploads/2018/06/11.jpg",
      overlay: "rgba(10, 80, 55, 0.55)",
      icon: "fas fa-hand-holding-heart",
      title: "Community Driven",
      description: "Together we can make Lusaka a cleaner and healthier place to live"
    },
    {
      image: "https://joburg.org.za/media_/Newsroom/PublishingImages/2020%20News%20Images/January/kleena%20joburg.jpg",
      overlay: "rgba(120, 60, 10, 0.55)",
      icon: "fas fa-star",
      title: "Join the Movement",
      description: "Thousands of Lusaka residents are already making a difference — be one of them"
    }
  ];

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      navigate('/dashboard');
    }
  }, [navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [slides.length]);

  // Preload images and track which ones loaded successfully
  useEffect(() => {
    slides.forEach((slide, index) => {
      const img = new Image();
      img.onload = () => setLoadedImages(prev => ({ ...prev, [index]: true }));
      img.onerror = () => setLoadedImages(prev => ({ ...prev, [index]: false }));
      img.src = slide.image;
    });
  }, []);

  if (user) return null;

  return (
    <div className="min-h-screen">
      {/* Hero Carousel */}
      <div className="relative h-screen overflow-hidden">
        {slides.map((slide, index) => (
          <div
            key={index}
            className="absolute inset-0 transition-opacity duration-700 ease-in-out"
            style={{
              opacity: currentSlide === index ? 1 : 0,
              zIndex: currentSlide === index ? 1 : 0
            }}
          >
            {/* Background photo */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.image})` }}
            />
            {/* Color overlay */}
            <div className="absolute inset-0" style={{ backgroundColor: slide.overlay }} />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-4">
              <div className="text-center max-w-3xl mx-auto">
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/30 shadow-2xl">
                  <i className={`${slide.icon} text-5xl text-white`}></i>
                </div>
                <h1 className="text-4xl sm:text-6xl font-bold mb-4 drop-shadow-lg animate-fade-in">
                  {slide.title}
                </h1>
                <p className="text-lg sm:text-xl text-gray-100 mb-8 drop-shadow animate-fade-in-delay">
                  {slide.description}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-delay-2">
                  <Link to="/login">
                    <button className="bg-white text-green-700 hover:bg-gray-100 px-8 py-3 rounded-lg font-semibold transition transform hover:scale-105 shadow-lg">
                      Get Started
                    </button>
                  </Link>
                  <Link to="/register">
                    <button className="bg-transparent border-2 border-white hover:bg-white hover:text-green-700 text-white px-8 py-3 rounded-lg font-semibold transition shadow-lg">
                      Sign Up
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Dot indicators */}
        <div className="absolute bottom-20 left-0 right-0 z-20 flex justify-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentSlide === index ? 'bg-white w-8' : 'bg-white/50 w-2'
              }`}
            />
          ))}
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 scroll-bounce">
          <div className="flex flex-col items-center">
            <span className="text-white text-xs mb-2 drop-shadow">Scroll Down</span>
            <i className="fas fa-chevron-down text-white text-xl drop-shadow"></i>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">How It Works</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">A simple 3-step process to report and resolve waste issues</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: "fas fa-camera", label: "1. Report", desc: "Take a photo and report waste issues in your area" },
              { icon: "fas fa-truck", label: "2. Respond", desc: "Workers get notified and are assigned to collect" },
              { icon: "fas fa-check-circle", label: "3. Resolve", desc: "Track progress and verify when waste is collected" },
            ].map((item, i) => (
              <div key={i} className="text-center p-6 rounded-2xl hover:shadow-xl transition-all duration-300 group">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition">
                  <i className={`${item.icon} text-3xl text-green-600`}></i>
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.label}</h3>
                <p className="text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center text-white mb-10">
            <h2 className="text-3xl font-bold mb-2">Our Impact</h2>
            <p className="text-green-100">Making Lusaka cleaner every day</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            {[
              { icon: "fas fa-flag", value: "500+", label: "Reports Resolved" },
              { icon: "fas fa-users", value: "1000+", label: "Active Users" },
              { icon: "fas fa-truck", value: "50+", label: "Collection Workers" },
              { icon: "fas fa-star", value: "95%", label: "Satisfaction Rate" },
            ].map((stat, i) => (
              <div key={i} className="p-4">
                <i className={`${stat.icon} text-4xl mb-3`}></i>
                <p className="text-3xl font-bold">{stat.value}</p>
                <p className="text-sm text-green-100">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gray-50 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">Ready to Make a Difference?</h2>
          <p className="text-gray-500 mb-8">Join Lusaka Clean today and help keep our community clean</p>
          <Link to="/register">
            <button className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition transform hover:scale-105">
              Create Free Account
            </button>
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
        .animate-fade-in-delay { animation: fadeIn 0.6s ease-out 0.2s forwards; opacity: 0; }
        .animate-fade-in-delay-2 { animation: fadeIn 0.6s ease-out 0.4s forwards; opacity: 0; }

        @keyframes scrollBounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(8px); }
        }
        .scroll-bounce { animation: scrollBounce 2s infinite; }
      `}</style>
    </div>
  );
};

export default Home;