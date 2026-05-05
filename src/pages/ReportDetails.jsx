import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import ChatSystem from '../components/ChatSystem';
import WorkerMapTracker from '../components/WorkerMapTracker';
import ResidentLocationTracker from '../components/ResidentLocationTracker';

const ReportDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [worker, setWorker] = useState(null);
  const [resident, setResident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingWorker, setLoadingWorker] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showReportIssue, setShowReportIssue] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [user, setUser] = useState(null);
  const [workerNote, setWorkerNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showCallConfirm, setShowCallConfirm] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [estimatedVolume, setEstimatedVolume] = useState('medium');
  const [recommendedVehicle, setRecommendedVehicle] = useState('');
  const [accessNotes, setAccessNotes] = useState('');
  const [assessmentSaved, setAssessmentSaved] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [callNumber, setCallNumber] = useState('');
  const [callName, setCallName] = useState('');

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    if (id) {
      loadReport();
      loadSavedAssessment();
    }
    window.scrollTo(0, 0);
  }, [id]);

  // Check for unread messages (for both resident and worker)
  useEffect(() => {
    if (!report?.assigned_worker_id || !user?.id) return;

    const checkUnreadMessages = async () => {
      try {
        const { count, error } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('report_id', report.id)
          .eq('receiver_id', user.id)
          .eq('read', false);

        if (!error && count !== null) {
          setUnreadChatCount(count);
        }
      } catch (err) {
        console.error('Error checking unread messages:', err);
      }
    };

    checkUnreadMessages();
    const interval = setInterval(checkUnreadMessages, 3000);
    return () => clearInterval(interval);
  }, [report?.assigned_worker_id, user?.id, report?.id]);

  const loadSavedAssessment = () => {
    const saved = localStorage.getItem(`assessment_${id}`);
    if (saved) {
      const assessment = JSON.parse(saved);
      setEstimatedVolume(assessment.volume || 'medium');
      setRecommendedVehicle(assessment.vehicle || '');
      setAccessNotes(assessment.notes || '');
      setAssessmentSaved(true);
    }
  };

  const saveAssessment = () => {
    const assessment = {
      volume: estimatedVolume,
      vehicle: recommendedVehicle,
      notes: accessNotes,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(`assessment_${id}`, JSON.stringify(assessment));
    setAssessmentSaved(true);
    toast.success('Assessment saved successfully');
  };

  const updateRecommendation = (volume) => {
    switch(volume) {
      case 'small': return 'Bicycle or Motorbike';
      case 'medium': return 'Motorbike or Pickup Truck';
      case 'large': return 'Pickup Truck or Large Truck';
      case 'huge': return 'Large Truck (may need assistance)';
      default: return 'Select volume for recommendation';
    }
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('waste_reports')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error loading report:', error);
        toast.error('Report not found');
        navigate('/dashboard');
        return;
      }
      
      setReport(data);
      setWorkerNote(data.worker_note || '');
      setImageError(false);
      
      if (data.assigned_worker_id) {
        setLoadingWorker(true);
        
        const { data: workerData, error: workerError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.assigned_worker_id)
          .maybeSingle();
        
        setLoadingWorker(false);
        
        if (!workerError && workerData) {
          setWorker(workerData);
        }
      }
      
      if (data.user_id) {
        const { data: residentData, error: residentError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user_id)
          .maybeSingle();
        
        if (!residentError && residentData) {
          setResident(residentData);
        }
      }
      
    } catch (err) {
      console.error('Error in loadReport:', err);
      toast.error('Failed to load report details');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const markAsCollected = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('waste_reports')
        .update({ 
          status: 'collected', 
          collected_at: new Date().toISOString(),
          worker_note: workerNote,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      
      await supabase.from('notifications').insert([{
        user_id: report.user_id,
        title: 'Waste Collected',
        message: `The waste at ${report.address} has been collected. Please verify.`,
        type: 'success',
        report_id: id,
        action_url: `/report/${id}`
      }]);
      
      toast.success('Task marked as collected! Resident will verify.');
      loadReport();
      
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const verifyByResident = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('waste_reports')
        .update({ 
          verified_by_resident: true,
          resident_verified_at: new Date().toISOString(),
          status: 'ready_for_rating',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      
      await supabase.from('notifications').insert([{
        user_id: report.user_id,
        title: 'Verification Confirmed',
        message: 'You have confirmed the waste was collected. Please rate the worker!',
        type: 'success',
        report_id: id,
        action_url: `/report/${id}`
      }]);
      
      toast.success('Verification confirmed! You can now rate the worker.');
      loadReport();
      
    } catch (err) {
      console.error(err);
      toast.error('Failed to verify');
    } finally {
      setUpdating(false);
    }
  };

  const markAsVerified = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('waste_reports')
        .update({ 
          status: 'verified', 
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      
      await supabase.from('notifications').insert([{
        user_id: report.user_id,
        title: 'Report Verified',
        message: `Your report at ${report.address} has been verified.`,
        type: 'success',
        report_id: id,
        action_url: `/report/${id}`
      }]);
      
      toast.success('Report verified!');
      loadReport();
      
    } catch (err) {
      console.error(err);
      toast.error('Failed to verify report');
    } finally {
      setUpdating(false);
    }
  };

  const reportWorkerIssue = async (issueType) => {
    setUpdating(true);
    try {
      const updates = {
        updated_at: new Date().toISOString()
      };
      
      if (issueType === 'delay') {
        updates.delayed = true;
        updates.delay_reported_at = new Date().toISOString();
        updates.delay_reason = 'Worker delayed';
      } else {
        updates.worker_no_show = true;
        updates.no_show_reported_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('waste_reports')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
      for (const admin of admins || []) {
        await supabase.from('notifications').insert([{
          user_id: admin.id,
          title: issueType === 'delay' ? '⚠️ Worker Delay Reported' : '🚨 Worker No-Show Reported',
          message: `${issueType === 'delay' ? 'Worker delayed' : 'Worker never showed up'} for report at ${report.address}`,
          type: 'warning',
          report_id: id,
          action_url: `/report/${id}`
        }]);
      }
      
      toast.success(issueType === 'delay' ? 'Delay reported to admin.' : 'No-show reported. Admin will reassign.');
      setShowReportIssue(false);
      loadReport();
      
    } catch (err) {
      console.error(err);
      toast.error('Failed to report issue');
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
      const { error } = await supabase
        .from('waste_reports')
        .update({ 
          rating: rating, 
          review: review, 
          rated: true, 
          rated_at: new Date().toISOString(),
          status: 'verified',
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      
      if (worker) {
        const newRatingCount = (worker.rating_count || 0) + 1;
        const newRating = ((worker.rating || 0) * (worker.rating_count || 0) + rating) / newRatingCount;
        
        await supabase
          .from('profiles')
          .update({ 
            rating: newRating, 
            rating_count: newRatingCount, 
            completed_jobs: (worker.completed_jobs || 0) + 1 
          })
          .eq('id', worker.id);
        
        await supabase.from('notifications').insert([{
          user_id: worker.id,
          title: 'New Rating Received!',
          message: `You received a ${rating}⭐ rating for your work at ${report.address}`,
          type: 'success',
          report_id: id,
          action_url: `/report/${id}`
        }]);
      }
      
      toast.success(`Thank you for your ${rating}⭐ rating!`);
      setShowRatingModal(false);
      loadReport();
      
    } catch (err) {
      console.error(err);
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

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-orange-500 text-white',
      assigned: 'bg-blue-500 text-white',
      collected: 'bg-purple-500 text-white',
      ready_for_rating: 'bg-yellow-500 text-white',
      verified: 'bg-green-600 text-white'
    };
    return `px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-500 text-white'}`;
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'pending': return 'Pending';
      case 'assigned': return 'Assigned';
      case 'collected': return 'Collected - Awaiting Verification';
      case 'ready_for_rating': return 'Ready for Rating';
      case 'verified': return 'Verified & Completed';
      default: return status;
    }
  };

  const getProgressSteps = () => {
    const steps = ['pending', 'assigned', 'collected', 'ready_for_rating', 'verified'];
    const currentIndex = steps.indexOf(report?.status);
    const stepLabels = { 
      pending: 'Reported', 
      assigned: 'Assigned', 
      collected: 'Collected', 
      ready_for_rating: 'Verify', 
      verified: 'Completed' 
    };
    
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
        <i className="fas fa-search text-4xl text-gray-400 mb-3"></i>
        <p className="text-gray-500">Report not found</p>
        <button onClick={() => navigate('/dashboard')} className="mt-3 text-green-600 hover:underline">
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6 pb-20 px-3 sm:px-4 md:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3">
        <div className="w-full sm:w-auto">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold break-all">Report #{report.id.slice(0, 8)}</h1>
            {report.is_emergency && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 whitespace-nowrap">
                <i className="fas fa-exclamation-triangle mr-1"></i>Emergency
              </span>
            )}
          </div>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            <i className="fas fa-calendar mr-1"></i>
            Submitted on {new Date(report.created_at).toLocaleString()}
          </p>
        </div>
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700 text-sm self-start sm:self-auto">
          <i className="fas fa-arrow-left mr-1"></i> Back
        </button>
      </div>

      {/* Status Timeline - Responsive */}
      <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow overflow-x-auto">
        <h2 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Status Timeline</h2>
        <div className="relative min-w-[500px] sm:min-w-0">
          <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-200"></div>
          <div className="relative flex justify-between">
            {getProgressSteps().map((step, idx) => (
              <div key={step.name} className="text-center flex-1">
                <div className={`relative z-10 w-8 h-8 sm:w-10 sm:h-10 mx-auto rounded-full flex items-center justify-center ${
                  step.completed ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  {step.completed ? <i className="fas fa-check text-xs sm:text-sm"></i> : <span className="text-xs sm:text-sm">{idx + 1}</span>}
                </div>
                <p className={`text-xs mt-2 font-medium whitespace-nowrap ${step.active ? 'text-green-600' : 'text-gray-500'}`}>
                  {step.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WORKER DETAILS - Visible to RESIDENTS */}
      {report.assigned_worker_id && user?.role === 'resident' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 md:p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="font-semibold flex items-center gap-2 text-blue-800 text-sm sm:text-base">
              <i className="fas fa-user-circle"></i>
              Assigned Worker Details
            </h2>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              {worker?.phone && (
                <button
                  onClick={() => {
                    setCallNumber(worker.phone);
                    setCallName(worker.full_name);
                    setShowCallConfirm(true);
                  }}
                  className="flex-1 sm:flex-none px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm hover:bg-blue-700 flex items-center justify-center gap-1 sm:gap-2"
                >
                  <i className="fas fa-phone text-xs sm:text-sm"></i>
                  <span>Call</span>
                </button>
              )}
              <button
                onClick={() => setShowChatModal(true)}
                className="flex-1 sm:flex-none px-3 py-1.5 sm:px-4 sm:py-2 bg-green-600 text-white rounded-lg text-xs sm:text-sm hover:bg-green-700 flex items-center justify-center gap-1 sm:gap-2 relative"
              >
                <i className="fas fa-comment text-xs sm:text-sm"></i>
                <span>Chat</span>
                {unreadChatCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-4 px-1 flex items-center justify-center">
                    {unreadChatCount > 99 ? '99+' : unreadChatCount}
                  </span>
                )}
              </button>
            </div>
          </div>
          
          {loadingWorker ? (
            <div className="text-center py-4 text-blue-600">
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Loading worker details...
            </div>
          ) : worker ? (
            <div className="flex flex-col md:flex-row gap-3 sm:gap-4 mt-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg">
                  {worker.full_name?.[0] || 'W'}
                </div>
                <div>
                  <p className="font-semibold text-sm sm:text-base">{worker.full_name || 'Worker'}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <i key={star} className={`fas fa-star text-xs sm:text-sm ${
                        star <= (worker.rating || 0) ? 'text-yellow-500' : 'text-gray-300'
                      }`}></i>
                    ))}
                    <span className="text-xs text-gray-500 ml-1">
                      ({worker.rating_count || 0})
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                <div><p className="text-gray-500 text-xs">Worker ID</p><p className="font-medium break-all">{worker.worker_id || 'N/A'}</p></div>
                <div><p className="text-gray-500 text-xs">Vehicle</p><p className="font-medium capitalize">{worker.vehicle_type || 'N/A'}</p></div>
                <div><p className="text-gray-500 text-xs">Phone</p><p className="font-medium">{worker.phone || 'N/A'}</p></div>
                <div><p className="text-gray-500 text-xs">Jobs</p><p className="font-medium">{worker.completed_jobs || 0}</p></div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-yellow-700 bg-yellow-100 rounded-lg text-sm">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              Worker details temporarily unavailable
            </div>
          )}
        </div>
      )}

      {/* WORKER LOCATION TRACKER - Residents see worker's live location */}
      {report.assigned_worker_id && user?.role === 'resident' && worker && (
        <WorkerMapTracker 
          workerId={report.assigned_worker_id}
          reportLocation={{ lat: report.latitude, lng: report.longitude }}
          worker={worker}
          onOpenChat={() => setShowChatModal(true)}
        />
      )}

      {/* RESIDENT DETAILS - Visible to WORKERS */}
      {report.user_id && user?.role === 'worker' && resident && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 md:p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="font-semibold flex items-center gap-2 text-green-800 text-sm sm:text-base">
              <i className="fas fa-home"></i>
              Resident Details
            </h2>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              {resident.phone && (
                <button
                  onClick={() => {
                    setCallNumber(resident.phone);
                    setCallName(resident.full_name);
                    setShowCallConfirm(true);
                  }}
                  className="flex-1 sm:flex-none px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm hover:bg-blue-700 flex items-center justify-center gap-1 sm:gap-2"
                >
                  <i className="fas fa-phone text-xs sm:text-sm"></i>
                  <span>Call</span>
                </button>
              )}
              <button
                onClick={() => setShowChatModal(true)}
                className="flex-1 sm:flex-none px-3 py-1.5 sm:px-4 sm:py-2 bg-green-600 text-white rounded-lg text-xs sm:text-sm hover:bg-green-700 flex items-center justify-center gap-1 sm:gap-2 relative"
              >
                <i className="fas fa-comment text-xs sm:text-sm"></i>
                <span>Chat</span>
                {unreadChatCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-4 px-1 flex items-center justify-center">
                    {unreadChatCount > 99 ? '99+' : unreadChatCount}
                  </span>
                )}
              </button>
            </div>
          </div>
          
          {resident ? (
            <div className="flex flex-col md:flex-row gap-3 sm:gap-4 mt-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg">
                  {resident.full_name?.[0] || 'R'}
                </div>
                <div>
                  <p className="font-semibold text-sm sm:text-base">{resident.full_name || 'Resident'}</p>
                  <p className="text-xs text-gray-500">Resident</p>
                </div>
              </div>
              
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                <div><p className="text-gray-500 text-xs">Phone</p><p className="font-medium">{resident.phone || 'N/A'}</p></div>
                <div><p className="text-gray-500 text-xs">Zone</p><p className="font-medium">{resident.zone || 'N/A'}</p></div>
                <div className="sm:col-span-2"><p className="text-gray-500 text-xs">Email</p><p className="font-medium text-sm break-all">{resident.email || 'N/A'}</p></div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-sm">Loading resident details...</div>
          )}
        </div>
      )}

      {/* RESIDENT LOCATION TRACKER - Workers see resident's location */}
      {report.user_id && user?.role === 'worker' && report.latitude && report.longitude && (
        <ResidentLocationTracker 
          residentId={report.user_id}
          reportLocation={{ lat: report.latitude, lng: report.longitude }}
        />
      )}

      {/* Resident Verification Section */}
      {report.status === 'collected' && !report.verified_by_resident && user?.role === 'resident' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
          <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2 text-sm sm:text-base">
            <i className="fas fa-check-circle"></i>
            Verify Waste Collection
          </h3>
          <p className="text-xs sm:text-sm text-green-700 mb-3">
            Has the waste been properly collected? Please verify before rating the worker.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={verifyByResident} disabled={updating} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
              <i className="fas fa-check mr-2"></i>Yes, Waste Collected
            </button>
            <button onClick={() => setShowReportIssue(true)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
              <i className="fas fa-exclamation-triangle mr-2"></i>Report Issue
            </button>
          </div>
        </div>
      )}

      {/* Rating Section */}
      {report.status === 'ready_for_rating' && !report.rated && user?.role === 'resident' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-semibold text-yellow-800 text-sm sm:text-base">Rate the Worker</h3>
              <p className="text-xs sm:text-sm text-yellow-700">How was your experience?</p>
            </div>
            <button onClick={() => setShowRatingModal(true)} className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm w-full sm:w-auto">
              Rate Now
            </button>
          </div>
        </div>
      )}

      {/* Waste Assessment for Workers */}
      {user?.role === 'worker' && report.status === 'assigned' && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 sm:p-4 md:p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2 text-purple-800 text-sm sm:text-base">
            <i className="fas fa-clipboard-list"></i>
            Waste Assessment
          </h2>
          
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-2 sm:p-3">
                <p className="text-xs text-gray-500">Waste Type</p>
                <p className="font-semibold text-sm capitalize">{report.waste_type}</p>
              </div>
              <div className="bg-white rounded-lg p-2 sm:p-3">
                <p className="text-xs text-gray-500">Estimated Volume</p>
                <select 
                  value={estimatedVolume}
                  onChange={(e) => {
                    setEstimatedVolume(e.target.value);
                    setRecommendedVehicle(updateRecommendation(e.target.value));
                  }}
                  className="w-full mt-1 px-2 py-1 border rounded text-sm"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="huge">Huge</option>
                </select>
              </div>
            </div>

            <button onClick={saveAssessment} className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 text-sm font-medium">
              <i className="fas fa-save mr-2"></i>
              {assessmentSaved ? 'Update' : 'Save'} Assessment
            </button>
          </div>
        </div>
      )}

      {/* Report Information */}
      <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow">
        <h2 className="font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
          <i className="fas fa-info-circle text-green-600"></i>
          Report Information
        </h2>
        
        <div className="space-y-2 sm:space-y-3">
          <div className="flex flex-wrap justify-between items-center">
            <p className="text-xs text-gray-500">Status</p>
            <span className={getStatusBadge(report.status)}>{getStatusText(report.status)}</span>
          </div>
          <div>
            <p className="text-xs text-gray-500">Address</p>
            <p className="font-medium text-sm break-words">{report.address}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Waste Type</p>
            <p className="capitalize text-sm">{report.waste_type}</p>
          </div>
          {report.description && (
            <div>
              <p className="text-xs text-gray-500">Description</p>
              <p className="text-gray-700 text-sm">{report.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Photo Evidence Section */}
      {report.photo_url && (
        <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow">
          <h2 className="font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
            <i className="fas fa-image text-green-600"></i>
            Photo Evidence
          </h2>
          {!imageError ? (
            <img 
              src={report.photo_url} 
              alt="Report evidence" 
              className="w-full max-h-64 sm:max-h-96 object-contain rounded-lg cursor-pointer border border-gray-200" 
              onClick={() => window.open(report.photo_url, '_blank')} 
              onError={() => setImageError(true)} 
            />
          ) : (
            <div className="bg-gray-100 p-6 sm:p-8 rounded-lg text-center">
              <i className="fas fa-image text-3xl sm:text-4xl text-gray-400 mb-2"></i>
              <p className="text-gray-500 text-sm">Image could not be loaded</p>
            </div>
          )}
        </div>
      )}

      {/* Worker Notes Section */}
      {(user?.role === 'worker' || user?.role === 'admin') && report.status === 'assigned' && (
        <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow">
          <h2 className="font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
            <i className="fas fa-edit text-green-600"></i>
            Worker Notes
          </h2>
          <textarea 
            value={workerNote} 
            onChange={(e) => setWorkerNote(e.target.value)} 
            placeholder="Add notes about this job..." 
            rows={3} 
            className="w-full px-3 py-2 border rounded-lg resize-none focus:ring-2 focus:ring-green-500 text-sm" 
          />
          <button 
            onClick={updateWorkerNote} 
            disabled={updating} 
            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            Save Note
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-end">
        {user?.role === 'worker' && report.status === 'assigned' && report.assigned_worker_id === user?.id && (
          <button onClick={markAsCollected} disabled={updating} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm w-full sm:w-auto">
            <i className="fas fa-truck mr-2"></i> Mark as Collected
          </button>
        )}
        {user?.role === 'admin' && report.status === 'ready_for_rating' && (
          <button onClick={markAsVerified} disabled={updating} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm w-full sm:w-auto">
            <i className="fas fa-check-double mr-2"></i> Verify & Complete
          </button>
        )}
      </div>

      {/* CHAT MODAL - Responsive */}
      {showChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl w-full max-w-[95%] sm:max-w-lg md:max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-3 sm:p-4 border-b">
              <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                <i className="fas fa-comments text-green-600"></i>
                Chat with {user?.role === 'resident' ? (worker?.full_name || 'Worker') : (resident?.full_name || 'Resident')}
              </h3>
              <button onClick={() => setShowChatModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-2 sm:p-4">
              <ChatSystem 
                reportId={report.id}
                currentUserId={user.id}
                otherUserId={user?.role === 'resident' ? report.assigned_worker_id : report.user_id}
                currentUserName={user.full_name || (user?.role === 'resident' ? 'Resident' : 'Worker')}
                otherUserName={user?.role === 'resident' ? worker?.full_name : resident?.full_name}
                currentUserRole={user?.role}
              />
            </div>
          </div>
        </div>
      )}

      {/* Call Confirmation Modal - Responsive */}
      {showCallConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-[90%] sm:max-w-sm w-full p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold mb-3">Call {callName}?</h3>
            <p className="text-gray-600 mb-4 text-sm">You are about to call {callName} at {callNumber}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => setShowCallConfirm(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
              <button onClick={() => { window.location.href = `tel:${callNumber}`; setShowCallConfirm(false); }} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">Call Now</button>
            </div>
          </div>
        </div>
      )}

      {/* Report Issue Modal - Responsive */}
      {showReportIssue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-[90%] sm:max-w-md w-full p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold mb-3">Report Issue with Worker</h3>
            <div className="space-y-2 mb-4">
              <button onClick={() => reportWorkerIssue('delay')} className="w-full p-3 border rounded-lg text-left hover:bg-yellow-50 text-yellow-700 text-sm">
                <i className="fas fa-clock mr-2"></i> Worker is delayed
              </button>
              <button onClick={() => reportWorkerIssue('no-show')} className="w-full p-3 border rounded-lg text-left hover:bg-red-50 text-red-600 text-sm">
                <i className="fas fa-user-slash mr-2"></i> Worker never showed up
              </button>
            </div>
            <button onClick={() => setShowReportIssue(false)} className="w-full px-4 py-2 border rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Rating Modal - Responsive */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-[90%] sm:max-w-md w-full p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold mb-4 text-center">Rate Your Experience</h3>
            <div className="flex justify-center gap-2 sm:gap-3 mb-4">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => setRating(star)} className="text-2xl sm:text-3xl focus:outline-none">
                  <i className={`fas fa-star ${star <= rating ? 'text-yellow-500' : 'text-gray-300'}`}></i>
                </button>
              ))}
            </div>
            <textarea 
              value={review} 
              onChange={(e) => setReview(e.target.value)} 
              placeholder="Share your experience..." 
              className="w-full px-3 py-2 border rounded-lg resize-none mb-4 text-sm" 
              rows={3} 
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => setShowRatingModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
              <button onClick={submitRating} disabled={updating || rating === 0} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm">
                {updating ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-500 space-y-1">
        <p><i className="fas fa-plus-circle mr-1"></i> Created: {new Date(report.created_at).toLocaleString()}</p>
        {report.assigned_at && <p><i className="fas fa-user-check mr-1"></i> Assigned: {new Date(report.assigned_at).toLocaleString()}</p>}
        {report.collected_at && <p><i className="fas fa-truck mr-1"></i> Collected: {new Date(report.collected_at).toLocaleString()}</p>}
        {report.verified_at && <p><i className="fas fa-check-double mr-1"></i> Completed: {new Date(report.verified_at).toLocaleString()}</p>}
        {report.rating > 0 && <p><i className="fas fa-star mr-1 text-yellow-500"></i> Rating: {report.rating}⭐</p>}
      </div>
    </div>
  );
};

export default ReportDetails;