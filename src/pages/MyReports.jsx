import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const MyReports = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [myReports, setMyReports] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadMyReports();
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false);
    }
  }, [isAuthenticated, user, authLoading]);

  const loadMyReports = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('waste_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setMyReports(data || []);
    } catch (error) {
      console.error('Failed to load reports:', error.message);
      // Don't show toast for every error, just log it
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      assigned: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      collected: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      verified: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    };
    return `px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`;
  };

  const filteredReports = filter === 'all' 
    ? myReports 
    : myReports.filter(r => r.status === filter);

  if (authLoading || loading) {
    return (
      <div className="space-y-4 sm:space-y-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold dark:text-white">My Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Track and manage your waste reports</p>
        </div>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="text-center py-12">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 max-w-md mx-auto">
          <i className="fas fa-lock text-5xl text-gray-400 mb-4"></i>
          <h2 className="text-xl font-semibold mb-2 dark:text-white">Login Required</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Please login to view your reports.
          </p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold dark:text-white">My Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Track and manage your waste reports</p>
        </div>
        <button 
          onClick={loadMyReports}
          className="text-green-600 hover:text-green-700 text-sm"
        >
          <i className="fas fa-sync-alt mr-1"></i>
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {['all', 'pending', 'assigned', 'collected', 'verified'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 rounded-full text-xs sm:text-sm transition ${
              filter === status
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {filteredReports.length > 0 ? (
        <div className="space-y-3">
          {filteredReports.map((report) => (
            <div key={report.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500 font-mono">#{report.id?.slice(0, 6)}</span>
                    <span className={getStatusBadge(report.status)}>
                      {report.status}
                    </span>
                    {report.is_emergency && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Emergency
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(report.created_at).toLocaleDateString()}
                  </span>
                </div>

                <p className="font-medium text-sm sm:text-base dark:text-white">{report.address || 'No address'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {report.waste_type || 'General waste'}
                </p>

                <div className="flex justify-end mt-2">
                  <Link to={`/report/${report.id}`}>
                    <button className="text-green-600 text-sm hover:underline flex items-center gap-1">
                      View Details <i className="fas fa-arrow-right text-xs"></i>
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-8 text-center">
          <i className="fas fa-flag text-3xl text-gray-300 mb-2"></i>
          <p className="text-gray-500">No reports found</p>
          <Link to="/report">
            <button className="mt-3 text-green-600 text-sm hover:underline">
              Create your first report →
            </button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default MyReports;
