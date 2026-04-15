import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const Register = () => {
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState('resident');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    zone: 'Matero',
    // Worker specific fields
    workerId: '',
    vehicleType: '',
    experience: ''
  });
  
  const navigate = useNavigate();
  const zones = ['Matero', 'Chilene', 'Kabwata', 'CBD', 'Kanyama', 'Chawama', 'Mandevu'];
  const vehicleTypes = ['Truck - Large Collection', 'Pickup - Medium Loads', 'Motorbike - Small Loads', 'Bicycle - Recycling', 'None'];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    if (selectedRole === 'worker' && !formData.workerId) {
      toast.error('Worker ID is required');
      return;
    }
    
    setLoading(true);
    
    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: selectedRole,
            zone: formData.zone,
            phone: formData.phone
          }
        }
      });
      
      if (authError) throw authError;
      
      // Create profile
      const profileData = {
        id: authData.user?.id,
        email: formData.email,
        full_name: formData.fullName,
        role: selectedRole,
        phone: formData.phone,
        zone: formData.zone,
        available: selectedRole === 'worker' ? false : null
      };
      
      // Add worker-specific fields
      if (selectedRole === 'worker') {
        profileData.worker_id = formData.workerId;
        profileData.vehicle_type = formData.vehicleType;
        profileData.experience = formData.experience;
        profileData.available = false;
        profileData.completed_jobs = 0;
        profileData.rating = 0;
      }
      
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([profileData]);
      
      if (profileError && profileError.code !== '23505') {
        console.error('Profile error:', profileError);
      }
      
      toast.success(`Account created successfully! Please check your email to verify.`);
      navigate('/login');
      
    } catch (error) {
      console.error('Registration error:', error);
      if (error.message?.includes('already registered')) {
        toast.error('Email already registered. Please login instead.');
      } else {
        toast.error(error.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-green-600 p-6 text-white text-center">
            <i className="fas fa-seedling text-3xl mb-2"></i>
            <h1 className="text-2xl font-bold">Create Account</h1>
            <p className="text-green-100 mt-1">Join Lusaka Clean community</p>
          </div>
          
          <div className="p-6">
            {/* Role Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">I want to join as:</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedRole('resident')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedRole === 'resident' 
                      ? 'border-green-600 bg-green-50' 
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <i className={`fas fa-user ${selectedRole === 'resident' ? 'text-green-600' : 'text-gray-400'} text-2xl mb-2`}></i>
                  <p className={`font-semibold ${selectedRole === 'resident' ? 'text-green-600' : 'text-gray-600'}`}>Resident</p>
                  <p className="text-xs text-gray-500">Report waste issues</p>
                </button>
                
                <button
                  type="button"
                  onClick={() => setSelectedRole('worker')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedRole === 'worker' 
                      ? 'border-green-600 bg-green-50' 
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <i className={`fas fa-truck ${selectedRole === 'worker' ? 'text-green-600' : 'text-gray-400'} text-2xl mb-2`}></i>
                  <p className={`font-semibold ${selectedRole === 'worker' ? 'text-green-600' : 'text-gray-600'}`}>Waste Collector</p>
                  <p className="text-xs text-gray-500">Collect and manage waste</p>
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="0977 123456"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zone / Area *</label>
                  <select
                    name="zone"
                    value={formData.zone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  >
                    {zones.map(zone => (
                      <option key={zone} value={zone}>{zone}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Worker Specific Fields */}
              {selectedRole === 'worker' && (
                <div className="border-t pt-4 mt-2">
                  <h3 className="font-semibold text-gray-700 mb-3">Worker Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Worker ID / License *</label>
                      <input
                        type="text"
                        name="workerId"
                        value={formData.workerId}
                        onChange={handleChange}
                        placeholder="LCC-WKR-001"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                      <select
                        name="vehicleType"
                        value={formData.vehicleType}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Select vehicle type</option>
                        {vehicleTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
                      <select
                        name="experience"
                        value={formData.experience}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Select experience</option>
                        <option value="Less than 1 year">Less than 1 year</option>
                        <option value="1-3 years">1-3 years</option>
                        <option value="3-5 years">3-5 years</option>
                        <option value="5+ years">5+ years</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-medium mt-4"
              >
                {loading ? <span className="flex items-center justify-center gap-2"><i className="fas fa-spinner fa-spin"></i>Creating account...</span> : 'Create Account'}
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="text-green-600 hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;