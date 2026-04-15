import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { notificationService } from '../services/notificationService';
import toast from 'react-hot-toast';

const Notifications = () => {
  const { user } = useSelector((state) => state.auth);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (user) {
      loadNotifications();
      
      const subscription = notificationService.subscribeToNotifications(user.id, (newNotification) => {
        setNotifications(prev => [newNotification, ...prev]);
      });
      
      return () => {
        if (subscription) subscription.unsubscribe();
      };
    }
  }, [user]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationService.getUserNotifications(user.id);
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
      toast.success('Marked as read');
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead(user.id);
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (id) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications(notifications.filter(n => n.id !== id));
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'success': return 'fa-check-circle text-green-600';
      case 'warning': return 'fa-exclamation-triangle text-yellow-600';
      case 'error': return 'fa-times-circle text-red-600';
      default: return 'fa-info-circle text-blue-600';
    }
  };

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === filter);

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">
            <i className="fas fa-check-double mr-2"></i>
            Mark All Read
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'info', 'success', 'warning', 'error'].map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1.5 rounded-full text-sm capitalize whitespace-nowrap transition ${
              filter === type
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center">
            <i className="fas fa-bell-slash text-4xl text-gray-400 mb-3"></i>
            <p className="text-gray-600 dark:text-gray-400">No notifications</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border overflow-hidden transition-all ${
                !notification.read ? 'border-l-4 border-l-green-600' : ''
              }`}
            >
              <div className="p-4">
                <div className="flex items-start space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    !notification.read ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    <i className={`fas ${getTypeIcon(notification.type)}`}></i>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className={`font-semibold ${!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                          {notification.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                            title="Mark as read"
                          >
                            <i className="fas fa-check"></i>
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="text-center">
        <button 
          onClick={loadNotifications}
          className="text-green-600 hover:text-green-700 text-sm"
        >
          <i className="fas fa-sync-alt mr-1"></i>
          Refresh
        </button>
      </div>
    </div>
  );
};

export default Notifications;