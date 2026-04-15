import { supabase } from '../lib/supabase';

export const homeService = {
  getSystemStats: async () => {
    try {
      const [reportsResult, workersResult, zonesResult] = await Promise.all([
        supabase.from('waste_reports').select('status', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'worker'),
        supabase.from('zones').select('id', { count: 'exact' })
      ]);
      
      const reports = reportsResult.data || [];
      const totalReports = reports.length;
      const resolvedReports = reports.filter(r => r.status === 'verified').length;
      const totalWorkers = workersResult.count || 0;
      const totalZones = zonesResult.count || 0;
      
      return {
        totalReports,
        resolvedReports,
        totalWorkers,
        totalZones
      };
    } catch (error) {
      console.error('Failed to get system stats:', error);
      return {
        totalReports: 0,
        resolvedReports: 0,
        totalWorkers: 0,
        totalZones: 7
      };
    }
  }
};