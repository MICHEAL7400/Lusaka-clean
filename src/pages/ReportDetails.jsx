import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const ReportDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [worker, setWorker] = useState(null);
  const [resident, setResident] = useState(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    if (id) {
      loadReport();
      loadSavedAssessment();
    }
  }, [id]);

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
        const { data: workerData, error: workerError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.assigned_worker_id)
          .single();
        
        if (!workerError && workerData) {
          setWorker(workerData);
        }
      }
      
      if (data.user_id) {
        const { data: residentData, error: residentError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user_id)
          .single();
        
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

  const handleCall = (phoneNumber, personName) => {
    if (phoneNumber) {
      window.location.href = `tel:${phoneNumber}`;
    } else {
      toast.error(`${personName} phone number not available`);
    }
    setShowCallConfirm(false);
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
    <div className="max-w-3xl mx-auto space-y-6 pb-20 px-4 sm:px-0">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold">Report #{report.id.slice(0, 8)}</h1>
            {report.is_emergency && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                <i className="fas fa-exclamation-triangle mr-1"></i>Emergency
              </span>
            )}
            {report.delayed && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                <i className="fas fa-clock mr-1"></i>Delayed
              </span>
            )}
            {report.worker_no_show && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                <i className="fas fa-user-slash mr-1"></i>No-Show
              </span>
            )}
          </div>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            <i className="fas fa-calendar mr-1"></i>
            Submitted on {new Date(report.created_at).toLocaleString()}
          </p>
        </div>
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700 text-sm">
          <i className="fas fa-arrow-left mr-1"></i> Back
        </button>
      </div>

      {/* Status Timeline */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
        <h2 className="font-semibold mb-4 text-sm sm:text-base">Status Timeline</h2>
        <div className="relative">
          <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-200"></div>
          <div className="relative flex justify-between">
            {getProgressSteps().map((step, idx) => (
              <div key={step.name} className="text-center flex-1">
                <div className={`relative z-10 w-8 h-8 sm:w-10 sm:h-10 mx-auto rounded-full flex items-center justify-center ${
                  step.completed ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  {step.completed ? <i className="fas fa-check text-xs sm:text-sm"></i> : <span className="text-sm">{idx + 1}</span>}
                </div>
                <p className={`text-xs mt-2 font-medium ${step.active ? 'text-green-600' : 'text-gray-500'}`}>
                  {step.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WORKER DETAILS - Visible to RESIDENTS when worker is assigned */}
      {report.status !== 'pending' && worker && user?.role === 'resident' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2 text-blue-800 text-sm sm:text-base">
            <i className="fas fa-user-circle"></i>
            Assigned Worker Details
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {worker.full_name?.[0] || 'W'}
              </div>
              <div>
                <p className="font-semibold text-base">{worker.full_name || 'Worker'}</p>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <i key={star} className={`fas fa-star text-sm ${
                      star <= (worker.rating || 0) ? 'text-yellow-500' : 'text-gray-300'
                    }`}></i>
                  ))}
                  <span className="text-xs text-gray-500 ml-1">
                    ({worker.rating_count || 0} reviews)
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Worker ID</p>
                <p className="font-medium">{worker.worker_id || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Vehicle Type</p>
                <p className="font-medium capitalize flex items-center gap-1">
                  {worker.vehicle_type === 'Bicycle' && '🚲'}
                  {worker.vehicle_type === 'Motorbike' && '🏍️'}
                  {worker.vehicle_type === 'Pickup' && '🚛'}
                  {worker.vehicle_type === 'Truck' && '🚚'}
                  {' '}{worker.vehicle_type || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Phone Number</p>
                <p className="font-medium">{worker.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Experience</p>
                <p className="font-medium">{worker.experience || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Jobs Completed</p>
                <p className="font-medium">{worker.completed_jobs || 0}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Assigned On</p>
                <p className="font-medium">{new Date(report.assigned_at).toLocaleDateString()}</p>
              </div>
            </div>
            
            {worker.phone && (
              <button
                onClick={() => setShowCallConfirm(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm self-start"
              >
                <i className="fas fa-phone"></i>
                Call Worker
              </button>
            )}
          </div>
        </div>
      )}

      {/* RESIDENT DETAILS - Visible to WORKERS when assigned */}
      {report.status !== 'pending' && resident && user?.role === 'worker' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2 text-green-800 text-sm sm:text-base">
            <i className="fas fa-home"></i>
            Resident Details
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {resident.full_name?.[0] || 'R'}
              </div>
              <div>
                <p className="font-semibold text-base">{resident.full_name || 'Resident'}</p>
                <p className="text-xs text-gray-500">Resident</p>
              </div>
            </div>
            
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Phone Number</p>
                <p className="font-medium">{resident.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Zone</p>
                <p className="font-medium">{resident.zone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Email</p>
                <p className="font-medium text-sm truncate">{resident.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Member Since</p>
                <p className="font-medium">{new Date(resident.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            
            {resident.phone && (
              <button
                onClick={() => setShowCallConfirm(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm self-start"
              >
                <i className="fas fa-phone"></i>
                Call Resident
              </button>
            )}
          </div>
        </div>
      )}

      {/* Resident Verification Section - Before Rating */}
      {report.status === 'collected' && !report.verified_by_resident && user?.role === 'resident' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
            <i className="fas fa-check-circle"></i>
            Verify Waste Collection
          </h3>
          <p className="text-sm text-green-700 mb-3">
            Has the waste been properly collected? Please verify before rating the worker.
          </p>
          <div className="flex gap-3">
            <button
              onClick={verifyByResident}
              disabled={updating}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <i className="fas fa-check mr-2"></i>Yes, Waste Collected
            </button>
            <button
              onClick={() => setShowReportIssue(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <i className="fas fa-exclamation-triangle mr-2"></i>Report Issue
            </button>
          </div>
        </div>
      )}

      {/* Rating Section - After Resident Verification */}
      {report.status === 'ready_for_rating' && !report.rated && user?.role === 'resident' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div>
              <h3 className="font-semibold text-yellow-800 text-sm sm:text-base">Rate the Worker</h3>
              <p className="text-xs sm:text-sm text-yellow-700">How was your experience with the waste collector?</p>
            </div>
            <button
              onClick={() => setShowRatingModal(true)}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
            >
              Rate Now
            </button>
          </div>
        </div>
      )}

      {/* Waste Assessment for Workers */}
      {user?.role === 'worker' && report.status === 'assigned' && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 sm:p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2 text-purple-800 text-sm sm:text-base">
            <i className="fas fa-clipboard-list"></i>
            Waste Assessment & Vehicle Recommendation
          </h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-500">Waste Type</p>
                <p className="font-semibold text-sm capitalize">{report.waste_type}</p>
              </div>
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-500">Estimated Volume</p>
                <select 
                  value={estimatedVolume}
                  onChange={(e) => {
                    setEstimatedVolume(e.target.value);
                    setRecommendedVehicle(updateRecommendation(e.target.value));
                  }}
                  className="w-full mt-1 px-2 py-1 border rounded text-sm"
                >
                  <option value="small">Small - One bag / Small bin</option>
                  <option value="medium">Medium - Wheelie bin / Few bags</option>
                  <option value="large">Large - Truck load / Many bags</option>
                  <option value="huge">Huge - Multiple truck loads</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-2">Recommended Vehicle</p>
              <div className="flex flex-wrap gap-2">
                {['Bicycle', 'Motorbike', 'Pickup', 'Truck'].map(vehicle => (
                  <label key={vehicle} className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input 
                      type="radio" 
                      name="vehicle" 
                      value={vehicle}
                      checked={recommendedVehicle === vehicle}
                      onChange={(e) => setRecommendedVehicle(e.target.value)}
                      className="w-4 h-4" 
                    />
                    <span className="text-sm">
                      {vehicle === 'Bicycle' && '🚲'}
                      {vehicle === 'Motorbike' && '🏍️'}
                      {vehicle === 'Pickup' && '🚛'}
                      {vehicle === 'Truck' && '🚚'}
                      {' '}{vehicle}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className={`rounded-lg p-3 border ${recommendedVehicle ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <p className="text-xs mb-2 flex items-center gap-1">
                <i className="fas fa-lightbulb"></i>
                Recommendation
              </p>
              <div className="text-sm">
                {recommendedVehicle ? (
                  <span className="text-green-700">
                    ✅ Based on estimated volume, a <strong>{recommendedVehicle}</strong> is recommended for this job.
                  </span>
                ) : (
                  <span className="text-yellow-700">Select estimated volume to see recommendation</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Access Notes (Optional)</label>
              <textarea
                value={accessNotes}
                onChange={(e) => setAccessNotes(e.target.value)}
                rows="2"
                placeholder="Any access issues? Gate code? Floor number? Special instructions?"
                className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
              ></textarea>
            </div>

            <button
              onClick={saveAssessment}
              className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 text-sm font-medium"
            >
              <i className="fas fa-save mr-2"></i>
              {assessmentSaved ? 'Update Assessment' : 'Save Assessment'}
            </button>
          </div>
        </div>
      )}

      {/* Report Details */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
        <h2 className="font-semibold mb-4 flex items-center gap-2 text-sm sm:text-base">
          <i className="fas fa-info-circle text-green-600"></i>
          Report Information
        </h2>
        
        <div className="space-y-3">
          <div>
            <p className="text-xs sm:text-sm text-gray-500">Status</p>
            <span className={getStatusBadge(report.status)}>
              {getStatusText(report.status)}
            </span>
          </div>
          <div>
            <p className="text-xs sm:text-sm text-gray-500">Address</p>
            <p className="font-medium text-sm sm:text-base">{report.address}</p>
          </div>
          <div>
            <p className="text-xs sm:text-sm text-gray-500">Waste Type</p>
            <p className="capitalize text-sm">{report.waste_type}</p>
          </div>
          {report.description && (
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Description</p>
              <p className="text-gray-700 text-sm">{report.description}</p>
            </div>
          )}
          {report.latitude && report.longitude && (
            <div>
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 text-xs sm:text-sm hover:underline inline-flex items-center gap-1"
              >
                <i className="fas fa-map-marker-alt"></i>
                View on Google Maps
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Photo Evidence Section */}
      {report.photo_url && (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <h2 className="font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
            <i className="fas fa-image text-green-600"></i>
            Photo Evidence
          </h2>
          <div className="relative">
            {!imageError ? (
              <img 
                src={report.photo_url} 
                alt="Report evidence" 
                className="w-full max-h-96 object-contain rounded-lg cursor-pointer border border-gray-200"
                onClick={() => window.open(report.photo_url, '_blank')}
                onError={() => {
                  console.error('Image failed to load:', report.photo_url);
                  setImageError(true);
                }}
              />
            ) : (
              <div className="bg-gray-100 p-8 rounded-lg text-center">
                <i className="fas fa-image text-4xl text-gray-400 mb-2"></i>
                <p className="text-gray-500">Image could not be loaded</p>
                <a 
                  href={report.photo_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 text-sm hover:underline mt-2 inline-block"
                >
                  Try opening directly
                </a>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">Click image to view full size</p>
        </div>
      )}

      {/* Worker Notes Section */}
      {(user?.role === 'worker' || user?.role === 'admin') && report.status === 'assigned' && (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <h2 className="font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
            <i className="fas fa-edit text-green-600"></i>
            Worker Notes
          </h2>
          <textarea
            value={workerNote}
            onChange={(e) => setWorkerNote(e.target.value)}
            placeholder="Add notes about this job (e.g., access code, special instructions, completion notes)..."
            rows="3"
            className="w-full px-3 py-2 border rounded-lg resize-none focus:ring-2 focus:ring-green-500 text-sm"
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
            onClick={markAsCollected}
            disabled={updating}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
          >
            <i className="fas fa-truck mr-2"></i>
            Mark as Collected
          </button>
        )}
        
        {user?.role === 'admin' && report.status === 'ready_for_rating' && (
          <button
            onClick={markAsVerified}
            disabled={updating}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
          >
            <i className="fas fa-check-double mr-2"></i>
            Verify & Complete
          </button>
        )}
      </div>

      {/* Report Issue Modal */}
      {showReportIssue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-3">Report Issue with Worker</h3>
            <p className="text-sm text-gray-600 mb-3">
              Select the issue you're experiencing:
            </p>
            <div className="space-y-2 mb-4">
              <button
                onClick={() => reportWorkerIssue('delay')}
                className="w-full p-3 border rounded-lg text-left hover:bg-yellow-50 text-yellow-700"
              >
                <i className="fas fa-clock mr-2"></i> Worker is delayed / taking too long
              </button>
              <button
                onClick={() => reportWorkerIssue('no-show')}
                className="w-full p-3 border rounded-lg text-left hover:bg-red-50 text-red-600"
              >
                <i className="fas fa-user-slash mr-2"></i> Worker never showed up
              </button>
            </div>
            <button onClick={() => setShowReportIssue(false)} className="w-full px-4 py-2 border rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      {/* Call Confirmation Modal */}
      {showCallConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold mb-3">
              {user?.role === 'resident' ? 'Call Worker?' : 'Call Resident?'}
            </h3>
            <p className="text-gray-600 mb-4 text-sm">
              You are about to call {user?.role === 'resident' ? worker?.full_name : resident?.full_name} at{' '}
              {user?.role === 'resident' ? worker?.phone : resident?.phone}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCallConfirm(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCall(
                  user?.role === 'resident' ? worker?.phone : resident?.phone,
                  user?.role === 'resident' ? worker?.full_name : resident?.full_name
                )}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
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
            
            <p className="text-center text-sm text-gray-600 mb-4">
              Rating for: <strong>{worker?.full_name || 'Worker'}</strong>
            </p>
            
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="text-2xl sm:text-3xl focus:outline-none transition-transform hover:scale-110"
                >
                  <i className={`fas fa-star ${star <= rating ? 'text-yellow-500' : 'text-gray-300'}`}></i>
                </button>
              ))}
            </div>
            
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Share your experience with this worker (optional)"
              className="w-full px-3 py-2 border rounded-lg resize-none mb-4 text-sm"
              rows="3"
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowRatingModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={submitRating}
                disabled={updating || rating === 0}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
              >
                {updating ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="bg-gray-50 p-3 sm:p-4 rounded-lg text-xs text-gray-500">
        <p><i className="fas fa-plus-circle mr-1"></i> Created: {new Date(report.created_at).toLocaleString()}</p>
        {report.assigned_at && <p className="mt-1"><i className="fas fa-user-check mr-1"></i> Assigned: {new Date(report.assigned_at).toLocaleString()}</p>}
        {report.collected_at && <p className="mt-1"><i className="fas fa-truck mr-1"></i> Collected: {new Date(report.collected_at).toLocaleString()}</p>}
        {report.resident_verified_at && <p className="mt-1"><i className="fas fa-check-circle mr-1"></i> Verified by Resident: {new Date(report.resident_verified_at).toLocaleString()}</p>}
        {report.verified_at && <p className="mt-1"><i className="fas fa-check-double mr-1"></i> Completed: {new Date(report.verified_at).toLocaleString()}</p>}
        {report.rated && report.rating > 0 && <p className="mt-1"><i className="fas fa-star mr-1 text-yellow-500"></i> Rating: {report.rating}⭐</p>}
        {report.delay_reported_at && <p className="mt-1 text-yellow-600"><i className="fas fa-clock mr-1"></i> Delay Reported: {new Date(report.delay_reported_at).toLocaleString()}</p>}
        <p className="mt-1"><i className="fas fa-edit mr-1"></i> Last updated: {new Date(report.updated_at).toLocaleString()}</p>
      </div>
    </div>
  );
};

export default ReportDetails;