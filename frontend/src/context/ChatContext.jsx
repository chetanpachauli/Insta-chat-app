import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import api, { setupAxiosInterceptors } from '../utils/axiosConfig';
import { toast } from 'react-hot-toast';

const ChatContext = createContext(null);

const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [sidebarUsers, setSidebarUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);
  const isSidebarFetchedRef = useRef(false);
  const userId = user?.id || user?._id;
  const userIdRef = useRef(userId);
  const connectionAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const socketInitialized = useRef(false);

  useEffect(() => {
    if (userId && userId !== userIdRef.current) {
      userIdRef.current = userId;
      hasFetchedRef.current = false;
      isSidebarFetchedRef.current = false; // Reset fetch flag when user changes
    }
  }, [userId]);

  const fetchSidebarUsers = useCallback(async () => {
    const currentUserId = userIdRef.current;
    
    if (isFetchingRef.current || !currentUserId) {
      console.log('Fetch in progress or no user ID, skipping');
      return;
    }
    
    console.log('Initiating sidebar users fetch for user:', currentUserId);
    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/api/messages/users/${currentUserId}`);
      console.log('Sidebar Data Success:', response.data);
      
      if (Array.isArray(response.data)) {
        setSidebarUsers(response.data);
        hasFetchedRef.current = true;
      } else {
        console.warn('Unexpected API response format:', response.data);
        setSidebarUsers([]);
      }
      return response.data;
    } catch (err) {
      console.error('Error fetching sidebar users:', err);
      setError(err.response?.data?.error || 'Failed to fetch users');
      setSidebarUsers([]);
      hasFetchedRef.current = false;
      throw err;
    } finally {
      if (isFetchingRef.current) { // Only reset if we're still the active fetch
        isFetchingRef.current = false;
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!userId || isSidebarFetchedRef.current) return;

    const fetchUsers = async () => {
      if (isFetchingRef.current) return;
      
      isFetchingRef.current = true;
      isSidebarFetchedRef.current = true;
      
      try {
        console.log('Fetching sidebar users for user:', userId);
        const response = await api.get(`/api/messages/users/${userId}`);
        
        if (Array.isArray(response.data)) {
          setSidebarUsers(response.data);
          hasFetchedRef.current = true;
        }
      } catch (error) {
        console.error('Error fetching sidebar users:', error);
        isSidebarFetchedRef.current = false; // Allow retry on error
        setError(error.response?.data?.error || 'Failed to fetch users');
      } finally {
        isFetchingRef.current = false;
      }
    };

    fetchUsers();

    // No cleanup needed as we want to maintain the fetched state
  }, [userId]); // Only depend on userId

  const handleMessage = useCallback((message) => {
    const chatId = String(message.chatId || message.senderId || message.receiverId);
    
    if (!chatId) {
      console.error('Received message with no valid chat ID:', message);
      return;
    }
    
    setMessages(prev => {
      const existingMessageIndex = (prev[chatId] || []).findIndex(
        msg => msg._id === message._id || 
              (msg._id && msg._id.startsWith('temp-') && 
               msg.senderId === message.senderId && 
               msg.createdAt === message.createdAt)
      );

      if (existingMessageIndex >= 0) {
        const updatedMessages = [...(prev[chatId] || [])];
        updatedMessages[existingMessageIndex] = {
          ...updatedMessages[existingMessageIndex],
          ...message,
          image: message.image || updatedMessages[existingMessageIndex].image
        };
        return {
          ...prev,
          [chatId]: updatedMessages
        };
      } else {
        return {
          ...prev,
          [chatId]: [...(prev[chatId] || []), message]
        };
      }
    });
  }, []);

  const handleTyping = useCallback(({ chatId, userId }) => {
    setTypingUsers(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []).filter(id => id !== userId), userId]
    }));
  }, []);

  const handleStopTyping = useCallback(({ chatId, userId }) => {
    setTypingUsers(prev => ({
      ...prev,
      [chatId]: (prev[chatId] || []).filter(id => id !== userId)
    }));
  }, []);

  const handleUserOnline = useCallback((userId) => {
    setOnlineUsers(prev => {
      if (!prev.includes(userId)) {
        return [...prev, userId];
      }
      return prev;
    });
  }, []);

  const handleUserOffline = useCallback((userId) => {
    setOnlineUsers(prev => prev.filter(id => id !== userId));
  }, []);

  useEffect(() => {
    // Initialize axios interceptors
    const cleanupInterceptors = setupAxiosInterceptors();
    return () => cleanupInterceptors();
  }, []);

  // WebSocket connection management
  useEffect(() => {
    // Skip if no user ID or if socket is already initialized
    if (!userId || socketInitialized.current) return;
    
    // Prevent multiple initializations
    if (socketRef.current?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    console.log(`Initializing WebSocket for user: ${userId}`);
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const serverUrl = baseUrl.replace('/api', ''); // Remove /api for WebSocket connection
    
    const socket = io(serverUrl, {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      autoConnect: true,
      transports: ['polling', 'websocket'],
      query: { 
        userId,
        token: localStorage.getItem('token')
      }
    });

    // Store the socket instance in the ref
    socketRef.current = socket;

    // Event handlers
    const handleConnect = () => {
      console.log('WebSocket connected with ID:', socket.id);
      setIsConnected(true);
      setConnectionStatus('connected');
      connectionAttemptRef.current = 0;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const handleConnectError = (err) => {
      console.error('Socket connection error:', err.message);
      setConnectionStatus(`error: ${err.message}`);
      
      const attempt = connectionAttemptRef.current++;
      const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        if (socket && !socket.connected) {
          console.log('Attempting to reconnect WebSocket...');
          socket.connect();
        }
      }, delay);
    };

    const handleDisconnect = (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
      setConnectionStatus('disconnected');
      
      if (reason === 'io server disconnect') {
        console.log('Server disconnected the socket. Attempting to reconnect...');
        socket.connect();
      }
    };

    // Set up event listeners with named functions for proper cleanup
    const eventHandlers = [
      { event: 'connect', handler: handleConnect },
      { event: 'connect_error', handler: handleConnectError },
      { event: 'disconnect', handler: handleDisconnect },
      { event: 'receiveMessage', handler: handleMessage },
      { event: 'typing', handler: handleTyping },
      { event: 'stopTyping', handler: handleStopTyping },
      { event: 'userOnline', handler: handleUserOnline },
      { event: 'userOffline', handler: handleUserOffline }
    ];

    // Register all event listeners
    eventHandlers.forEach(({ event, handler }) => {
      socket.on(event, handler);
    });

    // Mark socket as initialized
    socketInitialized.current = true;

    // Cleanup function
    return () => {
      console.log('Cleaning up WebSocket connection');
      if (socketRef.current) {
        // Remove all event listeners
        eventHandlers.forEach(({ event, handler }) => {
          socket.off(event, handler);
        });
        
        // Clear any pending reconnection attempts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        
        // Disconnect the socket if connected
        if (socket.connected) {
          socket.disconnect();
        }
        
        // Reset refs
        socketRef.current = null;
        socketInitialized.current = false;
      }
    };
  }, [userId]); // Only depend on userId as all handlers are stable

  // Handle user logout
  useEffect(() => {
    if (!userId && socketRef.current) {
      console.log('User logged out, cleaning up WebSocket');
      
      // Disconnect the socket
      if (socketRef.current.connected) {
        socketRef.current.disconnect();
      }
      
      // Clear any pending reconnection attempts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Clear the ref and update state
      socketRef.current = null;
      setIsConnected(false);
      setConnectionStatus('disconnected');
      
      // Reset connection attempt counter
      connectionAttemptRef.current = 0;
    }
  }, [userId]);

  const fetchMessages = useCallback(async (otherUserId) => {
    const currentUserId = userIdRef.current;
    console.log("Context: fetchMessages called with Sender:", currentUserId, "and Receiver:", otherUserId);

    if (!currentUserId || !otherUserId) {
      console.error('Missing user ID or otherUserId for fetchMessages', { currentUserId, otherUserId });
      return [];
    }

    const chatKey = String(otherUserId);
    if (isLoading && messages[chatKey]?.length > 0) {
      console.log('Skipping fetch - already loading messages for chat:', chatKey);
      return messages[chatKey];
    }

    setIsLoading(true);
    console.log(`Fetching messages between ${currentUserId} and ${otherUserId}`);

    try {
      const response = await api.get(`/api/messages/get/${currentUserId}/${otherUserId}`);
      console.log(`Fetched ${response.data?.length || 0} messages for chat ${otherUserId}`);

      const newMessages = response.data || [];
      setMessages(prev => ({
        ...prev,
        [chatKey]: newMessages
      }));

      return newMessages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to load messages');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages]);

  const sendMessage = useCallback(async ({ receiverId, message, image = null }) => {
    const chatId = receiverId;
    const currentUserId = userIdRef.current;

    if (!currentUserId || !receiverId) {
      throw new Error('Missing sender or receiver ID');
    }

    console.log(`Sending message - Sender: ${currentUserId}, Receiver: ${receiverId}`);

    let imagePreviewUrl = null;
    try {
      if (image && (image instanceof File || image instanceof Blob)) {
        imagePreviewUrl = URL.createObjectURL(image);
      } else if (image && typeof image === 'string') {
        imagePreviewUrl = image;
      }
    } catch (error) {
      console.error('Error creating image preview URL:', error);
    }

    const tempMessage = {
      _id: `temp-${Date.now()}`,
      senderId: currentUserId,
      receiverId: receiverId,
      message: message,
      text: message,
      image: imagePreviewUrl,
      createdAt: new Date().toISOString(),
      isSending: true,
      sender: user
    };

    setMessages(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), tempMessage]
    }));

    try {
      const formData = new FormData();
      if (message) formData.append('message', message);
      formData.append('receiverId', receiverId);
      
      if (image && (image instanceof File || image instanceof Blob)) {
        console.log('Attaching image to form data');
        formData.append('image', image);
      } else if (image && typeof image === 'string') {
        console.warn('Cannot upload image: Expected File/Blob but got string URL');
      }
      
      console.log('Sending message to:', `/api/messages/send/${currentUserId}`);
      
      const response = await api.post(
        `/api/messages/send/${currentUserId}`, 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(imagePreviewUrl);
        } catch (error) {
          console.error('Error revoking object URL:', error);
        }
      }

      setMessages(prev => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map(msg => 
          msg._id === tempMessage._id 
            ? { 
                ...response.data, 
                sender: user, 
                isSending: false,
                image: response.data.image || response.data.imageUrl || null
              } 
            : msg
        )
      }));

      if (socketRef.current) {
        const messageToEmit = {
          ...response.data,
          sender: user,
          image: response.data.image || response.data.imageUrl || null
        };
        socketRef.current.emit('sendMessage', messageToEmit);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error in sendMessage:', error);
      setMessages(prev => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map(msg => 
          msg._id === tempMessage._id 
            ? { ...msg, error: true, isSending: false } 
            : msg
        )
      }));
      throw error;
    }
  }, [user]);

  const startTyping = useCallback((chatId) => {
    if (socketRef.current?.connected && userIdRef.current) {
      socketRef.current.emit('typing', { 
        chatId, 
        userId: userIdRef.current 
      });
    }
  }, []);

  const stopTyping = useCallback((chatId) => {
    if (socketRef.current?.connected && userIdRef.current) {
      socketRef.current.emit('stopTyping', { 
        chatId, 
        userId: userIdRef.current 
      });
    }
  }, []);

  const deleteMessage = useCallback(async (messageId, chatId) => {
    try {
      if (messageId.startsWith('temp-')) {
        setMessages(prev => ({
          ...prev,
          [chatId]: (prev[chatId] || []).filter(msg => msg._id !== messageId)
        }));
        return true;
      }

      await api.delete(`/api/messages/delete/${messageId}`);

      setMessages(prev => ({
        ...prev,
        [chatId]: (prev[chatId] || []).filter(msg => msg._id !== messageId)
      }));

      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error(error.response?.data?.error || 'Failed to delete message');
      return false;
    }
  }, []);

  const contextValue = useMemo(() => ({
    // State
    isConnected,
    messages,
    typingUsers,
    onlineUsers,
    selectedChat,
    sidebarUsers,
    isLoading,
    error,
    connectionStatus,
    
    // Actions
    sendMessage,
    fetchMessages,
    startTyping,
    stopTyping,
    deleteMessage,
    setSelectedChat,
    setSidebarUsers,
    setMessages,
    fetchSidebarUsers
  }), [
    isConnected,
    messages,
    typingUsers,
    onlineUsers,
    selectedChat,
    sidebarUsers,
    isLoading,
    error,
    connectionStatus,
    sendMessage,
    fetchMessages,
    startTyping,
    stopTyping,
    deleteMessage,
    fetchSidebarUsers
  ]);

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

export { ChatContext };
export default ChatProvider;