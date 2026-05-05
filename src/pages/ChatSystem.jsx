import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const ChatSystem = ({ reportId, currentUserId, otherUserId, currentUserName, otherUserName, currentUserRole }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    if (reportId && currentUserId && otherUserId) {
      loadMessages();
      // Poll every 2 seconds for new messages
      pollingIntervalRef.current = setInterval(loadMessages, 2000);
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [reportId, currentUserId, otherUserId]);

  const loadMessages = async () => {
    if (!reportId) return;
    
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('report_id', reportId)
        .order('created_at', { ascending: true })
        .limit(100);
      
      if (error) {
        console.error('Error loading messages:', error);
        return;
      }
      
      if (data) {
        setMessages(data);
        // Mark unread messages as read when viewed
        const unreadMessages = data.filter(m => m.receiver_id === currentUserId && !m.read);
        if (unreadMessages.length > 0) {
          for (const msg of unreadMessages) {
            await supabase
              .from('chat_messages')
              .update({ read: true })
              .eq('id', msg.id);
          }
        }
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
    setNewMessage(''); // Clear input immediately for better UX
    
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert([{
          report_id: reportId,
          sender_id: currentUserId,
          receiver_id: otherUserId,
          message: messageText,
          read: false,
          created_at: new Date().toISOString()
        }]);
      
      if (error) {
        console.error('Send error:', error);
        toast.error('Failed to send message. Please try again.');
        setNewMessage(messageText); // Restore message on error
        return;
      }
      
      toast.success('Message sent!');
      await loadMessages(); // Reload to show new message
      
    } catch (err) {
      console.error('Error sending:', err);
      toast.error('Failed to send message');
      setNewMessage(messageText); // Restore message on error
    } finally {
      setSending(false);
    }
  };

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

  // Show a message if chat is not available
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
          messages.map((msg, idx) => {
            const isOwnMessage = msg.sender_id === currentUserId;
            return (
              <div
                key={idx}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 ${
                    isOwnMessage
                      ? 'bg-green-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}
                >
                  <p className="text-sm break-words">{msg.message}</p>
                  <p className={`text-xs mt-1 ${
                    isOwnMessage ? 'text-green-200' : 'text-gray-400'
                  }`}>
                    {formatTime(msg.created_at)}
                    {isOwnMessage && msg.read && <span className="ml-2">✓✓ Read</span>}
                    {isOwnMessage && !msg.read && <span className="ml-2">✓ Sent</span>}
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