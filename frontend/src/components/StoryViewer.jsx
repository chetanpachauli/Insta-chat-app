import React, { useState, useEffect, useCallback, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

export default function StoryViewer({ storyGroups, initialIndex, currentUserId, onClose }) {
  const [groupIndex, setGroupIndex] = useState(initialIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const DURATION = 5000;

  const currentGroup = storyGroups[groupIndex];
  const stories = currentGroup?.stories || [];
  const currentStory = stories[storyIndex];

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
    if (currentStory) markViewed(currentStory._id);
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
            />
            <span className="text-sm font-semibold text-white">{currentGroup?.user?.username}</span>
            <span className="text-xs text-white/60">
              {new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Story image */}
        <img
          src={currentStory.image}
          className="w-full h-full object-contain"
          alt="story"
        />

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
