import { supabase } from '../lib/supabase';
import { notificationService } from './notificationService';

export const reportService = {
  createReport: async (reportData) => {
    try {
      const { data, error } = await supabase
        .from('waste_reports')
        .insert([{
          ...reportData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      // Notify admins only (not the reporter)
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .neq('id', reportData.user_id);

      for (const admin of admins || []) {
        await notificationService.createNotification({
          userId: admin.id,
          title: reportData.is_emergency ? '🚨 EMERGENCY REPORT' : 'New Waste Report',
          message: `${reportData.is_emergency ? 'EMERGENCY - ' : ''}New report at ${reportData.address}`,
          type: reportData.is_emergency ? 'error' : 'info',
          reportId: data.id
        });
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  assignWorker: async (reportId, workerId) => {
    try {
      const { data: report } = await supabase
        .from('waste_reports')
        .select('*')
        .eq('id', reportId)
        .single();

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
      await notificationService.createNotification({
        userId: workerId,
        title: 'New Task Assigned',
        message: `You have been assigned to collect waste at ${report.address}`,
        type: 'success',
        reportId: reportId
      });

      // Notify resident
      await notificationService.createNotification({
        userId: report.user_id,
        title: 'Worker Assigned',
        message: `A worker has been assigned to your report at ${report.address}`,
        type: 'success',
        reportId: reportId
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  markAsCollected: async (reportId, workerId, note = '') => {
    try {
      const { data: report } = await supabase
        .from('waste_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      const { error } = await supabase
        .from('waste_reports')
        .update({
          status: 'collected',
          collected_at: new Date().toISOString(),
          worker_note: note,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;

      await notificationService.createNotification({
        userId: report.user_id,
        title: 'Waste Collected',
        message: `The waste at ${report.address} has been collected. Please verify.`,
        type: 'success',
        reportId: reportId
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  markAsVerified: async (reportId, rating = null, review = '') => {
    try {
      const { data: report } = await supabase
        .from('waste_reports')
        .select('*, profiles!assigned_worker_id(*)')
        .eq('id', reportId)
        .single();

      const updates = {
        status: 'verified',
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (rating) {
        updates.rating = rating;
        updates.review = review;
        updates.rated = true;
        updates.rated_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('waste_reports')
        .update(updates)
        .eq('id', reportId);

      if (error) throw error;

      // Update worker's rating (not admin)
      if (rating && report.assigned_worker_id) {
        const worker = report.profiles;
        const newRatingCount = (worker.rating_count || 0) + 1;
        const newRating = ((worker.rating || 0) * (worker.rating_count || 0) + rating) / newRatingCount;
        
        await supabase
          .from('profiles')
          .update({
            rating: newRating,
            rating_count: newRatingCount,
            completed_jobs: (worker.completed_jobs || 0) + 1
          })
          .eq('id', report.assigned_worker_id);

        // Notify worker about rating
        await notificationService.createNotification({
          userId: report.assigned_worker_id,
          title: 'New Rating Received!',
          message: `You received a ${rating}⭐ rating for your work at ${report.address}`,
          type: 'success',
          reportId: reportId
        });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};