import React, { useContext, useEffect, useState, useCallback } from 'react';
import { ChatContext } from '../context/ChatContext';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';
import ChatContainer from '../components/ChatContainer';
import { ArrowLeftIcon, WifiIcon, MagnifyingGlassIcon, UsersIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import GroupChatModal from '../components/GroupChatModal';

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
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [showSidebar, setShowSidebar] = useState(!isMobile);
  const [showGroupModal, setShowGroupModal] = useState(false);

  const {
    sidebarUsers = [],
    selectedChat,
    setSelectedChat,
    onlineUsers = [],
    isLoading = false,
    error,
    isConnected,
    socket,
    fetchSidebarUsers
  } = chat || {};

  const showLoading = isLoading && sidebarUsers.length === 0;
  const { user } = auth || {};

  const handleUserSelect = useCallback((selectedUser) => {
    const userWithStringIds = {
      ...selectedUser,
      _id: String(selectedUser._id || selectedUser.id),
      id: String(selectedUser.id || selectedUser._id)
    };
    setSelectedChat(userWithStringIds);
    if (isMobile) setShowSidebar(false);
  }, [isMobile, setSelectedChat]);

  const handleGroupCreated = useCallback(() => {
    setShowGroupModal(false);
    fetchSidebarUsers?.();
  }, [fetchSidebarUsers]);

  if (!chat || !auth) {
    return <div className="h-screen bg-dark-900 text-white flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="h-screen w-full bg-dark-900 text-white flex flex-col overflow-hidden pb-16 md:pb-0">
      <div className="flex-1 flex flex-col p-2 md:p-3 overflow-hidden">
        <div className="flex-1 flex gap-2 md:gap-3 overflow-hidden">
          {/* Sidebar */}
          <aside
            className={`${isMobile && selectedChat ? 'hidden' : 'flex'}
                        ${isMobile ? 'w-full' : 'w-[320px]'} shrink-0 flex-col card overflow-hidden animate-fade-in`}
          >
            <div className="p-4 pb-3 flex justify-between items-center border-b border-dark-700/50">
              <h1 className="text-xl font-bold bg-gradient-brand bg-clip-text text-transparent">Messages</h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowGroupModal(true)}
                  className="btn-icon text-dark-400 hover:text-brand-400"
                  title="Create group"
                >
                  <UsersIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    if (socket && !socket.connected) socket.connect();
                  }}
                  className={`btn-icon ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}
                  title={isConnected ? 'Connected' : 'Disconnected'}
                >
                  <WifiIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
              {error && (
                <div className="mx-2 mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                  <ExclamationTriangleIcon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-red-400">{error}</p>
                    <button
                      onClick={() => fetchSidebarUsers?.()}
                      className="text-xs text-red-300 hover:text-red-200 underline mt-1"
                    >
                      Tap to retry
                    </button>
                  </div>
                </div>
              )}
              {showLoading ? (
                <div className="p-8 text-center">
                  <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-dark-400 text-sm">Loading chats...</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {sidebarUsers.map((u) => {
                    const userId = String(u?._id || u?.id);
                    const selectedChatId = selectedChat ? String(selectedChat._id || selectedChat.id) : null;
                    const isSelected = selectedChatId === userId;

                    return (
                      <div
                        key={`user-${userId}`}
                        onClick={() => handleUserSelect(u)}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                          isSelected ? 'bg-brand-500/10 border border-brand-500/20' : 'hover:bg-dark-800/50 border border-transparent'
                        }`}
                      >
                        <div className="relative shrink-0">
                          {u.isGroup ? (
                            <div className="w-12 h-12 rounded-full bg-gradient-brand flex items-center justify-center text-white ring-2 ring-dark-700">
                              <UsersIcon className="w-5 h-5" />
                            </div>
                          ) : (
                            <>
                              <Avatar user={u} size={48} />
                              {onlineUsers.includes(userId) && (
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-dark-900" />
                              )}
                            </>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <h3 className="font-medium text-sm truncate">
                              {u.isGroup ? (u.groupName || 'Group') : (u?.username || 'Unknown User')}
                            </h3>
                            {u.isGroup ? (
                              <span className="text-[10px] text-dark-400 shrink-0 ml-2">
                                {u.participants?.length || 0} members
                              </span>
                            ) : (
                              <span className="text-[10px] text-dark-400 shrink-0 ml-2">
                                {u.lastMessageAt ? new Date(u.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-dark-400 truncate">
                            {u.isGroup ? (u.lastMessage || 'Group created') : (u?.lastMessage || 'No messages yet')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          {/* Chat Area */}
          <div className={`${isMobile && !selectedChat ? 'hidden' : 'flex'} ${isMobile ? 'w-full' : 'flex-1'} flex-col card overflow-hidden`}>
            {selectedChat ? (
              <ChatContainer />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 rounded-full bg-dark-800 flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold mb-1">Your Messages</h2>
                <p className="text-dark-400 text-sm mb-6 max-w-sm">Send private messages to a friend</p>
                <button className="btn-primary" onClick={() => {}}>Send Message</button>
              </div>
            )}
          </div>
        </div>
        <GroupChatModal
          isOpen={showGroupModal}
          onClose={() => setShowGroupModal(false)}
          onSuccess={handleGroupCreated}
        />
      </div>
    </div>
  );
};

export default Messages;
