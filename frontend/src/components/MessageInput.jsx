import React, { memo, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { ChatContext } from '../context/ChatContext';
import { AuthContext } from '../context/AuthContext';
import EmojiPicker from 'emoji-picker-react';
import { PaperAirplaneIcon, PhotoIcon, FaceSmileIcon } from '@heroicons/react/24/outline';

const MessageInput = memo(function MessageInput() {
  const chat = useContext(ChatContext);
  const auth = useContext(AuthContext);
  
  // Early return if no chat context or auth
  if (!chat || !auth) {
    return (
      <div className="p-4 bg-zinc-900 border-t border-zinc-800">
        <div className="text-sm text-gray-500">Loading message input...</div>
      </div>
    );
  }

  const { 
    selectedChat,
    sendMessage = () => Promise.resolve(),
    uploadImage = () => Promise.resolve(),
    handleTyping = () => {},
    handleStopTyping = () => {}
  } = chat || {};
  
  const selectedId = selectedChat?._id || selectedChat?.id;
  const currentUserId = auth?.user?._id || auth?.user?.id;
  
  console.log('Selected Chat ID:', selectedId);
  console.log('Current User ID:', currentUserId);
  
  // Show loading state if chat is selected but ID is missing
  if (!selectedId && selectedChat) {
    return (
      <div className="p-4 border-t border-zinc-800 bg-zinc-900 text-center text-gray-400">
        Loading input...
      </div>
    );
  }
  
  // Return null only if there's no selected chat at all
  if (!selectedChat) return null;
  
  // currentUserId is already defined above
  const { user } = auth;
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const typingTimer = useRef(null);
  const pickerRef = useRef(null);
  const emojiContainerRef = useRef(null);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const onDocClick = (e) => {
      if (!showEmoji) return;
      if (!emojiContainerRef.current) return;
      if (!emojiContainerRef.current.contains(e.target)) setShowEmoji(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [showEmoji]);

  const onSend = useCallback(async () => {
    if (!selectedId) {
      console.error('Cannot send message: No chat selected');
      return;
    }

    const messageText = text.trim();
    if (!messageText && !uploading) {
      console.error('Cannot send empty message when not uploading');
      return;
    }
    
    try {
      console.log('Sending message to:', selectedId);
      await sendMessage({ 
        receiverId: selectedId, 
        message: messageText,
        image: null
      });
      setText('');
      handleStopTyping(selectedId);
    } catch (err) {
      console.error('Failed to send message:', err);
      chat.setError?.('Failed to send message. Please try again.');
    }
  }, [selectedId, text, sendMessage, handleStopTyping, uploading, chat]);

  const onPick = useCallback((emojiData) => {
    setText(t => t + emojiData.emoji);
    setShowEmoji(false);
  }, []);

  const onFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!selectedId) {
      console.error('No chat selected');
      return;
    }

    try {
      setUploading(true);
      await sendMessage({ 
        receiverId: selectedId, 
        message: text || '', 
        image: file
      });
      setText('');
    } catch (error) {
      console.error('Error sending message with image:', error);
    } finally {
      e.target.value = null;
      setUploading(false);
    }
  };

  const handleChange = useCallback((e) => {
    const v = e.target.value;
    setText(v);
    
    if (!selectedId) return;
    
    // Notify other user that we're typing
    handleTyping(selectedId);
    
    // Clear any existing timer
    if (typingTimer.current) clearTimeout(typingTimer.current);
    
    // Set a new timer to stop the typing indicator
    typingTimer.current = setTimeout(() => {
      handleStopTyping(selectedId);
    }, 2000);
  }, [selectedId, handleTyping, handleStopTyping]);

  // Handle typing indicator
  useEffect(() => {
    if (!selectedId) return;
    
    const messageText = text.trim();
    
    if (messageText) {
      handleTyping(selectedId);
      
      if (typingTimer.current) {
        clearTimeout(typingTimer.current);
      }
      
      typingTimer.current = setTimeout(() => {
        handleStopTyping(selectedId);
      }, 2000);
    } else {
      handleStopTyping(selectedId);
    }
    
    return () => {
      if (typingTimer.current) {
        clearTimeout(typingTimer.current);
      }
    };
  }, [text, selectedId, handleTyping, handleStopTyping]);

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2">
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowEmoji(!showEmoji);
          }}
          className="p-2 text-gray-400 hover:text-white transition-colors"
          aria-label="Toggle emoji picker"
          disabled={uploading}
        >
          <FaceSmileIcon className="w-6 h-6" />
        </button>
        
        {showEmoji && (
          <div 
            ref={emojiContainerRef} 
            className="absolute bottom-16 left-4 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <EmojiPicker 
              onEmojiClick={onPick} 
              width={300} 
              height={350} 
              searchDisabled
              skinTonesDisabled
              previewConfig={{ showPreview: false }}
              lazyLoadEmojis
            />
          </div>
        )}
        
        <div className="flex-1 relative">
          <input
            type="text"
            value={text}
            onChange={handleChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Type a message..."
            className="w-full bg-zinc-800 text-white px-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={uploading}
            aria-label="Message input"
          />
        </div>

        <div className="flex items-center gap-1">
          <label className={`p-2 ${uploading ? 'opacity-50 cursor-not-allowed' : 'text-gray-400 hover:text-white cursor-pointer transition-colors'}`}>
            <PhotoIcon className="w-6 h-6" />
            <input
              type="file"
              accept="image/*"
              onChange={onFile}
              className="hidden"
              disabled={uploading}
            />
          </label>
          
          <button
            type="button"
            onClick={onSend}
            disabled={!text.trim() || uploading}
            className={`p-2 rounded-full transition-colors ${
              text.trim() && !uploading 
                ? 'text-purple-500 hover:bg-purple-500/10' 
                : 'text-gray-500 cursor-not-allowed'
            }`}
            aria-label="Send message"
          >
            <PaperAirplaneIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
});

export default MessageInput;