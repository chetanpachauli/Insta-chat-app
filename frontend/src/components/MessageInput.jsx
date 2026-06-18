import React, { memo, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { ChatContext } from '../context/ChatContext';
import { AuthContext } from '../context/AuthContext';
import EmojiPicker from 'emoji-picker-react';
import { PaperAirplaneIcon, PhotoIcon, FaceSmileIcon, MicrophoneIcon, StopIcon } from '@heroicons/react/24/outline';
import compressImage from '../utils/compressImage';

const MessageInput = memo(function MessageInput() {
  const chat = useContext(ChatContext);
  const auth = useContext(AuthContext);

  if (!chat || !auth) {
    return <div className="text-sm text-dark-400">Loading...</div>;
  }

  const {
    selectedChat,
    sendMessage = () => Promise.resolve(),
    handleTyping = () => {},
    handleStopTyping = () => {},
  } = chat;

  const selectedId = selectedChat?._id || selectedChat?.id;
  const isGroup = selectedChat?.isGroup;
  const conversationId = isGroup ? selectedId : null;
  const { user } = auth;
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordTimer, setRecordTimer] = useState(0);
  const typingTimer = useRef(null);
  const emojiContainerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordTimerRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!showEmoji) return;
      if (!emojiContainerRef.current?.contains(e.target)) setShowEmoji(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [showEmoji]);

  const onSend = useCallback(async () => {
    if (!selectedId) return;
    const messageText = text.trim();
    if (!messageText && !uploading) return;

    try {
      await sendMessage({ receiverId: selectedId, message: messageText, image: null, conversationId });
      setText('');
      handleStopTyping(selectedId, isGroup);
    } catch (err) {
      console.error('Failed to send message:', err);
      chat.setError?.('Failed to send message. Please try again.');
    }
  }, [selectedId, text, sendMessage, handleStopTyping, uploading, chat, conversationId, isGroup]);

  const onPick = useCallback((emojiData) => {
    setText(t => t + emojiData.emoji);
  }, []);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    try {
      setUploading(true);
      const compressed = file.type.startsWith('image/') ? await compressImage(file, 1000, 0.8) : file;
      await sendMessage({ receiverId: selectedId, message: text || '', image: compressed, conversationId });
      setText('');
    } catch (error) {
      console.error('Error sending image:', error);
    } finally {
      e.target.value = null;
      setUploading(false);
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (!selectedId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        setRecordTimer(0);

        if (audioBlob.size > 0) {
          try {
            setUploading(true);
            await sendMessage({
              receiverId: selectedId,
              message: '',
              image: null,
              audio: audioBlob,
              conversationId
            });
          } catch (err) {
            console.error('Error sending voice message:', err);
          } finally {
            setUploading(false);
          }
        }
      };

      mediaRecorder.start();
      setRecording(true);
      setRecordTimer(0);
      recordTimerRef.current = setInterval(() => {
        setRecordTimer(t => t + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      chat.setError?.('Microphone access denied. Please allow microphone permissions.');
    }
  }, [selectedId, sendMessage, chat]);

  const toggleRecording = useCallback(() => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [recording, startRecording, stopRecording]);

  const handleChange = useCallback((e) => {
    const v = e.target.value;
    setText(v);
    if (!selectedId) return;
    handleTyping(selectedId, isGroup);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => handleStopTyping(selectedId, isGroup), 2000);
  }, [selectedId, handleTyping, handleStopTyping, isGroup]);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  if (!selectedChat) return null;

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2">
        {recording ? (
          <div className="flex items-center gap-3 w-full">
            <div className="flex items-center gap-2 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-mono">{formatTime(recordTimer)}</span>
            </div>
            <div className="flex-1" />
            <button
              type="button"
              onClick={stopRecording}
              className="btn-icon text-red-400 hover:bg-red-500/10 shrink-0"
            >
              <StopIcon className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowEmoji(!showEmoji); }}
              className="btn-icon text-dark-400 hover:text-white shrink-0"
              disabled={uploading}
            >
              <FaceSmileIcon className="w-5 h-5" />
            </button>

            {showEmoji && (
              <div
                ref={emojiContainerRef}
                className="absolute bottom-16 left-0 z-50 animate-scale-in"
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
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
                placeholder="Type a message..."
                className="w-full bg-dark-800 text-white px-4 py-2.5 rounded-xl text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-500/30
                           placeholder:text-dark-400 transition-all duration-200"
                disabled={uploading}
              />
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleRecording}
                disabled={uploading}
                className="btn-icon text-dark-400 hover:text-brand-400 shrink-0"
              >
                <MicrophoneIcon className="w-5 h-5" />
              </button>

              <label className={`btn-icon ${uploading ? 'opacity-50 cursor-not-allowed' : 'text-dark-400 hover:text-white cursor-pointer'} shrink-0`}>
                <PhotoIcon className="w-5 h-5" />
                <input type="file" accept="image/*" onChange={onFile} className="hidden" disabled={uploading} />
              </label>

              <button
                type="button"
                onClick={onSend}
                disabled={!text.trim() || uploading}
                className={`btn-icon shrink-0 transition-colors ${
                  text.trim() && !uploading
                    ? 'text-brand-400 hover:bg-brand-500/10'
                    : 'text-dark-500 cursor-not-allowed'
                }`}
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

export default MessageInput;
