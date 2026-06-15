import React, { memo, useContext, useEffect, useRef, useCallback } from 'react';
import ChatContext from '../context/ChatContext';
import AuthContext from '../context/AuthContext';
import { Trash2, Users } from 'lucide-react';
import MessageInput from './MessageInput';
import MessageReactions from './MessageReactions';

const ChatWindow = memo(function ChatWindow({ chat, auth }) {
  const { selectedChat, messages, deleteMessage, onlineUsers, typingUsers, fetchMessages } = chat || {};
  const { user } = auth || {};
  const containerRef = useRef(null);
  const isFetchingRef = useRef(false);
  const prevChatIdRef = useRef(null);

  const fetchChatMessages = useCallback(async () => {
    const chatId = selectedChat?._id;
    if (!chatId || !user?.id || isFetchingRef.current) return;
    if (chatId === prevChatIdRef.current) return;
    isFetchingRef.current = true;
    prevChatIdRef.current = chatId;
    try {
      await fetchMessages(chatId);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      isFetchingRef.current = false;
    }
  }, [selectedChat?._id, user?.id, fetchMessages]);

  useEffect(() => {
    fetchChatMessages();
  }, [selectedChat?._id, fetchChatMessages]);

  const msgs = React.useMemo(() => {
    return selectedChat ? (messages[selectedChat._id] || []) : [];
  }, [selectedChat?._id, messages]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [msgs.length]);

  const handleReact = useCallback(() => {
    if (selectedChat?._id) {
      fetchMessages(selectedChat._id);
    }
  }, [selectedChat?._id, fetchMessages]);

  const renderAvatar = (u) => {
    if (u?.profilePic) {
      return (
        <img
          src={u.profilePic}
          alt={u.username}
          className="w-10 h-10 rounded-full object-cover ring-2 ring-dark-700"
          referrerPolicy="no-referrer"
        />
      );
    }
    return (
      <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center text-white text-sm font-semibold ring-2 ring-dark-700">
        {(u?.username || 'U')[0].toUpperCase()}
      </div>
    );
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const oneDay = 86400000;

    if (diff < oneDay) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-dark-900">
      {!selectedChat ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-dark-800 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-dark-400 text-sm">Select a user to start chatting</p>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex-shrink-0 px-4 py-3 bg-dark-800/50 backdrop-blur-sm border-b border-dark-700/50 flex items-center gap-3">
            {selectedChat?.isGroup ? (
              <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center text-white ring-2 ring-dark-700 shrink-0">
                <Users className="w-5 h-5" />
              </div>
            ) : (
              renderAvatar(selectedChat)
            )}
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-sm truncate">
                {selectedChat?.isGroup ? selectedChat?.groupName : (selectedChat?.username || 'Unknown User')}
              </h2>
              {selectedChat?.isGroup ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-dark-400">{selectedChat?.participants?.length || 0} members</span>
                </div>
              ) : onlineUsers?.includes(String(selectedChat._id)) && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-dark-400">Active now</span>
                </div>
              )}
            </div>
            <button className="btn-icon text-dark-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
            <button className="btn-icon text-dark-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {msgs.map((m) => {
              const senderId = m.senderId?._id || m.senderId;
              const currentUserId = user?._id || user?.id;
              const isMe = String(senderId) === String(currentUserId);
              const messageKey = m._id || `msg-${m.createdAt || Date.now()}`;

              return (
                <div key={messageKey} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                  <div className={`group relative max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                    {m.image && (
                      <div className={`mb-1.5 rounded-xl overflow-hidden ${isMe ? 'ml-auto' : ''}`}>
                        <img
                          src={m.image}
                          alt="Attachment"
                          className="max-h-60 w-full object-cover rounded-xl"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/300x200?text=Not+Available';
                          }}
                        />
                      </div>
                    )}

                    <div
                      className={`px-4 py-2.5 text-sm leading-relaxed ${
                        isMe
                          ? 'bg-gradient-brand-h text-white rounded-2xl rounded-br-sm'
                          : 'bg-dark-800 text-dark-100 rounded-2xl rounded-bl-sm'
                      }`}
                    >
                      {m.message || ''}
                      <div className={`text-[10px] mt-1 ${isMe ? 'text-white/60' : 'text-dark-400'}`}>
                        {formatTime(m.createdAt)}
                      </div>
                    </div>

                    <MessageReactions
                      messageId={m._id}
                      reactions={m.reactions || []}
                      currentUserId={currentUserId}
                      onReact={handleReact}
                    />

                    {isMe && (
                      <button
                        onClick={() => deleteMessage(m._id, selectedChat._id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute -top-2 -right-2 bg-dark-700 p-1.5 rounded-full hover:bg-red-500/20"
                        title="Delete message"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    )}

                    {isMe && m.isSeen && (
                      <div className="text-[10px] text-dark-400 mt-1 text-right">Seen</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Typing indicator */}
          {selectedChat?._id && typingUsers[selectedChat._id] && (
            <div className="px-4 py-2 text-xs text-dark-400 animate-pulse-soft">
              {selectedChat.username} is typing...
            </div>
          )}

          {/* Input */}
          <div className="border-t border-dark-700/50 bg-dark-800/30 backdrop-blur-sm p-3">
            <MessageInput />
          </div>
        </>
      )}
    </div>
  );
});

export default ChatWindow;
