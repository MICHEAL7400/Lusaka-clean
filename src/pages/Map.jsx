import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const Map = () => {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const savedUser = localStorage.getItem('user');
      const currentUser = savedUser ? JSON.parse(savedUser) : null;
      
      let query = supabase.from('waste_reports').select('*');
      
      // Different users see different reports
      if (currentUser) {
        if (currentUser.role === 'admin') {
          // Admin sees all reports
          query = query.order('created_at', { ascending: false });
        } else if (currentUser.role === 'worker') {
          // Worker sees reports assigned to them + pending in their zone
          query = query
            .or(`assigned_worker_id.eq.${currentUser.id},and(status.eq.pending,zone.eq.${currentUser.zone})`)
            .order('created_at', { ascending: false });
        } else {
          // Resident sees only their own reports
          query = query
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        }
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('Error loading reports:', err);
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

  const getStatusIcon = (status) => {
    switch(status) {
      case 'pending': return 'fa-clock';
      case 'assigned': return 'fa-user-check';
      case 'collected': return 'fa-truck';
      case 'verified': return 'fa-check-circle';
      default: return 'fa-question';
    }
  };

  const filteredReports = filter === 'all' 
    ? reports 
    : reports.filter(r => r.status === filter);

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
        <p className="text-gray-500">
          {user?.role === 'admin' ? 'Viewing all waste reports' :
           user?.role === 'worker' ? 'Viewing assigned and available jobs' :
           'Viewing your waste reports'}
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded-full text-sm ${filter === 'all' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>All ({reports.length})</button>
        <button onClick={() => setFilter('pending')} className={`px-3 py-1 rounded-full text-sm ${filter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-200'}`}>Pending ({reports.filter(r => r.status === 'pending').length})</button>
        <button onClick={() => setFilter('assigned')} className={`px-3 py-1 rounded-full text-sm ${filter === 'assigned' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Assigned ({reports.filter(r => r.status === 'assigned').length})</button>
        <button onClick={() => setFilter('collected')} className={`px-3 py-1 rounded-full text-sm ${filter === 'collected' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>Collected ({reports.filter(r => r.status === 'collected').length})</button>
        <button onClick={() => setFilter('verified')} className={`px-3 py-1 rounded-full text-sm ${filter === 'verified' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>Verified ({reports.filter(r => r.status === 'verified').length})</button>
      </div>

      {/* Map View - Interactive Map */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="h-96 w-full bg-gray-100 relative">
          {/* Embedded Google Maps view */}
          <iframe
            title="Lusaka Map"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d123456!2d28.2833!3d-15.4167!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x19415f5a7f5a7f5a%3A0x5f5a7f5a7f5a7f5a!2sLusaka%2C%20Zambia!5e0!3m2!1sen!2s!4v1234567890"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Report Locations ({filteredReports.length})</h2>
        </div>
        <div className="divide-y max-h-96 overflow-y-auto">
          {filteredReports.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <i className="fas fa-map-marker-alt text-4xl mb-3"></i>
              <p>No reports to display on map</p>
            </div>
          ) : (
            filteredReports.map(report => (
              <div key={report.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start gap-3">
                  <div className={`w-3 h-3 rounded-full mt-1.5 ${getStatusColor(report.status)}`}></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs text-gray-500">#{report.id.slice(0, 6)}</span>
                      <span className="text-xs font-medium capitalize flex items-center gap-1">
                        <i className={`fas ${getStatusIcon(report.status)}`}></i>
                        {report.status}
                      </span>
                      {report.is_emergency && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">Emergency</span>
                      )}
                    </div>
                    <p className="font-medium">{report.address}</p>
                    <p className="text-sm text-gray-500 capitalize">{report.waste_type}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Reported: {new Date(report.created_at).toLocaleString()}
                    </p>
                    {report.latitude && report.longitude && (
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`}
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

      {/* Legend */}
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