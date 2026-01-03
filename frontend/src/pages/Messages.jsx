import React, { useContext, useEffect, useState, useCallback } from 'react';
import { ChatContext } from '../context/ChatContext';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';
import ChatContainer from '../components/ChatContainer';
import { ArrowLeftIcon, PhoneIcon, VideoCameraIcon, MagnifyingGlassIcon, EllipsisHorizontalIcon, WifiIcon } from '@heroicons/react/24/outline';

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    setMatches(media.matches);
    return () => media.removeEventListener('change', listener);
  }, [query]);
  return matches;
};

const Messages = () => {
  const chat = useContext(ChatContext);
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [showSidebar, setShowSidebar] = useState(!isMobile);

  // Log the entire chat context for debugging
  console.log('Chat Context:', chat);

  // Safety Extraction
  const { 
    sidebarUsers = [],
    selectedChat,
    setSelectedChat,
    onlineUsers = [], 
    isLoading = false,
    error,
    isConnected,
    socket
  } = chat || {};
  
  // Determine if we should show loading state (only if we have no data and are loading)
  const showLoading = isLoading && sidebarUsers.length === 0;
  
  console.log('Current Sidebar Users:', sidebarUsers);

  const { user } = auth || {};

  // Handle user selection
  const handleUserSelect = useCallback((selectedUser) => {
    console.log('User selected:', selectedUser);
    // Ensure consistent ID handling
    const userWithStringIds = {
      ...selectedUser,
      _id: String(selectedUser._id || selectedUser.id),
      id: String(selectedUser.id || selectedUser._id)
    };
    setSelectedChat(userWithStringIds);
    if (isMobile) {
      setShowSidebar(false);
    }
  }, [isMobile, setSelectedChat]);

  // Toggle sidebar on mobile
  const toggleSidebar = useCallback(() => {
    setShowSidebar(prev => !prev);
  }, []);

  // ChatContext handles the initial fetch of sidebar users
  useEffect(() => {
    const userId = user?.id || user?._id;
    console.log('Messages mounted with user ID:', userId);
    console.log('WebSocket connected:', chat?.isConnected);
  }, [user?.id, user?._id, chat?.isConnected]);

  if (!chat || !auth) {
    return <div className="h-screen bg-black text-white flex items-center justify-center">Loading Context...</div>;
  }

  if (error) {
    return (
      <div className="h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center p-4">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <button 
            onClick={() => chat.fetchSidebarUsers()} 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-black text-white flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
          {/* User List Panel - Fixed width */}
          <aside 
            className={`${isMobile && selectedChat ? 'hidden' : 'flex'} 
                       w-[350px] flex-shrink-0 flex-col bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-700/50 overflow-hidden`}
          >
            <div className="p-6 pb-4 flex justify-between items-center">
              <h1 className="text-2xl font-bold">Messages</h1>
              <button 
                onClick={() => {
                  console.log('WebSocket status:', {
                    isConnected,
                    socket: socket?.connected ? 'Connected' : 'Disconnected',
                    socketId: socket?.id
                  });
                  if (socket && !socket.connected) {
                    console.log('Attempting to manually connect socket...');
                    socket.connect();
                  }
                }}
                className={`p-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} text-white`}
                title={isConnected ? 'WebSocket Connected' : 'WebSocket Disconnected'}
              >
                <WifiIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-4">
              {showLoading ? (
                <div className="p-10 text-center text-gray-500 text-sm">Loading chats...</div>
              ) : (
                sidebarUsers.map((u) => {
                  const userId = String(u?._id || u?.id);
                  const selectedChatId = selectedChat ? String(selectedChat._id || selectedChat.id) : null;
                  const isSelected = selectedChatId === userId;

                  return (
                    <div 
                      key={`user-${userId}`} 
                      onClick={() => handleUserSelect(u)} 
                      className={`flex items-center gap-3 p-3 rounded-2xl hover:bg-zinc-800/50 cursor-pointer transition-colors ${
                        isSelected ? 'bg-zinc-800/50' : ''
                      }`}
                    >
                      <div className="relative">
                        <Avatar user={u} size={56} />
                        {onlineUsers.includes(userId) && (
                          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-black"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium text-sm">{u?.username || 'Unknown User'}</h3>
                          <span className="text-xs text-gray-500">
                            {u.lastMessageAt ? new Date(u.lastMessageAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 truncate">
                          {u?.lastMessage || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* Chat Area - Takes remaining space */}
          <div className={`${isMobile && !selectedChat ? 'hidden' : 'flex'} flex-1 flex-col bg-black rounded-2xl overflow-hidden`}>
            {selectedChat ? (
              <ChatContainer />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2">Your Messages</h2>
                <p className="text-gray-400 mb-6 max-w-md">Send private messages to a friend or group</p>
                <button 
                  onClick={() => {}}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                >
                  Send Message
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;