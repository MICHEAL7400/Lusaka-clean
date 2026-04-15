import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [reports, setReports] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [stats, setStats] = useState({
    total: 0, pending: 0, assigned: 0, collected: 0, verified: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    if (user && user.id) {
      loadData();
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadData = async () => {
    try {
      // Load reports
      const { data: reportsData } = await supabase
        .from('waste_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      setReports(reportsData || []);
      setStats({
        total: reportsData?.length || 0,
        pending: reportsData?.filter(r => r.status === 'pending').length || 0,
        assigned: reportsData?.filter(r => r.status === 'assigned').length || 0,
        collected: reportsData?.filter(r => r.status === 'collected').length || 0,
        verified: reportsData?.filter(r => r.status === 'verified').length || 0
      });
      
      // Load notifications
      const { data: notifData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      setNotifications(notifData || []);
      setUnreadCount(notifData?.filter(n => !n.read).length || 0);
      
      // Load recent activity
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const { data: activityData } = await supabase
        .from('waste_reports')
        .select('status, created_at')
        .eq('user_id', user.id)
        .gte('created_at', lastWeek.toISOString());
      
      setRecentActivity(activityData || []);
      
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
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      assigned: 'bg-blue-100 text-blue-800',
      collected: 'bg-purple-100 text-purple-800',
      verified: 'bg-green-100 text-green-800'
    };
    return `px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`;
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getProgressPercentage = () => {
    if (stats.total === 0) return 0;
    return (stats.verified / stats.total) * 100;
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
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{getGreeting()}, {user?.full_name?.split(' ')[0] || 'Resident'}!</h1>
            <p className="text-green-100 mt-1">Welcome to Lusaka Clean - Let's keep our community clean</p>
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative bg-white/20 p-2 rounded-full hover:bg-white/30 transition"
            >
              <i className="fas fa-bell text-xl"></i>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border z-50">
                <div className="p-3 border-b flex justify-between items-center">
                  <h3 className="font-semibold text-gray-800">Notifications</h3>
                  <button onClick={() => setShowNotifications(false)} className="text-gray-400">&times;</button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">No notifications</div>
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
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-green-100">Total Reports</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.verified}</p>
            <p className="text-xs text-green-100">Resolved</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.pending}</p>
            <p className="text-xs text-green-100">Pending</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.assigned}</p>
            <p className="text-xs text-green-100">In Progress</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow text-center"><p className="text-gray-500">Total</p><p className="text-2xl font-bold">{stats.total}</p></div>
        <div className="bg-yellow-50 p-4 rounded-lg text-center"><p className="text-yellow-600">Pending</p><p className="text-2xl font-bold text-yellow-600">{stats.pending}</p></div>
        <div className="bg-blue-50 p-4 rounded-lg text-center"><p className="text-blue-600">Assigned</p><p className="text-2xl font-bold text-blue-600">{stats.assigned}</p></div>
        <div className="bg-purple-50 p-4 rounded-lg text-center"><p className="text-purple-600">Collected</p><p className="text-2xl font-bold text-purple-600">{stats.collected}</p></div>
        <div className="bg-green-50 p-4 rounded-lg text-center"><p className="text-green-600">Verified</p><p className="text-2xl font-bold text-green-600">{stats.verified}</p></div>
      </div>

      {/* Progress Bar */}
      {stats.total > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between mb-2"><span className="text-sm font-medium">Overall Progress</span><span className="text-sm font-medium">{Math.round(getProgressPercentage())}%</span></div>
          <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-green-600 h-2 rounded-full transition-all duration-500" style={{ width: `${getProgressPercentage()}%` }}></div></div>
          <p className="text-xs text-gray-500 mt-2">{stats.verified} of {stats.total} reports resolved</p>
        </div>
      )}

      {/* Recent Reports */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold text-lg">Recent Reports</h2>
          <Link to="/my-reports" className="text-green-600 text-sm hover:underline">View all →</Link>
        </div>
        <div className="divide-y">
          {reports.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <i className="fas fa-inbox text-4xl mb-3"></i>
              <p>No reports yet</p>
              <Link to="/report"><button className="mt-3 bg-green-600 text-white px-4 py-2 rounded-lg">Create your first report →</button></Link>
            </div>
          ) : (
            reports.slice(0, 5).map(report => (
              <div key={report.id} className="p-4 hover:bg-gray-50 transition">
                <div className="flex justify-between items-start flex-wrap gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs text-gray-500 font-mono">#{report.id.slice(0, 6)}</span>
                      <span className={getStatusBadge(report.status)}><i className={`fas ${getStatusIcon(report.status)} mr-1`}></i>{report.status}</span>
                      {report.is_emergency && <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800"><i className="fas fa-exclamation-triangle mr-1"></i>Emergency</span>}
                    </div>
                    <p className="font-medium">{report.address}</p>
                    <p className="text-sm text-gray-500 mt-1 capitalize"><i className="fas fa-trash mr-1"></i>{report.waste_type}</p>
                    <p className="text-xs text-gray-400 mt-2"><i className="fas fa-calendar mr-1"></i>{new Date(report.created_at).toLocaleString()}</p>
                  </div>
                  <Link to={`/report/${report.id}`}><button className="text-green-600 text-sm hover:underline">View Details →</button></Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/report"><div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-lg text-white text-center cursor-pointer hover:shadow-lg transition"><i className="fas fa-camera text-2xl mb-2"></i><p className="font-semibold">Report Waste</p><p className="text-xs opacity-90">Take a photo</p></div></Link>
        <Link to="/map"><div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-lg text-white text-center cursor-pointer hover:shadow-lg transition"><i className="fas fa-map-marked-alt text-2xl mb-2"></i><p className="font-semibold">View Map</p><p className="text-xs opacity-90">See nearby reports</p></div></Link>
        <Link to="/my-reports"><div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-lg text-white text-center cursor-pointer hover:shadow-lg transition"><i className="fas fa-flag text-2xl mb-2"></i><p className="font-semibold">My Reports</p><p className="text-xs opacity-90">Track status</p></div></Link>
        <Link to="/profile"><div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 rounded-lg text-white text-center cursor-pointer hover:shadow-lg transition"><i className="fas fa-user-circle text-2xl mb-2"></i><p className="font-semibold">My Profile</p><p className="text-xs opacity-90">Update info</p></div></Link>
      </div>

      {/* Tips Section */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200">
        <h3 className="font-semibold mb-2 flex items-center gap-2"><i className="fas fa-lightbulb text-yellow-500"></i>Waste Management Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2"><i className="fas fa-trash-alt text-green-600"></i><span>Separate recyclables from general waste</span></div>
          <div className="flex items-center gap-2"><i className="fas fa-clock text-green-600"></i><span>Report issues early for faster response</span></div>
          <div className="flex items-center gap-2"><i className="fas fa-camera text-green-600"></i><span>Clear photos help workers identify the issue</span></div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;