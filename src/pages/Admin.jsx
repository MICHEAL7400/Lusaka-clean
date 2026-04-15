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

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const [reportsRes, workersRes, residentsRes, notifRes] = await Promise.all([
        supabase.from('waste_reports').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('role', 'worker'),
        supabase.from('profiles').select('*').eq('role', 'resident'),
        supabase.from('notifications').select('*').order('created_at', { ascending: false })
      ]);
      
      setReports(reportsRes.data || []);
      setWorkers(workersRes.data || []);
      setResidents(residentsRes.data || []);
      setNotifications(notifRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const updateReportStatus = async (reportId, status) => {
    try {
      await supabase.from('waste_reports').update({ status, updated_at: new Date() }).eq('id', reportId);
      toast.success(`Report marked as ${status}`);
      loadAllData();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const assignWorker = async (reportId, workerId) => {
    setAssigning(true);
    try {
      await supabase.from('waste_reports').update({ assigned_worker_id: workerId, status: 'assigned', assigned_at: new Date() }).eq('id', reportId);
      
      // Get report details for notification
      const report = reports.find(r => r.id === reportId);
      const worker = workers.find(w => w.id === workerId);
      const resident = residents.find(r => r.id === report?.user_id);
      
      // Notify worker
      await supabase.from('notifications').insert([{
        user_id: workerId,
        title: 'New Task Assigned',
        message: `You have been assigned to collect waste at ${report?.address}`,
        type: 'success',
        report_id: reportId
      }]);
      
      // Notify resident
      if (resident) {
        await supabase.from('notifications').insert([{
          user_id: resident.id,
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
      toast.error('Failed to assign worker');
    } finally {
      setAssigning(false);
    }
  };

  const sendNotificationToAll = async (title, message, type = 'info') => {
    const allUsers = [...workers, ...residents];
    for (const user of allUsers) {
      await supabase.from('notifications').insert([{
        user_id: user.id,
        title,
        message,
        type
      }]);
    }
    toast.success(`Notification sent to ${allUsers.length} users`);
    loadAllData();
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

  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'pending').length,
    assigned: reports.filter(r => r.status === 'assigned').length,
    collected: reports.filter(r => r.status === 'collected').length,
    verified: reports.filter(r => r.status === 'verified').length
  };

  const filteredReports = reports.filter(r =>
    r.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-500">Manage reports, workers, residents, and notifications</p>
        </div>
        <button onClick={loadAllData} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          <i className="fas fa-sync-alt mr-2"></i> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow text-center"><p className="text-gray-500">Total Reports</p><p className="text-2xl font-bold">{stats.total}</p></div>
        <div className="bg-yellow-50 p-4 rounded-lg text-center"><p className="text-yellow-600">Pending</p><p className="text-2xl font-bold text-yellow-600">{stats.pending}</p></div>
        <div className="bg-blue-50 p-4 rounded-lg text-center"><p className="text-blue-600">Assigned</p><p className="text-2xl font-bold text-blue-600">{stats.assigned}</p></div>
        <div className="bg-purple-50 p-4 rounded-lg text-center"><p className="text-purple-600">Collected</p><p className="text-2xl font-bold text-purple-600">{stats.collected}</p></div>
        <div className="bg-green-50 p-4 rounded-lg text-center"><p className="text-green-600">Verified</p><p className="text-2xl font-bold text-green-600">{stats.verified}</p></div>
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-4 overflow-x-auto">
        <button onClick={() => setActiveTab('reports')} className={`px-4 py-2 font-medium ${activeTab === 'reports' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>Reports ({reports.length})</button>
        <button onClick={() => setActiveTab('workers')} className={`px-4 py-2 font-medium ${activeTab === 'workers' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>Workers ({workers.length})</button>
        <button onClick={() => setActiveTab('residents')} className={`px-4 py-2 font-medium ${activeTab === 'residents' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>Residents ({residents.length})</button>
        <button onClick={() => setActiveTab('notifications')} className={`px-4 py-2 font-medium ${activeTab === 'notifications' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>Notifications ({notifications.length})</button>
        <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 font-medium ${activeTab === 'analytics' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}>Analytics</button>
      </div>

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <input type="text" placeholder="Search reports..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
          {filteredReports.map(report => (
            <div key={report.id} className="bg-white rounded-lg shadow border p-4">
              <div className="flex justify-between items-start flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500">#{report.id.slice(0, 8)}</span>
                    <span className={getStatusBadge(report.status)}>{report.status}</span>
                    {report.is_emergency && <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">Emergency</span>}
                  </div>
                  <p className="font-medium">{report.address}</p>
                  <p className="text-sm text-gray-500 mt-1 capitalize">{report.waste_type}</p>
                  <p className="text-xs text-gray-400 mt-2">{new Date(report.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  {report.status === 'pending' && (
                    <button onClick={() => { setSelectedReport(report); setShowAssignModal(true); }} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Assign</button>
                  )}
                  {report.status === 'assigned' && (
                    <button onClick={() => updateReportStatus(report.id, 'collected')} className="px-3 py-1 bg-purple-600 text-white rounded text-sm">Mark Collected</button>
                  )}
                  {report.status === 'collected' && (
                    <button onClick={() => updateReportStatus(report.id, 'verified')} className="px-3 py-1 bg-green-600 text-white rounded text-sm">Verify</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Workers Tab */}
      {activeTab === 'workers' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {workers.map(worker => (
            <div key={worker.id} className="bg-white rounded-lg shadow border p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg">{worker.full_name?.[0] || 'W'}</div>
                <div>
                  <h3 className="font-semibold">{worker.full_name || 'Unnamed'}</h3>
                  <p className="text-xs text-gray-500">{worker.email}</p>
                  <p className="text-xs text-gray-500">Zone: {worker.zone}</p>
                  <p className="text-xs text-gray-500">Phone: {worker.phone || 'N/A'}</p>
                  <p className={`text-xs ${worker.available ? 'text-green-600' : 'text-gray-400'}`}>{worker.available ? '● Online' : '○ Offline'}</p>
                  <p className="text-xs text-yellow-600">Rating: {worker.rating || 0}⭐ ({worker.rating_count || 0} reviews)</p>
                  <p className="text-xs text-blue-600">Jobs: {worker.completed_jobs || 0} completed</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Residents Tab */}
      {activeTab === 'residents' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {residents.map(resident => {
            const userReports = reports.filter(r => r.user_id === resident.id);
            return (
              <div key={resident.id} className="bg-white rounded-lg shadow border p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">{resident.full_name?.[0] || 'R'}</div>
                  <div>
                    <h3 className="font-semibold">{resident.full_name || 'Unnamed'}</h3>
                    <p className="text-xs text-gray-500">{resident.email}</p>
                    <p className="text-xs text-gray-500">Zone: {resident.zone}</p>
                    <p className="text-xs text-gray-500">Phone: {resident.phone || 'N/A'}</p>
                    <p className="text-xs text-purple-600">Reports: {userReports.length} total</p>
                    <p className="text-xs text-green-600">Resolved: {userReports.filter(r => r.status === 'verified').length}</p>
                    <p className="text-xs text-yellow-600">Member since: {new Date(resident.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow border p-4">
            <h3 className="font-semibold mb-3">Send Broadcast Notification</h3>
            <div className="flex gap-3">
              <input type="text" id="broadcastTitle" placeholder="Title" className="flex-1 px-3 py-2 border rounded-lg" />
              <input type="text" id="broadcastMessage" placeholder="Message" className="flex-2 px-3 py-2 border rounded-lg" />
              <button onClick={() => {
                const title = document.getElementById('broadcastTitle').value;
                const message = document.getElementById('broadcastMessage').value;
                if (title && message) sendNotificationToAll(title, message);
                else toast.error('Enter both title and message');
              }} className="px-4 py-2 bg-green-600 text-white rounded-lg">Send to All</button>
            </div>
          </div>
          
          {notifications.map(notif => (
            <div key={notif.id} className="bg-white rounded-lg shadow border p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{notif.title}</p>
                  <p className="text-sm text-gray-600">{notif.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(notif.created_at).toLocaleString()}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${notif.read ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-600'}`}>{notif.read ? 'Read' : 'Unread'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-3">Reports by Status</h3>
              <div className="space-y-2">
                <div className="flex justify-between"><span>Pending</span><span className="font-bold text-yellow-600">{stats.pending}</span></div>
                <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${(stats.pending / stats.total) * 100 || 0}%` }}></div></div>
                <div className="flex justify-between mt-2"><span>Assigned</span><span className="font-bold text-blue-600">{stats.assigned}</span></div>
                <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(stats.assigned / stats.total) * 100 || 0}%` }}></div></div>
                <div className="flex justify-between mt-2"><span>Collected</span><span className="font-bold text-purple-600">{stats.collected}</span></div>
                <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-purple-500 h-2 rounded-full" style={{ width: `${(stats.collected / stats.total) * 100 || 0}%` }}></div></div>
                <div className="flex justify-between mt-2"><span>Verified</span><span className="font-bold text-green-600">{stats.verified}</span></div>
                <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: `${(stats.verified / stats.total) * 100 || 0}%` }}></div></div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-3">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded"><p className="text-2xl font-bold text-blue-600">{workers.length}</p><p className="text-sm">Active Workers</p></div>
                <div className="text-center p-3 bg-green-50 rounded"><p className="text-2xl font-bold text-green-600">{residents.length}</p><p className="text-sm">Total Residents</p></div>
                <div className="text-center p-3 bg-purple-50 rounded"><p className="text-2xl font-bold text-purple-600">{reports.filter(r => r.rating > 0).length}</p><p className="text-sm">Rated Reports</p></div>
                <div className="text-center p-3 bg-yellow-50 rounded"><p className="text-2xl font-bold text-yellow-600">{notifications.length}</p><p className="text-sm">Total Notifications</p></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">Assign Worker</h2><button onClick={() => setShowAssignModal(false)} className="text-gray-400">✕</button></div>
            <p className="mb-4">Assign to: <strong>{selectedReport.address}</strong></p>
            {workers.filter(w => w.available).length === 0 ? (<p className="text-center text-gray-500 py-4">No available workers</p>) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {workers.filter(w => w.available).map(worker => (
                  <button key={worker.id} onClick={() => assignWorker(selectedReport.id, worker.id)} disabled={assigning} className="w-full p-3 border rounded-lg text-left hover:bg-gray-50">
                    <p className="font-medium">{worker.full_name || 'Unnamed'}</p>
                    <p className="text-xs text-gray-500">Zone: {worker.zone} | Phone: {worker.phone || 'N/A'}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;