import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const ReportDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [report, setReport] = useState(null);
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [workerNote, setWorkerNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showCallConfirm, setShowCallConfirm] = useState(false);
  const [workerLocation, setWorkerLocation] = useState(null);

  useEffect(() => {
    loadReport();
  }, [id]);

  const loadReport = async () => {
    try {
      const { data, error } = await supabase.from('waste_reports').select('*').eq('id', id).single();
      if (error) throw error;
      setReport(data);
      setWorkerNote(data.worker_note || '');
      
      if (data.assigned_worker_id) {
        const { data: workerData } = await supabase.from('profiles').select('*').eq('id', data.assigned_worker_id).single();
        setWorker(workerData);
        
        // Get worker location if assigned
        const { data: location } = await supabase.from('worker_locations').select('*').eq('worker_id', data.assigned_worker_id).single();
        setWorkerLocation(location);
      }
    } catch (err) {
      console.error(err);
      toast.error('Report not found');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus) => {
    setUpdating(true);
    try {
      const updates = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === 'collected') updates.collected_at = new Date().toISOString();
      if (newStatus === 'verified') updates.verified_at = new Date().toISOString();
      
      await supabase.from('waste_reports').update(updates).eq('id', id);
      
      // Create notification
      await supabase.from('notifications').insert([{
        user_id: report.user_id,
        title: `Report ${newStatus}`,
        message: `Your report at ${report.address} has been ${newStatus}`,
        type: newStatus === 'verified' ? 'success' : 'info',
        report_id: id
      }]);
      
      toast.success(`Report marked as ${newStatus}`);
      loadReport();
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const updateWorkerNote = async () => {
    setUpdating(true);
    try {
      await supabase.from('waste_reports').update({ worker_note: workerNote, updated_at: new Date() }).eq('id', id);
      toast.success('Note saved');
    } catch (err) {
      toast.error('Failed to save note');
    } finally {
      setUpdating(false);
    }
  };

  const submitRating = async () => {
    if (rating === 0) { toast.error('Please select a rating'); return; }
    try {
      await supabase.from('waste_reports').update({ rating, review, rated: true, rated_at: new Date() }).eq('id', id);
      
      // Update worker rating
      if (worker) {
        const newRatingCount = (worker.rating_count || 0) + 1;
        const newRating = ((worker.rating || 0) * (worker.rating_count || 0) + rating) / newRatingCount;
        await supabase.from('profiles').update({ rating: newRating, rating_count: newRatingCount, completed_jobs: (worker.completed_jobs || 0) + 1 }).eq('id', worker.id);
        
        await supabase.from('notifications').insert([{
          user_id: worker.id,
          title: 'New Rating Received',
          message: `You received a ${rating}⭐ rating for job at ${report.address}`,
          type: 'success',
          report_id: id
        }]);
      }
      
      toast.success(`Thank you for your ${rating}⭐ rating!`);
      setShowRatingModal(false);
      loadReport();
    } catch (err) {
      toast.error('Failed to submit rating');
    }
  };

  const handleCallWorker = () => {
    if (worker?.phone) window.location.href = `tel:${worker.phone}`;
    else toast.error('Worker phone number not available');
    setShowCallConfirm(false);
  };

  const getStatusBadge = (status) => {
    const colors = { pending: 'bg-yellow-100 text-yellow-800', assigned: 'bg-blue-100 text-blue-800', collected: 'bg-purple-100 text-purple-800', verified: 'bg-green-100 text-green-800' };
    return `px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`;
  };

  const getProgressSteps = () => {
    const steps = ['pending', 'assigned', 'collected', 'verified'];
    const currentIndex = steps.indexOf(report?.status);
    return steps.map((step, index) => ({ name: step, label: step.charAt(0).toUpperCase() + step.slice(1), completed: index <= currentIndex, active: index === currentIndex }));
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div></div>;
  }

  if (!report) {
    return <div className="text-center py-12"><p className="text-gray-500">Report not found</p><button onClick={() => navigate(-1)} className="mt-3 text-green-600">Go back</button></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div><h1 className="text-2xl font-bold">Report #{report.id.slice(0, 8)}</h1><p className="text-gray-500 text-sm">Submitted on {new Date(report.created_at).toLocaleString()}</p></div>
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">← Back</button>
      </div>

      {/* Status Timeline */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="font-semibold mb-4">Status Timeline</h2>
        <div className="relative"><div className="absolute top-5 left-0 w-full h-0.5 bg-gray-200"></div>
          <div className="relative flex justify-between">
            {getProgressSteps().map((step, idx) => (
              <div key={step.name} className="text-center flex-1">
                <div className={`relative z-10 w-10 h-10 mx-auto rounded-full flex items-center justify-center ${step.completed ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                  {step.completed ? <i className="fas fa-check"></i> : idx + 1}
                </div>
                <p className={`text-xs mt-2 font-medium ${step.active ? 'text-green-600' : 'text-gray-500'}`}>{step.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Worker Location (if assigned) */}
      {report.status === 'assigned' && workerLocation && report.latitude && report.longitude && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2"><i className="fas fa-truck-moving"></i>Worker Location</h3>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-sm">Distance from your location:</span><span className="font-bold text-green-700">Calculating...</span></div>
            <div className="flex justify-between"><span className="text-sm">Last updated:</span><span className="text-xs text-gray-500">{new Date(workerLocation.timestamp).toLocaleTimeString()}</span></div>
            <button onClick={() => window.open(`https://maps.google.com/?q=${workerLocation.latitude},${workerLocation.longitude}`, '_blank')} className="w-full mt-2 text-sm bg-green-600 text-white px-3 py-2 rounded-lg">View on Map</button>
          </div>
        </div>
      )}

      {/* Worker Details */}
      {report.status === 'assigned' && worker && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2"><i className="fas fa-user-circle"></i>Assigned Worker</h3>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">{worker.full_name?.[0] || 'W'}</div>
              <div><p className="font-semibold">{worker.full_name || 'Worker'}</p><div className="flex items-center gap-1">{[...Array(5)].map((_, i) => <i key={i} className={`fas fa-star text-xs ${i < (worker.rating || 0) ? 'text-yellow-500' : 'text-gray-300'}`}></i>)}<span className="text-xs text-gray-500 ml-1">({worker.rating_count || 0} reviews)</span></div></div>
            </div>
            {worker.phone && <button onClick={() => setShowCallConfirm(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg"><i className="fas fa-phone mr-2"></i>Call Worker</button>}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-blue-200"><div><p className="text-xs text-gray-500">Worker ID</p><p className="text-sm font-medium">{worker.worker_id || 'N/A'}</p></div><div><p className="text-xs text-gray-500">Vehicle</p><p className="text-sm font-medium capitalize">{worker.vehicle_type || 'N/A'}</p></div></div>
        </div>
      )}

      {/* Report Details */}
      <div className="bg-white p-6 rounded-lg shadow"><h2 className="font-semibold mb-4">Report Information</h2>
        <div className="space-y-3"><div><p className="text-sm text-gray-500">Status</p><span className={getStatusBadge(report.status)}>{report.status.toUpperCase()}</span></div>
          <div><p className="text-sm text-gray-500">Address</p><p className="font-medium">{report.address}</p></div>
          <div><p className="text-sm text-gray-500">Waste Type</p><p className="capitalize">{report.waste_type}</p></div>
          {report.description && <div><p className="text-sm text-gray-500">Description</p><p>{report.description}</p></div>}
          {report.photo_url && <div><img src={report.photo_url} alt="Evidence" className="mt-2 max-h-64 rounded-lg cursor-pointer" onClick={() => window.open(report.photo_url, '_blank')} /></div>}
        </div>
      </div>

      {/* Worker Notes Section */}
      {(user?.role === 'worker' || user?.role === 'admin') && report.status === 'assigned' && (
        <div className="bg-white p-6 rounded-lg shadow"><h2 className="font-semibold mb-3">Worker Notes</h2>
          <textarea value={workerNote} onChange={(e) => setWorkerNote(e.target.value)} placeholder="Add notes about this job..." rows="3" className="w-full px-3 py-2 border rounded-lg resize-none"></textarea>
          <button onClick={updateWorkerNote} disabled={updating} className="mt-2 px-3 py-1 bg-blue-600 text-white rounded-lg text-sm">Save Note</button>
          {report.worker_note && <div className="mt-3 p-2 bg-gray-50 rounded"><p className="text-xs text-gray-500">Saved note:</p><p className="text-sm">{report.worker_note}</p></div>}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-end">
        {user?.role === 'worker' && report.status === 'assigned' && report.assigned_worker_id === user?.id && (
          <button onClick={() => updateStatus('collected')} disabled={updating} className="px-4 py-2 bg-purple-600 text-white rounded-lg"><i className="fas fa-truck mr-2"></i>Mark as Collected</button>
        )}
        {user?.role === 'admin' && report.status === 'collected' && (
          <button onClick={() => updateStatus('verified')} disabled={updating} className="px-4 py-2 bg-green-600 text-white rounded-lg"><i className="fas fa-check-double mr-2"></i>Verify Report</button>
        )}
      </div>

      {/* Rating Section */}
      {report.status === 'verified' && !report.rated && user?.role === 'resident' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex justify-between items-center"><div><h3 className="font-semibold text-yellow-800">Rate this service</h3><p className="text-sm text-yellow-700">How was your experience?</p></div><button onClick={() => setShowRatingModal(true)} className="px-4 py-2 bg-yellow-600 text-white rounded-lg">Rate Now</button></div>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl max-w-md w-full p-6"><h3 className="text-lg font-bold mb-4">Rate Your Experience</h3>
          <div className="flex justify-center gap-2 mb-4">{[...Array(5)].map((_, star) => (<button key={star} onClick={() => setRating(star + 1)} className="text-3xl"><i className={`fas fa-star ${star + 1 <= rating ? 'text-yellow-500' : 'text-gray-300'}`}></i></button>))}</div>
          <textarea value={review} onChange={(e) => setReview(e.target.value)} placeholder="Share your experience (optional)" className="w-full px-3 py-2 border rounded-lg resize-none mb-4" rows="3"></textarea>
          <div className="flex gap-3"><button onClick={() => setShowRatingModal(false)} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button><button onClick={submitRating} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg">Submit Rating</button></div>
        </div></div>
      )}

      {/* Call Modal */}
      {showCallConfirm && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl max-w-sm w-full p-6"><h3 className="text-lg font-bold mb-3">Call Worker?</h3><p className="text-gray-600 mb-4">You are about to call {worker?.full_name} at {worker?.phone}</p><div className="flex gap-3"><button onClick={() => setShowCallConfirm(false)} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button><button onClick={handleCallWorker} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg">Call Now</button></div></div></div>)}

      {/* Timestamps */}
      <div className="bg-gray-50 p-4 rounded-lg text-xs text-gray-500"><p>Created: {new Date(report.created_at).toLocaleString()}</p>{report.assigned_at && <p>Assigned: {new Date(report.assigned_at).toLocaleString()}</p>}{report.collected_at && <p>Collected: {new Date(report.collected_at).toLocaleString()}</p>}{report.verified_at && <p>Verified: {new Date(report.verified_at).toLocaleString()}</p>}<p>Last updated: {new Date(report.updated_at).toLocaleString()}</p></div>
    </div>
  );
};

export default ReportDetails;