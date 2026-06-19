import React, { useState, useEffect, useCallback, useRef } from 'react';
import { XMarkIcon, TrashIcon, EyeIcon, PaperAirplaneIcon, PhotoIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useConfirm } from '../hooks/useConfirm';
import { toast } from 'react-hot-toast';

export default function StoryViewer({ storyGroups, initialIndex, currentUserId, onClose }) {
  const confirm = useConfirm();
  const [groupIndex, setGroupIndex] = useState(initialIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const DURATION = 5000;

  const currentGroup = storyGroups[groupIndex];
  const stories = currentGroup?.stories || [];
  const currentStory = stories[storyIndex];
  const [showViews, setShowViews] = useState(false);
  const [viewers, setViewers] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const isOwnStory = String(currentGroup?.user?._id || currentGroup?.user?.id) === String(currentUserId);

  const markViewed = useCallback(async (storyId) => {
    try { await axios.post(`/api/stories/${storyId}/view`, {}, { withCredentials: true }); } catch (e) {}
  }, []);

  const next = useCallback(() => {
    if (storyIndex < stories.length - 1) {
      setStoryIndex(i => i + 1);
      setProgress(0);
    } else if (groupIndex < storyGroups.length - 1) {
      setGroupIndex(i => i + 1);
      setStoryIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [storyIndex, stories.length, groupIndex, storyGroups.length, onClose]);

  const prev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex(i => i - 1);
      setProgress(0);
    } else if (groupIndex > 0) {
      setGroupIndex(i => i - 1);
      setStoryIndex(storyGroups[i - 1]?.stories.length - 1 || 0);
      setProgress(0);
    }
  }, [storyIndex, groupIndex, storyGroups]);

  useEffect(() => {
    if (currentStory) { markViewed(currentStory._id); setImageLoaded(false); }
  }, [currentStory, markViewed]);

  useEffect(() => {
    setProgress(0);
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) next();
    }, 50);
    return () => clearInterval(timerRef.current);
  }, [groupIndex, storyIndex, next]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') next();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'Escape') onClose();
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const fetchViews = async () => {
    if (!currentStory?._id) return;
    try {
      const res = await axios.get(`/api/stories/${currentStory._id}/views`, { withCredentials: true });
      setViewers(res.data || []);
    } catch (e) { /* ignore */ }
  };

  const handleReply = async () => {
    const text = replyText.trim();
    if (!text || !currentStory?._id || !currentGroup?.user?._id) return;
    try {
      const formData = new FormData();
      formData.append('message', `📸 Reply to story: ${text}`);
      formData.append('receiverId', currentGroup.user._id);
      await axios.post(`/api/messages/send/${currentUserId}`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`Replied to ${currentGroup.user.username || 'user'}`);
      setReplyText('');
    } catch (e) {
      toast.error('Failed to send reply');
    }
  };

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center" onClick={onClose}>
      <div
        className="relative w-full max-w-[420px] h-full max-h-[700px] bg-dark-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bars */}
        <div className="absolute top-2 left-2 right-2 z-20 flex gap-1">
          {stories.map((s, i) => (
            <div key={s._id} className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-75"
                style={{
                  width: i < storyIndex ? '100%' : i === storyIndex ? `${progress}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 left-4 right-4 z-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={currentGroup?.user?.profilePic || '/default-avatar.png'}
              className="w-8 h-8 rounded-full border border-white/30"
              alt=""
              loading="lazy"
            />
            <span className="text-sm font-semibold text-white">{currentGroup?.user?.username}</span>
            <span className="text-xs text-white/60">
              {new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isOwnStory && (
              <>
                <button
                  onClick={() => { fetchViews(); setShowViews(!showViews); }}
                  className="text-white/60 hover:text-white relative"
                  title="View story views"
                >
                  <EyeIcon className="w-5 h-5" />
                  {currentStory?.viewedBy?.length > 0 && (
                    <span className="absolute -top-1 -right-1 text-[10px] bg-brand-500 rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                      {currentStory.viewedBy.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={async () => {
                    if (!(await confirm('Delete this story?'))) return;
                    try {
                      await axios.delete(`/api/stories/${currentStory._id}`, { withCredentials: true });
                      onClose();
                    } catch (e) { console.error('Failed to delete story'); }
                  }}
                  className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-xs font-medium"
                >
                  <TrashIcon className="w-4 h-4" />
                  Delete
                </button>
              </>
            )}
            <button onClick={onClose} className="text-white/80 hover:text-white">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Story image */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <PhotoIcon className="w-12 h-12 text-dark-600 animate-pulse" />
          </div>
        )}
        <img
          src={currentStory.image}
          className={`w-full h-full object-contain transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          alt="story"
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)}
        />

        {/* Views modal */}
        {showViews && (
          <div className="absolute bottom-20 left-4 right-4 z-30 bg-dark-800/95 backdrop-blur-md rounded-xl border border-dark-700 max-h-48 overflow-y-auto">
            <div className="p-3 border-b border-dark-700">
              <p className="text-sm font-semibold">Views ({viewers.length})</p>
            </div>
            {viewers.length === 0 ? (
              <p className="text-xs text-dark-400 p-3">No views yet</p>
            ) : (
              viewers.map(v => (
                <div key={v._id} className="flex items-center gap-2 p-2 hover:bg-dark-700/50">
                  <img src={v.profilePic || '/default-avatar.png'} className="w-7 h-7 rounded-full object-cover" alt="" loading="lazy" />
                  <span className="text-sm">{v.username}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Reply input */}
        {!isOwnStory && (
          <div className="absolute bottom-4 left-4 right-4 z-30 flex items-center gap-2">
            <input
              type="text"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleReply(); }}
              placeholder="Reply to this story..."
              className="flex-1 bg-dark-800/80 backdrop-blur-sm text-white px-4 py-2.5 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 placeholder:text-dark-400 border border-dark-700"
            />
            <button
              onClick={handleReply}
              disabled={!replyText.trim()}
              className={`btn-icon rounded-full p-2.5 ${replyText.trim() ? 'text-brand-400 bg-brand-500/10' : 'text-dark-500'}`}
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Tap zones */}
        <div
          className="absolute inset-0 z-10 flex"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            if (x < rect.width * 0.3) prev();
            else if (x > rect.width * 0.7) next();
            else return;
          }}
        />
      </div>
    </div>
  );
}
