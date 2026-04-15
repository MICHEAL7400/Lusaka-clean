import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const WorkerMapTracker = ({ workerId, reportLocation }) => {
  const [workerLocation, setWorkerLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workerId) return;

    const subscription = supabase
      .channel(`worker-location-${workerId}`)
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'worker_locations',
          filter: `worker_id=eq.${workerId}`
        },
        (payload) => {
          setWorkerLocation(payload.new);
          setLoading(false);
        }
      )
      .subscribe();

    fetchWorkerLocation();

    return () => {
      subscription.unsubscribe();
    };
  }, [workerId]);

  const fetchWorkerLocation = async () => {
    const { data } = await supabase
      .from('worker_locations')
      .select('*')
      .eq('worker_id', workerId)
      .single();
    
    setWorkerLocation(data);
    setLoading(false);
  };

  const calculateDistance = () => {
    if (!workerLocation || !reportLocation) return null;
    
    const R = 6371;
    const lat1 = workerLocation.latitude;
    const lon1 = workerLocation.longitude;
    const lat2 = reportLocation.lat;
    const lon2 = reportLocation.lng;
    
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance.toFixed(2);
  };

  if (loading) {
    return (
      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-blue-600">Loading worker location...</p>
      </div>
    );
  }

  if (!workerLocation) {
    return (
      <div className="bg-yellow-50 p-4 rounded-lg">
        <p className="text-sm text-yellow-600">Worker location not available yet.</p>
      </div>
    );
  }

  const distance = calculateDistance();

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <h3 className="font-medium text-green-800 mb-2 flex items-center gap-2">
        <i className="fas fa-truck-moving"></i>
        Worker Location
      </h3>
      <div className="space-y-2 text-sm">
        <p className="text-green-700">
          <span className="font-medium">Distance from your location:</span>{' '}
          {distance ? `${distance} km` : 'Calculating...'}
        </p>
        <p className="text-green-600 text-xs">
          Last updated: {new Date(workerLocation.timestamp).toLocaleTimeString()}
        </p>
        <button
          onClick={() => {
            window.open(`https://maps.google.com/?q=${workerLocation.latitude},${workerLocation.longitude}`, '_blank');
          }}
          className="mt-2 text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
        >
          <i className="fas fa-map-marker-alt mr-1"></i>
          View on Map
        </button>
      </div>
    </div>
  );
};

export default WorkerMapTracker;
