import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { reportService } from '../services/reportService';

const ReportDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [user, setUser] = useState(null);
  const [workerNote, setWorkerNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showCallConfirm, setShowCallConfirm] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    loadReport();
  }, [id]);

  const loadReport = async () => {
    try {
      const { data, error } = await supabase
        .from('waste_reports')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      setReport(data);
      setWorkerNote(data.worker_note || '');
      
      if (data.assigned_worker_id) {
        const { data: workerData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.assigned_worker_id)
          .single();
        setWorker(workerData);
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
    if (newStatus === 'verified') {
      setShowRatingModal(true);
      return;
    }
    
    setUpdating(true);
    try {
      if (newStatus === 'collected') {
        const result = await reportService.markAsCollected(id, user?.id, workerNote);
        if (result.success) {
          toast.success('Task marked as collected!');
          loadReport();
        } else {
          throw new Error(result.error);
        }
      }
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const submitRating = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    
    setUpdating(true);
    try {
      const result = await reportService.markAsVerified(id, rating, review);
      if (result.success) {
        toast.success(`Thank you for your ${rating}⭐ rating!`);
        setShowRatingModal(false);
        loadReport();
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      toast.error('Failed to submit rating');
    } finally {
      setUpdating(false);
    }
  };

  const updateWorkerNote = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('waste_reports')
        .update({ worker_note: workerNote, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Note saved');
    } catch (err) {
      toast.error('Failed to save note');
    } finally {
      setUpdating(false);
    }
  };

  const handleCallWorker = () => {
    if (worker?.phone) {
      window.location.href = `tel:${worker.phone}`;
    } else {
      toast.error('Worker phone number not available');
    }
    setShowCallConfirm(false);
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

  const getProgressSteps = () => {
    const steps = ['pending', 'assigned', 'collected', 'verified'];
    const currentIndex = steps.indexOf(report?.status);
    const stepLabels = { pending: 'Reported', assigned: 'Assigned', collected: 'Collected', verified: 'Verified' };
    
    return steps.map((step, index) => ({
      name: step,
      label: stepLabels[step],
      completed: index <= currentIndex,
      active: index === currentIndex
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Report not found</p>
        <button onClick={() => navigate(-1)} className="mt-3 text-green-600">Go back</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">Report #{report.id.slice(0, 8)}</h1>
            {report.is_emergency && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <i className="fas fa-exclamation-triangle mr-1"></i>Emergency
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-1">
            <i className="fas fa-calendar mr-1"></i>
            Submitted on {new Date(report.created_at).toLocaleString()}
          </p>
        </div>
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
          <i className="fas fa-arrow-left mr-1"></i> Back
        </button>
      </div>

      {/* Status Timeline */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="font-semibold mb-4">Status Timeline</h2>
        <div className="relative">
          <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-200"></div>
          <div className="relative flex justify-between">
            {getProgressSteps().map((step, idx) => (
              <div key={step.name} className="text-center flex-1">
                <div className={`relative z-10 w-10 h-10 mx-auto rounded-full flex items-center justify-center ${
                  step.completed ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  {step.completed ? <i className="fas fa-check"></i> : idx + 1}
                </div>
                <p className={`text-xs mt-2 font-medium ${step.active ? 'text-green-600' : 'text-gray-500'}`}>
                  {step.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Worker Details (if assigned) */}
      {report.status === 'assigned' && worker && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2 text-blue-800">
            <i className="fas fa-user-circle"></i>
            Assigned Worker
          </h2>
          
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {worker.full_name?.[0] || 'W'}
              </div>
              <div>
                <p className="font-semibold">{worker.full_name || 'Worker'}</p>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <i key={star} className={`fas fa-star text-xs ${
                      star <= (worker.rating || 0) ? 'text-yellow-500' : 'text-gray-300'
                    }`}></i>
                  ))}
                  <span className="text-xs text-gray-500 ml-1">
                    ({worker.rating_count || 0} reviews)
                  </span>
                </div>
              </div>
            </div>
            
            {worker.phone && (
              <button
                onClick={() => setShowCallConfirm(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
              >
                <i className="fas fa-phone"></i>
                Call Worker
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-blue-200">
            <div>
              <p className="text-xs text-gray-500">Worker ID</p>
              <p className="text-sm font-medium">{worker.worker_id || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Vehicle</p>
              <p className="text-sm font-medium capitalize">{worker.vehicle_type || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Assigned At</p>
              <p className="text-sm font-medium">{new Date(report.assigned_at).toLocaleTimeString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Report Details */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <i className="fas fa-info-circle text-green-600"></i>
          Report Information
        </h2>
        
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <span className={getStatusBadge(report.status)}>
              <i className={`fas ${getStatusIcon(report.status)} mr-1`}></i>
              {report.status.toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500">Address</p>
            <p className="font-medium">{report.address}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Waste Type</p>
            <p className="capitalize">{report.waste_type}</p>
          </div>
          {report.description && (
            <div>
              <p className="text-sm text-gray-500">Description</p>
              <p className="text-gray-700">{report.description}</p>
            </div>
          )}
          {report.photo_url && (
            <div>
              <p className="text-sm text-gray-500">Photo Evidence</p>
              <img 
                src={report.photo_url} 
                alt="Evidence" 
                className="mt-2 max-h-64 rounded-lg cursor-pointer hover:opacity-90"
                onClick={() => window.open(report.photo_url, '_blank')}
              />
            </div>
          )}
          {report.latitude && report.longitude && (
            <div>
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 text-sm hover:underline inline-flex items-center gap-1"
              >
                <i className="fas fa-map-marker-alt"></i>
                View on Google Maps
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Worker Notes Section (for workers and admins) */}
      {(user?.role === 'worker' || user?.role === 'admin') && report.status === 'assigned' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <i className="fas fa-edit text-green-600"></i>
            Worker Notes
          </h2>
          <textarea
            value={workerNote}
            onChange={(e) => setWorkerNote(e.target.value)}
            placeholder="Add notes about this job (e.g., access code, special instructions, completion notes)..."
            rows="3"
            className="w-full px-3 py-2 border rounded-lg resize-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={updateWorkerNote}
            disabled={updating}
            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            Save Note
          </button>
          {report.worker_note && (
            <div className="mt-3 p-2 bg-gray-50 rounded">
              <p className="text-xs text-gray-500">Previous note:</p>
              <p className="text-sm">{report.worker_note}</p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-end">
        {user?.role === 'worker' && report.status === 'assigned' && report.assigned_worker_id === user?.id && (
          <button
            onClick={() => updateStatus('collected')}
            disabled={updating}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            <i className="fas fa-truck mr-2"></i>
            Mark as Collected
          </button>
        )}
        
        {user?.role === 'admin' && report.status === 'collected' && (
          <button
            onClick={() => updateStatus('verified')}
            disabled={updating}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <i className="fas fa-check-double mr-2"></i>
            Verify Report
          </button>
        )}
      </div>

      {/* Rating Section - Only residents can rate, rating goes to worker */}
      {report.status === 'verified' && !report.rated && user?.role === 'resident' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-yellow-800">Rate the Worker</h3>
              <p className="text-sm text-yellow-700">How was your experience with the waste collector?</p>
            </div>
            <button
              onClick={() => setShowRatingModal(true)}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              Rate Now
            </button>
          </div>
        </div>
      )}

      {/* Call Confirmation Modal */}
      {showCallConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold mb-3">Call Worker?</h3>
            <p className="text-gray-600 mb-4">
              You are about to call {worker?.full_name} at {worker?.phone}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCallConfirm(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCallWorker}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Call Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4 text-center">Rate Your Experience</h3>
            
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="text-3xl focus:outline-none transition-transform hover:scale-110"
                >
                  <i className={`fas fa-star ${star <= rating ? 'text-yellow-500' : 'text-gray-300'}`}></i>
                </button>
              ))}
            </div>
            
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Share your experience (optional)"
              className="w-full px-3 py-2 border rounded-lg resize-none mb-4"
              rows="3"
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowRatingModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitRating}
                disabled={updating || rating === 0}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {updating ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="bg-gray-50 p-4 rounded-lg text-xs text-gray-500">
        <p><i className="fas fa-plus-circle mr-1"></i> Created: {new Date(report.created_at).toLocaleString()}</p>
        {report.assigned_at && <p className="mt-1"><i className="fas fa-user-check mr-1"></i> Assigned: {new Date(report.assigned_at).toLocaleString()}</p>}
        {report.collected_at && <p className="mt-1"><i className="fas fa-truck mr-1"></i> Collected: {new Date(report.collected_at).toLocaleString()}</p>}
        {report.verified_at && <p className="mt-1"><i className="fas fa-check-circle mr-1"></i> Verified: {new Date(report.verified_at).toLocaleString()}</p>}
        <p className="mt-1"><i className="fas fa-edit mr-1"></i> Last updated: {new Date(report.updated_at).toLocaleString()}</p>
      </div>
    </div>
  );
};

export default ReportDetails;