import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../services/notificationService';
import NotificationCenter from './NotificationCenter';

const NotificationBell = () => {
  const { user } = useSelector((state) => state.auth);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const intervalRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (!user || !user.id) return;

    const loadUnreadCount = async () => {
      try {
        const count = await notificationService.getUnreadCount(user.id);
        if (isMountedRef.current) {
          setUnreadCount(count);
        }
      } catch (error) {
        // Silently fail
      }
    };

    loadUnreadCount();

    // Poll every 20 seconds
    intervalRef.current = setInterval(async () => {
      try {
        const count = await notificationService.getUnreadCount(user.id);
        if (isMountedRef.current && count !== unreadCount) {
          setUnreadCount(count);
          if (count > unreadCount) {
            toast.success(`${count - unreadCount} new notification(s)`);
          }
        }
      } catch (error) {
        // Silently fail
      }
    }, 20000);

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, unreadCount]);

  if (!user) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        aria-label="Notifications"
      >
        <i className="fas fa-bell text-gray-600 dark:text-gray-300 text-lg"></i>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 transform translate-x-1 -translate-y-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationCenter isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default NotificationBell;