import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    assigned: 0,
    collected: 0,
    verified: 0,
    ready_for_rating: 0,
    totalUsers: 0,
    activeWorkers: 0,
    totalReportsThisMonth: 0
  });

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    try {
      const { data: reportsData, error: reportsError } = await supabase
        .from('waste_reports')
        .select('*, profiles:user_id(full_name, email, phone)')
        .order('created_at', { ascending: false });
      
      if (reportsError) throw reportsError;
      setReports(reportsData || []);
      
      const { data: workersData, error: workersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'worker')
        .order('created_at', { ascending: false });
      
      if (workersError) throw workersError;
      setWorkers(workersData || []);
      
      const { data: residentsData, error: residentsError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'resident')
        .order('created_at', { ascending: false });
      
      if (residentsError) throw residentsError;
      setResidents(residentsData || []);
      
      const { data: notifData, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (notifError) throw notifError;
      setNotifications(notifData || []);
      
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const reportsThisMonth = reportsData?.filter(r => new Date(r.created_at) >= thisMonth) || [];
      
      setStats({
        total: reportsData?.length || 0,
        pending: reportsData?.filter(r => r.status === 'pending').length || 0,
        assigned: reportsData?.filter(r => r.status === 'assigned').length || 0,
        collected: reportsData?.filter(r => r.status === 'collected').length || 0,
        ready_for_rating: reportsData?.filter(r => r.status === 'ready_for_rating').length || 0,
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
      const updates = { status, updated_at: new Date().toISOString() };
      if (status === 'collected') updates.collected_at = new Date().toISOString();
      if (status === 'verified') updates.verified_at = new Date().toISOString();
      
      const { error } = await supabase.from('waste_reports').update(updates).eq('id', reportId);
      if (error) throw error;
      
      const report = reports.find(r => r.id === reportId);
      if (report) {
        await supabase.from('notifications').insert([{
          user_id: report.user_id,
          title: `Report ${status}`,
          message: `Your report at ${report.address} has been ${status}`,
          type: status === 'verified' ? 'success' : 'info',
          report_id: reportId,
          action_url: `/report/${reportId}`
        }]);
      }
      
      toast.success(`Report marked as ${status}`);
      loadAllData();
    } catch (err) {
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
      
      if (worker) {
        await supabase.from('notifications').insert([{
          user_id: workerId,
          title: 'New Task Assigned',
          message: `You have been assigned to collect waste at ${report?.address}`,
          type: 'success',
          report_id: reportId,
          action_url: `/report/${reportId}`
        }]);
      }
      
      if (report) {
        await supabase.from('notifications').insert([{
          user_id: report.user_id,
          title: 'Worker Assigned',
          message: `A worker has been assigned to your report at ${report?.address}`,
          type: 'info',
          report_id: reportId,
          action_url: `/report/${reportId}`
        }]);
      }
      
      toast.success('Worker assigned and notified');
      loadAllData();
      setShowAssignModal(false);
      setSelectedReport(null);
    } catch (err) {
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
      toast.error('Failed to send broadcast');
    }
  };

  const deleteReport = async (reportId) => {
    if (!confirm('Delete this report?')) return;
    try {
      await supabase.from('waste_reports').delete().eq('id', reportId);
      toast.success('Report deleted');
      loadAllData();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const toggleWorkerAvailability = async (workerId, currentStatus) => {
    try {
      await supabase.from('profiles').update({ available: !currentStatus }).eq('id', workerId);
      toast.success(`Worker ${!currentStatus ? 'activated' : 'deactivated'}`);
      loadAllData();
    } catch (err) {
      toast.error('Failed to update worker status');
    }
  };

  const deleteUser = async (userId, userRole) => {
    if (!confirm(`Delete this ${userRole}? All data will be removed.`)) return;
    try {
      await supabase.from('waste_reports').delete().eq('user_id', userId);
      await supabase.from('notifications').delete().eq('user_id', userId);
      await supabase.from('profiles').delete().eq('id', userId);
      toast.success(`${userRole} deleted`);
      loadAllData();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-orange-500 text-white',
      assigned: 'bg-blue-500 text-white',
      collected: 'bg-purple-500 text-white',
      ready_for_rating: 'bg-yellow-500 text-white',
      verified: 'bg-green-600 text-white'
    };
    return `px-1.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-500 text-white'}`;
  };

  const filteredReports = reports.filter(r =>
    r.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const delayedReports = reports.filter(r => r.delayed === true || r.worker_no_show === true);
  const collectedReports = reports.filter(r => r.status === 'collected');
  const readyForRatingReports = reports.filter(r => r.status === 'ready_for_rating');

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentReports = filteredReports.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-2 sm:px-0 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-4 text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Admin Dashboard</h1>
            <p className="text-green-100 text-xs">Manage reports, workers, residents</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowBroadcastModal(true)} className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs">
              <i className="fas fa-broadcast-tower mr-1"></i>Broadcast
            </button>
            <button onClick={loadAllData} className="px-3 py-1 bg-white text-green-700 rounded-lg hover:bg-gray-100 text-xs">
              <i className="fas fa-sync-alt mr-1"></i>Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Delayed / No-Show Reports Alert */}
      {delayedReports.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4">
          <h3 className="font-semibold text-red-800 flex items-center gap-2">
            <i className="fas fa-exclamation-triangle"></i>
            Urgent: Delayed / No-Show Reports ({delayedReports.length})
          </h3>
          <div className="mt-2 space-y-2">
            {delayedReports.slice(0, 3).map(report => (
              <div key={report.id} className="bg-white p-2 rounded flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">{report.address}</p>
                  <p className="text-xs text-red-600">
                    {report.delayed ? '⚠️ Worker Delayed' : '🚨 Worker Never Showed'}
                  </p>
                </div>
                <Link to={`/report/${report.id}`}>
                  <button className="px-2 py-1 bg-red-600 text-white rounded text-xs">View & Reassign</button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
        <div className="bg-white p-2 rounded-lg shadow text-center">
          <i className="fas fa-flag text-blue-500 text-sm"></i>
          <p className="text-base font-bold">{stats.total}</p>
          <p className="text-xs text-gray-500">Reports</p>
        </div>
        <div className="bg-orange-50 p-2 rounded-lg text-center">
          <i className="fas fa-clock text-orange-600 text-sm"></i>
          <p className="text-base font-bold text-orange-600">{stats.pending}</p>
          <p className="text-xs text-orange-600">Pending</p>
        </div>
        <div className="bg-blue-50 p-2 rounded-lg text-center">
          <i className="fas fa-user-check text-blue-600 text-sm"></i>
          <p className="text-base font-bold text-blue-600">{stats.assigned}</p>
          <p className="text-xs text-blue-600">Assigned</p>
        </div>
        <div className="bg-purple-50 p-2 rounded-lg text-center">
          <i className="fas fa-truck text-purple-600 text-sm"></i>
          <p className="text-base font-bold text-purple-600">{stats.collected}</p>
          <p className="text-xs text-purple-600">Collected</p>
        </div>
        <div className="bg-yellow-50 p-2 rounded-lg text-center">
          <i className="fas fa-star text-yellow-600 text-sm"></i>
          <p className="text-base font-bold text-yellow-600">{stats.ready_for_rating}</p>
          <p className="text-xs text-yellow-600">Ready Rating</p>
        </div>
        <div className="bg-green-50 p-2 rounded-lg text-center">
          <i className="fas fa-check-circle text-green-600 text-sm"></i>
          <p className="text-base font-bold text-green-600">{stats.verified}</p>
          <p className="text-xs text-green-600">Verified</p>
        </div>
        <div className="bg-indigo-50 p-2 rounded-lg text-center">
          <i className="fas fa-users text-indigo-600 text-sm"></i>
          <p className="text-base font-bold text-indigo-600">{stats.totalUsers}</p>
          <p className="text-xs text-indigo-600">Users</p>
        </div>
        <div className="bg-emerald-50 p-2 rounded-lg text-center">
          <i className="fas fa-calendar-alt text-emerald-600 text-sm"></i>
          <p className="text-base font-bold text-emerald-600">{stats.totalReportsThisMonth}</p>
          <p className="text-xs text-emerald-600">Month</p>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5">
        <div className="bg-orange-100 p-1.5 rounded-lg text-center">
          <p className="text-orange-700 text-xs">Pending</p>
          <p className="text-sm font-bold text-orange-600">{Math.round((stats.pending / stats.total) * 100) || 0}%</p>
        </div>
        <div className="bg-blue-100 p-1.5 rounded-lg text-center">
          <p className="text-blue-700 text-xs">Assigned</p>
          <p className="text-sm font-bold text-blue-600">{Math.round((stats.assigned / stats.total) * 100) || 0}%</p>
        </div>
        <div className="bg-purple-100 p-1.5 rounded-lg text-center">
          <p className="text-purple-700 text-xs">Collected</p>
          <p className="text-sm font-bold text-purple-600">{Math.round((stats.collected / stats.total) * 100) || 0}%</p>
        </div>
        <div className="bg-yellow-100 p-1.5 rounded-lg text-center">
          <p className="text-yellow-700 text-xs">Ready Rating</p>
          <p className="text-sm font-bold text-yellow-600">{Math.round((stats.ready_for_rating / stats.total) * 100) || 0}%</p>
        </div>
        <div className="bg-green-100 p-1.5 rounded-lg text-center">
          <p className="text-green-700 text-xs">Verified</p>
          <p className="text-sm font-bold text-green-600">{Math.round((stats.verified / stats.total) * 100) || 0}%</p>
        </div>
        <div className="bg-gray-100 p-1.5 rounded-lg text-center">
          <p className="text-gray-700 text-xs">Resolution</p>
          <p className="text-sm font-bold text-gray-600">{stats.total ? Math.round((stats.verified / stats.total) * 100) : 0}%</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"></i>
        <input
          type="text"
          placeholder="Search reports by address, ID, or reporter..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          className="w-full pl-8 pr-3 py-1.5 border rounded-lg text-sm"
        />
      </div>

      {/* Tabs */}
      <div className="border-b overflow-x-auto whitespace-nowrap pb-1 -mx-2 px-2">
        <div className="inline-flex gap-1">
          <button onClick={() => { setActiveTab('reports'); setCurrentPage(1); }} className={`px-3 py-1.5 text-sm rounded-t-lg ${activeTab === 'reports' ? 'text-green-600 border-b-2 border-green-600 font-medium' : 'text-gray-500'}`}>
            <i className="fas fa-flag mr-1"></i>Reports ({reports.length})
          </button>
          <button onClick={() => setActiveTab('workers')} className={`px-3 py-1.5 text-sm rounded-t-lg ${activeTab === 'workers' ? 'text-green-600 border-b-2 border-green-600 font-medium' : 'text-gray-500'}`}>
            <i className="fas fa-truck mr-1"></i>Workers ({workers.length})
          </button>
          <button onClick={() => setActiveTab('residents')} className={`px-3 py-1.5 text-sm rounded-t-lg ${activeTab === 'residents' ? 'text-green-600 border-b-2 border-green-600 font-medium' : 'text-gray-500'}`}>
            <i className="fas fa-users mr-1"></i>Residents ({residents.length})
          </button>
          <button onClick={() => setActiveTab('notifications')} className={`px-3 py-1.5 text-sm rounded-t-lg ${activeTab === 'notifications' ? 'text-green-600 border-b-2 border-green-600 font-medium' : 'text-gray-500'}`}>
            <i className="fas fa-bell mr-1"></i>Notif ({notifications.length})
          </button>
          <button onClick={() => setActiveTab('analytics')} className={`px-3 py-1.5 text-sm rounded-t-lg ${activeTab === 'analytics' ? 'text-green-600 border-b-2 border-green-600 font-medium' : 'text-gray-500'}`}>
            <i className="fas fa-chart-line mr-1"></i>Analytics
          </button>
        </div>
      </div>

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-2">
          {currentReports.length === 0 ? (
            <div className="bg-white rounded-lg border p-6 text-center text-gray-500">
              <i className="fas fa-inbox text-3xl mb-2"></i>
              <p className="text-sm">No reports found</p>
            </div>
          ) : (
            currentReports.map(report => (
              <div key={report.id} className="bg-white rounded-lg border p-2 hover:shadow-md transition">
                <div className="flex flex-wrap justify-between items-center gap-1">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-xs text-gray-500 font-mono">#{report.id.slice(0, 6)}</span>
                      <span className={getStatusBadge(report.status)}>{report.status}</span>
                      {report.is_emergency && <span className="text-xs bg-red-100 text-red-700 px-1 py-0.5 rounded">!</span>}
                      {report.delayed && <span className="text-xs bg-yellow-100 text-yellow-700 px-1 py-0.5 rounded">Delayed</span>}
                      {report.worker_no_show && <span className="text-xs bg-red-100 text-red-700 px-1 py-0.5 rounded">No-Show</span>}
                    </div>
                    <p className="font-medium text-sm truncate">{report.address}</p>
                    <p className="text-xs text-gray-500 capitalize">{report.waste_type}</p>
                    <p className="text-xs text-gray-400">By: {report.profiles?.full_name || 'Unknown'}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {report.status === 'pending' && (
                      <button onClick={() => { setSelectedReport(report); setShowAssignModal(true); }} className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">Assign</button>
                    )}
                    {report.status === 'assigned' && (
                      <button onClick={() => updateReportStatus(report.id, 'collected')} className="px-1.5 py-0.5 bg-purple-600 text-white rounded text-xs hover:bg-purple-700">Collect</button>
                    )}
                    {report.status === 'collected' && (
                      <button onClick={() => updateReportStatus(report.id, 'ready_for_rating')} className="px-1.5 py-0.5 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700">Ready</button>
                    )}
                    {report.status === 'ready_for_rating' && (
                      <button onClick={() => updateReportStatus(report.id, 'verified')} className="px-1.5 py-0.5 bg-green-600 text-white rounded text-xs hover:bg-green-700">Verify</button>
                    )}
                    <button onClick={() => deleteReport(report.id)} className="px-1.5 py-0.5 border border-red-300 text-red-600 rounded text-xs hover:bg-red-50">X</button>
                  </div>
                </div>
              </div>
            ))
          )}
          
          {filteredReports.length > itemsPerPage && (
            <div className="flex justify-center items-center gap-1 pt-2">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-2 py-0.5 text-xs bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50">Prev</button>
              <span className="text-xs text-gray-500">{currentPage}/{totalPages}</span>
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-2 py-0.5 text-xs bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50">Next</button>
            </div>
          )}
        </div>
      )}

      {/* Workers Tab */}
      {activeTab === 'workers' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {workers.map(worker => (
            <div key={worker.id} className="bg-white rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {worker.full_name?.[0] || 'W'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{worker.full_name || 'Unnamed'}</h3>
                  <p className="text-xs text-gray-500 truncate">{worker.email}</p>
                </div>
                <div className="flex gap-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${worker.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {worker.available ? 'Online' : 'Offline'}
                  </span>
                  <button onClick={() => toggleWorkerAvailability(worker.id, worker.available)} className={`text-xs px-1.5 py-0.5 rounded-full ${worker.available ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                    {worker.available ? 'Off' : 'On'}
                  </button>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t grid grid-cols-2 gap-1 text-xs">
                <p><i className="fas fa-phone w-3 text-gray-400"></i> {worker.phone || 'No phone'}</p>
                <p><i className="fas fa-map-marker-alt w-3 text-gray-400"></i> {worker.zone || 'No zone'}</p>
                <p><i className="fas fa-id-card w-3 text-gray-400"></i> {worker.worker_id || 'No ID'}</p>
                <p><i className="fas fa-truck w-3 text-gray-400"></i> {worker.vehicle_type || 'No vehicle'}</p>
                <p><i className="fas fa-star w-3 text-yellow-500"></i> {worker.rating || 0}⭐ ({worker.rating_count || 0})</p>
                <p><i className="fas fa-briefcase w-3 text-gray-400"></i> {worker.completed_jobs || 0} jobs</p>
              </div>
              <div className="mt-2 pt-2 border-t">
                <button onClick={() => deleteUser(worker.id, 'worker')} className="w-full text-xs text-red-600 hover:bg-red-50 py-1 rounded">Delete Worker</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Residents Tab */}
      {activeTab === 'residents' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {residents.map(resident => {
            const userReports = reports.filter(r => r.user_id === resident.id);
            return (
              <div key={resident.id} className="bg-white rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {resident.full_name?.[0] || 'R'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{resident.full_name || 'Unnamed'}</h3>
                    <p className="text-xs text-gray-500 truncate">{resident.email}</p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t grid grid-cols-2 gap-1 text-xs">
                  <p><i className="fas fa-phone w-3 text-gray-400"></i> {resident.phone || 'No phone'}</p>
                  <p><i className="fas fa-map-marker-alt w-3 text-gray-400"></i> {resident.zone || 'No zone'}</p>
                  <p><i className="fas fa-flag w-3 text-gray-400"></i> {userReports.length} reports</p>
                  <p><i className="fas fa-check-circle w-3 text-green-500"></i> {userReports.filter(r => r.status === 'verified').length} resolved</p>
                  <p><i className="fas fa-calendar w-3 text-gray-400"></i> Joined: {new Date(resident.created_at).toLocaleDateString()}</p>
                </div>
                <div className="mt-2 pt-2 border-t">
                  <button onClick={() => deleteUser(resident.id, 'resident')} className="w-full text-xs text-red-600 hover:bg-red-50 py-1 rounded">Delete Resident</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-2">
          {notifications.length === 0 ? (
            <div className="bg-white rounded-lg border p-6 text-center text-gray-500">
              <i className="fas fa-bell-slash text-3xl mb-2"></i>
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            notifications.slice(0, 20).map(notif => (
              <div key={notif.id} className="bg-white rounded-lg border p-3 cursor-pointer hover:shadow-md transition" onClick={() => {
                if (notif.action_url) window.location.href = notif.action_url;
                else if (notif.report_id) window.location.href = `/report/${notif.report_id}`;
              }}>
                <div className="flex items-start gap-2">
                  <i className={`fas text-sm mt-0.5 ${
                    notif.type === 'success' ? 'fa-check-circle text-green-500' :
                    notif.type === 'error' ? 'fa-times-circle text-red-500' :
                    notif.type === 'warning' ? 'fa-exclamation-triangle text-yellow-500' :
                    'fa-info-circle text-blue-500'
                  }`}></i>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-1">
                      <p className="font-semibold text-sm">{notif.title}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${notif.read ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-600'}`}>
                        {notif.read ? 'Read' : 'New'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(notif.created_at).toLocaleString()}</p>
                    {(notif.action_url || notif.report_id) && (
                      <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                        <i className="fas fa-share-alt"></i> Click to view details
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-sm mb-3">Reports by Status</h3>
            <div className="space-y-2">
              <div><div className="flex justify-between text-xs"><span>Pending</span><span className="font-bold text-orange-600">{stats.pending}</span></div><div className="w-full bg-gray-200 rounded-full h-1.5 mt-1"><div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${(stats.pending / stats.total) * 100 || 0}%` }}></div></div></div>
              <div><div className="flex justify-between text-xs"><span>Assigned</span><span className="font-bold text-blue-600">{stats.assigned}</span></div><div className="w-full bg-gray-200 rounded-full h-1.5 mt-1"><div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(stats.assigned / stats.total) * 100 || 0}%` }}></div></div></div>
              <div><div className="flex justify-between text-xs"><span>Collected</span><span className="font-bold text-purple-600">{stats.collected}</span></div><div className="w-full bg-gray-200 rounded-full h-1.5 mt-1"><div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${(stats.collected / stats.total) * 100 || 0}%` }}></div></div></div>
              <div><div className="flex justify-between text-xs"><span>Ready Rating</span><span className="font-bold text-yellow-600">{stats.ready_for_rating}</span></div><div className="w-full bg-gray-200 rounded-full h-1.5 mt-1"><div className="bg-yellow-500 h-1.5 rounded-full" style={{ width: `${(stats.ready_for_rating / stats.total) * 100 || 0}%` }}></div></div></div>
              <div><div className="flex justify-between text-xs"><span>Verified</span><span className="font-bold text-green-600">{stats.verified}</span></div><div className="w-full bg-gray-200 rounded-full h-1.5 mt-1"><div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${(stats.verified / stats.total) * 100 || 0}%` }}></div></div></div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-sm mb-3">Key Metrics</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 bg-blue-50 rounded"><p className="text-lg font-bold text-blue-600">{workers.filter(w => w.available).length}</p><p className="text-xs text-gray-600">Active Workers</p></div>
              <div className="text-center p-2 bg-green-50 rounded"><p className="text-lg font-bold text-green-600">{stats.verified}</p><p className="text-xs text-gray-600">Resolved</p></div>
              <div className="text-center p-2 bg-purple-50 rounded"><p className="text-lg font-bold text-purple-600">{reports.filter(r => r.rating > 0).length}</p><p className="text-xs text-gray-600">Rated</p></div>
              <div className="text-center p-2 bg-yellow-50 rounded"><p className="text-lg font-bold text-yellow-600">{stats.totalReportsThisMonth}</p><p className="text-xs text-gray-600">This Month</p></div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-sm mb-3">Worker Performance</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs">Top Rated Worker</span>
                <span className="text-xs font-bold text-green-600">
                  {workers.length > 0 ? Math.max(...workers.map(w => w.rating || 0)).toFixed(1) : 0}⭐
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">Most Active Worker</span>
                <span className="text-xs font-bold text-blue-600">
                  {workers.length > 0 ? Math.max(...workers.map(w => w.completed_jobs || 0)) : 0} jobs
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">Average Response Time</span>
                <span className="text-xs font-bold text-purple-600">
                  {collectedReports.length > 0 ? 
                    Math.round(collectedReports.reduce((acc, r) => 
                      acc + (new Date(r.collected_at).getTime() - new Date(r.assigned_at).getTime()), 0) / collectedReports.length / (1000 * 60 * 60)
                    ) : 0} hours
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal with Report Details Preview */}
      {showAssignModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-3">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-bold">Assign Worker</h2>
              <button onClick={() => setShowAssignModal(false)} className="text-gray-400 text-lg">&times;</button>
            </div>
            
            {/* Report Details Preview */}
            <div className="bg-gray-50 p-3 rounded-lg mb-3">
              <h4 className="font-semibold text-sm mb-2">Report Details:</h4>
              <p className="text-xs"><strong>Address:</strong> {selectedReport.address}</p>
              <p className="text-xs"><strong>Waste Type:</strong> {selectedReport.waste_type}</p>
              <p className="text-xs"><strong>Description:</strong> {selectedReport.description?.substring(0, 100)}</p>
              {selectedReport.is_emergency && (
                <p className="text-xs text-red-600 font-semibold mt-1">🚨 EMERGENCY - Prioritize this</p>
              )}
              {selectedReport.photo_url && (
                <img src={selectedReport.photo_url} alt="Evidence" className="h-16 w-16 object-cover rounded mt-2" />
              )}
            </div>
            
            <p className="mb-2 text-xs">Assign to: <strong>{selectedReport.address}</strong></p>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {workers.filter(w => w.available).length === 0 ? (
                <p className="text-center text-gray-500 py-2 text-xs">No available workers</p>
              ) : (
                workers.filter(w => w.available).map(worker => (
                  <button key={worker.id} onClick={() => assignWorker(selectedReport.id, worker.id)} disabled={assigning} className="w-full p-2 border rounded-lg text-left hover:bg-gray-50 text-xs">
                    <p className="font-medium text-xs">{worker.full_name || 'Unnamed'}</p>
                    <p className="text-xs text-gray-500">Zone: {worker.zone} | Phone: {worker.phone || 'N/A'}</p>
                    <p className="text-xs text-gray-400">Vehicle: {worker.vehicle_type || 'N/A'} | Rating: {worker.rating || 0}⭐</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-3">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-bold">Send Broadcast</h2>
              <button onClick={() => setShowBroadcastModal(false)} className="text-gray-400 text-lg">&times;</button>
            </div>
            <div className="space-y-2">
              <input type="text" placeholder="Title" value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} className="w-full px-2 py-1 border rounded-lg text-sm" />
              <textarea placeholder="Message" value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)} rows="2" className="w-full px-2 py-1 border rounded-lg resize-none text-sm" />
              <select value={broadcastType} onChange={(e) => setBroadcastType(e.target.value)} className="w-full px-2 py-1 border rounded-lg text-sm">
                <option value="info">Information</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
              <div className="flex gap-2">
                <button onClick={() => setShowBroadcastModal(false)} className="flex-1 px-2 py-1 border rounded-lg text-sm">Cancel</button>
                <button onClick={sendBroadcastNotification} className="flex-1 px-2 py-1 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">Send</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;