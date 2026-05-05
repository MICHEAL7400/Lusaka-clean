import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const WorkerLocationTracker = ({ workerId }) => {
  const [tracking, setTracking] = useState(false);
  const [lastLocation, setLastLocation] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const watchIdRef = useRef(null);
  const isMountedRef = useRef(true);

  // Save location to Supabase (production)
  const saveLocationToSupabase = async (latitude, longitude, acc) => {
    if (!workerId) return false;
    
    try {
      const { error } = await supabase
        .from('worker_locations')
        .upsert({
          worker_id: workerId,
          latitude: latitude,
          longitude: longitude,
          accuracy: Math.round(acc || 0),
          timestamp: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'worker_id' });
      
      if (error) {
        console.error('Supabase location save error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Location save exception:', err);
      return false;
    }
  };

  const handlePosition = async (position) => {
    const { latitude, longitude, accuracy: acc } = position.coords;
    
    if (isMountedRef.current) {
      setLastLocation({ latitude, longitude });
      setAccuracy(acc);
      setLocationError(null);
    }
    
    // Save to Supabase
    await saveLocationToSupabase(latitude, longitude, acc);
    console.log('📍 Location saved to Supabase:', { latitude, longitude, accuracy: acc });
  };

  const handleError = (err) => {
    console.warn('Geolocation error:', err.code, err.message);
    
    switch(err.code) {
      case 1:
        setLocationError('Permission denied. Please allow location access.');
        toast.error('Location permission denied');
        stopTracking();
        break;
      case 2:
        setLocationError('Position unavailable. Check GPS.');
        break;
      case 3:
        setLocationError('Searching for GPS signal...');
        break;
      default:
        setLocationError(err.message);
    }
  };

  const stopTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
    toast('Location sharing stopped', { icon: '📍' });
  };

  const startTracking = () => {
    if (!workerId) {
      toast.error('Worker ID not available');
      return;
    }
    
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }

    setTracking(true);
    setLocationError(null);

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await handlePosition(position);
        toast.success('📍 Sharing your location! Residents can now track you.');
      },
      (err) => {
        console.warn('Initial position error:', err);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // Watch for continuous updates
    const watchId = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
        distanceFilter: 10
      }
    );
    
    watchIdRef.current = watchId;
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-4 border">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${tracking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
          <div>
            <h3 className="font-semibold text-sm">Live Location Sharing</h3>
            <p className="text-xs text-gray-500">
              {tracking 
                ? accuracy 
                  ? `📍 Active — ±${Math.round(accuracy)}m`
                  : '🟢 Getting GPS...'
                : '⚫ Not sharing'}
            </p>
          </div>
        </div>

        <button
          onClick={tracking ? stopTracking : startTracking}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            tracking
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          <i className={`fas ${tracking ? 'fa-stop' : 'fa-location-dot'} mr-2`}></i>
          {tracking ? 'Stop Sharing' : 'Share Live Location'}
        </button>
      </div>

      {locationError && (
        <div className="mt-3 text-xs text-orange-600 bg-orange-50 p-2 rounded">
          <i className="fas fa-satellite-dish mr-1"></i>
          {locationError}
        </div>
      )}

      {tracking && lastLocation && (
        <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded">
          📍 {lastLocation.latitude.toFixed(6)}, {lastLocation.longitude.toFixed(6)}
          {accuracy && <span className="ml-2">±{Math.round(accuracy)}m</span>}
        </div>
      )}
    </div>
  );
};

export default WorkerLocationTracker;