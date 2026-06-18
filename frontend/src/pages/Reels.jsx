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
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid, BookmarkIcon as BookmarkIconSolid } from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';
import ShareModal from '../components/ShareModal';
import { ReelsSkeleton } from '../components/SkeletonLoaders';
import EmptyState from '../components/EmptyState';

function ReelVideo({ post, index, videoRefs }) {
  const observerRef = useRef(null);

  const setVideoRef = useCallback((el) => {
    videoRefs.current[index] = el;
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
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
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  const src = post.image;

  const isVideo = post.mediaType === 'video' ||
    post.mimetype?.includes('video') ||
    (post.image && /\.(mp4|mov|webm|quicktime)$/i.test(post.image));

  if (isVideo) {
    return (
      <video
        ref={setVideoRef}
        src={src}
        className="w-full h-full object-cover"
        loop muted playsInline crossOrigin="anonymous"
        onClick={(e) => {
          e.stopPropagation();
          const video = videoRefs.current[index];
          if (!video) return;
          if (video.paused) { video.play().catch(() => {}); }
          else { video.pause(); }
        }}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          const fallback = e.currentTarget.parentElement?.querySelector('.reel-fallback');
          if (fallback) fallback.style.display = 'block';
        }}
      />
    );
  }

  return (
    <>
      <video style={{ display: 'none' }} className="reel-fallback" />
      <img
        src={src}
        className="w-full h-full object-cover"
        alt="reel"
        crossOrigin="anonymous"
        onError={(e) => { e.target.src = '/placeholder-reel.jpg'; }}
      />
    </>
  );
}

const MemoizedReelVideo = React.memo(ReelVideo);

