import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const ResidentLocationTracker = ({ residentId, reportLocation }) => {
  const [residentLocation, setResidentLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [distance, setDistance] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!residentId) {
      setLoading(false);
      setError('No resident assigned yet');
      return;
    }

    const loadLocation = async () => {
      try {
        // In production, residents would share their location
        // For now, use the report's location as the resident's location
        if (reportLocation && reportLocation.lat && reportLocation.lng) {
          setResidentLocation({
            latitude: reportLocation.lat,
            longitude: reportLocation.lng,
            accuracy: 50
          });
          setError(null);
        } else {
          setError('Resident location not available');
        }
      } catch (err) {
        console.error('Error loading resident location:', err);
        setError('Error loading resident location');
      } finally {
        setLoading(false);
      }
    };

    loadLocation();
    
    // Poll every 5 seconds for updates
    const interval = setInterval(loadLocation, 5000);
    
    return () => clearInterval(interval);
  }, [residentId, reportLocation]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(2);
  };

  const getETA = () => {
    if (!distance) return null;
    const mins = Math.round(parseFloat(distance) * 2);
    if (mins < 1) return 'Less than 1 minute';
    if (mins < 60) return `~${mins} min${mins !== 1 ? 's' : ''}`;
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return minutes > 0 ? `~${hours}h ${minutes}m` : `~${hours} hour${hours !== 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="bg-blue-50 p-4 rounded-lg text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-sm text-blue-600 mt-2">Loading resident location...</p>
      </div>
    );
  }

  if (error || !residentLocation) {
    return (
      <div className="bg-yellow-50 p-4 rounded-lg text-center">
        <i className="fas fa-home text-yellow-600 text-2xl mb-2"></i>
        <p className="text-sm text-yellow-600">{error || 'Resident location not available'}</p>
        <p className="text-xs text-yellow-500 mt-1">Location is based on report address</p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <h3 className="font-semibold text-blue-800 flex items-center gap-2">
          <i className="fas fa-home text-blue-600"></i>
          Resident Location
          <span className="text-xs text-blue-600 font-normal">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block mr-1"></span>
            Live
          </span>
        </h3>
      </div>

      <div className="space-y-3">
        <div className="bg-white rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600 text-sm">Distance to resident:</span>
            <span className="font-bold text-blue-700 text-lg">{distance} km</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Estimated arrival:</span>
            <span className="font-medium text-blue-600">{getETA()}</span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">
            {parseFloat(distance) < 0.5 ? '📍 Very close to resident!' : 
             parseFloat(distance) < 1 ? '🏠 Nearby resident' : 
             parseFloat(distance) < 2 ? '🚶 Approaching resident' : 
             parseFloat(distance) < 5 ? '🚗 On the way to resident' : 
             '🚚 En route to resident'}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (1 - parseFloat(distance) / 10) * 100)}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded p-2 text-xs font-mono text-gray-600 break-all">
          📍 {residentLocation.latitude.toFixed(6)}, {residentLocation.longitude.toFixed(6)}
          {residentLocation.accuracy && (
            <span className="ml-2 text-gray-400">±{Math.round(residentLocation.accuracy)}m</span>
          )}
        </div>

        <div className="flex gap-2">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${residentLocation.latitude},${residentLocation.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
          >
            <i className="fas fa-directions mr-1"></i> Directions to Resident
          </a>
        </div>
      </div>
    </div>
  );
};

export default ResidentLocationTracker;