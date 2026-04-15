import { supabase } from '../lib/supabase';

export const profileService = {
  updateProfile: async (userId, data) => {
    const { data: updated, error } = await supabase
      .from('profiles')
      .update({
        full_name: data.full_name,
        phone: data.phone,
        zone: data.zone,
        bio: data.bio,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return updated;
  },
  
  getUserStats: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('waste_reports')
        .select('status')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      const totalReports = data?.length || 0;
      const resolvedReports = data?.filter(r => r.status === 'verified').length || 0;
      const pendingReports = data?.filter(r => r.status !== 'verified').length || 0;
      
      return { totalReports, resolvedReports, pendingReports };
    } catch (error) {
      console.error('Failed to get user stats:', error);
      return { totalReports: 0, resolvedReports: 0, pendingReports: 0 };
    }
  },
  
  getWorkerStats: async (workerId) => {
    try {
      const { data, error } = await supabase
        .from('waste_reports')
        .select('status')
        .eq('assigned_worker_id', workerId);
      
      if (error) throw error;
      
      const completedJobs = data?.filter(r => r.status === 'verified').length || 0;
      const pendingJobs = data?.filter(r => r.status === 'assigned').length || 0;
      
      return { completedJobs, pendingJobs, totalJobs: data?.length || 0 };
    } catch (error) {
      console.error('Failed to get worker stats:', error);
      return { completedJobs: 0, pendingJobs: 0, totalJobs: 0 };
    }
  }
};