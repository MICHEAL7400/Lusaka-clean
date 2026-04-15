import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const MyReports = () => {
  const [reports, setReports] = useState([]);
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
    const savedUser = localStorage.getItem('user');
    if (!savedUser) return;
    
    const currentUser = JSON.parse(savedUser);
    
    try {
      const { data, error } = await supabase
        .from('waste_reports')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (reportId) => {
    if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('waste_reports')
        .delete()
        .eq('id', reportId);
      
      if (error) throw error;
      
      toast.success('Report deleted successfully');
      loadReports();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete report');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      assigned: 'bg-blue-100 text-blue-800',
      collected: 'bg-purple-100 text-purple-800',
      verified: 'bg-green-100 text-green-800'
    };
    return `px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`;
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">My Reports</h1>
          <p className="text-gray-500">Manage and track your waste reports</p>
        </div>
        <Link to="/report">
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            <i className="fas fa-plus-circle mr-2"></i>New Report
          </button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="font-semibold">All Reports ({reports.length})</h2>
        </div>
        <div className="divide-y">
          {reports.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <i className="fas fa-inbox text-4xl mb-3"></i>
              <p>No reports yet</p>
              <Link to="/report" className="text-green-600 text-sm mt-2 inline-block">Create your first report →</Link>
            </div>
          ) : (
            reports.map(report => (
              <div key={report.id} className="p-4 hover:bg-gray-50 transition">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs text-gray-500 font-mono">#{report.id.slice(0, 6)}</span>
                      <span className={getStatusBadge(report.status)}>{report.status}</span>
                      {report.is_emergency && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800">Emergency</span>
                      )}
                    </div>
                    <p className="font-medium">{report.address}</p>
                    <p className="text-sm text-gray-500 mt-1 capitalize">{report.waste_type}</p>
                    <p className="text-xs text-gray-400 mt-2">{new Date(report.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    {report.status === 'pending' && (
                      <Link to={`/edit-report/${report.id}`}>
                        <button className="px-3 py-1 text-blue-600 border rounded-lg text-sm hover:bg-blue-50">
                          <i className="fas fa-edit mr-1"></i>Edit
                        </button>
                      </Link>
                    )}
                    <Link to={`/report/${report.id}`}>
                      <button className="px-3 py-1 text-green-600 border rounded-lg text-sm hover:bg-green-50">
                        <i className="fas fa-eye mr-1"></i>View
                      </button>
                    </Link>
                    {report.status === 'pending' && (
                      <button onClick={() => handleDelete(report.id)} className="px-3 py-1 text-red-600 border rounded-lg text-sm hover:bg-red-50">
                        <i className="fas fa-trash mr-1"></i>Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MyReports;