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
import ShareModal from '../components/ShareModal';

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
  const videoRefs = useRef([]);
  const lastTap = useRef(0);
  const isMounted = useRef(true);

  const fetchReels = useCallback(async () => {
    if (!isMounted.current) return;
    setLoading(true);

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

      const initialLiked = {};
      const initialSaved = {};
      const initialCounts = {};

      validPosts.forEach(post => {
        initialLiked[post._id] = Array.isArray(post.likes) && post.likes.some(id =>
          id && currentUser?._id && String(id) === String(currentUser._id)
        );
        initialSaved[post._id] = Array.isArray(post.savedBy) && post.savedBy.some(id =>
          id && currentUser?._id && String(id) === String(currentUser._id)
        );
        initialCounts[post._id] = post.likesCount || post.likes?.length || 0;
      });

      if (isMounted.current) {
        setPosts(validPosts);
        setLiked(initialLiked);
        setSaved(initialSaved);
        setLikesCount(initialCounts);
        videoRefs.current = new Array(validPosts.length);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load reels');
      setPosts([]);
    } finally {
      if (isMounted.current) setLoading(false);
    }
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

  const safePosts = useMemo(
    () => Array.isArray(posts) ? posts.filter(post => post && post._id) : [],
    [posts]
  );

  if (loading) {
    return (
      <div className="h-screen bg-dark-900 flex flex-col items-center justify-center text-white p-4 text-center gap-4">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-dark-400 text-sm">{!currentUser ? 'Checking...' : 'Loading reels...'}</p>
        <button onClick={() => window.location.reload()} className="btn-ghost text-sm">Refresh</button>
      </div>
    );
  }

  if (safePosts.length === 0) {
    return (
      <div className="h-screen bg-dark-900 flex flex-col items-center justify-center text-white p-4 text-center gap-4">
        <h2 className="text-xl font-semibold">No Reels Available</h2>
        <p className="text-dark-400 text-sm max-w-md">Be the first to create one!</p>
        <button onClick={() => navigate('/create')} className="btn-primary">Create a Post</button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-dark-900 text-white flex flex-col overflow-hidden">
      <div className="absolute top-0 w-full z-50 p-6 flex items-center bg-gradient-to-b from-dark-900/80 to-transparent">
        <ArrowLeftIcon className="w-7 h-7 cursor-pointer drop-shadow-lg" onClick={() => navigate(-1)} />
        <h1 className="ml-4 text-xl font-bold drop-shadow-lg">Reels</h1>
      </div>

      <div className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-thin">
        {safePosts.map((post, index) => (
          <div key={post._id} className="h-full w-full relative snap-start flex items-center justify-center bg-dark-900 p-2 md:p-4">
            <div
              className="relative w-full h-full max-w-[450px] bg-dark-800 rounded-[2.5rem] overflow-hidden border border-dark-700 shadow-2xl select-none"
              onClick={() => handleDoubleTap(post._id)}
            >
              <MemoizedReelVideo post={post} index={index} videoRefs={videoRefs} />

              {showHeart[post._id] && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                  <HeartIconSolid className="w-24 h-24 text-white/90 animate-ping" />
                </div>
              )}

              <div className="absolute right-4 bottom-32 flex flex-col items-center gap-7 z-30">
                <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleLike(post._id)}>
                    {liked[post._id]
                      ? <HeartIconSolid className="w-9 h-9 text-red-500" />
                      : <HeartIcon className="w-9 h-9 text-white" />}
                  </button>
                  <span className="text-xs font-bold mt-1 drop-shadow-md">{likesCount[post._id] || 0}</span>
                </div>

                <button className="flex flex-col items-center" onClick={(e) => { e.stopPropagation(); navigate(`/p/${post._id}`); }}>
                  <ChatBubbleLeftRightIcon className="w-9 h-9 text-white drop-shadow-lg" />
                  <span className="text-xs font-bold mt-1">{post.comments?.length || 0}</span>
                </button>

                <button onClick={(e) => { e.stopPropagation(); handleShare(post); }}>
                  <PaperAirplaneIcon className="w-9 h-9 text-white -rotate-45 drop-shadow-lg" />
                </button>

                <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleSave(post._id)}>
                    {saved[post._id]
                      ? <BookmarkIconSolid className="w-9 h-9 text-yellow-400 drop-shadow-lg" />
                      : <BookmarkIcon className="w-9 h-9 text-white drop-shadow-lg" />}
                  </button>
                  <span className="text-xs font-bold mt-1">{post.savedBy?.length || 0}</span>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-dark-900/90 via-dark-900/30 to-transparent z-20">
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={post.author?.profilePic || '/default-avatar.png'}
                    className="w-10 h-10 rounded-full border border-white/20"
                    alt=""
                  />
                  <span className="font-bold text-sm drop-shadow-md">{post.author?.username || 'user'}</span>
                  <button className="bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ml-2 hover:bg-white/20 transition-colors">
                    Follow
                  </button>
                </div>
                <p className="text-sm line-clamp-2 drop-shadow-md pr-12">{post.caption}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <ShareModal isOpen={!!sharePost} onClose={() => setSharePost(null)} post={sharePost} />
    </div>
  );
}
