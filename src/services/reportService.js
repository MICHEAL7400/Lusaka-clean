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

      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin');

      for (const admin of admins || []) {
        await notificationService.createNotification({
          userId: admin.id,
          title: 'New Waste Report',
          message: `New ${reportData.is_emergency ? 'EMERGENCY ' : ''}report at ${reportData.address}`,
          type: reportData.is_emergency ? 'error' : 'info',
          reportId: data.id,
          actionUrl: `/admin`
        });
      }

      const { data: workers } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'worker')
        .eq('zone', reportData.zone)
        .eq('available', true);

      for (const worker of workers || []) {
        await notificationService.createNotification({
          userId: worker.id,
          title: 'New Job Available',
          message: `${reportData.is_emergency ? 'EMERGENCY - ' : ''}New waste report in ${reportData.zone}`,
          type: reportData.is_emergency ? 'error' : 'success',
          reportId: data.id,
          actionUrl: `/worker`
        });
      }

      return { success: true, data };
    } catch (error) {
      console.error('Failed to create report:', error);
      return { success: false, error: error.message };
    }
  },

  assignWorker: async (reportId, workerId, adminId) => {
    try {
      const { data: report } = await supabase
        .from('waste_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (!report) throw new Error('Report not found');

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

      await notificationService.createNotification({
        userId: workerId,
        title: 'New Task Assigned',
        message: `You have been assigned to collect waste at ${report.address}`,
        type: 'success',
        reportId: reportId,
        actionUrl: `/report/${reportId}`
      });

      await notificationService.createNotification({
        userId: report.user_id,
        title: 'Worker Assigned',
        message: `A worker has been assigned to your report at ${report.address}. You can now track their location.`,
        type: 'success',
        reportId: reportId,
        actionUrl: `/report/${reportId}`
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to assign worker:', error);
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

      if (!report) throw new Error('Report not found');

      const { error } = await supabase
        .from('waste_reports')
        .update({
          status: 'collected',
          collected_at: new Date().toISOString(),
          worker_note: note,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId)
        .eq('assigned_worker_id', workerId);

      if (error) throw error;

      await notificationService.createNotification({
        userId: report.user_id,
        title: 'Waste Collected',
        message: `The waste at ${report.address} has been collected. Please verify when you confirm.`,
        type: 'success',
        reportId: reportId,
        actionUrl: `/report/${reportId}`
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to mark as collected:', error);
      return { success: false, error: error.message };
    }
  },

  markAsVerified: async (reportId, userId, rating = null, review = '') => {
    try {
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

      const { data: report } = await supabase
        .from('waste_reports')
        .select('*, profiles!assigned_worker_id(full_name, rating, rating_count, completed_jobs)')
        .eq('id', reportId)
        .single();

      if (rating && report?.assigned_worker_id) {
        await notificationService.createNotification({
          userId: report.assigned_worker_id,
          title: 'Job Verified',
          message: `Your job at ${report.address} has been verified with a ${rating}⭐ rating!`,
          type: 'success',
          reportId: reportId
        });

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
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to mark as verified:', error);
      return { success: false, error: error.message };
    }
  },

  getWorkerLocation: async (workerId) => {
    try {
      const { data, error } = await supabase
        .from('worker_locations')
        .select('*')
        .eq('worker_id', workerId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Failed to get worker location:', error);
      return null;
    }
  },

  updateWorkerLocation: async (workerId, latitude, longitude, accuracy = null) => {
    try {
      const { error } = await supabase
        .from('worker_locations')
        .upsert({
          worker_id: workerId,
          latitude,
          longitude,
          accuracy,
          timestamp: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Failed to update location:', error);
      return { success: false };
    }
  }
};