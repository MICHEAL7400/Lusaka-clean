import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const Map = () => {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const { data } = await supabase
        .from('waste_reports')
        .select('*')
        .order('created_at', { ascending: false });
      setReports(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500',
      assigned: 'bg-blue-500',
      collected: 'bg-purple-500',
      verified: 'bg-green-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const filteredReports = filter === 'all' 
    ? reports 
    : reports.filter(r => r.status === filter);

  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'pending').length,
    assigned: reports.filter(r => r.status === 'assigned').length,
    collected: reports.filter(r => r.status === 'collected').length,
    verified: reports.filter(r => r.status === 'verified').length
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Waste Reports Map</h1>
        <p className="text-gray-500">View all waste reports across Lusaka</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-full text-sm ${
            filter === 'all' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          All ({stats.total})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-3 py-1 rounded-full text-sm ${
            filter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Pending ({stats.pending})
        </button>
        <button
          onClick={() => setFilter('assigned')}
          className={`px-3 py-1 rounded-full text-sm ${
            filter === 'assigned' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Assigned ({stats.assigned})
        </button>
        <button
          onClick={() => setFilter('collected')}
          className={`px-3 py-1 rounded-full text-sm ${
            filter === 'collected' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Collected ({stats.collected})
        </button>
        <button
          onClick={() => setFilter('verified')}
          className={`px-3 py-1 rounded-full text-sm ${
            filter === 'verified' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Verified ({stats.verified})
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Report Locations ({filteredReports.length})</h2>
        </div>
        <div className="divide-y">
          {filteredReports.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No reports to display.
            </div>
          ) : (
            filteredReports.map(report => (
              <div key={report.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start gap-3">
                  <div className={`w-3 h-3 rounded-full mt-1.5 ${getStatusColor(report.status)}`}></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs text-gray-500">#{report.id.slice(0, 6)}</span>
                      <span className="text-xs font-medium capitalize">{report.status}</span>
                      {report.is_emergency && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                          Emergency
                        </span>
                      )}
                    </div>
                    <p className="font-medium">{report.address}</p>
                    <p className="text-sm text-gray-500 capitalize">{report.waste_type}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Reported: {new Date(report.created_at).toLocaleString()}
                    </p>
                    {report.latitude && report.longitude && (
                      <a 
                        href={`https://maps.google.com/?q=${report.latitude},${report.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 text-xs hover:underline inline-block mt-2"
                      >
                        <i className="fas fa-external-link-alt mr-1"></i> Open in Google Maps
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-2">Legend</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500"></div><span className="text-sm">Pending</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div><span className="text-sm">Assigned</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500"></div><span className="text-sm">Collected</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div><span className="text-sm">Verified</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div><span className="text-sm">Emergency</span></div>
        </div>
      </div>
    </div>
  );
};

export default Map;