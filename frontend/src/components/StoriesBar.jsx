import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { PlusIcon } from '@heroicons/react/24/solid';
import StoryViewer from './StoryViewer';

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export default function StoriesBar({ currentUser, onStoryCreated }) {
  const [storyGroups, setStoryGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingIndex, setViewingIndex] = useState(null);
  const fileRef = useRef(null);

  const fetchStories = async () => {
    try {
      const res = await axios.get('/api/stories', { withCredentials: true });
      setStoryGroups(res.data || []);
    } catch (e) {
      if (e.response?.status !== 401) console.error('Failed to load stories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStories(); }, []);

  const handleCreateStory = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!cloudName || !uploadPreset) {
      console.error('Cloudinary not configured — missing env vars');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    try {
      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: formData }
      );
      if (!uploadRes.ok) throw new Error('Cloudinary upload failed');
      const uploadData = await uploadRes.json();
      await axios.post('/api/stories', { image: uploadData.secure_url }, { withCredentials: true });
      fetchStories();
      if (onStoryCreated) onStoryCreated();
    } catch (err) {
      console.error('Failed to create story:', err);
    }
    e.target.value = '';
  };

  const currentUserGroup = storyGroups.find(
    g => g.user?._id === currentUser?._id
  );

  const otherGroups = storyGroups.filter(
    g => g.user?._id !== currentUser?._id
  );

  const ordered = currentUserGroup
    ? [currentUserGroup, ...otherGroups]
    : [...otherGroups];

  return (
    <>
      <div className="flex gap-3 overflow-x-auto scrollbar-thin py-3 px-1">
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <button
            onClick={() => fileRef.current?.click()}
            className="w-16 h-16 rounded-full bg-dark-800 border-2 border-dashed border-brand-500 flex items-center justify-center relative"
          >
            <PlusIcon className="w-6 h-6 text-brand-500" />
          </button>
          <span className="text-[10px] text-dark-400">Your Story</span>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleCreateStory} />
        </div>

        {loading ? (
          <div className="flex gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-dark-800 animate-pulse" />
                <div className="w-12 h-2 rounded bg-dark-800 animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          ordered.filter(g => g.stories?.length > 0).map((group, idx) => {
            const hasUnseen = group.stories.some(
              s => !s.viewedBy?.some(v => String(v) === String(currentUser?._id))
            );
            return (
              <button
                key={group.user?._id}
                onClick={() => setViewingIndex(idx)}
                className="flex flex-col items-center gap-1 flex-shrink-0"
              >
                <div className={`w-16 h-16 rounded-full p-[2px] ${hasUnseen ? 'bg-gradient-brand' : 'bg-dark-700'}`}>
                  <img
                    src={group.user?.profilePic || '/default-avatar.png'}
                    className="w-full h-full rounded-full object-cover border-2 border-dark-900"
                    alt=""
                  />
                </div>
                <span className="text-[10px] text-dark-300 truncate max-w-[60px]">
                  {group.user?.username || 'user'}
                </span>
              </button>
            );
          })
        )}
      </div>

      {viewingIndex !== null && (
        <StoryViewer
          storyGroups={ordered}
          initialIndex={viewingIndex}
          currentUserId={currentUser?._id}
          onClose={() => { setViewingIndex(null); fetchStories(); }}
        />
      )}
    </>
  );
}
