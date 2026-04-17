import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const Worker = ({ user }) => {
  const [availableJobs, setAvailableJobs] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);
  const [activeTab, setActiveTab] = useState('available');
  const [workerNote, setWorkerNote] = useState('');
  const [trackingLocation, setTrackingLocation] = useState(false);
  const [watchId, setWatchId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    avgRating: 0,
    totalJobs: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    if (user && user.id) {
      loadData();
      loadStats();
      loadNotifications();
      const interval = setInterval(() => {
        loadData();
        loadNotifications();
      }, 15000);
      return () => {
        clearInterval(interval);
        if (watchId) navigator.geolocation.clearWatch(watchId);
      };
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (err) {
      console.error(err);
    }
  };

  const markNotificationAsRead = async (id) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const loadStats = async () => {
    try {
      const { data: tasks } = await supabase
        .from('waste_reports')
        .select('rating')
        .eq('assigned_worker_id', user.id)
        .eq('status', 'verified');
      
      const ratings = tasks?.filter(t => t.rating > 0).map(t => t.rating) || [];
      const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
      
      setStats({
        totalJobs: tasks?.length || 0,
        avgRating: avgRating,
        totalEarnings: (tasks?.length || 0) * 50
      });
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('available')
        .eq('id', user.id)
        .single();
      setIsAvailable(profile?.available || false);
      
      const { data: jobs } = await supabase
        .from('waste_reports')
        .select('*')
        .eq('zone', user.zone)
        .eq('status', 'pending')
        .is('assigned_worker_id', null)
        .order('is_emergency', { ascending: false })
        .order('created_at', { ascending: true });
      
      const { data: tasks } = await supabase
        .from('waste_reports')
        .select('*')
        .eq('assigned_worker_id', user.id)
        .order('created_at', { ascending: false });
      
      setAvailableJobs(jobs || []);
      setMyTasks(tasks?.filter(t => t.status === 'assigned') || []);
      setCompletedJobs(tasks?.filter(t => t.status !== 'assigned') || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async () => {
    const newStatus = !isAvailable;
    await supabase
      .from('profiles')
      .update({ available: newStatus, updated_at: new Date() })
      .eq('id', user.id);
    setIsAvailable(newStatus);
    toast.success(newStatus ? 'You are now ONLINE - Jobs will appear here' : 'You are now OFFLINE');
    if (newStatus) loadData();
  };

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    
    const id = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        await supabase
          .from('worker_locations')
          .upsert({
            worker_id: user.id,
            latitude,
            longitude,
            accuracy,
            timestamp: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      },
      (error) => console.error('Location error:', error),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 60000 }
    );
    
    setWatchId(id);
    setTrackingLocation(true);
    toast.success('Location tracking enabled - Residents can see your location');
  };

  const stopLocationTracking = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setTrackingLocation(false);
      toast.info('Location tracking disabled');
    }
  };

  const acceptJob = async (job) => {
    if (!isAvailable) {
      toast.error('Please go online first to accept jobs');
      return;
    }
    
    await supabase
      .from('waste_reports')
      .update({ 
        assigned_worker_id: user.id, 
        status: 'assigned', 
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);
    
    await supabase.from('notifications').insert([{
      user_id: job.user_id,
      title: 'Worker Assigned',
      message: `A worker has been assigned to your report at ${job.address}`,
      type: 'success',
      report_id: job.id
    }]);
    
    toast.success(`Job accepted: ${job.address}`);
    loadData();
    loadStats();
  };

  const completeJob = async (taskId, note = '') => {
    await supabase
      .from('waste_reports')
      .update({ 
        status: 'collected', 
        collected_at: new Date().toISOString(),
        worker_note: note,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);
    
    const task = myTasks.find(t => t.id === taskId);
    if (task) {
      await supabase.from('notifications').insert([{
        user_id: task.user_id,
        title: 'Waste Collected',
        message: `The waste at ${task.address} has been collected. Please verify.`,
        type: 'info',
        report_id: taskId
      }]);
    }
    
    toast.success('Job marked as collected! Resident will verify');
    loadData();
    loadStats();
  };

  const getStatusBadge = (status) => {
    const colors = {
      assigned: 'bg-blue-100 text-blue-800',
      collected: 'bg-purple-100 text-purple-800',
      verified: 'bg-green-100 text-green-800'
    };
    return `px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`;
  };

  const getPaginatedData = (data) => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return data.slice(start, end);
  };

  const totalPages = (data) => Math.ceil(data.length / itemsPerPage);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0 pb-20">
      {/* Header with Notifications */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-4 sm:p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Worker Dashboard</h1>
            <p className="text-blue-100 text-xs sm:text-sm mt-1">
              <i className="fas fa-map-marker-alt mr-1"></i> Zone: {user?.zone} | 
              <span className={`ml-2 ${isAvailable ? 'text-green-300' : 'text-red-300'}`}>
                {isAvailable ? 'Online' : 'Offline'}
              </span>
            </p>
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
        
        <div className="flex flex-wrap justify-between items-center gap-3 mt-4">
          <div className="flex gap-2">
            {trackingLocation ? (
              <button onClick={stopLocationTracking} className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                <i className="fas fa-stop mr-2"></i>Stop Sharing
              </button>
            ) : (
              <button onClick={startLocationTracking} className="px-3 sm:px-4 py-1.5 sm:py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                <i className="fas fa-share-alt mr-2"></i>Share Location
              </button>
            )}
            <button onClick={toggleAvailability} className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-white text-sm ${isAvailable ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
              {isAvailable ? 'Go Offline' : 'Go Online'}
            </button>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mt-4">
          <div className="bg-white/10 rounded-lg p-2 sm:p-3 text-center">
            <p className="text-lg sm:text-2xl font-bold">{availableJobs.length}</p>
            <p className="text-xs text-blue-100">Available Jobs</p>
          </div>
          <div className="bg-white/10 rounded-lg p-2 sm:p-3 text-center">
            <p className="text-lg sm:text-2xl font-bold">{myTasks.length}</p>
            <p className="text-xs text-blue-100">In Progress</p>
          </div>
          <div className="bg-white/10 rounded-lg p-2 sm:p-3 text-center">
            <p className="text-lg sm:text-2xl font-bold">{stats.totalJobs}</p>
            <p className="text-xs text-blue-100">Total Jobs</p>
          </div>
          <div className="bg-white/10 rounded-lg p-2 sm:p-3 text-center">
            <p className="text-lg sm:text-2xl font-bold">{stats.avgRating.toFixed(1)}⭐</p>
            <p className="text-xs text-blue-100">Avg Rating</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white p-2 sm:p-4 rounded-lg shadow text-center">
          <i className="fas fa-tasks text-blue-500 text-lg sm:text-2xl mb-1"></i>
          <p className="text-gray-500 text-xs sm:text-sm">Available</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600">{availableJobs.length}</p>
        </div>
        <div className="bg-white p-2 sm:p-4 rounded-lg shadow text-center">
          <i className="fas fa-spinner fa-pulse text-orange-500 text-lg sm:text-2xl mb-1"></i>
          <p className="text-gray-500 text-xs sm:text-sm">In Progress</p>
          <p className="text-lg sm:text-2xl font-bold text-orange-600">{myTasks.length}</p>
        </div>
        <div className="bg-white p-2 sm:p-4 rounded-lg shadow text-center">
          <i className="fas fa-check-circle text-green-500 text-lg sm:text-2xl mb-1"></i>
          <p className="text-gray-500 text-xs sm:text-sm">Completed</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600">{completedJobs.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-2 sm:gap-4 overflow-x-auto">
        <button onClick={() => { setActiveTab('available'); setCurrentPage(1); }} className={`px-3 sm:px-4 py-2 text-sm sm:text-base whitespace-nowrap ${activeTab === 'available' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>
          Available ({availableJobs.length})
        </button>
        <button onClick={() => { setActiveTab('assigned'); setCurrentPage(1); }} className={`px-3 sm:px-4 py-2 text-sm sm:text-base whitespace-nowrap ${activeTab === 'assigned' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>
          My Tasks ({myTasks.length})
        </button>
        <button onClick={() => { setActiveTab('completed'); setCurrentPage(1); }} className={`px-3 sm:px-4 py-2 text-sm sm:text-base whitespace-nowrap ${activeTab === 'completed' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>
          History ({completedJobs.length})
        </button>
      </div>

      {/* Available Jobs */}
      {activeTab === 'available' && (
        <div className="space-y-3">
          {!isAvailable && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center text-sm">
              <i className="fas fa-info-circle text-yellow-600 mr-2"></i>
              You are offline. Click "Go Online" to see and accept jobs.
            </div>
          )}
          {availableJobs.length === 0 ? (
            <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
              <i className="fas fa-check-circle text-4xl text-green-500 mb-2"></i>
              <p className="text-sm">No available jobs in {user?.zone}</p>
            </div>
          ) : (
            getPaginatedData(availableJobs).map(job => (
              <div key={job.id} className="bg-white rounded-lg border p-3 sm:p-4">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div className="flex-1">
                    {job.is_emergency && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full inline-block mb-1">Emergency</span>
                    )}
                    <p className="font-medium text-sm sm:text-base">{job.address}</p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1 capitalize">{job.waste_type}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(job.created_at).toLocaleString()}</p>
                  </div>
                  <button onClick={() => acceptJob(job)} disabled={!isAvailable} className="px-3 sm:px-4 py-1.5 sm:py-2 bg-green-600 text-white rounded-lg text-sm whitespace-nowrap">Accept</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* My Tasks */}
      {activeTab === 'assigned' && (
        <div className="space-y-3">
          {myTasks.length === 0 ? (
            <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
              <i className="fas fa-clipboard-list text-4xl text-gray-400 mb-2"></i>
              <p className="text-sm">No tasks assigned</p>
            </div>
          ) : (
            getPaginatedData(myTasks).map(task => (
              <div key={task.id} className="bg-white rounded-lg border p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm sm:text-base">{task.address}</p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1 capitalize">{task.waste_type}</p>
                    <p className="text-xs text-gray-400 mt-1">Assigned: {new Date(task.assigned_at).toLocaleString()}</p>
                    <textarea
                      value={workerNote}
                      onChange={(e) => setWorkerNote(e.target.value)}
                      placeholder="Add notes..."
                      className="mt-2 w-full px-2 py-1 border rounded text-xs sm:text-sm"
                      rows="2"
                    />
                  </div>
                  <button onClick={() => completeJob(task.id, workerNote)} className="px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-600 text-white rounded-lg text-sm whitespace-nowrap">Complete</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Completed Jobs */}
      {activeTab === 'completed' && (
        <div className="space-y-3">
          {completedJobs.length === 0 ? (
            <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
              <i className="fas fa-history text-4xl text-gray-400 mb-2"></i>
              <p className="text-sm">No completed jobs yet</p>
            </div>
          ) : (
            getPaginatedData(completedJobs).map(task => (
              <div key={task.id} className="bg-white rounded-lg border p-3 sm:p-4 opacity-75">
                <p className="font-medium text-sm sm:text-base">{task.address}</p>
                <p className="text-xs sm:text-sm text-gray-500">{task.waste_type}</p>
                <p className="text-xs text-gray-400 mt-1">Completed: {new Date(task.collected_at).toLocaleString()}</p>
                {task.rating > 0 && <p className="text-xs text-yellow-600 mt-1">Rating: {task.rating} stars</p>}
                <Link to={`/report/${task.id}`}><button className="mt-2 text-green-600 text-xs hover:underline">View Details</button></Link>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {(activeTab === 'available' && availableJobs.length > itemsPerPage) ||
       (activeTab === 'assigned' && myTasks.length > itemsPerPage) ||
       (activeTab === 'completed' && completedJobs.length > itemsPerPage) ? (
        <div className="flex justify-center items-center gap-1 sm:gap-2 flex-wrap pt-2">
          <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50">Prev</button>
          <span className="text-xs sm:text-sm text-gray-500">Page {currentPage} of {totalPages(activeTab === 'available' ? availableJobs : activeTab === 'assigned' ? myTasks : completedJobs)}</span>
          <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages(activeTab === 'available' ? availableJobs : activeTab === 'assigned' ? myTasks : completedJobs)))} disabled={currentPage === totalPages(activeTab === 'available' ? availableJobs : activeTab === 'assigned' ? myTasks : completedJobs)} className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50">Next</button>
        </div>
      ) : null}

      {/* Refresh Button */}
      <div className="text-center">
        <button onClick={loadData} className="text-green-600 text-sm hover:underline">
          <i className="fas fa-sync-alt mr-1"></i>Refresh Data
        </button>
      </div>
    </div>
  );
};

export default Worker;