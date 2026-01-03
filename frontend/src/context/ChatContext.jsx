import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.log("Token expired or invalid. Logging out...");
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

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

  useEffect(() => {
    if (userId && userId !== userIdRef.current) {
      userIdRef.current = userId;
      hasFetchedRef.current = false;
    }
  }, [userId]);

  const fetchSidebarUsers = useCallback(async () => {
    const currentUserId = userIdRef.current;
    
    if (isFetchingRef.current) {
      console.log('Fetch already in progress, skipping duplicate request');
      return;
    }
    
    if (!currentUserId) {
      console.log('No user ID available, skipping sidebar fetch');
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
    } catch (err) {
      console.error('Error fetching sidebar users:', err);
      setError(err.response?.data?.error || 'Failed to fetch users');
      setSidebarUsers([]);
      hasFetchedRef.current = false;
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchUsers = async () => {
      if (!userId) return;

      if (isSidebarFetchedRef.current || isFetchingRef.current) {
        console.log('Skipping fetch - already fetched or currently fetching');
        return;
      }

      console.log('Triggering sidebar users fetch for user:', userId);
      isSidebarFetchedRef.current = true;
      await fetchSidebarUsers();
    };

    if (userId && !isSidebarFetchedRef.current) {
      fetchUsers();
    }

    return () => {
      isMounted = false;
      if (!userId) {
        hasFetchedRef.current = false;
        isSidebarFetchedRef.current = false;
      }
    };
  }, [userId, fetchSidebarUsers]);

  useEffect(() => {
    const currentUserId = userIdRef.current;
    if (!currentUserId) {
      console.log('No user ID, skipping WebSocket initialization');
      return;
    }

    console.log(`Initializing WebSocket for user: ${currentUserId}`);
    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const socket = io(serverUrl, {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      autoConnect: true,
      transports: ['polling', 'websocket'],
      query: { 
        userId: currentUserId,
        token: localStorage.getItem('token')
      }
    });

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

    const handleMessage = (message) => {
      console.log('Socket: New real-time message received:', message);
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
    };

    const handleTyping = ({ chatId, userId }) => {
      setTypingUsers(prev => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []).filter(id => id !== userId), userId]
      }));
    };

    const handleStopTyping = ({ chatId, userId }) => {
      setTypingUsers(prev => ({
        ...prev,
        [chatId]: (prev[chatId] || []).filter(id => id !== userId)
      }));
    };

    const handleOnlineUsers = (users) => {
      console.log('Online users updated:', users);
      setOnlineUsers(users);
    };

    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);
    socket.on('disconnect', handleDisconnect);
    socket.on('newMessage', handleMessage);
    socket.on('typing', handleTyping);
    socket.on('stopTyping', handleStopTyping);
    socket.on('onlineUsers', handleOnlineUsers);

    socketRef.current = socket;

    return () => {
      console.log('Cleaning up WebSocket...');
      if (socket) {
        socket.off('connect', handleConnect);
        socket.off('connect_error', handleConnectError);
        socket.off('disconnect', handleDisconnect);
        socket.off('newMessage', handleMessage);
        socket.off('typing', handleTyping);
        socket.off('stopTyping', handleStopTyping);
        socket.off('onlineUsers', handleOnlineUsers);
        socket.disconnect();
        socketRef.current = null;
      }
    };
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
    setMessages
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
    deleteMessage
  ]);

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

export { ChatContext };
export default ChatProvider;