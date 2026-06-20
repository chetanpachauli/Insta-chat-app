import React, { useState, useEffect, useRef, useCallback, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import {
  HeartIcon,
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  BookmarkIcon,
  ArrowLeftIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  MusicalNoteIcon,
  PlusIcon,
  PlayIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid, BookmarkIcon as BookmarkIconSolid } from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';
import ShareModal from '../components/ShareModal';
import { ReelsSkeleton } from '../components/SkeletonLoaders';
import EmptyState from '../components/EmptyState';

function ReelVideo({ post, index, videoRefs, muted, onToggleMute, onTimeUpdate, duration, currentTime, buffering }) {
  const observerRef = useRef(null);
  const videoElRef = useRef(null);

  const setVideoRef = useCallback((el) => {
    videoElRef.current = el;
    videoRefs.current[index] = el;
    if (observerRef.current) { observerRef.current.disconnect(); observerRef.current = null; }
    if (el) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            el.play().catch(() => {});
          } else {
            el.pause();
          }
        },
        { threshold: 0.5 }
      );
      observer.observe(el);
      observerRef.current = observer;
    }
  }, [index, videoRefs]);

  useEffect(() => {
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    const el = videoElRef.current;
    if (!el) return;
    el.muted = muted;
  }, [muted]);

  const src = post.image;
  const isVideo = post.mediaType === 'video' ||
    post.mimetype?.includes('video') ||
    (post.image && /\.(mp4|mov|webm|quicktime)$/i.test(post.image));

  if (isVideo) {
    return (
      <>
        <video
          ref={setVideoRef}
          src={src}
          className="w-full h-full object-cover"
          loop playsInline crossOrigin="anonymous"
          muted={muted}
          onTimeUpdate={(e) => onTimeUpdate(index, e.target.currentTime, e.target.duration)}
          onLoadedMetadata={(e) => onTimeUpdate(index, 0, e.target.duration)}
          onWaiting={() => onTimeUpdate(index, currentTime, duration, true)}
          onCanPlay={() => onTimeUpdate(index, currentTime, duration, false)}
          onClick={(e) => {
            e.stopPropagation();
            const video = videoRefs.current[index];
            if (!video) return;
            if (video.paused) video.play().catch(() => {});
            else video.pause();
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <div
          className="absolute bottom-2 left-2 z-30 cursor-pointer drop-shadow-lg"
          onClick={(e) => { e.stopPropagation(); onToggleMute(index); }}
        >
          {muted
            ? <SpeakerXMarkIcon className="w-5 h-5 md:w-6 md:h-6 text-white bg-black/40 rounded-full p-1" />
            : <SpeakerWaveIcon className="w-5 h-5 md:w-6 md:h-6 text-white bg-black/40 rounded-full p-1" />
          }
        </div>
      </>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-dark-800">
      <img
        src={src}
        className="w-full h-full object-cover"
        alt="reel"
        crossOrigin="anonymous"
        onError={(e) => { e.target.src = '/placeholder-reel.jpg'; }}
      />
      <PlayIcon className="absolute w-12 h-12 text-white/60" />
    </div>
  );
}

const MemoizedReelVideo = React.memo(ReelVideo);

export default function Reels() {
  const navigate = useNavigate();
  const { user: currentUser } = useContext(AuthContext);
  const [sharePost, setSharePost] = useState(null);
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState({});
  const [saved, setSaved] = useState({});
  const [likesCount, setLikesCount] = useState({});
  const [showHeart, setShowHeart] = useState({});
  const [following, setFollowing] = useState({});
  const [mutedStates, setMutedStates] = useState({});
  const [videoProgress, setVideoProgress] = useState({});
  const [bufferingStates, setBufferingStates] = useState({});
  const [pausedStates, setPausedStates] = useState({});
  const videoRefs = useRef([]);
  const lastTap = useRef(0);
  const isMounted = useRef(true);
  const cacheKey = 'reels_cache';

  const handleCommentAdded = useCallback((postId, newComment) => {
    setPosts(prev => prev.map(p => {
      if (p._id === postId) {
        return {
          ...p,
          comments: [...(p.comments || []), newComment]
        };
      }
      return p;
    }));
  }, []);

  const handleTimeUpdate = useCallback((idx, ct, dur, isBuffering) => {
    setVideoProgress(prev => ({ ...prev, [idx]: { currentTime: ct, duration: dur } }));
    if (isBuffering !== undefined) {
      setBufferingStates(prev => ({ ...prev, [idx]: isBuffering }));
    }
  }, []);

  const handleToggleMute = useCallback((idx) => {
    setMutedStates(prev => {
      const next = !prev[idx];
      const video = videoRefs.current[idx];
      if (video) video.muted = next;
      return { ...prev, [idx]: next };
    });
  }, []);

  const fetchReels = useCallback(async () => {
    if (!isMounted.current) return;
    setLoading(true);

    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          applyPosts(parsed);
          setLoading(false);
        }
      }
    } catch { /* ignore */ }

    try {
      const res = await axios.get('/api/posts/explore', {
        params: { type: 'reel' },
        withCredentials: true,
        timeout: 10000
      });

      if (!res.data || !Array.isArray(res.data)) throw new Error('Invalid response format');

      const validPosts = res.data.filter(post =>
        post && post._id && (post.mediaUrl || post.video || post.image)
      );

      if (isMounted.current) {
        applyPosts(validPosts);
        try { sessionStorage.setItem(cacheKey, JSON.stringify(validPosts)); } catch { /* ignore */ }
      }
    } catch (error) {
      if (!posts.length) toast.error(error.response?.data?.message || 'Failed to load reels');
      if (!posts.length) setPosts([]);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [currentUser]);

  const applyPosts = useCallback((validPosts) => {
    const initialLiked = {};
    const initialSaved = {};
    const initialCounts = {};
    const initialFollowing = {};
    const initialMuted = {};

    validPosts.forEach((post, idx) => {
      initialLiked[post._id] = Array.isArray(post.likes) && post.likes.some(id =>
        id && currentUser?._id && String(id) === String(currentUser._id)
      );
      initialSaved[post._id] = Array.isArray(post.savedBy) && post.savedBy.some(id =>
        id && currentUser?._id && String(id) === String(currentUser._id)
      );
      initialCounts[post._id] = post.likesCount || post.likes?.length || 0;
      initialFollowing[post._id] = post.author?.followers?.some(id =>
        id && currentUser?._id && String(id) === String(currentUser._id)
      ) || false;
      initialMuted[idx] = true;
    });

    setPosts(validPosts);
    setLiked(initialLiked);
    setSaved(initialSaved);
    setLikesCount(initialCounts);
    setFollowing(initialFollowing);
    setMutedStates(initialMuted);
    videoRefs.current = new Array(validPosts.length);
  }, [currentUser]);

  useEffect(() => {
    isMounted.current = true;
    fetchReels();
    return () => {
      isMounted.current = false;
      videoRefs.current = [];
    };
  }, [fetchReels]);

  const handleSave = async (postId) => {
    const isCurrentlySaved = saved[postId];
    setSaved(prev => ({ ...prev, [postId]: !isCurrentlySaved }));
    try {
      await axios.post(`/api/posts/${postId}/save`, {
        action: isCurrentlySaved ? 'unsave' : 'save'
      }, { withCredentials: true });
    } catch (error) {
      toast.error('Failed to save post');
      setSaved(prev => ({ ...prev, [postId]: isCurrentlySaved }));
    }
  };

  const handleLike = async (postId) => {
    const isCurrentlyLiked = liked[postId];
    setLiked(prev => ({ ...prev, [postId]: !isCurrentlyLiked }));
    setLikesCount(prev => ({ ...prev, [postId]: prev[postId] + (isCurrentlyLiked ? -1 : 1) }));
    try {
      await axios.post(`/api/posts/${postId}/like`, { action: isCurrentlyLiked ? 'unlike' : 'like' });
    } catch (error) {
      setLiked(prev => ({ ...prev, [postId]: isCurrentlyLiked }));
      setLikesCount(prev => ({ ...prev, [postId]: prev[postId] - (isCurrentlyLiked ? -1 : 1) }));
    }
  };

  const handleDoubleTap = (postId) => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!liked[postId]) handleLike(postId);
      setShowHeart(prev => ({ ...prev, [postId]: true }));
      setTimeout(() => setShowHeart(prev => ({ ...prev, [postId]: false })), 800);
    }
    lastTap.current = now;
  };

  const handleSingleTap = (postId, index) => {
    const video = videoRefs.current[index];
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setPausedStates(prev => ({ ...prev, [index]: false }));
    } else {
      video.pause();
      setPausedStates(prev => ({ ...prev, [index]: true }));
    }
  };

  const handleShare = (post) => setSharePost(post);

  const handleFollow = async (authorId, postId) => {
    if (!authorId) return;
    const isCurrentlyFollowing = following[postId];
    setFollowing(prev => ({ ...prev, [postId]: !isCurrentlyFollowing }));
    try {
      await axios.post(`/api/profile/${authorId}/follow`, {}, { withCredentials: true });
    } catch {
      setFollowing(prev => ({ ...prev, [postId]: isCurrentlyFollowing }));
    }
  };

  const safePosts = useMemo(
    () => Array.isArray(posts) ? posts.filter(post => post && post._id) : [],
    [posts]
  );

  if (loading) return <ReelsSkeleton />;

  if (safePosts.length === 0) {
    return (
      <div className="h-screen bg-dark-900 flex items-center justify-center">
        <EmptyState
          type="reels"
          title="No Reels Available"
          subtitle="Be the first to create one!"
          action={() => navigate('/create')}
          actionLabel="Create a Reel"
        />
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-114px)] md:h-screen bg-black text-white flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="absolute top-0 w-full z-50 px-4 py-3 md:p-6 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <ArrowLeftIcon className="w-6 h-6 cursor-pointer drop-shadow-lg md:w-7 md:h-7" onClick={() => navigate(-1)} />
          <h1 className="text-lg font-bold drop-shadow-lg md:text-xl">Reels</h1>
        </div>
        <button
          onClick={() => navigate('/create')}
          className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full px-4 py-1.5 text-sm font-semibold transition-all"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Create</span>
        </button>
      </div>

      {/* Reels container */}
      <div className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-thin bg-black">
        {safePosts.map((post, index) => {
          const prog = videoProgress[index];
          const progPct = prog?.duration > 0 ? ((prog.currentTime || 0) / prog.duration) * 100 : 0;
          const isBuffering = bufferingStates[index];

          return (
            <div key={post._id} className="h-[calc(100dvh-114px)] md:h-screen w-full relative snap-start flex items-center justify-center bg-black">
              <div
                className="relative w-full h-full md:max-w-[450px] md:rounded-[2.5rem] md:overflow-hidden md:border md:border-dark-700 md:shadow-2xl select-none bg-black"
                onClick={() => handleDoubleTap(post._id)}
                onDoubleClick={() => {}}
              >
                {/* Video/Image */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <MemoizedReelVideo
                    post={post}
                    index={index}
                    videoRefs={videoRefs}
                    muted={mutedStates[index]}
                    onToggleMute={handleToggleMute}
                    onTimeUpdate={handleTimeUpdate}
                    duration={prog?.duration || 0}
                    currentTime={prog?.currentTime || 0}
                    buffering={isBuffering}
                  />
                </div>

                {/* Buffering spinner */}
                {isBuffering && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                    <div className="w-8 h-8 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  </div>
                )}

                {/* Pause overlay */}
                {pausedStates[index] && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                    <PlayIcon className="w-14 h-14 text-white/60" />
                  </div>
                )}

                {/* Double tap heart */}
                {showHeart[post._id] && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                    <HeartIconSolid className="w-24 h-24 text-white/90 animate-ping" />
                  </div>
                )}

                {/* Progress bar */}
                <div className="absolute top-0 left-0 right-0 z-30 h-0.5 bg-white/10">
                  <div className="h-full bg-white transition-all duration-200" style={{ width: `${progPct}%` }} />
                </div>

                {/* Action buttons - right */}
                <div className="absolute right-2 md:right-4 bottom-20 md:bottom-28 flex flex-col items-center gap-4 md:gap-6 z-30">
                  <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                    <motion.button whileTap={{ scale: 0.8 }} onClick={() => handleLike(post._id)}>
                      {liked[post._id]
                        ? <HeartIconSolid className="w-7 h-7 md:w-9 md:h-9 text-red-500 drop-shadow-lg" />
                        : <HeartIcon className="w-7 h-7 md:w-9 md:h-9 text-white drop-shadow-lg" />}
                    </motion.button>
                    <span className="text-[11px] font-bold mt-0.5 drop-shadow-md">{likesCount[post._id] || 0}</span>
                  </div>

                  <motion.button 
                    whileTap={{ scale: 0.8 }} 
                    className="flex flex-col items-center" 
                    onClick={(e) => { e.stopPropagation(); setActiveCommentPost(post); }}
                  >
                    <ChatBubbleLeftRightIcon className="w-7 h-7 md:w-9 md:h-9 text-white drop-shadow-lg" />
                    <span className="text-[11px] font-bold mt-0.5">{post.comments?.length || 0}</span>
                  </motion.button>

                  <motion.button whileTap={{ scale: 0.8 }} onClick={(e) => { e.stopPropagation(); handleShare(post); }}>
                    <PaperAirplaneIcon className="w-7 h-7 md:w-9 md:h-9 text-white -rotate-45 drop-shadow-lg" />
                  </motion.button>

                  <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                    <motion.button whileTap={{ scale: 0.8 }} onClick={() => handleSave(post._id)}>
                      {saved[post._id]
                        ? <BookmarkIconSolid className="w-7 h-7 md:w-9 md:h-9 text-yellow-400 drop-shadow-lg" />
                        : <BookmarkIcon className="w-7 h-7 md:w-9 md:h-9 text-white drop-shadow-lg" />}
                    </motion.button>
                    <span className="text-[11px] font-bold mt-0.5">{post.savedBy?.length || 0}</span>
                  </div>
                </div>

                {/* Bottom info */}
                <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 md:pb-8 pt-16 md:p-6 bg-gradient-to-t from-black/95 via-black/45 to-transparent z-20">
                  <div className="flex items-center gap-2 mb-2">
                    <img
                      src={post.author?.profilePic || '/default-avatar.png'}
                      className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white/30 object-cover shrink-0 cursor-pointer"
                      alt=""
                      loading="lazy"
                      onClick={(e) => { e.stopPropagation(); navigate(`/profile/${post.author?.username}`); }}
                    />
                    <span
                      className="font-semibold text-sm drop-shadow-md cursor-pointer hover:underline"
                      onClick={(e) => { e.stopPropagation(); navigate(`/profile/${post.author?.username}`); }}
                    >
                      {post.author?.username || 'user'}
                    </span>
                    {post.author?._id !== currentUser?._id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleFollow(post.author?._id, post._id); }}
                        className={`text-[11px] md:text-xs font-bold px-3 py-1 rounded-full transition-colors shrink-0 ${
                          following[post._id]
                            ? 'bg-dark-600 text-dark-200'
                            : 'bg-white text-dark-900'
                        }`}
                      >
                        {following[post._id] ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>
                  {post.caption && (
                    <p className="text-sm leading-tight line-clamp-2 drop-shadow-md pr-14 md:pr-16">{post.caption}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <MusicalNoteIcon className="w-3.5 h-3.5 text-dark-300" />
                    <span className="text-xs text-dark-300 drop-shadow-md">Original audio</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <ShareModal isOpen={!!sharePost} onClose={() => setSharePost(null)} post={sharePost} />
      
      {activeCommentPost && (
        <ReelCommentsSheet
          post={activeCommentPost}
          onClose={() => setActiveCommentPost(null)}
          currentUser={currentUser}
          onCommentAdded={handleCommentAdded}
        />
      )}
    </div>
  );
}

// Reel comments bottom sheet component
function ReelCommentsSheet({ post, onClose, currentUser, onCommentAdded }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const commentsEndRef = useRef(null);

  useEffect(() => {
    let active = true;
    const fetchComments = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/posts/${post._id}`, { withCredentials: true });
        if (active) {
          setComments(res.data.comments || []);
        }
      } catch (err) {
        toast.error('Failed to load comments');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchComments();
    return () => { active = false; };
  }, [post._id]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await axios.post(`/api/posts/${post._id}/comment`, { text: newComment }, { withCredentials: true });
      const addedComment = res.data.comment;
      
      setComments(prev => [...prev, addedComment]);
      setNewComment('');
      
      if (onCommentAdded) {
        onCommentAdded(post._id, addedComment);
      }
      toast.success('Comment added');
    } catch (err) {
      toast.error('Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="w-full md:max-w-[450px] bg-dark-900 border-t border-dark-700/50 rounded-t-3xl h-[65vh] flex flex-col overflow-hidden text-white relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-dark-600 rounded-full mx-auto my-3 shrink-0" />
        
        <div className="flex items-center justify-between px-4 pb-3 border-b border-dark-700/50 shrink-0">
          <span className="text-sm font-semibold mx-auto">Comments</span>
          <button onClick={onClose} className="btn-icon p-1 text-dark-300 hover:text-white absolute right-4">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
 
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center text-dark-400 py-16 text-sm">
              No comments yet. Start the conversation!
            </div>
          ) : (
            comments.map(c => {
              const username = c.author?.username || 'user';
              const profilePic = c.author?.profilePic;
              const text = c.text || '';
              const date = c.createdAt ? new Date(c.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
              return (
                <div key={c._id} className="flex gap-3 text-sm items-start animate-slide-up">
                  <img
                     src={profilePic || '/default-avatar.png'}
                     alt={username}
                     className="w-8 h-8 rounded-full object-cover shrink-0"
                     onError={(e) => { e.target.src = '/default-avatar.png'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="font-semibold text-xs text-white">{username}</span>
                      <span className="text-xs text-dark-400 text-[10px]">{date}</span>
                    </div>
                    <p className="text-dark-200 mt-1 break-words leading-relaxed text-xs">{text}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={commentsEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="p-3 pb-[calc(env(safe-area-inset-bottom)+12px)] border-t border-dark-700/50 bg-dark-900 flex gap-2 items-center shrink-0">
          <input
            type="text"
            placeholder="Add a comment..."
            className="flex-1 bg-dark-800 border border-dark-700 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500/50 text-white"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <button 
            type="submit" 
            disabled={!newComment.trim() || isSubmitting}
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
              newComment.trim() ? 'bg-brand-500 text-white' : 'bg-dark-800 text-dark-500 cursor-not-allowed'
            }`}
          >
            <PaperAirplaneIcon className="w-4 h-4 -rotate-45" />
          </button>
        </form>
      </div>
    </div>
  );
}
