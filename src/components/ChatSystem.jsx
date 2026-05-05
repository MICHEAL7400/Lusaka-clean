import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { notificationService } from '../services/notificationService';

const ChatSystem = ({ reportId, currentUserId, otherUserId, currentUserName, otherUserName, currentUserRole }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const subscriptionRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.5);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      setTimeout(() => audioContext.close(), 600);
    } catch (err) {
      console.log('Sound not supported');
    }
  };

  // Load messages and count unread
  const loadMessages = async () => {
    if (!reportId) return;
    
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('report_id', String(reportId))
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error loading messages:', error);
        return;
      }
      
      if (data) {
        setMessages(data);
        const unread = data.filter(msg => 
          String(msg.receiver_id) === String(currentUserId) && !msg.read
        ).length;
        setUnreadCount(unread);
        
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  };

  // Mark messages as read when chat is open
  const markMessagesAsRead = async () => {
    if (!reportId || !currentUserId) return;
    
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('report_id', String(reportId))
        .eq('receiver_id', String(currentUserId))
        .eq('read', false);
      
      if (error) {
        console.error('Error marking messages as read:', error);
      } else {
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error marking read:', err);
    }
  };

  // Send a new message
  const sendMessage = async () => {
    if (!newMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }
    
    if (!reportId || !currentUserId || !otherUserId) {
      toast.error('Cannot send message - missing information');
      return;
    }
    
    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage('');
    
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert([{
          report_id: String(reportId),
          sender_id: String(currentUserId),
          receiver_id: String(otherUserId),
          message: messageText,
          read: false,
          created_at: new Date().toISOString()
        }]);
      
      if (error) {
        console.error('Send error:', error);
        toast.error(`Failed to send: ${error.message}`);
        setNewMessage(messageText);
        return;
      }
      
      toast.success('Message sent!');
      
      // Create notification for receiver (with error handling)
      try {
        if (notificationService && typeof notificationService.createChatNotification === 'function') {
          await notificationService.createChatNotification({
            receiverId: otherUserId,
            senderName: currentUserName || (currentUserRole === 'resident' ? 'Resident' : 'Worker'),
            message: messageText,
            reportId: reportId
          });
        }
      } catch (notifErr) {
        console.log('Notification not sent (non-critical):', notifErr);
      }
      
    } catch (err) {
      console.error('Error sending:', err);
      toast.error('Failed to send message');
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  // Setup real-time subscription
  useEffect(() => {
    if (!reportId) return;
    
    loadMessages();
    
    // Mark messages as read when chat opens
    markMessagesAsRead();
    
    // Subscribe to real-time changes
    const subscription = supabase
      .channel(`chat_${reportId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `report_id=eq.${reportId}`
      }, async (payload) => {
        const newMsg = payload.new;
        const isForCurrentUser = String(newMsg.receiver_id) === String(currentUserId);
        const isFromCurrentUser = String(newMsg.sender_id) === String(currentUserId);
        
        setMessages(prev => [...prev, newMsg]);
        
        if (isForCurrentUser && !isFromCurrentUser) {
          playNotificationSound();
          setUnreadCount(prev => prev + 1);
          
          toast(`${otherUserName || (currentUserRole === 'resident' ? 'Worker' : 'Resident')} sent: ${newMsg.message.substring(0, 50)}`, {
            icon: '💬',
            duration: 5000,
          });
          
          if (Notification.permission === 'granted') {
            new Notification(`New message from ${otherUserName || 'User'}`, {
              body: newMsg.message.substring(0, 100),
              icon: '/favicon.ico',
            });
          }
        }
        
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      })
      .subscribe();
    
    subscriptionRef.current = subscription;
    
    // Fallback polling
    pollingIntervalRef.current = setInterval(() => {
      loadMessages();
    }, 5000);
    
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [reportId, currentUserId]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const displayName = otherUserName || (currentUserRole === 'resident' ? 'Worker' : 'Resident');

  if (!reportId || !currentUserId || !otherUserId) {
    return (
      <div className="bg-white rounded-lg shadow border p-6 text-center text-gray-500">
        <i className="fas fa-comments text-3xl mb-2 text-gray-300"></i>
        <p className="text-sm">Chat will appear once a worker is assigned</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border flex flex-col" style={{ height: '450px' }}>
      <div className="p-3 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <i className="fas fa-comments text-green-600"></i>
            Chat with {displayName}
            {unreadCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5 animate-pulse">
                {unreadCount} new
              </span>
            )}
          </h3>
          <span className="text-xs text-gray-400">
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50" style={{ minHeight: '300px' }}>
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <i className="fas fa-comment-dots text-3xl mb-2"></i>
            <p className="text-sm">No messages yet</p>
            <p className="text-xs">Send a message to {displayName}</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = String(msg.sender_id) === String(currentUserId);
            const isUnread = !isOwnMessage && !msg.read;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 ${
                    isOwnMessage
                      ? 'bg-green-600 text-white'
                      : `bg-white border border-gray-200 text-gray-800 ${isUnread ? 'ring-2 ring-blue-400' : ''}`
                  }`}
                >
                  <p className="text-sm break-words">{msg.message}</p>
                  <p className={`text-xs mt-1 ${
                    isOwnMessage ? 'text-green-200' : 'text-gray-400'
                  }`}>
                    {formatTime(msg.created_at)}
                    {!isOwnMessage && msg.read && <span className="ml-2 text-green-500">✓✓ Read</span>}
                    {!isOwnMessage && !msg.read && <span className="ml-2 text-blue-500">● New</span>}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !sending && sendMessage()}
            placeholder={`Message ${displayName}...`}
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={sending}
            autoFocus
          />
          <button
            onClick={sendMessage}
            disabled={sending || !newMessage.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm transition"
          >
            <i className={`fas ${sending ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatSystem;