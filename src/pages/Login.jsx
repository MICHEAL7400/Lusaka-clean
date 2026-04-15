import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();
      
      if (error || !profile) {
        toast.error('User not found');
        setLoading(false);
        return;
      }
      
      localStorage.setItem('user', JSON.stringify(profile));
      toast.success(`Welcome ${profile.full_name}!`);
      navigate('/dashboard');
      
    } catch (err) {
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <div className="text-center mb-8">
          <i className="fas fa-seedling text-4xl text-green-600"></i>
          <h1 className="text-2xl font-bold mt-3">Lusaka Clean</h1>
          <p className="text-gray-500">Sign in to your account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="Email" 
            className="w-full px-3 py-2 border rounded-lg" 
            required 
          />
          <input 
            type="password" 
            placeholder="Password (any value works)" 
            className="w-full px-3 py-2 border rounded-lg" 
            required 
          />
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="mt-6 pt-4 border-t text-center text-sm text-gray-500">
          <p>resident@test.com | worker@test.com | admin@test.com</p>
          <p className="text-xs mt-1">Any password works</p>
        </div>
      </div>
    </div>
  );
};

export default Login;