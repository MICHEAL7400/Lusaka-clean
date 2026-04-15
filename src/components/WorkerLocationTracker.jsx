// src/components/WorkerLocationMap.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const WorkerLocationMap = ({ workerId, reportLocation }) => {
  const [workerLocation, setWorkerLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workerId) return;

    // Subscribe to worker location updates
    const subscription = supabase
      .channel(`worker-location-${workerId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'worker_locations', filter: `worker_id=eq.${workerId}` },
        (payload) => {
          if (payload.new) {
            setWorkerLocation(payload.new);
            calculateDistance(payload.new.latitude, payload.new.longitude);
            setLoading(false);
          }
        }
      )
      .subscribe();

    // Fetch initial location
    fetchWorkerLocation();

    return () => subscription.unsubscribe();
  }, [workerId]);

  const fetchWorkerLocation = async () => {
    const { data } = await supabase
      .from('worker_locations')
      .select('*')
      .eq('worker_id', workerId)
      .single();
    
    if (data) {
      setWorkerLocation(data);
      calculateDistance(data.latitude, data.longitude);
    }
    setLoading(false);
  };

  const calculateDistance = (lat2, lon2) => {
    if (!reportLocation) return;
    
    const R = 6371;
    const lat1 = reportLocation.lat;
    const lon1 = reportLocation.lng;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    setDistance((R * c).toFixed(2));
  };

  if (loading) {
    return (
      <div className="bg-blue-50 p-4 rounded-lg text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-sm text-blue-600 mt-2">Loading worker location...</p>
      </div>
    );
  }

  if (!workerLocation) {
    return (
      <div className="bg-yellow-50 p-4 rounded-lg text-center">
        <i className="fas fa-map-marker-alt text-yellow-600 text-2xl mb-2"></i>
        <p className="text-sm text-yellow-600">Worker location not available yet</p>
        <p className="text-xs text-yellow-500 mt-1">They may be offline</p>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
        <i className="fas fa-truck-moving"></i>
        Worker Location
      </h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Distance from your location:</span>
          <span className="font-bold text-green-700">{distance} km</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Last updated:</span>
          <span className="text-xs text-gray-500">
            {new Date(workerLocation.timestamp).toLocaleTimeString()}
          </span>
        </div>
        
        <div className="h-48 w-full rounded-lg overflow-hidden">
          <MapContainer
            center={[workerLocation.latitude, workerLocation.longitude]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap'
            />
            <Marker position={[workerLocation.latitude, workerLocation.longitude]}>
              <Popup>
                Worker is here<br />
                Last updated: {new Date(workerLocation.timestamp).toLocaleString()}
              </Popup>
            </Marker>
            {reportLocation && (
              <Marker position={[reportLocation.lat, reportLocation.lng]}>
                <Popup>Your waste report location</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
        
        <button
          onClick={() => window.open(`https://maps.google.com/?q=${workerLocation.latitude},${workerLocation.longitude}`, '_blank')}
          className="w-full mt-2 text-sm bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700"
        >
          <i className="fas fa-directions mr-2"></i>
          Get Directions
        </button>
      </div>
    </div>
  );
};

export default WorkerLocationMap;