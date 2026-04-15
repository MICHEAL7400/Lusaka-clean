import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Get user from profiles table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();
      
      if (error || !profile) {
        toast.error('User not found. Please check your email.');
        setLoading(false);
        return;
      }
      
      // Store user in localStorage
      localStorage.setItem('user', JSON.stringify(profile));
      toast.success(`Welcome ${profile.full_name}!`);
      
      // Redirect based on role
      if (profile.role === 'admin') {
        window.location.href = '/admin';
      } else if (profile.role === 'worker') {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/dashboard';
      }
      
    } catch (err) {
      console.error('Login error:', err);
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-seedling text-3xl text-white"></i>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome Back</h1>
          <p className="text-gray-500 mt-1">Sign in to your account</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <i className="fas fa-envelope absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="resident@test.com"
                className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <i className="fas fa-lock absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-medium"
          >
            {loading ? <span className="flex items-center justify-center gap-2"><i className="fas fa-spinner fa-spin"></i>Signing in...</span> : 'Sign In'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-green-600 hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
        
        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-gray-500 text-center mb-2">Demo Accounts:</p>
          <div className="space-y-1 text-xs text-gray-400 text-center">
            <p> resident@test.com - Resident</p>
            <p> worker@test.com - Worker</p>
            <p> admin@test.com - Admin</p>
            <p className="text-green-500 text-xs mt-1">Any password works for demo</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;