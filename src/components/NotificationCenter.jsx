import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { notificationService } from '../services/notificationService';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const NotificationCenter = ({ isOpen, onClose }) => {
  const { user } = useSelector((state) => state.auth);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      loadNotifications();
    }
  }, [isOpen, user]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationService.getUserNotifications(user.id);
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeStyles = (type) => {
    const styles = {
      success: 'bg-green-50 border-green-500 dark:bg-green-900/20',
      error: 'bg-red-50 border-red-500 dark:bg-red-900/20',
      warning: 'bg-yellow-50 border-yellow-500 dark:bg-yellow-900/20',
      info: 'bg-blue-50 border-blue-500 dark:bg-blue-900/20',
    };
    return styles[type] || styles.info;
  };

  const getTypeIcon = (type) => {
    const icons = {
      success: 'fa-check-circle text-green-600',
      error: 'fa-times-circle text-red-600',
      warning: 'fa-exclamation-triangle text-yellow-600',
      info: 'fa-info-circle text-blue-600',
    };
    return icons[type] || icons.info;
  };

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === filter);

  const markAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error('Failed to mark as read:', error);
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

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead(user.id);
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose}></div>
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-white dark:bg-gray-800 shadow-xl z-50 flex flex-col"
          >
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold dark:text-white">Notifications</h2>
              <div className="flex gap-2">
                {notifications.filter(n => !n.read).length > 0 && (
                  <button onClick={markAllAsRead} className="text-xs text-green-600 hover:underline">
                    Mark all read
                  </button>
                )}
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            <div className="p-3 border-b dark:border-gray-700 flex gap-2 overflow-x-auto">
              {['all', 'info', 'success', 'warning', 'error'].map(type => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-3 py-1 rounded-full text-xs capitalize whitespace-nowrap transition ${
                    filter === type
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : filteredNotifications.length > 0 ? (
                <div className="divide-y dark:divide-gray-700">
                  {filteredNotifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`p-4 cursor-pointer transition ${
                        !notification.read ? 'bg-gray-50 dark:bg-gray-700/50' : ''
                      } ${getTypeStyles(notification.type)}`}
                      onClick={() => {
                        if (!notification.read) markAsRead(notification.id);
                        if (notification.action_url) {
                          window.location.href = notification.action_url;
                          onClose();
                        }
                      }}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0">
                          <i className={`fas ${getTypeIcon(notification.type)}`}></i>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm dark:text-white">{notification.title}</h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <i className="fas fa-trash-alt text-xs"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <i className="fas fa-bell-slash text-4xl mb-3"></i>
                  <p className="text-sm">No notifications</p>
                </div>
              )}
            </div>

            <div className="p-3 border-t dark:border-gray-700">
              <button
                onClick={loadNotifications}
                className="w-full text-center text-sm text-green-600 hover:underline"
              >
                <i className="fas fa-sync-alt mr-1"></i>
                Refresh
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationCenter;
