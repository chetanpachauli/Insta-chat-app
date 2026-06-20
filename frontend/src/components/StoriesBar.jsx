import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { PlusIcon } from '@heroicons/react/24/solid';
import StoryViewer from './StoryViewer';

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const PRESET_SONGS = [
  { id: '1', name: 'Ambient Gold', artist: 'Chillhop Music', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: '2', name: 'Synthwave Boulevard', artist: 'Retro Beats', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: '3', name: 'Acoustic Sunrise', artist: 'Guitar Chill', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { id: '4', name: 'Lofi Coffee Shop', artist: 'Coffee Shop Beats', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
  { id: '5', name: 'Summer Breeze', artist: 'Dance Groove', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' }
];

const getUserId = (u) => u?.id || u?._id;

export default function StoriesBar({ currentUser, onStoryCreated }) {
  const [storyGroups, setStoryGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [viewingIndex, setViewingIndex] = useState(null);
  const [closeFriendsOnly, setCloseFriendsOnly] = useState(false);
  
  // Story Creation Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [selectedSong, setSelectedSong] = useState(null);
  const [playingSongId, setPlayingSongId] = useState(null);
  const previewAudioRef = useRef(null);
  
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

  useEffect(() => {
    fetchStories();
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  const handleSelectFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setShowCreateModal(true);
    e.target.value = '';
  };

  const handleCloseModal = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setPlayingSongId(null);
    setSelectedFile(null);
    setPreviewUrl('');
    setSelectedSong(null);
    setShowCreateModal(false);
  };

  const handleTogglePlaySong = (song, e) => {
    e.stopPropagation();
    if (playingSongId === song.id) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setPlayingSongId(null);
    } else {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      previewAudioRef.current = new Audio(song.url);
      previewAudioRef.current.volume = 0.5;
      previewAudioRef.current.play().catch(err => console.log('Preview block:', err));
      setPlayingSongId(song.id);
      
      previewAudioRef.current.onended = () => {
        setPlayingSongId(null);
      };
    }
  };

  const handleUploadAndCreateStory = async () => {
    if (!selectedFile) return;

    if (!cloudName || !uploadPreset) {
      toast.error('Story upload not configured');
      return;
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    setPlayingSongId(null);

    setCreating(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
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
        closeFriendsOnly,
        songName: selectedSong?.name || null,
        songArtist: selectedSong?.artist || null,
        songUrl: selectedSong?.url || null
      }, { withCredentials: true });

      toast.success('Story created!');
      handleCloseModal();
      fetchStories();
      if (onStoryCreated) onStoryCreated();
    } catch (err) {
      console.error('Failed to create story:', err);
      toast.error('Failed to create story');
      setCreating(false);
    }
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
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleSelectFile} />
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

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={handleCloseModal}>
          <div className="bg-dark-800 border border-dark-700/80 rounded-2xl w-full max-w-[420px] overflow-hidden flex flex-col shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-dark-700/50 flex justify-between items-center">
              <h3 className="font-bold text-sm tracking-wide">Create Story</h3>
              <button onClick={handleCloseModal} className="text-dark-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto max-h-[70dvh] space-y-4 scrollbar-thin">
              <div className="relative aspect-[9/16] max-h-[300px] w-full bg-zinc-950 rounded-xl overflow-hidden flex items-center justify-center border border-dark-700/50 shadow-inner">
                <img src={previewUrl} className="w-full h-full object-contain" alt="Preview" />
                {selectedSong && (
                  <div className="absolute top-4 left-4 bg-black/60 border border-white/10 px-2.5 py-1 rounded-lg text-xs font-semibold text-pink-400 backdrop-blur-md flex items-center gap-1 animate-pulse">
                    <span>🎵</span>
                    <span>{selectedSong.name} - {selectedSong.artist}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between bg-dark-850/50 border border-dark-700/50 p-3 rounded-xl">
                <span className="text-xs font-semibold text-dark-100">⭐ Close Friends Only</span>
                <button
                  type="button"
                  onClick={() => setCloseFriendsOnly(!closeFriendsOnly)}
                  className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${closeFriendsOnly ? 'bg-emerald-500 justify-end' : 'bg-dark-600 justify-start'}`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-dark-400 uppercase tracking-wider">Add Music</h4>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto scrollbar-thin pr-1">
                  {PRESET_SONGS.map(song => {
                    const isSelected = selectedSong?.id === song.id;
                    const isPlaying = playingSongId === song.id;
                    return (
                      <div
                        key={song.id}
                        onClick={() => setSelectedSong(isSelected ? null : song)}
                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer border transition-all ${
                          isSelected ? 'bg-pink-500/10 border-pink-500/30' : 'bg-dark-850/30 border-transparent hover:bg-dark-850/80'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => handleTogglePlaySong(song, e)}
                            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                              isPlaying ? 'bg-pink-500 text-white' : 'bg-dark-700 text-dark-300 hover:bg-dark-600 hover:text-white'
                            }`}
                          >
                            {isPlaying ? (
                              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5 fill-current ml-0.5" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            )}
                          </button>
                          <div className="min-w-0">
                            <p className={`text-xs font-semibold truncate ${isSelected ? 'text-pink-400' : 'text-dark-100'}`}>{song.name}</p>
                            <p className="text-[10px] text-dark-400 truncate mt-0.5">{song.artist}</p>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="text-pink-500 shrink-0 mr-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-dark-700/50 flex gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={creating}
                className="flex-1 px-4 py-2.5 bg-dark-700 hover:bg-dark-600 rounded-xl text-xs font-semibold text-white transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadAndCreateStory}
                disabled={creating}
                className="flex-1 px-4 py-2.5 bg-gradient-brand hover:brightness-110 rounded-xl text-xs font-semibold text-white transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-lg active:scale-95"
              >
                {creating ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sharing...</span>
                  </>
                ) : (
                  <span>Share to Story</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
