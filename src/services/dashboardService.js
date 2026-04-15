import { supabase } from '../lib/supabase';

export const dashboardService = {
  getResidentReports: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('waste_reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const stats = {
        total: data?.length || 0,
        pending: data?.filter(r => r.status === 'pending').length || 0,
        assigned: data?.filter(r => r.status === 'assigned').length || 0,
        collected: data?.filter(r => r.status === 'collected').length || 0,
        verified: data?.filter(r => r.status === 'verified').length || 0
      };
      
      return { reports: data || [], stats };
    } catch (error) {
      console.error('Failed to get resident reports:', error.message);
      return { reports: [], stats: { total: 0, pending: 0, assigned: 0, collected: 0, verified: 0 } };
    }
  },
  
  getWorkerJobs: async (workerId) => {
    try {
      const { data, error } = await supabase
        .from('waste_reports')
        .select('*')
        .eq('assigned_worker_id', workerId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const stats = {
        total: data?.length || 0,
        pending: data?.filter(r => r.status === 'assigned').length || 0,
        collected: data?.filter(r => r.status === 'collected').length || 0,
        verified: data?.filter(r => r.status === 'verified').length || 0
      };
      
      return { reports: data || [], stats };
    } catch (error) {
      console.error('Failed to get worker jobs:', error.message);
      return { reports: [], stats: { total: 0, pending: 0, collected: 0, verified: 0 } };
    }
  },
  
  getAllReports: async () => {
    try {
      const { data, error } = await supabase
        .from('waste_reports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const stats = {
        total: data?.length || 0,
        pending: data?.filter(r => r.status === 'pending').length || 0,
        assigned: data?.filter(r => r.status === 'assigned').length || 0,
        collected: data?.filter(r => r.status === 'collected').length || 0,
        verified: data?.filter(r => r.status === 'verified').length || 0
      };
      
      return { reports: data || [], stats };
    } catch (error) {
      console.error('Failed to get all reports:', error.message);
      return { reports: [], stats: { total: 0, pending: 0, assigned: 0, collected: 0, verified: 0 } };
    }
  }
};
