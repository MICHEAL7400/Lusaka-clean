import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import AdminAnalytics from './AdminAnalytics';

const Admin = () => {
  const [reports, setReports] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [residents, setResidents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [adminLogs, setAdminLogs] = useState([]);
  const [bannedUsers, setBannedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reports');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [zoneFilter, setZoneFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState('info');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReports, setSelectedReports] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('collected');
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showUserRoleModal, setShowUserRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [showBanModal, setShowBanModal] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState('permanent');
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('adminDarkMode') === 'true';
  });
  const [newVehicle, setNewVehicle] = useState({
    registration: '',
    type: 'Pickup',
    driver_name: '',
    last_service: '',
    mileage: '',
    fuel_level: 100
  });
  const itemsPerPage = 10;
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    assigned: 0,
    collected: 0,
    ready_for_rating: 0,
    verified: 0,
    totalUsers: 0,
    activeWorkers: 0,
    totalReportsThisMonth: 0,
    avgResponseTime: 0,
    resolutionRate: 0,
    bannedUsers: 0
  });

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('adminDarkMode', darkMode);
  }, [darkMode]);

  // Load banned users
  const loadBannedUsers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, banned, ban_reason, banned_at')
        .eq('banned', true);
      setBannedUsers(data || []);
    } catch (err) {
      console.error('Error loading banned users:', err);
    }
  };

  // Log admin action
  const logAdminAction = async (action, details) => {
    try {
      const userId = localStorage.getItem('userId');
      await supabase.from('admin_logs').insert({
        admin_id: userId,
        action,
        details,
        created_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to log action:', err);
    }
  };

  // Load all data
  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [reportsRes, workersRes, residentsRes, notifRes, vehiclesRes, logsRes] = await Promise.all([
        supabase.from('waste_reports').select('*, profiles:user_id(full_name, email, phone)').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('role', 'worker').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('role', 'resident').order('created_at', { ascending: false }),
        supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('vehicles').select('*').order('created_at', { ascending: false }),
        supabase.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(100)
      ]);
      
      setReports(reportsRes.data || []);
      setWorkers(workersRes.data || []);
      setResidents(residentsRes.data || []);
      setNotifications(notifRes.data || []);
      setVehicles(vehiclesRes.data || []);
      setAdminLogs(logsRes.data || []);
      
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const reportsThisMonth = reportsRes.data?.filter(r => new Date(r.created_at) >= thisMonth) || [];
      
      const completedReports = reportsRes.data?.filter(r => r.status === 'verified' && r.assigned_at && r.collected_at) || [];
      const avgResponseTime = completedReports.length > 0 
        ? completedReports.reduce((sum, r) => {
            const assigned = new Date(r.assigned_at);
            const collected = new Date(r.collected_at);
            return sum + (collected - assigned) / (1000 * 60 * 60);
          }, 0) / completedReports.length
        : 0;
      
      const resolved = reportsRes.data?.filter(r => r.status === 'verified').length || 0;
      const resolutionRate = reportsRes.data?.length > 0 ? (resolved / reportsRes.data.length) * 100 : 0;
      
      setStats({
        total: reportsRes.data?.length || 0,
        pending: reportsRes.data?.filter(r => r.status === 'pending').length || 0,
        assigned: reportsRes.data?.filter(r => r.status === 'assigned').length || 0,
        collected: reportsRes.data?.filter(r => r.status === 'collected').length || 0,
        ready_for_rating: reportsRes.data?.filter(r => r.status === 'ready_for_rating').length || 0,
        verified: resolved,
        totalUsers: (workersRes.data?.length || 0) + (residentsRes.data?.length || 0),
        activeWorkers: workersRes.data?.filter(w => w.available === true).length || 0,
        totalReportsThisMonth: reportsThisMonth.length,
        avgResponseTime: Math.round(avgResponseTime),
        resolutionRate: Math.round(resolutionRate),
        bannedUsers: bannedUsers.length
      });
      
    } catch (err) {
      console.error('Error loading data:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [bannedUsers.length]);

  // Real-time subscription
  useEffect(() => {
    loadAllData();
    loadBannedUsers();
    
    const subscription = supabase
      .channel('admin-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waste_reports' }, () => {
        loadAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        loadAllData();
        loadBannedUsers();
      })
      .subscribe();
    
    const interval = setInterval(() => {
      loadAllData();
      loadBannedUsers();
    }, 30000);
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(subscription);
    };
  }, [loadAllData]);

  // Export to CSV
  const exportToCSV = async () => {
    try {
      const { data } = await supabase
        .from('waste_reports')
        .select('*, profiles:user_id(full_name, email)')
        .order('created_at', { ascending: false });
      
      if (!data) return;
      
      const headers = ['ID', 'Address', 'Waste Type', 'Status', 'Reporter', 'Email', 'Created At', 'Completed At'];
      const rows = data.map(r => [
        r.id.slice(0, 8),
        r.address,
        r.waste_type,
        r.status,
        r.profiles?.full_name || 'Unknown',
        r.profiles?.email || 'Unknown',
        new Date(r.created_at).toLocaleString(),
        r.verified_at ? new Date(r.verified_at).toLocaleString() : 'Pending'
      ]);
      
      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reports_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      await logAdminAction('EXPORT_REPORTS', `Exported ${data.length} reports to CSV`);
      toast.success('Reports exported successfully');
    } catch (err) {
      toast.error('Failed to export reports');
    }
  };

  // Ban user
  const banUser = async (userId, reason, duration) => {
    try {
      const updates = {
        banned: true,
        ban_reason: reason,
        banned_at: new Date().toISOString(),
        ban_duration: duration,
        updated_at: new Date().toISOString()
      };
      
      if (duration !== 'permanent') {
        const unbanDate = new Date();
        if (duration === '7days') unbanDate.setDate(unbanDate.getDate() + 7);
        if (duration === '30days') unbanDate.setDate(unbanDate.getDate() + 30);
        updates.unban_at = unbanDate.toISOString();
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);
      
      if (error) throw error;
      
      await logAdminAction('BAN_USER', `Banned user ${userId} for: ${reason} (${duration})`);
      toast.success(`User has been ${duration === 'permanent' ? 'permanently banned' : 'suspended'}`);
      loadAllData();
      loadBannedUsers();
      setShowBanModal(false);
      setBanReason('');
      setBanDuration('permanent');
      setSelectedUser(null);
    } catch (err) {
      toast.error('Failed to ban user');
    }
  };

  // Update user role
  const updateUserRole = async (userId, newRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);
      
      if (error) throw error;
      
      await logAdminAction('UPDATE_ROLE', `Changed user ${userId} role to ${newRole}`);
      toast.success(`User role updated to ${newRole}`);
      loadAllData();
      setShowUserRoleModal(false);
      setSelectedUser(null);
    } catch (err) {
      toast.error('Failed to update user role');
    }
  };

  // Unban user
  const unbanUser = async (userId) => {
    if (!confirm('Unban this user? They will be able to log in again.')) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          banned: false,
          ban_reason: null,
          banned_at: null,
          ban_duration: null,
          unban_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (error) throw error;
      
      await logAdminAction('UNBAN_USER', `Unbanned user ${userId}`);
      toast.success('User unbanned successfully');
      loadAllData();
      loadBannedUsers();
    } catch (err) {
      toast.error('Failed to unban user');
    }
  };

  // Send warning
  const sendWarningToUser = async (userId, warningMessage) => {
    try {
      await supabase.from('notifications').insert([{
        user_id: userId,
        title: '⚠️ Admin Warning',
        message: warningMessage,
        type: 'warning',
        created_at: new Date().toISOString()
      }]);
      
      await logAdminAction('SEND_WARNING', `Sent warning to user ${userId}`);
      toast.success('Warning sent to user');
    } catch (err) {
      toast.error('Failed to send warning');
    }
  };

  // Delete user account
  const deleteUserAccount = async (userId, userRole, userName) => {
    if (!confirm(`⚠️ DANGER: Delete ${userName} (${userRole})?\n\nAll their reports, notifications, and messages will be PERMANENTLY deleted. This action cannot be undone.`)) return;
    
    try {
      await Promise.all([
        supabase.from('chat_messages').delete().eq('sender_id', userId),
        supabase.from('chat_messages').delete().eq('receiver_id', userId),
        supabase.from('notifications').delete().eq('user_id', userId),
        supabase.from('waste_reports').delete().eq('user_id', userId),
        supabase.from('waste_reports').delete().eq('assigned_worker_id', userId),
        supabase.from('worker_locations').delete().eq('worker_id', userId),
        supabase.from('profiles').delete().eq('id', userId)
      ]);
      
      await logAdminAction('DELETE_USER_ACCOUNT', `Permanently deleted user ${userName} (${userRole})`);
      toast.success(`User ${userName} permanently deleted`);
      loadAllData();
      loadBannedUsers();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete user. They may have existing data constraints.');
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
      
      await logAdminAction('UPDATE_STATUS', `Updated report ${reportId} to ${status}`);
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
      
      await Promise.all([
        worker && supabase.from('notifications').insert([{
          user_id: workerId,
          title: 'New Task Assigned',
          message: `You have been assigned to collect waste at ${report?.address}`,
          type: 'success',
          report_id: reportId,
          action_url: `/report/${reportId}`
        }]),
        report && supabase.from('notifications').insert([{
          user_id: report.user_id,
          title: 'Worker Assigned',
          message: `A worker has been assigned to your report at ${report?.address}`,
          type: 'info',
          report_id: reportId,
          action_url: `/report/${reportId}`
        }])
      ]);
      
      await logAdminAction('ASSIGN_WORKER', `Assigned worker ${workerId} to report ${reportId}`);
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

  const bulkAssign = async (workerId) => {
    const promises = selectedReports.map(reportId => 
      supabase
        .from('waste_reports')
        .update({ assigned_worker_id: workerId, status: 'assigned', assigned_at: new Date().toISOString() })
        .eq('id', reportId)
    );
    await Promise.all(promises);
    await logAdminAction('BULK_ASSIGN', `Assigned ${selectedReports.length} reports to worker ${workerId}`);
    toast.success(`${selectedReports.length} reports assigned`);
    setSelectedReports([]);
    setBulkMode(false);
    setShowBulkAssignModal(false);
    loadAllData();
  };

  const bulkStatusUpdate = async () => {
    const promises = selectedReports.map(reportId => 
      supabase
        .from('waste_reports')
        .update({ 
          status: bulkStatus, 
          updated_at: new Date().toISOString(),
          ...(bulkStatus === 'collected' ? { collected_at: new Date().toISOString() } : {}),
          ...(bulkStatus === 'verified' ? { verified_at: new Date().toISOString() } : {})
        })
        .eq('id', reportId)
    );
    await Promise.all(promises);
    await logAdminAction('BULK_STATUS_UPDATE', `Updated ${selectedReports.length} reports to ${bulkStatus}`);
    toast.success(`${selectedReports.length} reports updated to ${bulkStatus}`);
    setSelectedReports([]);
    setBulkMode(false);
    setShowBulkStatusModal(false);
    loadAllData();
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedReports.length} reports? This action cannot be undone.`)) return;
    const promises = selectedReports.map(reportId => 
      supabase.from('waste_reports').delete().eq('id', reportId)
    );
    await Promise.all(promises);
    await logAdminAction('BULK_DELETE', `Deleted ${selectedReports.length} reports`);
    toast.success(`${selectedReports.length} reports deleted`);
    setSelectedReports([]);
    setBulkMode(false);
    loadAllData();
  };

  const addVehicle = async () => {
    if (!newVehicle.registration) {
      toast.error('Registration number required');
      return;
    }
    try {
      const { error } = await supabase.from('vehicles').insert([{
        ...newVehicle,
        mileage: parseInt(newVehicle.mileage) || 0,
        fuel_level: parseInt(newVehicle.fuel_level),
        status: 'active',
        created_at: new Date().toISOString()
      }]);
      if (error) throw error;
      await logAdminAction('ADD_VEHICLE', `Added vehicle ${newVehicle.registration}`);
      toast.success('Vehicle added successfully');
      setShowAddVehicleModal(false);
      setNewVehicle({ registration: '', type: 'Pickup', driver_name: '', last_service: '', mileage: '', fuel_level: 100 });
      loadAllData();
    } catch (err) {
      toast.error('Failed to add vehicle');
    }
  };

  const deleteVehicle = async (id, registration) => {
    if (!confirm('Remove this vehicle?')) return;
    await supabase.from('vehicles').delete().eq('id', id);
    await logAdminAction('DELETE_VEHICLE', `Removed vehicle ${registration}`);
    toast.success('Vehicle removed');
    loadAllData();
  };

  const sendBroadcastNotification = async () => {
    if (!broadcastTitle || !broadcastMessage) {
      toast.error('Please enter both title and message');
      return;
    }
    
    try {
      const allUsers = [...workers, ...residents];
      const batchSize = 10;
      let sentCount = 0;
      
      for (let i = 0; i < allUsers.length; i += batchSize) {
        const batch = allUsers.slice(i, i + batchSize);
        const promises = batch.map(user => 
          supabase.from('notifications').insert([{
            user_id: user.id,
            title: broadcastTitle,
            message: broadcastMessage,
            type: broadcastType,
            created_at: new Date().toISOString()
          }])
        );
        const results = await Promise.all(promises);
        sentCount += results.filter(r => !r.error).length;
      }
      
      await logAdminAction('SEND_BROADCAST', `Sent broadcast to ${sentCount} users: "${broadcastTitle}"`);
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
      await logAdminAction('DELETE_REPORT', `Deleted report ${reportId}`);
      toast.success('Report deleted');
      loadAllData();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const toggleWorkerAvailability = async (workerId, currentStatus) => {
    try {
      await supabase.from('profiles').update({ available: !currentStatus }).eq('id', workerId);
      await logAdminAction('TOGGLE_WORKER', `${!currentStatus ? 'Activated' : 'Deactivated'} worker ${workerId}`);
      toast.success(`Worker ${!currentStatus ? 'activated' : 'deactivated'}`);
      loadAllData();
    } catch (err) {
      toast.error('Failed to update worker status');
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

  const getIsBanned = (userId) => bannedUsers.some(b => b.id === userId);

  // Apply filters
  const filteredReports = reports.filter(r => {
    const matchesSearch = r.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDateRange = (!dateRange.start || new Date(r.created_at) >= new Date(dateRange.start)) &&
      (!dateRange.end || new Date(r.created_at) <= new Date(dateRange.end));
    
    const matchesZone = !zoneFilter || r.address?.toLowerCase().includes(zoneFilter.toLowerCase());
    const matchesStatus = !statusFilter || r.status === statusFilter;
    
    return matchesSearch && matchesDateRange && matchesZone && matchesStatus;
  });

  const delayedReports = reports.filter(r => r.delayed === true || r.worker_no_show === true);
  const allUsers = [
    ...residents.map(r => ({ ...r, userType: 'resident' })),
    ...workers.map(w => ({ ...w, userType: 'worker' }))
  ].filter(user => userFilter === 'all' || user.userType === userFilter);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentReports = filteredReports.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);

  const StatCard = ({ icon, color, value, label, bgColor }) => (
    <div className={`${bgColor || 'bg-white'} p-2 rounded-lg shadow text-center dark:bg-gray-800 dark:text-white`}>
      <i className={`fas ${icon} text-${color}-500 text-sm`}></i>
      <p className="text-base font-bold">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 px-2 sm:px-4 pb-20 max-w-7xl mx-auto ${darkMode ? 'dark' : ''}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-4 text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Admin Dashboard</h1>
            <p className="text-green-100 text-xs">Manage reports, workers, residents, fleet, and users</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setDarkMode(!darkMode)} className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-xs">
              <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'} mr-1`}></i>
              {darkMode ? 'Light' : 'Dark'}
            </button>
            <button onClick={() => setShowExportModal(true)} className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs">
              <i className="fas fa-download mr-1"></i>Export
            </button>
            <button onClick={() => setShowBroadcastModal(true)} className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs">
              <i className="fas fa-broadcast-tower mr-1"></i>Broadcast
            </button>
            <button onClick={() => setBulkMode(!bulkMode)} className="px-3 py-1 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-xs">
              <i className="fas fa-layer-group mr-1"></i>{bulkMode ? 'Exit Bulk' : 'Bulk Mode'}
            </button>
            <button onClick={loadAllData} className="px-3 py-1 bg-white text-green-700 rounded-lg hover:bg-gray-100 text-xs">
              <i className="fas fa-sync-alt mr-1"></i>Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Delayed Reports Alert */}
      {delayedReports.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-3 sm:p-4 dark:bg-red-900 dark:border-red-700">
          <h3 className="font-semibold text-red-800 dark:text-red-200 flex items-center gap-2 text-sm sm:text-base">
            <i className="fas fa-exclamation-triangle"></i>
            Urgent: Delayed / No-Show Reports ({delayedReports.length})
          </h3>
          <div className="mt-2 space-y-2">
            {delayedReports.slice(0, 3).map(report => (
              <div key={report.id} className="bg-white dark:bg-gray-800 p-2 rounded flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium break-words dark:text-white">{report.address}</p>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {report.delayed ? '⚠️ Worker Delayed' : '🚨 Worker Never Showed'}
                  </p>
                </div>
                <Link to={`/report/${report.id}`}>
                  <button className="px-2 py-1 bg-red-600 text-white rounded text-xs w-full sm:w-auto">View & Reassign</button>
                </Link>
              </div>
            ))}
            {delayedReports.length > 3 && (
              <p className="text-xs text-red-500 text-center">+{delayedReports.length - 3} more issues</p>
            )}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-11 gap-2">
        <StatCard icon="fa-flag" color="blue" value={stats.total} label="Reports" />
        <StatCard icon="fa-clock" color="orange" value={stats.pending} label="Pending" bgColor="bg-orange-50 dark:bg-gray-800" />
        <StatCard icon="fa-user-check" color="blue" value={stats.assigned} label="Assigned" bgColor="bg-blue-50 dark:bg-gray-800" />
        <StatCard icon="fa-truck" color="purple" value={stats.collected} label="Collected" bgColor="bg-purple-50 dark:bg-gray-800" />
        <StatCard icon="fa-star" color="yellow" value={stats.ready_for_rating} label="Ready" bgColor="bg-yellow-50 dark:bg-gray-800" />
        <StatCard icon="fa-check-circle" color="green" value={stats.verified} label="Verified" bgColor="bg-green-50 dark:bg-gray-800" />
        <StatCard icon="fa-users" color="indigo" value={stats.totalUsers} label="Users" />
        <StatCard icon="fa-user-check" color="teal" value={stats.activeWorkers} label="Active Workers" />
        <StatCard icon="fa-calendar-alt" color="emerald" value={stats.totalReportsThisMonth} label="This Month" />
        <StatCard icon="fa-chart-line" color="cyan" value={`${stats.resolutionRate}%`} label="Resolution" />
        <StatCard icon="fa-gavel" color="red" value={stats.bannedUsers} label="Banned" bgColor="bg-red-50 dark:bg-gray-800" />
      </div>

      {/* Advanced Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <h3 className="font-semibold text-sm mb-3 dark:text-white">Advanced Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <input
            type="date"
            placeholder="From Date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <input
            type="date"
            placeholder="To Date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <input
            type="text"
            placeholder="Zone / Area"
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="collected">Collected</option>
            <option value="ready_for_rating">Ready for Rating</option>
            <option value="verified">Verified</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b overflow-x-auto whitespace-nowrap pb-1 -mx-2 px-2 dark:border-gray-700">
        <div className="inline-flex gap-1">
          {['reports', 'users', 'workers', 'residents', 'fleet', 'notifications', 'analytics', 'logs'].map(tab => (
            <button 
              key={tab}
              onClick={() => { setActiveTab(tab); setCurrentPage(1); }} 
              className={`px-3 py-1.5 text-sm rounded-t-lg capitalize ${
                activeTab === tab 
                  ? 'text-green-600 border-b-2 border-green-600 font-medium dark:text-green-400' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <i className={`fas ${
                tab === 'reports' ? 'fa-flag' :
                tab === 'users' ? 'fa-users-cog' :
                tab === 'workers' ? 'fa-truck' :
                tab === 'residents' ? 'fa-users' :
                tab === 'fleet' ? 'fa-truck' :
                tab === 'notifications' ? 'fa-bell' :
                tab === 'analytics' ? 'fa-chart-line' : 'fa-history'
              } mr-1`}></i>
              {tab} ({tab === 'reports' ? filteredReports.length : 
                     tab === 'users' ? allUsers.length : 
                     tab === 'workers' ? workers.length : 
                     tab === 'residents' ? residents.length : 
                     tab === 'fleet' ? vehicles.length : 
                     tab === 'notifications' ? notifications.length : 
                     tab === 'logs' ? adminLogs.length : ''})
            </button>
          ))}
        </div>
      </div>

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-2">
          {currentReports.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 text-center text-gray-500 dark:text-gray-400">
              <i className="fas fa-inbox text-3xl mb-2"></i>
              <p className="text-sm">No reports found</p>
            </div>
          ) : (
            currentReports.map(report => (
              <div key={report.id} className="bg-white dark:bg-gray-800 rounded-lg border p-2 hover:shadow-md transition">
                <div className="flex items-center gap-2">
                  {bulkMode && (
                    <input
                      type="checkbox"
                      checked={selectedReports.includes(report.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedReports([...selectedReports, report.id]);
                        } else {
                          setSelectedReports(selectedReports.filter(id => id !== report.id));
                        }
                      }}
                      className="w-4 h-4"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-xs text-gray-500 font-mono">#{report.id.slice(0, 6)}</span>
                      <span className={getStatusBadge(report.status)}>{report.status}</span>
                      {report.is_emergency && <span className="text-xs bg-red-100 text-red-700 px-1 py-0.5 rounded">!</span>}
                      {report.delayed && <span className="text-xs bg-yellow-100 text-yellow-700 px-1 py-0.5 rounded">Delayed</span>}
                    </div>
                    <p className="font-medium text-sm truncate dark:text-white">{report.address}</p>
                    <p className="text-xs text-gray-500 capitalize dark:text-gray-400">{report.waste_type}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">By: {report.profiles?.full_name || 'Unknown'}</p>
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

      {/* Users Management Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* User Filter Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border">
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="all">All Users</option>
                <option value="resident">Residents Only</option>
                <option value="worker">Workers Only</option>
              </select>
              <input
                type="text"
                placeholder="Search by name, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>

          {/* Users Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {allUsers
              .filter(user => 
                user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email?.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map(user => {
                const isBanned = getIsBanned(user.id);
                const userReports = reports.filter(r => r.user_id === user.id || r.assigned_worker_id === user.id);
                
                return (
                  <div key={user.id} className={`bg-white dark:bg-gray-800 rounded-lg border p-4 ${isBanned ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                          user.userType === 'resident' ? 'bg-blue-600' : 
                          user.userType === 'worker' ? 'bg-green-600' : 'bg-purple-600'
                        }`}>
                          {user.full_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <h3 className="font-semibold text-base dark:text-white">
                            {user.full_name || 'Unnamed'}
                            {isBanned && (
                              <span className="ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">BANNED</span>
                            )}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                          <div className="flex gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                              user.userType === 'resident' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {user.role || user.userType}
                            </span>
                            {user.available !== undefined && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                user.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {user.available ? '🟢 Online' : '⚫ Offline'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {user.phone && (
                          <a href={`tel:${user.phone}`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                            <i className="fas fa-phone text-sm"></i>
                          </a>
                        )}
                        <a href={`mailto:${user.email}`} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">
                          <i className="fas fa-envelope text-sm"></i>
                        </a>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t dark:border-gray-700 grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <p className="text-lg font-bold text-blue-600">{userReports.length}</p>
                        <p className="text-xs text-gray-500">Reports</p>
                      </div>
                      <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <p className="text-lg font-bold text-green-600">{userReports.filter(r => r.status === 'verified').length}</p>
                        <p className="text-xs text-gray-500">Resolved</p>
                      </div>
                      <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <p className="text-lg font-bold text-yellow-600">{user.rating || 0}⭐</p>
                        <p className="text-xs text-gray-500">Rating</p>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t dark:border-gray-700">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <p><i className="fas fa-phone w-5 text-gray-400"></i> {user.phone || 'No phone'}</p>
                        <p><i className="fas fa-map-marker-alt w-5 text-gray-400"></i> {user.zone || 'No zone'}</p>
                        <p><i className="fas fa-calendar w-5 text-gray-400"></i> Joined: {new Date(user.created_at).toLocaleDateString()}</p>
                        {isBanned && (
                          <p className="col-span-2 text-red-600 text-xs">
                            <i className="fas fa-gavel mr-1"></i> Banned: {bannedUsers.find(b => b.id === user.id)?.ban_reason || 'No reason'}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t dark:border-gray-700 flex flex-wrap gap-2">
                      <Link to={`/report?user=${user.id}`}>
                        <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                          <i className="fas fa-eye mr-1"></i> Reports
                        </button>
                      </Link>
                      
                      {user.role !== 'admin' && (
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setNewRole('admin');
                            setShowUserRoleModal(true);
                          }}
                          className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                        >
                          <i className="fas fa-user-shield mr-1"></i> Make Admin
                        </button>
                      )}
                      
                      {user.role === 'admin' && user.userType !== 'admin' && (
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setNewRole(user.userType);
                            setShowUserRoleModal(true);
                          }}
                          className="px-3 py-1.5 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700"
                        >
                          <i className="fas fa-user-minus mr-1"></i> Remove Admin
                        </button>
                      )}
                      
                      <button
                        onClick={() => {
                          const warning = prompt(`Send warning to ${user.full_name}:`, 'Please follow community guidelines.');
                          if (warning) sendWarningToUser(user.id, warning);
                        }}
                        className="px-3 py-1.5 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700"
                      >
                        <i className="fas fa-exclamation-triangle mr-1"></i> Warning
                      </button>
                      
                      {isBanned ? (
                        <button
                          onClick={() => unbanUser(user.id)}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                        >
                          <i className="fas fa-check-circle mr-1"></i> Unban
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowBanModal(true);
                          }}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                        >
                          <i className="fas fa-ban mr-1"></i> Ban
                        </button>
                      )}
                      
                      <button
                        onClick={() => deleteUserAccount(user.id, user.userType, user.full_name)}
                        className="px-3 py-1.5 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700"
                      >
                        <i className="fas fa-trash-alt mr-1"></i> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
          
          {allUsers.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-8 text-center text-gray-500">
              <i className="fas fa-users fa-3x mb-3"></i>
              <p>No users found</p>
            </div>
          )}
        </div>
      )}

      {/* Workers Tab */}
      {activeTab === 'workers' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {workers.map(worker => {
            const workerReports = reports.filter(r => r.assigned_worker_id === worker.id);
            const completedReports = workerReports.filter(r => r.status === 'verified');
            const avgResponseTime = completedReports.length > 0 
              ? completedReports.reduce((sum, r) => {
                  const assigned = new Date(r.assigned_at);
                  const collected = new Date(r.collected_at);
                  return sum + (collected - assigned) / (1000 * 60 * 60);
                }, 0) / completedReports.length
              : 0;
            
            return (
              <div key={worker.id} className="bg-white dark:bg-gray-800 rounded-lg border p-3">
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
                <div className="mt-2 pt-2 border-t grid grid-cols-2 gap-1 text-xs dark:border-gray-700">
                  <p><i className="fas fa-phone w-3 text-gray-400"></i> {worker.phone || 'No phone'}</p>
                  <p><i className="fas fa-map-marker-alt w-3 text-gray-400"></i> {worker.zone || 'No zone'}</p>
                  <p><i className="fas fa-id-card w-3 text-gray-400"></i> {worker.worker_id || 'No ID'}</p>
                  <p><i className="fas fa-truck w-3 text-gray-400"></i> {worker.vehicle_type || 'No vehicle'}</p>
                  <p><i className="fas fa-star w-3 text-yellow-500"></i> {worker.rating || 0}⭐ ({worker.rating_count || 0})</p>
                  <p><i className="fas fa-briefcase w-3 text-gray-400"></i> {worker.completed_jobs || 0} jobs</p>
                </div>
                <div className="mt-2 pt-2 border-t flex gap-2 dark:border-gray-700">
                  <Link to={`/report?worker=${worker.id}`} className="flex-1 text-center text-xs text-blue-600 hover:underline">View Reports</Link>
                  <button onClick={() => deleteUserAccount(worker.id, 'worker', worker.full_name)} className="flex-1 text-xs text-red-600 hover:bg-red-50 py-1 rounded">Delete</button>
                </div>
              </div>
            );
          })}
          {workers.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-8 text-center text-gray-500 col-span-full">No workers found</div>
          )}
        </div>
      )}

      {/* Residents Tab */}
      {activeTab === 'residents' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {residents.map(resident => {
            const userReports = reports.filter(r => r.user_id === resident.id);
            return (
              <div key={resident.id} className="bg-white dark:bg-gray-800 rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {resident.full_name?.[0] || 'R'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{resident.full_name || 'Unnamed'}</h3>
                    <p className="text-xs text-gray-500 truncate">{resident.email}</p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t grid grid-cols-2 gap-1 text-xs dark:border-gray-700">
                  <p><i className="fas fa-phone w-3 text-gray-400"></i> {resident.phone || 'No phone'}</p>
                  <p><i className="fas fa-map-marker-alt w-3 text-gray-400"></i> {resident.zone || 'No zone'}</p>
                  <p><i className="fas fa-flag w-3 text-gray-400"></i> {userReports.length} reports</p>
                  <p><i className="fas fa-check-circle w-3 text-green-500"></i> {userReports.filter(r => r.status === 'verified').length} resolved</p>
                  <p><i className="fas fa-calendar w-3 text-gray-400"></i> Joined: {new Date(resident.created_at).toLocaleDateString()}</p>
                </div>
                <div className="mt-2 pt-2 border-t dark:border-gray-700">
                  <button onClick={() => deleteUserAccount(resident.id, 'resident', resident.full_name)} className="w-full text-xs text-red-600 hover:bg-red-50 py-1 rounded">Delete Resident</button>
                </div>
              </div>
            );
          })}
          {residents.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-8 text-center text-gray-500 col-span-full">No residents found</div>
          )}
        </div>
      )}

      {/* Fleet Tab */}
      {activeTab === 'fleet' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-base dark:text-white">Vehicle Fleet Management</h2>
            <button onClick={() => setShowAddVehicleModal(true)} className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm">
              <i className="fas fa-plus mr-1"></i>Add Vehicle
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {vehicles.map(vehicle => (
              <div key={vehicle.id} className="bg-white dark:bg-gray-800 rounded-lg border p-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      vehicle.type === 'Truck' ? 'bg-blue-100 dark:bg-blue-900' :
                      vehicle.type === 'Pickup' ? 'bg-green-100 dark:bg-green-900' : 'bg-purple-100 dark:bg-purple-900'
                    }`}>
                      <i className={`fas fa-truck ${
                        vehicle.type === 'Truck' ? 'text-blue-600 dark:text-blue-300' :
                        vehicle.type === 'Pickup' ? 'text-green-600 dark:text-green-300' : 'text-purple-600 dark:text-purple-300'
                      }`}></i>
                    </div>
                    <div>
                      <p className="font-semibold text-sm dark:text-white">{vehicle.registration}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{vehicle.type}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    vehicle.status === 'active' ? 'bg-green-100 text-green-700' :
                    vehicle.status === 'maintenance' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {vehicle.status || 'active'}
                  </span>
                </div>
                
                <div className="mt-2 pt-2 border-t grid grid-cols-2 gap-1 text-xs dark:border-gray-700">
                  <p><i className="fas fa-calendar w-3 text-gray-400"></i> Last Service: {vehicle.last_service || 'N/A'}</p>
                  <p><i className="fas fa-tachometer-alt w-3 text-gray-400"></i> Mileage: {vehicle.mileage?.toLocaleString() || 'N/A'} km</p>
                  <p><i className="fas fa-gas-pump w-3 text-gray-400"></i> Fuel: {vehicle.fuel_level || 'N/A'}%</p>
                  <p><i className="fas fa-user w-3 text-gray-400"></i> Driver: {vehicle.driver_name || 'Unassigned'}</p>
                </div>
                
                <div className="mt-2 pt-2 border-t flex gap-2 dark:border-gray-700">
                  <button onClick={() => deleteVehicle(vehicle.id, vehicle.registration)} className="flex-1 text-xs text-red-600 hover:bg-red-50 py-1 rounded">Remove</button>
                </div>
              </div>
            ))}
          </div>
          
          {vehicles.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-8 text-center text-gray-500">
              <i className="fas fa-truck text-4xl mb-2"></i>
              <p>No vehicles in fleet</p>
              <button onClick={() => setShowAddVehicleModal(true)} className="mt-3 text-green-600">Add your first vehicle →</button>
            </div>
          )}
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-2">
          {notifications.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 text-center text-gray-500">
              <i className="fas fa-bell-slash text-3xl mb-2"></i>
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            notifications.slice(0, 20).map(notif => (
              <div key={notif.id} className="bg-white dark:bg-gray-800 rounded-lg border p-3 cursor-pointer hover:shadow-md transition" onClick={() => {
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
                      <p className="font-semibold text-sm dark:text-white">{notif.title}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${notif.read ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-600'}`}>
                        {notif.read ? 'Read' : 'New'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(notif.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && <AdminAnalytics />}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="space-y-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border">
            <h3 className="font-semibold text-sm mb-3 dark:text-white">Admin Activity Log</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {adminLogs.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No admin actions logged yet</p>
              ) : (
                adminLogs.map(log => (
                  <div key={log.id} className="border-b pb-2 last:border-0 dark:border-gray-700">
                    <div className="flex justify-between items-start flex-wrap gap-1">
                      <p className="text-sm font-medium dark:text-white">{log.action}</p>
                      <p className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{log.details}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      {bulkMode && selectedReports.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg border-t p-4 z-50">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
            <span className="text-sm dark:text-white">{selectedReports.length} reports selected</span>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setShowBulkAssignModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Assign Selected</button>
              <button onClick={() => setShowBulkStatusModal(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Update Status</button>
              <button onClick={bulkDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Delete Selected</button>
              <button onClick={() => setBulkMode(false)} className="px-4 py-2 border rounded-lg text-sm dark:border-gray-600 dark:text-white">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Modals remain the same as your original... */}
      {/* Assign Modal, Bulk Assign Modal, Bulk Status Modal, Export Modal, Add Vehicle Modal, Broadcast Modal */}
      {/* User Role Modal */}
      {showUserRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-bold mb-4 dark:text-white">
              {selectedUser.role === 'admin' ? 'Remove Admin Privileges?' : 'Make Admin?'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {selectedUser.role === 'admin' 
                ? `Remove admin privileges from ${selectedUser.full_name}? They will become a regular ${selectedUser.userType}.`
                : `Grant admin privileges to ${selectedUser.full_name}? They will have full access to the admin dashboard.`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowUserRoleModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button 
                onClick={() => updateUserRole(selectedUser.id, selectedUser.role === 'admin' ? selectedUser.userType : 'admin')} 
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      {showBanModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-bold mb-4 dark:text-white">Ban/Suspend User</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              User: <strong>{selectedUser.full_name}</strong> ({selectedUser.email})
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-white">Ban Duration</label>
                <select
                  value={banDuration}
                  onChange={(e) => setBanDuration(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="7days">7 Days (Temporary Suspend)</option>
                  <option value="30days">30 Days (Temporary Suspend)</option>
                  <option value="permanent">Permanent Ban</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-white">Reason for Ban</label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  rows="3"
                  placeholder="Explain why this user is being banned..."
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              
              <div className="flex gap-3">
                <button onClick={() => setShowBanModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button 
                  onClick={() => banUser(selectedUser.id, banReason, banDuration)} 
                  disabled={!banReason}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
                >
                  Confirm Ban
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-3">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-bold dark:text-white">Assign Worker</h2>
              <button onClick={() => setShowAssignModal(false)} className="text-gray-400 text-lg">&times;</button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mb-3">
              <h4 className="font-semibold text-sm mb-2 dark:text-white">Report Details:</h4>
              <p className="text-xs"><strong>Address:</strong> {selectedReport.address}</p>
              <p className="text-xs"><strong>Waste Type:</strong> {selectedReport.waste_type}</p>
              {selectedReport.is_emergency && <p className="text-xs text-red-600 font-semibold mt-1">🚨 EMERGENCY - Prioritize this</p>}
            </div>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {workers.filter(w => w.available).length === 0 ? (
                <p className="text-center text-gray-500 py-2 text-xs">No available workers</p>
              ) : (
                workers.filter(w => w.available).map(worker => (
                  <button key={worker.id} onClick={() => assignWorker(selectedReport.id, worker.id)} disabled={assigning} className="w-full p-2 border rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-xs">
                    <p className="font-medium text-xs dark:text-white">{worker.full_name || 'Unnamed'}</p>
                    <p className="text-xs text-gray-500">Zone: {worker.zone} | Phone: {worker.phone || 'N/A'}</p>
                    <p className="text-xs text-gray-400">Vehicle: {worker.vehicle_type || 'N/A'} | Rating: {worker.rating || 0}⭐</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Assign Modal */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-3">
            <h2 className="text-sm font-bold mb-2 dark:text-white">Assign {selectedReports.length} Reports</h2>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {workers.filter(w => w.available).map(worker => (
                <button key={worker.id} onClick={() => bulkAssign(worker.id)} className="w-full p-2 border rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-xs">
                  <p className="font-medium text-xs dark:text-white">{worker.full_name || 'Unnamed'}</p>
                  <p className="text-xs text-gray-500">Zone: {worker.zone} | Vehicle: {worker.vehicle_type || 'N/A'}</p>
                </button>
              ))}
            </div>
            <button onClick={() => setShowBulkAssignModal(false)} className="w-full mt-2 p-2 border rounded-lg text-xs">Cancel</button>
          </div>
        </div>
      )}

      {/* Bulk Status Modal */}
      {showBulkStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-3">
            <h2 className="text-sm font-bold mb-2 dark:text-white">Update {selectedReports.length} Reports</h2>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="w-full p-2 border rounded-lg mb-3 text-sm dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="collected">Collected</option>
              <option value="ready_for_rating">Ready for Rating</option>
              <option value="verified">Verified</option>
            </select>
            <div className="flex gap-2">
              <button onClick={() => setShowBulkStatusModal(false)} className="flex-1 p-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={bulkStatusUpdate} className="flex-1 p-2 bg-green-600 text-white rounded-lg text-sm">Update</button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-4">
            <h2 className="text-lg font-bold mb-4 dark:text-white">Export Reports</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Export all reports to CSV format for analysis in Excel or other tools.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowExportModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={() => { exportToCSV(); setShowExportModal(false); }} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Export CSV</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showAddVehicleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4 dark:text-white">Add New Vehicle</h2>
            <div className="space-y-3">
              <input type="text" placeholder="Registration Number *" value={newVehicle.registration} onChange={(e) => setNewVehicle({...newVehicle, registration: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              <select value={newVehicle.type} onChange={(e) => setNewVehicle({...newVehicle, type: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <option value="Bicycle">Bicycle</option>
                <option value="Motorbike">Motorbike</option>
                <option value="Pickup">Pickup Truck</option>
                <option value="Truck">Large Truck</option>
              </select>
              <input type="text" placeholder="Driver Name" value={newVehicle.driver_name} onChange={(e) => setNewVehicle({...newVehicle, driver_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              <input type="date" placeholder="Last Service Date" value={newVehicle.last_service} onChange={(e) => setNewVehicle({...newVehicle, last_service: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              <input type="number" placeholder="Mileage (km)" value={newVehicle.mileage} onChange={(e) => setNewVehicle({...newVehicle, mileage: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              <input type="number" placeholder="Fuel Level (%)" value={newVehicle.fuel_level} onChange={(e) => setNewVehicle({...newVehicle, fuel_level: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddVehicleModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm dark:border-gray-600 dark:text-white">Cancel</button>
                <button onClick={addVehicle} className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm">Add Vehicle</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-3">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-bold dark:text-white">Send Broadcast</h2>
              <button onClick={() => setShowBroadcastModal(false)} className="text-gray-400 text-lg">&times;</button>
            </div>
            <div className="space-y-2">
              <input type="text" placeholder="Title" value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} className="w-full px-2 py-1 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              <textarea placeholder="Message" value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)} rows="2" className="w-full px-2 py-1 border rounded-lg resize-none text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              <select value={broadcastType} onChange={(e) => setBroadcastType(e.target.value)} className="w-full px-2 py-1 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
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