import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import WorkerLocationTracker from '../components/WorkerLocationTracker';
import ChatSystem from '../components/ChatSystem';

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
  const [completionPhoto, setCompletionPhoto] = useState(null);
  const [completionPhotoPreview, setCompletionPhotoPreview] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedReportForChat, setSelectedReportForChat] = useState(null);
  const [selectedResidentForChat, setSelectedResidentForChat] = useState(null);
  const [showCallConfirm, setShowCallConfirm] = useState(false);
  const [residentToCall, setResidentToCall] = useState(null);
  const [residentDataMap, setResidentDataMap] = useState({});
  const [unreadChatCounts, setUnreadChatCounts] = useState({});
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

  // Check for unread messages on tasks
  useEffect(() => {
    if (myTasks.length === 0) return;

    const checkUnreadMessages = async () => {
      const counts = {};
      for (const task of myTasks) {
        try {
          const { count, error } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('report_id', task.id)
            .eq('receiver_id', user.id)
            .eq('read', false);

          if (!error && count > 0) {
            counts[task.id] = count;
          }
        } catch (err) {
          console.error('Error checking unread:', err);
        }
      }
      setUnreadChatCounts(counts);
    };

    checkUnreadMessages();
    const interval = setInterval(checkUnreadMessages, 3000);
    return () => clearInterval(interval);
  }, [myTasks, user?.id]);

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
        .maybeSingle();
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
      
      // Load residents for tasks
      const residentIds = [...new Set(tasks?.filter(t => t.status === 'assigned').map(t => t.user_id) || [])];
      const residentMap = {};
      for (const id of residentIds) {
        const { data: resident } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (resident) {
          residentMap[id] = resident;
        }
      }
      setResidentDataMap(residentMap);
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const optimizeRoute = () => {
    const tasks = [...myTasks];
    if (tasks.length === 0) return;
    const optimized = tasks.sort((a, b) => {
      if (a.is_emergency && !b.is_emergency) return -1;
      if (!a.is_emergency && b.is_emergency) return 1;
      return 0;
    });
    setMyTasks(optimized);
    toast.success('Route optimized! Tasks reordered for efficiency.');
  };

  const handleCompletionPhoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Photo too large. Max 5MB');
        return;
      }
      setCompletionPhoto(file);
      setCompletionPhotoPreview(URL.createObjectURL(file));
    }
  };

  const uploadCompletionPhoto = async () => {
    if (!completionPhoto) return null;
    const fileName = `completion_${Date.now()}_${completionPhoto.name}`;
    const { error } = await supabase.storage.from('report-images').upload(fileName, completionPhoto);
    if (error) return null;
    const { data } = supabase.storage.from('report-images').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const toggleAvailability = async () => {
    const newStatus = !isAvailable;
    try {
      setIsAvailable(newStatus);
      const { error } = await supabase
        .from('profiles')
        .update({ available: newStatus, updated_at: new Date() })
        .eq('id', user.id);
      if (error) throw error;
      toast.success(newStatus ? 'You are now ONLINE - Jobs will appear here' : 'You are now OFFLINE');
      if (newStatus) loadData();
    } catch (err) {
      console.error(err);
      setIsAvailable(!newStatus);
      toast.error('Failed to update status');
    }
  };

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    
    const id = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        // Save to Supabase
        const { error } = await supabase
          .from('worker_locations')
          .upsert({
            worker_id: user.id,
            latitude,
            longitude,
            accuracy,
            timestamp: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'worker_id' });
        
        if (error) {
          console.error('Location save error:', error);
        } else {
          console.log('📍 Location saved to Supabase:', { latitude, longitude, accuracy });
        }
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
      report_id: job.id,
      action_url: `/report/${job.id}`
    }]);
    
    toast.success(`Job accepted: ${job.address}`);
    loadData();
    loadStats();
  };

  const completeJob = async (taskId, note = '') => {
    const completionPhotoUrl = await uploadCompletionPhoto();
    
    await supabase
      .from('waste_reports')
      .update({ 
        status: 'collected', 
        collected_at: new Date().toISOString(),
        worker_note: note,
        completion_photo_url: completionPhotoUrl,
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
        report_id: taskId,
        action_url: `/report/${taskId}`
      }]);
    }
    
    toast.success('Job marked as collected! Resident will verify');
    setCompletionPhoto(null);
    setCompletionPhotoPreview(null);
    loadData();
    loadStats();
  };

  const getVehicleRecommendation = (wasteType) => {
    switch(wasteType) {
      case 'household':
        return { vehicle: 'Bicycle or Motorbike', color: 'text-green-600', suitable: true };
      case 'recycling':
        return { vehicle: 'Bicycle or Motorbike', color: 'text-green-600', suitable: true };
      default:
        return { vehicle: 'Motorbike or Pickup', color: 'text-blue-600', suitable: true };
    }
  };

  const getPaginatedData = (data) => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return data.slice(start, end);
  };

  const totalPages = (data) => Math.ceil(data.length / itemsPerPage);

  const openChat = (task, resident) => {
    setSelectedReportForChat(task);
    setSelectedResidentForChat(resident);
    setShowChatModal(true);
  };

  const openCall = (resident) => {
    setResidentToCall(resident);
    setShowCallConfirm(true);
  };

  const closeChatModal = () => {
    setShowChatModal(false);
    setSelectedReportForChat(null);
    setSelectedResidentForChat(null);
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
      {/* Header */}
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
                  {unreadCount > 99 ? '99+' : unreadCount}
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
                      <div 
                        key={notif.id} 
                        className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${!notif.read ? 'bg-blue-50' : ''}`} 
                        onClick={async () => {
                          if (!notif.read) await markNotificationAsRead(notif.id);
                          if (notif.action_url) window.location.href = notif.action_url;
                          else if (notif.report_id) window.location.href = `/report/${notif.report_id}`;
                        }}
                      >
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

      {/* Worker Location Tracker */}
      <WorkerLocationTracker workerId={user?.id} />

      {/* Worker Vehicle Info Card */}
      <div className="bg-white p-3 rounded-lg shadow">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <i className="fas fa-truck text-purple-600"></i>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Your Vehicle: {user?.vehicle_type || 'Not specified'}</p>
            <p className="text-xs text-gray-500">Update your profile to add vehicle type</p>
          </div>
          <Link to="/profile">
            <button className="text-xs text-blue-600 hover:underline">Update</button>
          </Link>
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
            getPaginatedData(availableJobs).map(job => {
              const recommendation = getVehicleRecommendation(job.waste_type);
              return (
                <div key={job.id} className="bg-white rounded-lg border p-3 sm:p-4">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div className="flex-1">
                      {job.is_emergency && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full inline-block mb-1">🚨 Emergency</span>
                      )}
                      <p className="font-medium text-sm sm:text-base">{job.address}</p>
                      <p className="text-xs text-gray-500 mt-1 capitalize">{job.waste_type}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(job.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/report/${job.id}`}>
                        <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm">View</button>
                      </Link>
                      <button onClick={() => acceptJob(job)} disabled={!isAvailable} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm disabled:opacity-50">
                        Accept
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          
          {availableJobs.length > itemsPerPage && (
            <div className="flex justify-center items-center gap-1 pt-2">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-2 py-1 text-xs bg-gray-100 rounded">Prev</button>
              <span className="text-xs">Page {currentPage} of {totalPages(availableJobs)}</span>
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages(availableJobs)))} disabled={currentPage === totalPages(availableJobs)} className="px-2 py-1 text-xs bg-gray-100 rounded">Next</button>
            </div>
          )}
        </div>
      )}

      {/* My Tasks */}
      {activeTab === 'assigned' && (
        <div className="space-y-3">
          {myTasks.length > 0 && (
            <div className="flex justify-end">
              <button onClick={optimizeRoute} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                <i className="fas fa-route mr-1"></i>Optimize Route
              </button>
            </div>
          )}
          {myTasks.length === 0 ? (
            <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
              <i className="fas fa-clipboard-list text-4xl text-gray-400 mb-2"></i>
              <p className="text-sm">No tasks assigned</p>
            </div>
          ) : (
            getPaginatedData(myTasks).map(task => {
              const resident = residentDataMap[task.user_id];
              
              return (
                <div key={task.id} className="bg-white rounded-lg border p-3 sm:p-4">
                  <div className="flex flex-col gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Assigned</span>
                        {task.is_emergency && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Emergency</span>}
                      </div>
                      <p className="font-medium text-sm sm:text-base">{task.address}</p>
                      <p className="text-xs text-gray-500 capitalize mt-1">{task.waste_type}</p>
                      <p className="text-xs text-gray-400 mt-1">Assigned: {new Date(task.assigned_at).toLocaleString()}</p>
                      
                      {resident && (
                        <p className="text-xs text-green-600 mt-1">
                          <i className="fas fa-user mr-1"></i>Resident: {resident.full_name || 'Resident'}
                        </p>
                      )}
                    </div>
                    
                    {/* ACTION BUTTONS WITH CHAT BADGE */}
                    {resident && (
                      <div className="flex gap-2 flex-wrap">
                        {resident.phone && (
                          <button
                            onClick={() => openCall(resident)}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1"
                          >
                            <i className="fas fa-phone"></i> Call
                          </button>
                        )}
                        <button
                          onClick={() => openChat(task, resident)}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center gap-1 relative"
                        >
                          <i className="fas fa-comment"></i>
                          Chat
                          {unreadChatCounts[task.id] > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-4 px-1 flex items-center justify-center">
                              {unreadChatCounts[task.id] > 99 ? '99+' : unreadChatCounts[task.id]}
                            </span>
                          )}
                        </button>
                        <Link to={`/report/${task.id}`}>
                          <button className="px-3 py-1.5 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700">
                            View Details
                          </button>
                        </Link>
                      </div>
                    )}
                    
                    {/* Completion Photo */}
                    <div className="mt-2">
                      <label className="text-xs font-medium text-gray-600">Completion Photo (Proof)</label>
                      {completionPhotoPreview ? (
                        <div className="relative inline-block mt-1">
                          <img src={completionPhotoPreview} alt="Completion" className="h-16 w-16 object-cover rounded" />
                          <button
                            type="button"
                            onClick={() => { setCompletionPhoto(null); setCompletionPhotoPreview(null); }}
                            className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-0.5 w-5 h-5 flex items-center justify-center text-xs"
                          >✕</button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-2 mt-1 cursor-pointer">
                          <i className="fas fa-camera text-gray-400"></i>
                          <span className="text-xs text-blue-600">Upload proof photo</span>
                          <input type="file" accept="image/*" onChange={handleCompletionPhoto} className="hidden" />
                        </label>
                      )}
                    </div>
                    
                    <textarea
                      value={workerNote}
                      onChange={(e) => setWorkerNote(e.target.value)}
                      placeholder="Add notes about this job..."
                      className="w-full px-2 py-1 border rounded text-xs"
                      rows="2"
                    />
                    
                    <button 
                      onClick={() => completeJob(task.id, workerNote)} 
                      className="w-full px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                    >
                      <i className="fas fa-check-circle mr-1"></i> Mark as Collected
                    </button>
                  </div>
                </div>
              );
            })
          )}
          
          {myTasks.length > itemsPerPage && (
            <div className="flex justify-center items-center gap-1 pt-2">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-2 py-1 text-xs bg-gray-100 rounded">Prev</button>
              <span className="text-xs">Page {currentPage} of {totalPages(myTasks)}</span>
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages(myTasks)))} disabled={currentPage === totalPages(myTasks)} className="px-2 py-1 text-xs bg-gray-100 rounded">Next</button>
            </div>
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
              <div key={task.id} className="bg-white rounded-lg border p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Completed</span>
                    <p className="font-medium text-sm mt-1">{task.address}</p>
                    <p className="text-xs text-gray-500 capitalize">{task.waste_type}</p>
                    <p className="text-xs text-gray-400 mt-1">Completed: {new Date(task.collected_at).toLocaleString()}</p>
                    {task.rating > 0 && <p className="text-xs text-yellow-600 mt-1">Rating: {task.rating}⭐</p>}
                  </div>
                  <Link to={`/report/${task.id}`}>
                    <button className="px-3 py-1 border rounded-lg text-sm">View</button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Refresh Button */}
      <div className="text-center">
        <button onClick={loadData} className="text-green-600 text-sm hover:underline">
          <i className="fas fa-sync-alt mr-1"></i>Refresh Data
        </button>
      </div>

      {/* Chat Modal */}
      {showChatModal && selectedResidentForChat && selectedReportForChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <i className="fas fa-comments text-green-600"></i>
                Chat with {selectedResidentForChat.full_name || 'Resident'}
              </h3>
              <button
                onClick={closeChatModal}
                className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                &times;
              </button>
            </div>
            <div className="p-4">
              <ChatSystem 
                reportId={selectedReportForChat.id}
                currentUserId={user.id}
                otherUserId={selectedReportForChat.user_id}
                currentUserName={user.full_name || 'Worker'}
                otherUserName={selectedResidentForChat.full_name || 'Resident'}
                currentUserRole={user.role}
              />
            </div>
            <div className="p-3 border-t bg-gray-50">
              <button
                onClick={closeChatModal}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
              >
                Close Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Confirmation Modal */}
      {showCallConfirm && residentToCall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold mb-3">Call Resident?</h3>
            <p className="text-gray-600 mb-4 text-sm">
              You are about to call {residentToCall.full_name} at {residentToCall.phone}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowCallConfirm(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
              <button onClick={() => { window.location.href = `tel:${residentToCall.phone}`; setShowCallConfirm(false); }} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">Call Now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Worker;