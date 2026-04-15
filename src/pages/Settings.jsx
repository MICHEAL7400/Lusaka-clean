import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { supabase } from '../lib/supabase';
import { notificationService } from '../services/notificationService';
import toast from 'react-hot-toast';

const Settings = () => {
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    dark_mode: false,
    email_notifications: true,
    sms_notifications: false,
    push_notifications: true
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      
      if (data) {
        setPreferences(data);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const updatePreference = async (key, value) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user?.id,
          [key]: value,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      setPreferences(prev => ({ ...prev, [key]: value }));
      toast.success('Settings updated');
      
      if (key === 'push_notifications' && value) {
        await notificationService.requestBrowserPermission();
      }
      
    } catch (error) {
      console.error('Failed to update preference:', error);
      toast.error('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const requestNotificationPermission = async () => {
    const granted = await notificationService.requestBrowserPermission();
    if (granted) {
      toast.success('Notifications enabled');
      updatePreference('push_notifications', true);
    } else {
      toast.error('Notification permission denied');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold dark:text-white">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account preferences</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
        <div className="p-5 border-b">
          <h2 className="font-semibold dark:text-white">Notification Preferences</h2>
          <p className="text-sm text-gray-500 mt-1">Choose how you want to be notified</p>
        </div>
        
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium dark:text-white">Email Notifications</p>
              <p className="text-sm text-gray-500">Receive updates about your reports via email</p>
            </div>
            <button
              onClick={() => updatePreference('email_notifications', !preferences.email_notifications)}
              disabled={loading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                preferences.email_notifications ? 'bg-green-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  preferences.email_notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium dark:text-white">Push Notifications</p>
              <p className="text-sm text-gray-500">Receive browser notifications</p>
            </div>
            <div className="flex items-center gap-3">
              {Notification.permission !== 'granted' && preferences.push_notifications && (
                <button
                  onClick={requestNotificationPermission}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Enable
                </button>
              )}
              <button
                onClick={() => updatePreference('push_notifications', !preferences.push_notifications)}
                disabled={loading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  preferences.push_notifications ? 'bg-green-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    preferences.push_notifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium dark:text-white">SMS Notifications</p>
              <p className="text-sm text-gray-500">Receive text message updates (additional charges may apply)</p>
            </div>
            <button
              onClick={() => updatePreference('sms_notifications', !preferences.sms_notifications)}
              disabled={loading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                preferences.sms_notifications ? 'bg-green-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  preferences.sms_notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
        <div className="p-5 border-b">
          <h2 className="font-semibold dark:text-white">Account Information</h2>
        </div>
        
        <div className="p-5 space-y-3">
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium dark:text-white">{user?.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Account Type</p>
            <p className="font-medium capitalize dark:text-white">{user?.role}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Member Since</p>
            <p className="font-medium dark:text-white">{new Date(user?.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
        <div className="p-5 border-b">
          <h2 className="font-semibold dark:text-white">Data Management</h2>
        </div>
        
        <div className="p-5 space-y-4">
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                toast.error('Please contact support to delete your account');
              }
            }}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;