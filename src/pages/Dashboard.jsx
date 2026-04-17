import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { supabase } from '../lib/supabase';

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [reports, setReports] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const reportsPerPage = 5;

  useEffect(() => {
    if (user && user.id) {
      loadData();
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadData = async () => {
    try {
      const { data: reportsData } = await supabase
        .from('waste_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      setReports(reportsData || []);
      
      const { data: notifData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      setNotifications(notifData || []);
      setUnreadCount(notifData?.filter(n => !n.read).length || 0);
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markNotificationAsRead = async (id) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const getStatusBadge = (status) => {
    // Orange for pending/assigned, Green for verified
    if (status === 'pending' || status === 'assigned') {
      return 'bg-orange-500 text-white';
    }
    if (status === 'verified') {
      return 'bg-green-600 text-white';
    }
    if (status === 'collected') {
      return 'bg-purple-500 text-white';
    }
    return 'bg-gray-500 text-white';
  };

  const getStatusText = (status) => {
    if (status === 'pending') return 'Pending';
    if (status === 'assigned') return 'Assigned';
    if (status === 'collected') return 'Collected';
    if (status === 'verified') return 'Resolved';
    return status;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Pagination
  const indexOfLastReport = currentPage * reportsPerPage;
  const indexOfFirstReport = indexOfLastReport - reportsPerPage;
  const currentReports = reports.slice(indexOfFirstReport, indexOfLastReport);
  const totalPages = Math.ceil(reports.length / reportsPerPage);

  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'pending' || r.status === 'assigned').length,
    resolved: reports.filter(r => r.status === 'verified').length
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0 pb-20">
      {/* Welcome Header with Notifications */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-4 sm:p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{getGreeting()}, {user?.full_name?.split(' ')[0] || 'Resident'}!</h1>
            <p className="text-green-100 text-xs sm:text-sm mt-1">Let's keep our community clean</p>
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative bg-white/20 p-2 rounded-full hover:bg-white/30 transition"
            >
              <i className="fas fa-bell text-lg sm:text-xl"></i>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-lg shadow-xl border z-50">
                <div className="p-3 border-b flex justify-between items-center">
                  <h3 className="font-semibold text-gray-800 text-sm">Notifications</h3>
                  <button onClick={() => setShowNotifications(false)} className="text-gray-400 text-xl">&times;</button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">No notifications</div>
                  ) : (
                    notifications.map(notif => (
                      <div key={notif.id} className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${!notif.read ? 'bg-blue-50' : ''}`} onClick={() => markNotificationAsRead(notif.id)}>
                        <p className="text-sm font-medium">{notif.title}</p>
                        <p className="text-xs text-gray-600 mt-1">{notif.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(notif.created_at).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 sm:mt-6">
          <div className="bg-white/10 rounded-lg p-2 sm:p-3 text-center">
            <p className="text-xl sm:text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-green-100">Total Reports</p>
          </div>
          <div className="bg-white/10 rounded-lg p-2 sm:p-3 text-center">
            <p className="text-xl sm:text-2xl font-bold">{stats.resolved}</p>
            <p className="text-xs text-green-100">Resolved</p>
          </div>
          <div className="bg-white/10 rounded-lg p-2 sm:p-3 text-center">
            <p className="text-xl sm:text-2xl font-bold">{stats.pending}</p>
            <p className="text-xs text-green-100">In Progress</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link to="/report" className="flex-1">
          <button className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 font-medium text-sm sm:text-base">
            <i className="fas fa-plus-circle mr-2"></i>New Report
          </button>
        </Link>
        <Link to="/report?emergency=true" className="flex-1">
          <button className="w-full bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 animate-pulse font-medium text-sm sm:text-base">
            <i className="fas fa-exclamation-triangle mr-2"></i>Emergency Report
          </button>
        </Link>
      </div>

      {/* Stats Cards - Mobile Responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4">
        <div className="bg-white p-2 sm:p-4 rounded-lg shadow text-center">
          <p className="text-gray-500 text-xs sm:text-sm">Total</p>
          <p className="text-lg sm:text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-orange-50 p-2 sm:p-4 rounded-lg text-center">
          <p className="text-orange-600 text-xs sm:text-sm">Pending</p>
          <p className="text-lg sm:text-2xl font-bold text-orange-600">{stats.pending}</p>
        </div>
        <div className="bg-blue-50 p-2 sm:p-4 rounded-lg text-center">
          <p className="text-blue-600 text-xs sm:text-sm">Assigned</p>
          <p className="text-lg sm:text-2xl font-bold text-blue-600">{reports.filter(r => r.status === 'assigned').length}</p>
        </div>
        <div className="bg-purple-50 p-2 sm:p-4 rounded-lg text-center">
          <p className="text-purple-600 text-xs sm:text-sm">Collected</p>
          <p className="text-lg sm:text-2xl font-bold text-purple-600">{reports.filter(r => r.status === 'collected').length}</p>
        </div>
        <div className="bg-green-50 p-2 sm:p-4 rounded-lg text-center col-span-2 sm:col-span-1">
          <p className="text-green-600 text-xs sm:text-sm">Resolved</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600">{stats.resolved}</p>
        </div>
      </div>

      {/* Recent Reports with Pagination */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-3 sm:p-4 border-b flex justify-between items-center flex-wrap gap-2">
          <h2 className="font-semibold text-sm sm:text-base">Recent Reports</h2>
          <Link to="/my-reports" className="text-green-600 text-xs sm:text-sm hover:underline">View all →</Link>
        </div>
        <div className="divide-y">
          {currentReports.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-gray-500">
              <i className="fas fa-inbox text-3xl sm:text-4xl mb-2"></i>
              <p className="text-sm">No reports yet</p>
              <Link to="/report"><button className="mt-3 bg-green-600 text-white px-4 py-2 rounded-lg text-sm">Create your first report →</button></Link>
            </div>
          ) : (
            currentReports.map(report => (
              <div key={report.id} className="p-3 sm:p-4 hover:bg-gray-50 transition">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs text-gray-500 font-mono">#{report.id.slice(0, 6)}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(report.status)}`}>
                        {getStatusText(report.status)}
                      </span>
                      {report.is_emergency && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">Emergency</span>
                      )}
                    </div>
                    <p className="font-medium text-sm sm:text-base">{report.address}</p>
                    <p className="text-xs sm:text-sm text-gray-500 capitalize mt-1">{report.waste_type}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(report.created_at).toLocaleDateString()}</p>
                  </div>
                  <Link to={`/report/${report.id}`}>
                    <button className="text-green-600 text-xs sm:text-sm hover:underline whitespace-nowrap">View →</button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Pagination - Mobile Responsive */}
        {reports.length > reportsPerPage && (
          <div className="p-3 sm:p-4 border-t">
            <div className="flex justify-center items-center gap-1 sm:gap-2 flex-wrap">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="fas fa-chevron-left mr-1"></i> Prev
              </button>
              <div className="flex gap-1 sm:gap-2">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-7 h-7 sm:w-8 sm:h-8 text-xs sm:text-sm rounded-lg ${
                        currentPage === pageNum
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next <i className="fas fa-chevron-right ml-1"></i>
              </button>
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">
              Page {currentPage} of {totalPages} ({reports.length} total reports)
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/map">
          <div className="bg-blue-600 p-3 sm:p-4 rounded-lg text-white text-center">
            <i className="fas fa-map text-xl sm:text-2xl mb-1"></i>
            <p className="font-semibold text-sm sm:text-base">View Map</p>
          </div>
        </Link>
        <Link to="/profile">
          <div className="bg-purple-600 p-3 sm:p-4 rounded-lg text-white text-center">
            <i className="fas fa-user text-xl sm:text-2xl mb-1"></i>
            <p className="font-semibold text-sm sm:text-base">My Profile</p>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;