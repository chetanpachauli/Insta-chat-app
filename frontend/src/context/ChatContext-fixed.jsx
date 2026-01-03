import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';

// Create axios instance with base URL
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true
});

// Exporting Context for use in other files
export const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const auth = useContext(AuthContext);
  const { user, logout } = auth || { user: null, logout: () => {} };
  
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState({});
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [sidebarUsers, setSidebarUsers] = useState([]);
  
  const socketRef = useRef(null);

  // Socket setup with reconnection and error handling
  useEffect(() => {
    if (!user?.id) return;

    console.log('Initializing WebSocket connection...');
    
    // Create new socket instance with proper configuration
    const socket = io('ws://localhost:5000', {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      autoConnect: true,
      transports: ['websocket'],
      path: '/socket.io',
      query: {
        userId: user.id
      }
    });

    // Debug logging
    socket.on('connect', () => {
      console.log('WebSocket connected with ID:', socket.id);
      socket.emit('addUser', {
        userId: user.id,
        username: user.username,
        timestamp: new Date().toISOString()
      });
      setIsInitialized(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsInitialized(false);
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
      setIsInitialized(false);
    });

    // Handle new messages
    const onNewMessage = (msg) => {
      try {
        console.log('New message received:', msg);
        
        // Ensure we have proper IDs for comparison
        const senderId = (msg.senderId?._id || msg.senderId)?.toString();
        const receiverId = (msg.receiverId?._id || msg.receiverId)?.toString();
        const otherId = (senderId === user.id ? receiverId : senderId)?.toString();
        
        setMessages(prev => {
          const existingMessages = prev[otherId] || [];
          
          // Check if message already exists to prevent duplicates
          if (existingMessages.some(m => m._id === msg._id)) return prev;
          
          // Format the message properly
          const formattedMsg = {
            ...msg,
            _id: msg._id || `temp-${Date.now()}`,
            senderId: senderId,
            receiverId: receiverId,
            message: msg.message || msg.text || '',
            text: msg.text || msg.message || '', // Keep both for compatibility
            image: msg.image || msg.mediaUrl || '',
            createdAt: msg.createdAt || new Date().toISOString(),
            updatedAt: msg.updatedAt || new Date().toISOString()
          };
          
          console.log('Adding new message to state:', formattedMsg);
          return {
            ...prev,
            [otherId]: [...existingMessages, formattedMsg]
          };
        });
      } catch (error) {
        console.error('Error processing new message:', error, 'Message:', msg);
      }
    };

    // Handle message deletion
    const onMessageDeleted = ({ messageId, senderId }) => {
      setMessages(prev => {
        const updated = { ...prev };
        if (updated[senderId]) {
          updated[senderId] = updated[senderId].filter(msg => msg._id !== messageId);
        }
        return updated;
      });
    };

    // Set up event listeners
    socket.on('newMessage', onNewMessage);
    socket.on('messageDeleted', onMessageDeleted);
    socket.on('getOnlineUsers', (users) => setOnlineUsers(users || []));
    socket.on('typing', ({ from }) => setTypingUsers(prev => ({ ...prev, [from]: true })));
    socket.on('stopTyping', ({ from }) => setTypingUsers(prev => {
      const updated = { ...prev };
      delete updated[from];
      return updated;
    }));

    // Store socket reference
    socketRef.current = socket;

    // Cleanup function
    return () => {
      console.log('Cleaning up WebSocket...');
      if (socket.connected) {
        socket.disconnect();
      }
      socket.off('connect');
      socket.off('connect_error');
      socket.off('newMessage');
      socket.off('messageDeleted');
      socket.off('getOnlineUsers');
      socket.off('typing');
      socket.off('stopTyping');
      
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      
      setIsInitialized(false);
    };
  }, [user?.id]);

  // API Call to get messages
  const fetchMessages = useCallback(async (otherId) => {
    const myId = String(user?._id || user?.id);
    const otherUserId = String(otherId);
    
    if (!myId) {
      console.error('Cannot fetch messages: No current user ID');
      return [];
    }
    
    if (!otherUserId || otherUserId === 'undefined') {
      console.error('Cannot fetch messages: Invalid other user ID provided', otherId);
      return [];
    }

    console.log(`[fetchMessages] Fetching between currentUser:${myId} and otherUser:${otherUserId}`);
    
    try {
      // Use the correct endpoint format
      const endpoint = `/chat/messages/${myId}/${otherUserId}`.replace(/\/+/g, '/');
      console.log(`[fetchMessages] Calling API: ${endpoint}`);
      
      const res = await api.get(endpoint);
      console.log('[fetchMessages] Response:', { 
        status: res.status,
        dataLength: res.data?.length,
        firstMessage: res.data?.[0]
      });
      
      if (!res.data || !Array.isArray(res.data)) {
        console.error('[fetchMessages] Invalid response format:', res.data);
        return [];
      }

      const formattedMessages = res.data.map(msg => ({
        ...msg,
        _id: msg._id || `temp-${Date.now()}`,
        senderId: String(msg.senderId?._id || msg.senderId || ''),
        receiverId: String(msg.receiverId?._id || msg.receiverId || ''),
        text: msg.text || msg.message || '',
        image: msg.image || msg.mediaUrl || '',
        createdAt: msg.createdAt || new Date().toISOString(),
        updatedAt: msg.updatedAt || new Date().toISOString(),
        sender: msg.sender || { 
          _id: String(msg.senderId?._id || msg.senderId || ''), 
          username: msg.sender?.username || 'Unknown',
          profilePicture: msg.sender?.profilePicture
        }
      }));

      // Update messages in state
      setMessages(prev => ({
        ...prev,
        [otherUserId]: formattedMessages
      }));

      return formattedMessages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      if (error.response?.status === 401) {
        logout();
      }
      return [];
    }
  }, [logout]);

  const fetchUsers = useCallback(async () => {
    if (!user?.id) return [];
    try {
      console.log('Fetching users for sidebar, user ID:', user.id);
      const res = await api.get(`/messages/users/${user.id}`);
      console.log('Fetched users:', res.data);
      return res.data || [];
    } catch (error) {
      console.error('Error fetching users:', {
        error: error.response?.data || error.message,
        config: error.config
      });
      return [];
    }
  }, [user?.id]);

  const getOnlineUsers = useCallback(async () => {
    try {
      const response = await api.get('/users/online');
      const onlineUsers = response.data.onlineUsers || [];
      setOnlineUsers(onlineUsers);

      setSidebarUsers(prevUsers =>
        prevUsers.map(user => ({
          ...user,
          isOnline: onlineUsers.some(onlineUser => onlineUser.userId === user._id)
        }))
      );

      return onlineUsers;
    } catch (error) {
      console.error('Error fetching online users:', error);
      return [];
    }
  }, []);

  const deleteMessage = async (messageId, otherUserId) => {
    if (!messageId || !user?.id) return false;

    try {
      console.log('Deleting message:', messageId);
      await api.delete(`/messages/${messageId}`);

      if (otherUserId) {
        setMessages(prev => ({
          ...prev,
          [otherUserId]: (prev[otherUserId] || []).filter(msg => msg._id !== messageId)
        }));
      }

      if (socketRef.current) {
        socketRef.current.emit('deleteMessage', {
          messageId,
          senderId: user.id,
          receiverId: otherUserId
        });
      }

      return true;
    } catch (error) {
      console.error('Error deleting message:', error.response?.data || error.message);
      throw error;
    }
  };

  const handleTyping = useCallback((receiverId) => {
    if (socketRef.current && user?.id) {
      socketRef.current.emit('typing', {
        from: user.id,
        to: receiverId
      });
    }
  }, [user?.id]);

  const handleStopTyping = useCallback((receiverId) => {
    if (socketRef.current && user?.id) {
      socketRef.current.emit('stopTyping', {
        from: user.id,
        to: receiverId
      });
    }
  }, [user?.id]);

  const sendMessage = useCallback(async ({ receiverId, message, image }) => {
    if (!user?.id) throw new Error('Not authenticated');
    if (!receiverId) throw new Error('No receiver specified');

    console.log(`Sending message to ${receiverId}:`, { message, hasImage: !!image });

    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      _id: tempId,
      senderId: user.id,
      receiverId,
      message,
      text: message, // For backward compatibility
      image,
      createdAt: new Date().toISOString(),
      isSending: true
    };

    // Optimistic update
    setMessages(prev => {
      const updated = {
        ...prev,
        [receiverId]: [...(prev[receiverId] || []), tempMessage]
      };
      console.log('Optimistic update:', updated);
      return updated;
    });

    try {
      const formData = new FormData();
      if (message) formData.append('message', message);
      
      if (image) {
        // If image is a URL, fetch and convert to File
        if (typeof image === 'string' && image.startsWith('http')) {
          const response = await fetch(image);
          const blob = await response.blob();
          const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
          formData.append('image', file);
        } else if (image instanceof File) {
          formData.append('image', image);
        }
      }

      console.log(`Calling API: /messages/send/${receiverId}`);
      const { data } = await api.post(`/messages/send/${receiverId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Message sent successfully:', data);

      // Update the message with the server response
      setMessages(prev => {
        const updated = {
          ...prev,
          [receiverId]: (prev[receiverId] || []).map(msg => 
            msg._id === tempId ? { ...data, isSending: false } : msg
          )
        };
        console.log('Message state after update:', updated);
        return updated;
      });

      // Emit socket event for real-time update
      if (socketRef.current) {
        socketRef.current.emit('newMessage', {
          ...data,
          senderId: user.id,
          receiverId: receiverId,
          text: data.message || '',
          image: data.image || ''
        });
      }

      // Update sidebar last message
      setSidebarUsers(prev =>
        prev.map(u =>
          u._id === receiverId
            ? { ...u, lastMessage: data.message || 'Sent an image' }
            : u
        )
      );

      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove the temporary message on error
      setMessages(prev => ({
        ...prev,
        [receiverId]: (prev[receiverId] || []).filter(msg => msg._id !== tempId)
      }));
      throw error;
    } finally {
      setUploadProgress(0);
      setIsUploading(false);
    }
  }, [user?.id, setUploadProgress, setIsUploading, setSidebarUsers]);

return (
  <ChatContext.Provider value={{
    messages,
    sendMessage,
    deleteMessage,
    handleTyping,
    handleStopTyping,
    onlineUsers,
    sidebarUsers,
    setSidebarUsers,
    uploadProgress,
    isUploading,
    setIsUploading,
    setUploadProgress
  }}>
    {children}
  </ChatContext.Provider>
);
}

export default ChatProvider;
