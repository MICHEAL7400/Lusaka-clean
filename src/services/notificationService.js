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
      
      if (Notification.permission === 'granted') {
        new Notification(title, { body: message });
      }
      
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

      if (error) {
        // Don't throw on error, just return 0
        console.error('Failed to get unread count:', error.message);
        return 0;
      }
      return count || 0;
    } catch (error) {
      console.error('Failed to get unread count:', error.message);
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
      console.error('Failed to mark as read:', error);
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
      console.error('Failed to mark all as read:', error);
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
      console.error('Failed to delete notification:', error);
      return false;
    }
  },

  subscribeToNotifications: (userId, onNewNotification, onUnreadCountChange) => {
    let lastCount = 0;
    
    const interval = setInterval(async () => {
      try {
        const count = await notificationService.getUnreadCount(userId);
        
        if (count > lastCount && onNewNotification) {
          onNewNotification({ count: count - lastCount });
        }
        
        if (count !== lastCount && onUnreadCountChange) {
          onUnreadCountChange(count);
        }
        
        lastCount = count;
      } catch (error) {
        // Silently fail on polling errors
      }
    }, 15000); // Poll every 15 seconds
    
    return {
      unsubscribe: () => clearInterval(interval)
    };
  },

  requestBrowserPermission: async () => {
    if (!('Notification' in window)) {
      console.log('Browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }
};
