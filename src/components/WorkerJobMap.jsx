import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const WorkerJobMap = ({ workerId, jobs }) => {
  const [workerLocation, setWorkerLocation] = useState(null);

  useEffect(() => {
    if (workerId) {
      loadWorkerLocation();
      const interval = setInterval(loadWorkerLocation, 10000);
      return () => clearInterval(interval);
    }
  }, [workerId]);

  const loadWorkerLocation = async () => {
    const { data } = await supabase
      .from('worker_locations')
      .select('*')
      .eq('worker_id', workerId)
      .single();
    if (data) setWorkerLocation(data);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <i className="fas fa-map-marked-alt text-green-600"></i>
        Job Locations Map
      </h3>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {workerLocation && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm font-medium">Your Location</p>
            <p className="text-xs text-gray-600 font-mono">
              {workerLocation.latitude.toFixed(6)}, {workerLocation.longitude.toFixed(6)}
            </p>
          </div>
        )}
        
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Assigned Jobs:</p>
          {jobs.filter(j => j.status === 'assigned').map(job => (
            <div key={job.id} className="bg-gray-50 p-3 rounded-lg border">
              <p className="font-medium text-sm">{job.address}</p>
              {job.latitude && job.longitude && (
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&origin=${workerLocation?.latitude},${workerLocation?.longitude}&destination=${job.latitude},${job.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 text-xs hover:underline mt-1 inline-block"
                >
                  <i className="fas fa-directions mr-1"></i> Get Directions
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WorkerJobMap;