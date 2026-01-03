import React, { memo, useContext, useEffect, useRef, useCallback } from 'react';
import ChatContext from '../context/ChatContext';
import AuthContext from '../context/AuthContext';
import { Trash2 } from 'lucide-react';
import MessageInput from './MessageInput';

const ChatWindow = memo(function ChatWindow({ chat, auth }) {
  const { selectedChat, messages, deleteMessage, onlineUsers, typingUsers, fetchMessages } = chat || {};
  const { user } = auth || {};
  const containerRef = useRef(null);

  // Track if we're currently fetching messages for a chat
  const isFetchingRef = useRef(false);
  const prevChatIdRef = useRef(null);

  // Memoize the message fetching logic
  const fetchChatMessages = useCallback(async () => {
    const chatId = selectedChat?._id;
    if (!chatId || !user?.id || isFetchingRef.current) return;
    
    // Skip if we're already fetching for this chat
    if (chatId === prevChatIdRef.current) return;
    
    isFetchingRef.current = true;
    prevChatIdRef.current = chatId;
    
    try {
      console.log('Fetching messages for chat:', chatId);
      await fetchMessages(chatId);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      isFetchingRef.current = false;
    }
  }, [selectedChat?._id, user?.id, fetchMessages]);

  // Only trigger on selectedChat._id change
  useEffect(() => {
    fetchChatMessages();
  }, [selectedChat?._id, fetchChatMessages]);

  // Memoize the messages for the current chat
  const msgs = React.useMemo(() => {
    return selectedChat ? (messages[selectedChat._id] || []) : [];
  }, [selectedChat?._id, messages]);

  // Scroll to bottom when messages array changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [msgs.length]);

  const renderAvatar = (u) => {
    if (u?.profilePic) {
      return (
        <img 
          src={u.profilePic} 
          alt={u.username} 
          className="w-12 h-12 rounded-full object-cover"
          referrerPolicy="no-referrer"
        />
      );
    }
    return (
      <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center text-white font-semibold">
        {(u?.username || 'U')[0].toUpperCase()}
      </div>
    );
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 text-gray-100">
      {!selectedChat ? (
        <div className="m-auto text-gray-400">Select a user to start chatting</div>
      ) : (
        <>
          {/* Chat Header */}
          <div className="flex-shrink-0 h-16 px-6 bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-700/50 flex items-center">
            <div className="flex items-center gap-3 w-full">
              <div className="flex-shrink-0">
                {renderAvatar(selectedChat)}
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-base leading-tight">
                  {selectedChat?.username || 'Unknown User'}
                </h2>
                {onlineUsers?.includes(String(selectedChat._id)) && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                    <span className="text-xs text-gray-400 truncate">Active now</span>
                  </div>
                )}
              </div>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <button 
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-full hover:bg-zinc-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>
              <button 
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-full hover:bg-zinc-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div ref={containerRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar">
           {msgs.map((m) => {
  // Fix: Comparison supporting both String and Populated Object IDs
  const isMe = (m.senderId?._id || m.senderId) === (user?._id || user?.id);
  const messageKey = m._id || `msg-${m.createdAt || Date.now()}`;
  
  return (
    <div 
      key={messageKey}
      className={`flex mb-4 ${isMe ? 'justify-end' : 'justify-start'}`}
    >
                  <div className={`group relative max-w-[75%] ${isMe ? 'text-right' : 'text-left'}`}>
                    {m.image && (
                      <div className="mb-1 rounded-lg overflow-hidden">
                        <img 
                          src={m.image} 
                          alt="Message attachment" 
                          className="max-h-60 w-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/300x200?text=Image+Not+Available';
                          }}
                        />
                      </div>
                    )}
                    
                    <div 
                      className={`inline-block px-4 py-2 rounded-2xl ${
                        isMe 
                          ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-br-none' 
                          : 'bg-zinc-800 text-gray-100 rounded-bl-none'
                      }`}
                    >
                      {m.message || ''}
                      <div className="text-xs opacity-70 mt-1">
                        {formatTime(m.createdAt)}
                      </div>
                    </div>
                    
                    {isMe && (
                      <button 
                        onClick={() => deleteMessage(m._id, selectedChat._id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute -top-2 -right-2 bg-zinc-800 p-1 rounded-full"
                        title="Delete message"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    )}
                    
                    {isMe && m.isSeen && (
                      <div className="text-xs text-gray-400 mt-1 text-right">Seen ✓</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {selectedChat?._id && typingUsers[selectedChat._id] && (
            <div className="px-4 py-2 text-sm text-gray-400">
              {selectedChat.username} is typing...
            </div>
          )}
          
          <div className="p-4 border-t border-zinc-800 bg-zinc-900">
            <MessageInput />
          </div>
        </>
      )}
    </div>
  );
});

export default ChatWindow;