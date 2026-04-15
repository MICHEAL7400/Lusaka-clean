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
  const [stats, setStats] = useState({
    totalEarnings: 0,
    avgRating: 0,
    totalJobs: 0
  });

  useEffect(() => {
    if (user && user.id) {
      loadData();
      loadStats();
      const interval = setInterval(loadData, 15000);
      return () => {
        clearInterval(interval);
        if (watchId) navigator.geolocation.clearWatch(watchId);
      };
    }
  }, [user]);

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
        totalEarnings: (tasks?.length || 0) * 50 // Example: $50 per job
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
    toast.success(newStatus ? '🟢 You are now ONLINE - Jobs will appear here' : '🔴 You are now OFFLINE');
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
    
    // Notify resident
    await supabase.from('notifications').insert([{
      user_id: job.user_id,
      title: 'Worker Assigned',
      message: `A worker has been assigned to your report at ${job.address}`,
      type: 'success',
      report_id: job.id
    }]);
    
    toast.success(`✅ Job accepted: ${job.address}`);
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
        message: `The waste at ${task.address} has been collected. Please verify when you confirm.`,
        type: 'info',
        report_id: taskId
      }]);
    }
    
    toast.success('✅ Job marked as collected! Resident will verify');
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Worker Dashboard</h1>
            <p className="text-blue-100 mt-1">
              <i className="fas fa-map-marker-alt mr-1"></i> Zone: {user?.zone} | 
              <span className={`ml-2 ${isAvailable ? 'text-green-300' : 'text-red-300'}`}>
                {isAvailable ? '🟢 Online' : '🔴 Offline'}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            {trackingLocation ? (
              <button onClick={stopLocationTracking} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                <i className="fas fa-stop mr-2"></i>Stop Sharing
              </button>
            ) : (
              <button onClick={startLocationTracking} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                <i className="fas fa-share-alt mr-2"></i>Share Location
              </button>
            )}
            <button onClick={toggleAvailability} className={`px-4 py-2 rounded-lg text-white ${isAvailable ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
              {isAvailable ? 'Go Offline' : 'Go Online'}
            </button>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{availableJobs.length}</p>
            <p className="text-xs text-blue-100">Available Jobs</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{myTasks.length}</p>
            <p className="text-xs text-blue-100">In Progress</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.totalJobs}</p>
            <p className="text-xs text-blue-100">Total Jobs</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.avgRating.toFixed(1)}⭐</p>
            <p className="text-xs text-blue-100">Avg Rating</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow text-center"><i className="fas fa-tasks text-2xl text-blue-500 mb-2"></i><p className="text-gray-500">Available</p><p className="text-2xl font-bold text-green-600">{availableJobs.length}</p></div>
        <div className="bg-white p-4 rounded-lg shadow text-center"><i className="fas fa-spinner fa-pulse text-2xl text-orange-500 mb-2"></i><p className="text-gray-500">In Progress</p><p className="text-2xl font-bold text-orange-600">{myTasks.length}</p></div>
        <div className="bg-white p-4 rounded-lg shadow text-center"><i className="fas fa-check-circle text-2xl text-green-500 mb-2"></i><p className="text-gray-500">Completed</p><p className="text-2xl font-bold text-green-600">{completedJobs.length}</p></div>
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-4">
        <button onClick={() => setActiveTab('available')} className={`px-4 py-2 font-medium ${activeTab === 'available' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>Available Jobs ({availableJobs.length})</button>
        <button onClick={() => setActiveTab('assigned')} className={`px-4 py-2 font-medium ${activeTab === 'assigned' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>My Tasks ({myTasks.length})</button>
        <button onClick={() => setActiveTab('completed')} className={`px-4 py-2 font-medium ${activeTab === 'completed' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>Completed ({completedJobs.length})</button>
      </div>

      {/* Available Jobs */}
      {activeTab === 'available' && (
        <div className="space-y-4">
          {!isAvailable && <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center"><i className="fas fa-info-circle text-yellow-600 mr-2"></i><span className="text-yellow-700">You are offline. Click "Go Online" to see and accept jobs.</span></div>}
          {availableJobs.length === 0 ? (
            <div className="bg-white rounded-lg border p-12 text-center"><i className="fas fa-check-circle text-5xl text-green-500 mb-3"></i><p className="text-gray-500">No available jobs in {user?.zone}</p>{isAvailable && <p className="text-sm text-gray-400 mt-2">New jobs will appear here automatically</p>}</div>
          ) : (
            availableJobs.map(job => (
              <div key={job.id} className="bg-white rounded-lg border p-4 hover:shadow-lg transition">
                <div className="flex justify-between items-start flex-wrap gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-500">#{job.id.slice(0, 8)}</span>
                      {job.is_emergency && <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full animate-pulse"><i className="fas fa-exclamation-triangle mr-1"></i>EMERGENCY</span>}
                    </div>
                    <p className="font-semibold">{job.address}</p>
                    <p className="text-sm text-gray-600 mt-1 capitalize"><i className="fas fa-trash mr-1"></i>{job.waste_type}</p>
                    <p className="text-sm text-gray-500 mt-2">{job.description?.slice(0, 100)}</p>
                    <p className="text-xs text-gray-400 mt-2"><i className="fas fa-clock mr-1"></i>Reported: {new Date(job.created_at).toLocaleString()}</p>
                    {job.photo_url && <img src={job.photo_url} alt="Evidence" className="h-16 w-16 object-cover rounded mt-2" />}
                  </div>
                  <button onClick={() => acceptJob(job)} disabled={!isAvailable} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">Accept Job</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* My Tasks */}
      {activeTab === 'assigned' && (
        <div className="space-y-4">
          {myTasks.length === 0 ? (
            <div className="bg-white rounded-lg border p-12 text-center"><i className="fas fa-clipboard-list text-5xl text-gray-400 mb-3"></i><p className="text-gray-500">No assigned tasks</p><p className="text-sm text-gray-400 mt-2">Accept jobs from Available Jobs tab</p></div>
          ) : (
            myTasks.map(task => (
              <div key={task.id} className="bg-white rounded-lg border p-4">
                <div className="flex justify-between items-start flex-wrap gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2"><span className="text-xs text-gray-500">#{task.id.slice(0, 8)}</span><span className={getStatusBadge(task.status)}>{task.status}</span>{task.is_emergency && <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">Emergency</span>}</div>
                    <p className="font-semibold">{task.address}</p>
                    <p className="text-sm text-gray-600 mt-1 capitalize"><i className="fas fa-trash mr-1"></i>{task.waste_type}</p>
                    <p className="text-sm text-gray-500 mt-2">{task.description}</p>
                    <p className="text-xs text-gray-400 mt-1"><i className="fas fa-calendar-check mr-1"></i>Assigned: {new Date(task.assigned_at).toLocaleString()}</p>
                    <textarea value={workerNote} onChange={(e) => setWorkerNote(e.target.value)} placeholder="Add notes about this job (e.g., access code, special instructions)..." className="mt-3 w-full px-3 py-2 border rounded-lg text-sm resize-none" rows="2" />
                    {task.photo_url && <img src={task.photo_url} alt="Evidence" className="h-16 w-16 object-cover rounded mt-2" />}
                  </div>
                  <button onClick={() => completeJob(task.id, workerNote)} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Mark Collected</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Completed Jobs */}
      {activeTab === 'completed' && (
        <div className="space-y-4">
          {completedJobs.length === 0 ? (
            <div className="bg-white rounded-lg border p-12 text-center"><i className="fas fa-history text-5xl text-gray-400 mb-3"></i><p className="text-gray-500">No completed jobs yet</p></div>
          ) : (
            completedJobs.map(task => (
              <div key={task.id} className="bg-white rounded-lg border p-4 opacity-80">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2"><span className="text-xs text-gray-500">#{task.id.slice(0, 8)}</span><span className={getStatusBadge(task.status)}>{task.status}</span></div>
                    <p className="font-semibold">{task.address}</p>
                    <p className="text-sm text-gray-600">{task.waste_type}</p>
                    {task.collected_at && <p className="text-xs text-gray-400 mt-1"><i className="fas fa-check mr-1"></i>Collected: {new Date(task.collected_at).toLocaleString()}</p>}
                    {task.verified_at && <p className="text-xs text-gray-400"><i className="fas fa-star mr-1"></i>Verified: {new Date(task.verified_at).toLocaleString()}</p>}
                    {task.rating > 0 && <p className="text-xs text-yellow-600 mt-1"><i className="fas fa-star mr-1"></i>Rating: {task.rating}/5</p>}
                    {task.worker_note && <p className="text-xs text-gray-500 mt-1 italic">Note: {task.worker_note}</p>}
                  </div>
                  <Link to={`/report/${task.id}`}><button className="px-3 py-1 border rounded-lg text-sm hover:bg-gray-50">View Details</button></Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Refresh Button */}
      <div className="text-center"><button onClick={loadData} className="text-green-600 text-sm hover:underline"><i className="fas fa-sync-alt mr-1"></i>Refresh Data</button></div>
    </div>
  );
};

export default Worker;