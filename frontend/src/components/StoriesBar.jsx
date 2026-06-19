import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { PlusIcon } from '@heroicons/react/24/solid';
import StoryViewer from './StoryViewer';

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const getUserId = (u) => u?.id || u?._id;

export default function StoriesBar({ currentUser, onStoryCreated }) {
  const [storyGroups, setStoryGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [viewingIndex, setViewingIndex] = useState(null);
  const [closeFriendsOnly, setCloseFriendsOnly] = useState(false);
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
      toast.error('Story upload not configured');
      return;
    }

    setCreating(true);
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
      await axios.post('/api/stories', {
        image: uploadData.secure_url,
        closeFriendsOnly
      }, { withCredentials: true });
      toast.success('Story created!');
      setCloseFriendsOnly(false);
      fetchStories();
      if (onStoryCreated) onStoryCreated();
    } catch (err) {
      console.error('Failed to create story:', err);
      toast.error('Failed to create story');
    }
    setCreating(false);
    e.target.value = '';
  };

  const currentUserId = getUserId(currentUser);

  const currentUserGroup = storyGroups.find(
    g => String(g.user?._id || g.user?.id) === String(currentUserId)
  );

  const otherGroups = storyGroups.filter(
    g => String(g.user?._id || g.user?.id) !== String(currentUserId)
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
            disabled={creating}
            className={`w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center relative transition-all ${
              creating
                ? 'border-brand-500/50 bg-dark-800'
                : closeFriendsOnly ? 'border-emerald-500 bg-emerald-500/10' : 'border-brand-500'
            }`}
          >
            {creating ? (
              <span className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <PlusIcon className={`w-6 h-6 ${closeFriendsOnly ? 'text-emerald-500' : 'text-brand-500'}`} />
            )}
            {closeFriendsOnly && (
              <span className="absolute -bottom-1 -right-1 text-[8px] bg-emerald-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">CF</span>
            )}
          </button>
          <span className="text-[10px] text-dark-400">Your Story</span>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setCloseFriendsOnly(!closeFriendsOnly); }}
              disabled={creating}
              className={`text-[9px] px-1.5 py-0.5 rounded-full transition-colors ${closeFriendsOnly ? 'bg-emerald-500/20 text-emerald-400' : 'text-dark-500 hover:text-dark-300'}`}
              title={closeFriendsOnly ? 'Close friends only' : 'Public story'}
            >
              {closeFriendsOnly ? '⭐ Close Friends' : 'Public'}
            </button>
          </div>
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
              s => !s.viewedBy?.some(v => String(v) === String(currentUserId))
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
                    loading="lazy"
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
          currentUserId={currentUserId}
          onClose={() => { setViewingIndex(null); fetchStories(); }}
        />
      )}
    </>
  );
}
