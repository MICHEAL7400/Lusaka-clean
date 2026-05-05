import React, { useState, useEffect } from 'react';

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

    const loadLocation = () => {
      // For now, use the report's location as the resident's location
      if (reportLocation && reportLocation.lat && reportLocation.lng) {
        setResidentLocation({
          latitude: reportLocation.lat,
          longitude: reportLocation.lng,
          accuracy: 50
        });
        setError(null);
        
        // Calculate distance from worker's current location (if available)
        // For demo, we'll just show the report location
        setDistance("0.00");
      } else {
        setError('Resident location not available');
      }
      setLoading(false);
    };

    loadLocation();
    const interval = setInterval(loadLocation, 5000);
    return () => clearInterval(interval);
  }, [residentId, reportLocation]);

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
      <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
        <i className="fas fa-home text-blue-600"></i>
        Resident Location
        <span className="ml-auto text-xs text-blue-600 font-normal">Based on report address</span>
      </h3>

      <div className="space-y-3">
        <div className="bg-white rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600 text-sm">Report address:</span>
            <span className="font-bold text-blue-700 text-sm truncate ml-2">{reportLocation?.lat}, {reportLocation?.lng}</span>
          </div>
        </div>

        <div className="bg-white rounded p-2 text-xs font-mono text-gray-600 break-all">
          📍 {residentLocation.latitude.toFixed(6)}, {residentLocation.longitude.toFixed(6)}
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