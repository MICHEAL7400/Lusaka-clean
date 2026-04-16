import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (cooldown) {
      toast.error('Please wait 60 seconds before requesting another reset');
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        if (error.message.includes('rate limit')) {
          toast.error('Too many requests. Please wait 1 minute before trying again.');
          setCooldown(true);
          setTimeout(() => setCooldown(false), 60000);
        } else {
          throw error;
        }
        return;
      }
      
      setSent(true);
      toast.success('Password reset email sent! Check your inbox.');
      
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
          <i className="fas fa-envelope text-5xl text-green-600 mb-4"></i>
          <h1 className="text-2xl font-bold mb-2">Check Your Email</h1>
          <p className="text-gray-600 mb-4">
            We sent a password reset link to <strong>{email}</strong>
          </p>
          <Link to="/login" className="text-green-600 hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <div className="text-center mb-8">
          <i className="fas fa-key text-4xl text-green-600"></i>
          <h1 className="text-2xl font-bold mt-3">Forgot Password?</h1>
          <p className="text-gray-500 text-sm mt-1">
            Enter your email and we'll send you a reset link
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email Address"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            required
          />
          <button
            type="submit"
            disabled={loading || cooldown}
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            {loading ? 'Sending...' : cooldown ? 'Please wait...' : 'Send Reset Link'}
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <Link to="/login" className="text-sm text-green-600 hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;