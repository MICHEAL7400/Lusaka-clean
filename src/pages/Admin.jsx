import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const Admin = () => {
  const [reports, setReports] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [residents, setResidents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reports');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState('info');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    assigned: 0,
    collected: 0,
    verified: 0,
    totalUsers: 0,
    activeWorkers: 0,
    totalReportsThisMonth: 0
  });

  useEffect(() => {
    loadAllData();
    // Auto refresh every 30 seconds
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    try {
      // Load reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('waste_reports')
        .select('*, profiles:user_id(full_name, email, phone)')
        .order('created_at', { ascending: false });
      
      if (reportsError) throw reportsError;
      setReports(reportsData || []);
      
      // Load workers
      const { data: workersData, error: workersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'worker')
        .order('created_at', { ascending: false });
      
      if (workersError) throw workersError;
      setWorkers(workersData || []);
      
      // Load residents
      const { data: residentsData, error: residentsError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'resident')
        .order('created_at', { ascending: false });
      
      if (residentsError) throw residentsError;
      setResidents(residentsData || []);
      
      // Load notifications
      const { data: notifData, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (notifError) throw notifError;
      setNotifications(notifData || []);
      
      // Calculate stats
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const reportsThisMonth = reportsData?.filter(r => new Date(r.created_at) >= thisMonth) || [];
      
      setStats({
        total: reportsData?.length || 0,
        pending: reportsData?.filter(r => r.status === 'pending').length || 0,
        assigned: reportsData?.filter(r => r.status === 'assigned').length || 0,
        collected: reportsData?.filter(r => r.status === 'collected').length || 0,
        verified: reportsData?.filter(r => r.status === 'verified').length || 0,
        totalUsers: (workersData?.length || 0) + (residentsData?.length || 0),
        activeWorkers: workersData?.filter(w => w.available === true).length || 0,
        totalReportsThisMonth: reportsThisMonth.length
      });
      
    } catch (err) {
      console.error('Error loading data:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const updateReportStatus = async (reportId, status) => {
    try {
      const updates = { 
        status, 
        updated_at: new Date().toISOString() 
      };
      
      if (status === 'collected') {
        updates.collected_at = new Date().toISOString();
      }
      if (status === 'verified') {
        updates.verified_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('waste_reports')
        .update(updates)
        .eq('id', reportId);
      
      if (error) throw error;
      
      // Get report details for notification
      const report = reports.find(r => r.id === reportId);
      
      // Notify resident
      if (report) {
        await supabase.from('notifications').insert([{
          user_id: report.user_id,
          title: `Report ${status}`,
          message: `Your report at ${report.address} has been ${status}`,
          type: status === 'verified' ? 'success' : 'info',
          report_id: reportId
        }]);
      }
      
      toast.success(`Report marked as ${status}`);
      loadAllData();
      
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status');
    }
  };

  const assignWorker = async (reportId, workerId) => {
    setAssigning(true);
    try {
      const report = reports.find(r => r.id === reportId);
      const worker = workers.find(w => w.id === workerId);
      
      const { error } = await supabase
        .from('waste_reports')
        .update({ 
          assigned_worker_id: workerId, 
          status: 'assigned', 
          assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId);
      
      if (error) throw error;
      
      // Notify worker
      if (worker) {
        await supabase.from('notifications').insert([{
          user_id: workerId,
          title: 'New Task Assigned',
          message: `You have been assigned to collect waste at ${report?.address}`,
          type: 'success',
          report_id: reportId
        }]);
      }
      
      // Notify resident
      if (report) {
        await supabase.from('notifications').insert([{
          user_id: report.user_id,
          title: 'Worker Assigned',
          message: `A worker has been assigned to your report at ${report?.address}`,
          type: 'info',
          report_id: reportId
        }]);
      }
      
      toast.success('Worker assigned and notified');
      loadAllData();
      setShowAssignModal(false);
      setSelectedReport(null);
      
    } catch (err) {
      console.error('Error assigning worker:', err);
      toast.error('Failed to assign worker');
    } finally {
      setAssigning(false);
    }
  };

  const sendBroadcastNotification = async () => {
    if (!broadcastTitle || !broadcastMessage) {
      toast.error('Please enter both title and message');
      return;
    }
    
    try {
      const allUsers = [...workers, ...residents];
      let sentCount = 0;
      
      for (const user of allUsers) {
        const { error } = await supabase.from('notifications').insert([{
          user_id: user.id,
          title: broadcastTitle,
          message: broadcastMessage,
          type: broadcastType,
          created_at: new Date().toISOString()
        }]);
        
        if (!error) sentCount++;
      }
      
      toast.success(`Broadcast sent to ${sentCount} users`);
      setShowBroadcastModal(false);
      setBroadcastTitle('');
      setBroadcastMessage('');
      loadAllData();
      
    } catch (err) {
      console.error('Error sending broadcast:', err);
      toast.error('Failed to send broadcast');
    }
  };

  const deleteReport = async (reportId) => {
    if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('waste_reports')
        .delete()
        .eq('id', reportId);
      
      if (error) throw error;
      
      toast.success('Report deleted successfully');
      loadAllData();
      
    } catch (err) {
      console.error('Error deleting report:', err);
      toast.error('Failed to delete report');
    }
  };

  const toggleWorkerAvailability = async (workerId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ available: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', workerId);
      
      if (error) throw error;
      
      toast.success(`Worker ${!currentStatus ? 'activated' : 'deactivated'}`);
      loadAllData();
      
    } catch (err) {
      console.error('Error toggling worker:', err);
      toast.error('Failed to update worker status');
    }
  };

  const deleteUser = async (userId, userRole) => {
    if (!confirm(`Are you sure you want to delete this ${userRole}? All their data will be removed.`)) return;
    
    try {
      // Delete user's reports first
      await supabase.from('waste_reports').delete().eq('user_id', userId);
      
      // Delete user's notifications
      await supabase.from('notifications').delete().eq('user_id', userId);
      
      // Delete user profile
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      
      if (error) throw error;
      
      toast.success(`${userRole} deleted successfully`);
      loadAllData();
      
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error('Failed to delete user');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      assigned: 'bg-blue-100 text-blue-800',
      collected: 'bg-purple-100 text-purple-800',
      verified: 'bg-green-100 text-green-800'
    };
    return `px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100'}`;
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

  const filteredReports = reports.filter(r =>
    r.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-500">Manage reports, workers, residents, and system settings</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowBroadcastModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <i className="fas fa-broadcast-tower mr-2"></i>Broadcast
          </button>
          <button 
            onClick={loadAllData} 
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <i className="fas fa-sync-alt mr-2"></i>Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white p-3 rounded-lg shadow text-center">
          <i className="fas fa-flag text-blue-500 text-xl mb-1"></i>
          <p className="text-xl font-bold">{stats.total}</p>
          <p className="text-xs text-gray-500">Total Reports</p>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg text-center">
          <i className="fas fa-clock text-yellow-600 text-xl mb-1"></i>
          <p className="text-xl font-bold text-yellow-600">{stats.pending}</p>
          <p className="text-xs text-yellow-600">Pending</p>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <i className="fas fa-user-check text-blue-600 text-xl mb-1"></i>
          <p className="text-xl font-bold text-blue-600">{stats.assigned}</p>
          <p className="text-xs text-blue-600">Assigned</p>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg text-center">
          <i className="fas fa-truck text-purple-600 text-xl mb-1"></i>
          <p className="text-xl font-bold text-purple-600">{stats.collected}</p>
          <p className="text-xs text-purple-600">Collected</p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg text-center">
          <i className="fas fa-check-circle text-green-600 text-xl mb-1"></i>
          <p className="text-xl font-bold text-green-600">{stats.verified}</p>
          <p className="text-xs text-green-600">Verified</p>
        </div>
        <div className="bg-indigo-50 p-3 rounded-lg text-center">
          <i className="fas fa-users text-indigo-600 text-xl mb-1"></i>
          <p className="text-xl font-bold text-indigo-600">{stats.totalUsers}</p>
          <p className="text-xs text-indigo-600">Total Users</p>
        </div>
        <div className="bg-emerald-50 p-3 rounded-lg text-center">
          <i className="fas fa-calendar-alt text-emerald-600 text-xl mb-1"></i>
          <p className="text-xl font-bold text-emerald-600">{stats.totalReportsThisMonth}</p>
          <p className="text-xs text-emerald-600">This Month</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
        <input
          type="text"
          placeholder="Search reports by address, ID, or reporter name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
        />
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-2 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('reports')} 
          className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'reports' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}
        >
          <i className="fas fa-flag mr-2"></i>Reports ({reports.length})
        </button>
        <button 
          onClick={() => setActiveTab('workers')} 
          className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'workers' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}
        >
          <i className="fas fa-truck mr-2"></i>Workers ({workers.length})
        </button>
        <button 
          onClick={() => setActiveTab('residents')} 
          className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'residents' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}
        >
          <i className="fas fa-users mr-2"></i>Residents ({residents.length})
        </button>
        <button 
          onClick={() => setActiveTab('notifications')} 
          className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'notifications' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}
        >
          <i className="fas fa-bell mr-2"></i>Notifications ({notifications.length})
        </button>
        <button 
          onClick={() => setActiveTab('analytics')} 
          className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'analytics' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}
        >
          <i className="fas fa-chart-line mr-2"></i>Analytics
        </button>
      </div>

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-3">
          {filteredReports.length === 0 ? (
            <div className="bg-white rounded-lg border p-12 text-center text-gray-500">
              <i className="fas fa-inbox text-4xl mb-3"></i>
              <p>No reports found</p>
            </div>
          ) : (
            filteredReports.map(report => (
              <div key={report.id} className="bg-white rounded-lg border p-4 hover:shadow-md transition">
                <div className="flex justify-between items-start flex-wrap gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs text-gray-500 font-mono">#{report.id.slice(0, 8)}</span>
                      <span className={getStatusBadge(report.status)}>
                        <i className={`fas ${getStatusIcon(report.status)} mr-1`}></i>
                        {report.status}
                      </span>
                      {report.is_emergency && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full animate-pulse">
                          <i className="fas fa-exclamation-triangle mr-1"></i>EMERGENCY
                        </span>
                      )}
                    </div>
                    <p className="font-semibold">{report.address}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      <i className="fas fa-trash mr-1"></i>{report.waste_type}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      <i className="fas fa-user mr-1"></i>Reported by: {report.profiles?.full_name || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      <i className="fas fa-calendar mr-1"></i>{new Date(report.created_at).toLocaleString()}
                    </p>
                    {report.assigned_worker_id && (
                      <p className="text-xs text-blue-600 mt-1">
                        <i className="fas fa-user-check mr-1"></i>Assigned to: {workers.find(w => w.id === report.assigned_worker_id)?.full_name || 'Worker'}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {report.status === 'pending' && (
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setShowAssignModal(true);
                        }}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                      >
                        <i className="fas fa-user-plus mr-1"></i>Assign
                      </button>
                    )}
                    {report.status === 'assigned' && (
                      <button
                        onClick={() => updateReportStatus(report.id, 'collected')}
                        className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                      >
                        <i className="fas fa-truck mr-1"></i>Mark Collected
                      </button>
                    )}
                    {report.status === 'collected' && (
                      <button
                        onClick={() => updateReportStatus(report.id, 'verified')}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                      >
                        <i className="fas fa-check-double mr-1"></i>Verify
                      </button>
                    )}
                    <button
                      onClick={() => window.open(`/report/${report.id}`, '_blank')}
                      className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50"
                    >
                      <i className="fas fa-eye mr-1"></i>View
                    </button>
                    <button
                      onClick={() => deleteReport(report.id)}
                      className="px-3 py-1.5 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50"
                    >
                      <i className="fas fa-trash mr-1"></i>Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Workers Tab */}
      {activeTab === 'workers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workers.length === 0 ? (
            <div className="col-span-3 bg-white rounded-lg border p-12 text-center text-gray-500">
              <i className="fas fa-users text-4xl mb-3"></i>
              <p>No workers registered</p>
            </div>
          ) : (
            workers.map(worker => (
              <div key={worker.id} className="bg-white rounded-lg border p-4 hover:shadow-md transition">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {worker.full_name?.[0] || 'W'}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{worker.full_name || 'Unnamed'}</h3>
                    <p className="text-xs text-gray-500">{worker.email}</p>
                  </div>
                  <button
                    onClick={() => toggleWorkerAvailability(worker.id, worker.available)}
                    className={`px-2 py-1 rounded text-xs ${worker.available ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}
                  >
                    {worker.available ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="flex items-center gap-2"><i className="fas fa-phone w-4 text-gray-400"></i>{worker.phone || 'No phone'}</p>
                  <p className="flex items-center gap-2"><i className="fas fa-map-marker-alt w-4 text-gray-400"></i>{worker.zone || 'No zone'}</p>
                  <p className="flex items-center gap-2"><i className="fas fa-id-card w-4 text-gray-400"></i>{worker.worker_id || 'No ID'}</p>
                  <p className="flex items-center gap-2"><i className="fas fa-truck w-4 text-gray-400"></i>{worker.vehicle_type || 'No vehicle'}</p>
                  <p className="flex items-center gap-2"><i className="fas fa-star w-4 text-yellow-500"></i>{worker.rating || 0}⭐ ({worker.rating_count || 0} reviews)</p>
                  <p className="flex items-center gap-2"><i className="fas fa-briefcase w-4 text-gray-400"></i>{worker.completed_jobs || 0} jobs completed</p>
                  <p className={`text-xs mt-2 ${worker.available ? 'text-green-600' : 'text-gray-400'}`}>
                    <i className={`fas ${worker.available ? 'fa-circle' : 'fa-circle'} text-xs mr-1`}></i>
                    {worker.available ? 'Available' : 'Offline'}
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t flex gap-2">
                  <button className="flex-1 text-xs text-red-600 hover:bg-red-50 py-1 rounded" onClick={() => deleteUser(worker.id, 'worker')}>
                    <i className="fas fa-trash mr-1"></i>Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Residents Tab */}
      {activeTab === 'residents' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {residents.length === 0 ? (
            <div className="col-span-3 bg-white rounded-lg border p-12 text-center text-gray-500">
              <i className="fas fa-users text-4xl mb-3"></i>
              <p>No residents registered</p>
            </div>
          ) : (
            residents.map(resident => {
              const userReports = reports.filter(r => r.user_id === resident.id);
              return (
                <div key={resident.id} className="bg-white rounded-lg border p-4 hover:shadow-md transition">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {resident.full_name?.[0] || 'R'}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{resident.full_name || 'Unnamed'}</h3>
                      <p className="text-xs text-gray-500">{resident.email}</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="flex items-center gap-2"><i className="fas fa-phone w-4 text-gray-400"></i>{resident.phone || 'No phone'}</p>
                    <p className="flex items-center gap-2"><i className="fas fa-map-marker-alt w-4 text-gray-400"></i>{resident.zone || 'No zone'}</p>
                    <p className="flex items-center gap-2"><i className="fas fa-flag w-4 text-gray-400"></i>{userReports.length} reports</p>
                    <p className="flex items-center gap-2"><i className="fas fa-check-circle w-4 text-green-500"></i>{userReports.filter(r => r.status === 'verified').length} resolved</p>
                    <p className="text-xs text-gray-400 mt-2">
                      <i className="fas fa-calendar mr-1"></i>Joined: {new Date(resident.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <button className="w-full text-xs text-red-600 hover:bg-red-50 py-1 rounded" onClick={() => deleteUser(resident.id, 'resident')}>
                      <i className="fas fa-trash mr-1"></i>Delete Resident
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="bg-white rounded-lg border p-12 text-center text-gray-500">
              <i className="fas fa-bell-slash text-4xl mb-3"></i>
              <p>No notifications</p>
            </div>
          ) : (
            notifications.map(notif => (
              <div key={notif.id} className="bg-white rounded-lg border p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <i className={`fas ${
                        notif.type === 'success' ? 'fa-check-circle text-green-500' :
                        notif.type === 'error' ? 'fa-times-circle text-red-500' :
                        notif.type === 'warning' ? 'fa-exclamation-triangle text-yellow-500' :
                        'fa-info-circle text-blue-500'
                      }`}></i>
                      <p className="font-semibold">{notif.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded ${notif.read ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-600'}`}>
                        {notif.read ? 'Read' : 'Unread'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-2">{new Date(notif.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Reports by Status */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <i className="fas fa-chart-pie text-green-600"></i>
                Reports by Status
              </h3>
              <div className="space-y-3">
                <div><div className="flex justify-between text-sm"><span>Pending</span><span className="font-bold text-yellow-600">{stats.pending}</span></div><div className="w-full bg-gray-200 rounded-full h-2 mt-1"><div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${(stats.pending / stats.total) * 100 || 0}%` }}></div></div></div>
                <div><div className="flex justify-between text-sm"><span>Assigned</span><span className="font-bold text-blue-600">{stats.assigned}</span></div><div className="w-full bg-gray-200 rounded-full h-2 mt-1"><div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(stats.assigned / stats.total) * 100 || 0}%` }}></div></div></div>
                <div><div className="flex justify-between text-sm"><span>Collected</span><span className="font-bold text-purple-600">{stats.collected}</span></div><div className="w-full bg-gray-200 rounded-full h-2 mt-1"><div className="bg-purple-500 h-2 rounded-full" style={{ width: `${(stats.collected / stats.total) * 100 || 0}%` }}></div></div></div>
                <div><div className="flex justify-between text-sm"><span>Verified</span><span className="font-bold text-green-600">{stats.verified}</span></div><div className="w-full bg-gray-200 rounded-full h-2 mt-1"><div className="bg-green-500 h-2 rounded-full" style={{ width: `${(stats.verified / stats.total) * 100 || 0}%` }}></div></div></div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <i className="fas fa-chart-line text-green-600"></i>
                Key Metrics
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded"><p className="text-2xl font-bold text-blue-600">{workers.filter(w => w.available).length}</p><p className="text-xs text-gray-600">Active Workers</p></div>
                <div className="text-center p-3 bg-green-50 rounded"><p className="text-2xl font-bold text-green-600">{stats.verified}</p><p className="text-xs text-gray-600">Resolved Reports</p></div>
                <div className="text-center p-3 bg-purple-50 rounded"><p className="text-2xl font-bold text-purple-600">{reports.filter(r => r.rating > 0).length}</p><p className="text-xs text-gray-600">Rated Reports</p></div>
                <div className="text-center p-3 bg-yellow-50 rounded"><p className="text-2xl font-bold text-yellow-600">{stats.totalReportsThisMonth}</p><p className="text-xs text-gray-600">This Month</p></div>
              </div>
            </div>
          </div>

          {/* Resolution Rate */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-3">Resolution Rate</h3>
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-32 h-32">
                  <circle className="text-gray-200" strokeWidth="8" stroke="currentColor" fill="transparent" r="58" cx="64" cy="64"/>
                  <circle className="text-green-600" strokeWidth="8" strokeDasharray={`${(stats.verified / stats.total) * 365 || 0} 365`} strokeLinecap="round" stroke="currentColor" fill="transparent" r="58" cx="64" cy="64"/>
                </svg>
                <span className="absolute text-2xl font-bold text-green-600">{Math.round((stats.verified / stats.total) * 100) || 0}%</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Reports Resolved</p>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Assign Worker</h2>
              <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <p className="mb-4 text-gray-600">Assign to: <strong className="text-gray-900">{selectedReport.address}</strong></p>
            {workers.filter(w => w.available).length === 0 ? (
              <p className="text-center text-gray-500 py-4">No available workers</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {workers.filter(w => w.available).map(worker => (
                  <button
                    key={worker.id}
                    onClick={() => assignWorker(selectedReport.id, worker.id)}
                    disabled={assigning}
                    className="w-full p-3 border rounded-lg text-left hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    <p className="font-medium">{worker.full_name || 'Unnamed'}</p>
                    <p className="text-xs text-gray-500">Zone: {worker.zone || 'Not assigned'} | Phone: {worker.phone || 'N/A'}</p>
                    <p className="text-xs text-gray-400">Vehicle: {worker.vehicle_type || 'N/A'}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Send Broadcast Notification</h2>
              <button onClick={() => setShowBroadcastModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="e.g., System Update"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Message</label>
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Enter your message here..."
                  rows="3"
                  className="w-full px-3 py-2 border rounded-lg resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notification Type</label>
                <select
                  value={broadcastType}
                  onChange={(e) => setBroadcastType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="info">Information</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowBroadcastModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={sendBroadcastNotification}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Send to All Users
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;