export default function Reels() {
  const navigate = useNavigate();
  const { user: currentUser } = useContext(AuthContext);
  const [sharePost, setSharePost] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState({});
  const [saved, setSaved] = useState({});
  const [likesCount, setLikesCount] = useState({});
  const [showHeart, setShowHeart] = useState({});
  const [following, setFollowing] = useState({});
  const videoRefs = useRef([]);
  const lastTap = useRef(0);
  const isMounted = useRef(true);
  const cacheKey = 'reels_cache';

  const fetchReels = useCallback(async () => {
    if (!isMounted.current) return;
    setLoading(true);

    // Try cache first
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          applyPosts(parsed);
          setLoading(false);
          // Don't return — fetch fresh data in background
        }
      }
    } catch { /* ignore */ }

    try {
      const res = await axios.get('/api/posts/explore', {
        params: { type: 'reel' },
        withCredentials: true,
        timeout: 10000
      });

      if (!res.data || !Array.isArray(res.data)) {
        throw new Error('Invalid response format');
      }

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

    validPosts.forEach(post => {
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
    });

    setPosts(validPosts);
    setLiked(initialLiked);
    setSaved(initialSaved);
    setLikesCount(initialCounts);
    setFollowing(initialFollowing);
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
    const currentUserId = currentUser?._id;

    setLiked(prev => ({ ...prev, [postId]: !isCurrentlyLiked }));
    setLikesCount(prev => ({
      ...prev,
      [postId]: prev[postId] + (isCurrentlyLiked ? -1 : 1)
    }));

    try {
      await axios.post(`/api/posts/${postId}/like`, {
        action: isCurrentlyLiked ? 'unlike' : 'like'
      });
    } catch (error) {
      setLiked(prev => ({ ...prev, [postId]: isCurrentlyLiked }));
      setLikesCount(prev => ({
        ...prev,
        [postId]: prev[postId] - (isCurrentlyLiked ? -1 : 1)
      }));
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

  if (loading) {
    return <ReelsSkeleton />;
  }

  if (safePosts.length === 0) {
    return (
      <div className="h-screen bg-dark-900 flex items-center justify-center">
        <EmptyState
          type="reels"
          title="No Reels Available"
          subtitle="Be the first to create one!"
          action={() => navigate('/create')}
          actionLabel="Create a Post"
        />
      </div>
    );
  }

  return (
    <div className="h-screen bg-dark-900 text-white flex flex-col overflow-hidden">
      <div className="absolute top-0 w-full z-50 px-4 py-3 md:p-6 flex items-center bg-gradient-to-b from-dark-900/80 to-transparent">
        <ArrowLeftIcon className="w-6 h-6 cursor-pointer drop-shadow-lg md:w-7 md:h-7" onClick={() => navigate(-1)} />
        <h1 className="ml-3 text-lg font-bold drop-shadow-lg md:text-xl md:ml-4">Reels</h1>
      </div>

      <div className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-thin">
        {safePosts.map((post, index) => (
          <div key={post._id} className="h-dvh md:h-full w-full relative snap-start flex items-center justify-center bg-dark-900">
            <div
              className="relative w-full h-full md:max-w-[450px] md:rounded-[2.5rem] md:overflow-hidden md:border md:border-dark-700 md:shadow-2xl select-none bg-dark-800/50"
              onClick={() => handleDoubleTap(post._id)}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <MemoizedReelVideo post={post} index={index} videoRefs={videoRefs} />
              </div>

              {showHeart[post._id] && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                  <HeartIconSolid className="w-24 h-24 text-white/90 animate-ping" />
                </div>
              )}

              {/* Action buttons - right side */}
              <div className="absolute right-3 bottom-28 md:right-4 md:bottom-32 flex flex-col items-center gap-5 md:gap-7 z-30">
                <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleLike(post._id)}>
                    {liked[post._id]
                      ? <HeartIconSolid className="w-8 h-8 md:w-9 md:h-9 text-red-500" />
                      : <HeartIcon className="w-8 h-8 md:w-9 md:h-9 text-white" />}
                  </button>
                  <span className="text-[11px] md:text-xs font-bold mt-0.5 drop-shadow-md">{likesCount[post._id] || 0}</span>
                </div>

                <button className="flex flex-col items-center" onClick={(e) => { e.stopPropagation(); navigate(`/p/${post._id}`); }}>
                  <ChatBubbleLeftRightIcon className="w-8 h-8 md:w-9 md:h-9 text-white drop-shadow-lg" />
                  <span className="text-[11px] md:text-xs font-bold mt-0.5">{post.comments?.length || 0}</span>
                </button>

                <button onClick={(e) => { e.stopPropagation(); handleShare(post); }}>
                  <PaperAirplaneIcon className="w-8 h-8 md:w-9 md:h-9 text-white -rotate-45 drop-shadow-lg" />
                </button>

                <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleSave(post._id)}>
                    {saved[post._id]
                      ? <BookmarkIconSolid className="w-8 h-8 md:w-9 md:h-9 text-yellow-400 drop-shadow-lg" />
                      : <BookmarkIcon className="w-8 h-8 md:w-9 md:h-9 text-white drop-shadow-lg" />}
                  </button>
                  <span className="text-[11px] md:text-xs font-bold mt-0.5">{post.savedBy?.length || 0}</span>
                </div>
              </div>

              {/* Bottom info */}
              <div className="absolute bottom-0 left-0 right-0 px-3 pb-4 pt-12 md:p-6 md:pb-8 bg-gradient-to-t from-dark-900/95 via-dark-900/50 to-transparent z-20">
                <div className="flex items-center gap-2 mb-2">
                  <img
                    src={post.author?.profilePic || '/default-avatar.png'}
                    className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white/30 object-cover shrink-0"
                    alt=""
                    loading="lazy"
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
                      className={`text-[11px] md:text-xs font-bold px-3 py-1 rounded-full transition-colors ml-1 shrink-0 ${
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
              </div>
            </div>
          </div>
        ))}
      </div>
      <ShareModal isOpen={!!sharePost} onClose={() => setSharePost(null)} post={sharePost} />
    </div>
  );
}
