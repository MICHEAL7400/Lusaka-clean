import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export const notificationService = {
  createNotification: async ({ userId, title, message, type = 'info', reportId = null, actionUrl = null }) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          user_id: userId,
          title,
          message,
          type,
          report_id: reportId,
          action_url: actionUrl,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to create notification:', error);
      return null;
    }
  },

  getUserNotifications: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get notifications:', error);
      return [];
    }
  },

  getUnreadCount: async (userId) => {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      return 0;
    }
  },

  markAsRead: async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      return false;
    }
  },

  markAllAsRead: async (userId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      return true;
    } catch (error) {
      return false;
    }
  },

  deleteNotification: async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      return false;
    }
  },

  handleNotificationClick: (notification) => {
    // Mark as read first
    notificationService.markAsRead(notification.id);
    
    // Navigate based on action_url or report_id
    if (notification.action_url) {
      window.location.href = notification.action_url;
    } else if (notification.report_id) {
      window.location.href = `/report/${notification.report_id}`;
    }
  }
};