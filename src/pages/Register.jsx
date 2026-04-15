import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

const Register = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'resident',
    zone: 'Matero'
  });
  
  const navigate = useNavigate();
  const zones = ['Matero', 'Chilene', 'Kabwata', 'CBD', 'Kanyama', 'Chawama', 'Mandevu'];

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

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: formData.role,
            zone: formData.zone,
            phone: formData.phone
          }
        }
      });
      
      if (error) throw error;
      
      toast.success('Account created! Please check your email to verify.');
      navigate('/login');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <i className="fas fa-seedling text-4xl text-green-600"></i>
          <h1 className="text-2xl font-bold mt-3 dark:text-white">Create Account</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            Already have an account? <Link to="/login" className="text-green-600">Sign in</Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input type="text" name="fullName" required value={formData.fullName} onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" name="email" required value={formData.email} onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Zone</label>
            <select name="zone" value={formData.zone} onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700">
              {zones.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input type="password" name="password" required value={formData.password} onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Confirm Password</label>
            <input type="password" name="confirmPassword" required value={formData.confirmPassword} onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
