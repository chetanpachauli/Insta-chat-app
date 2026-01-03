import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
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

export default function Reels() {
  const navigate = useNavigate();
  const { user: currentUser } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState({});
  const [saved, setSaved] = useState({});
  const [showHeart, setShowHeart] = useState({});
  const videoRefs = useRef([]);
  const lastTap = useRef(0);
  const isMounted = useRef(true);

  console.log('Reels render - currentUser:', currentUser);

  const fetchReels = useCallback(async () => {
    if (!isMounted.current) return;
    
    console.log('Fetching reels...', { currentUserId: currentUser?._id });
    setLoading(true);
    
    try {
      const res = await axios.get('/api/posts/explore', { 
        params: { type: 'reel' },
        withCredentials: true,
        timeout: 10000
      });
      
      console.log('Reels API Response:', {
        status: res.status,
        data: res.data,
        isArray: Array.isArray(res.data)
      });

      if (!res.data || !Array.isArray(res.data)) {
        throw new Error('Invalid response format: Expected an array of posts');
      }

      // Filter out only completely invalid posts
      const validPosts = res.data.filter(post => {
        // A post is valid if it has an ID and at least one media source
        const hasValidMedia = post && 
                            post._id && 
                            (post.mediaUrl || post.video || post.image);
        
        // Log skipped posts for debugging
        if (!hasValidMedia) {
          console.warn('Skipping invalid post (missing required fields):', post);
        }
        
        return hasValidMedia;
      });

      console.log('Processing reels:', { 
        total: res.data.length, 
        valid: validPosts.length,
        invalid: res.data.length - validPosts.length
      });
      
      const initialLiked = {};
      const initialSaved = {};
      
      validPosts.forEach(post => {
        if (!post) return;
        
        initialLiked[post._id] = Array.isArray(post.likes) && post.likes.some(id => 
          id && currentUser?._id && String(id) === String(currentUser._id)
        );
        
        initialSaved[post._id] = Array.isArray(post.savedBy) && post.savedBy.some(id => 
          id && currentUser?._id && String(id) === String(currentUser._id)
        );
      });
      
      if (isMounted.current) {
        setPosts(validPosts);
        setLiked(initialLiked);
        setSaved(initialSaved);
      }
    } catch (error) {
      console.error('Error in fetchReels:', {
        message: error.message,
        response: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          params: error.config?.params
        }
      });
      toast.error(error.response?.data?.message || 'Failed to load reels');
      setPosts([]);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    isMounted.current = true;
    console.log('Reels mounted, fetching reels...');
    fetchReels();

    return () => {
      console.log('Reels unmounting, cleaning up...');
      isMounted.current = false;
      // Cleanup video refs
      videoRefs.current = [];
    };
  }, [fetchReels]);

  // Handle saving/unsaving posts
  const handleSave = async (postId) => {
    try {
      const isCurrentlySaved = saved[postId];
      const newSavedState = { ...saved, [postId]: !isCurrentlySaved };
      setSaved(newSavedState);

      await axios.post(`/api/posts/${postId}/save`, {
        action: isCurrentlySaved ? 'unsave' : 'save'
      }, { withCredentials: true });

      // Update the posts state to reflect the change
      setPosts(posts.map(post => 
        post._id === postId 
          ? { 
              ...post, 
              savedBy: isCurrentlySaved 
                ? post.savedBy?.filter(id => id !== currentUser?._id) 
                : [...(post.savedBy || []), currentUser?._id]
            } 
          : post
      ));
    } catch (error) {
      console.error('Error saving post:', error);
      toast.error('Failed to save post');
      // Revert on error
      setSaved(prev => ({ ...prev, [postId]: !saved[postId] }));
    }
  };

  // Handle liking/unliking posts
  const handleLike = async (postId) => {
    const isCurrentlyLiked = liked[postId];
    const currentUserId = currentUser?._id;
    
    try {
      // Optimistic update
      setLiked(prev => ({ ...prev, [postId]: !isCurrentlyLiked }));
      
      // Update posts state with the new like status
      setPosts(prevPosts => prevPosts.map(post => {
        if (post._id === postId) {
          const updatedLikes = isCurrentlyLiked 
            ? post.likes.filter(id => id !== currentUserId)
            : [...(post.likes || []), currentUserId];
          
          return {
            ...post,
            likes: updatedLikes,
            likesCount: updatedLikes.length
          };
        }
        return post;
      }));

      // Make API call
      await axios.post(`/api/posts/${postId}/like`, {
        action: isCurrentlyLiked ? 'unlike' : 'like'
      });
      
    } catch (error) {
      console.error('Error liking post:', error);
      // Revert on error
      setLiked(prev => ({ ...prev, [postId]: isCurrentlyLiked }));
      setPosts(prevPosts => prevPosts.map(post => {
        if (post._id === postId) {
          return {
            ...post,
            likes: isCurrentlyLiked 
              ? [...(post.likes || []), currentUserId]
              : post.likes.filter(id => id !== currentUserId),
            likesCount: isCurrentlyLiked 
              ? (post.likes?.length || 0) + 1 
              : Math.max(0, (post.likes?.length || 0) - 1)
          };
        }
        return post;
      }));
      toast.error('Failed to update like');
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

  // --- NATIVE SHARE (WHATSAPP, SNAPCHAT) ---
  const handleShare = async (post) => {
    const shareData = {
      title: 'Check out this Reel',
      text: post.caption,
      url: `${window.location.origin}/reels/${post._id}`
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(shareData.url);
      toast.success('Link copied! Share it anywhere.');
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-white p-4 text-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-semibold mb-2">Loading Reels</h2>
        <p className="text-gray-400 text-sm max-w-md">
          {!currentUser ? 'Checking authentication...' : 'Fetching your reels...'}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 text-blue-400 hover:text-blue-300 text-sm"
        >
          {!currentUser ? 'Not loading? Try refreshing' : 'Taking too long? Refresh'}
        </button>
      </div>
    );
  }

  // Handle case when there are no posts
  if (!posts || posts.length === 0) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-white p-4 text-center">
        <h2 className="text-xl font-semibold mb-2">No Content Available</h2>
        <p className="text-gray-400 text-sm max-w-md mb-6">
          There are no reels or posts to show right now. Be the first to create one!
        </p>
        <button 
          onClick={() => navigate('/create')}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Create a Post
        </button>
      </div>
    );
  }

  // Ensure posts is always an array
  const safePosts = Array.isArray(posts) ? posts.filter(post => post && post._id) : [];

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
      {/* Header Overlay */}
      <div className="absolute top-0 w-full z-50 p-6 flex items-center bg-gradient-to-b from-black/80 to-transparent">
        <ArrowLeftIcon className="w-7 h-7 cursor-pointer drop-shadow-lg" onClick={() => navigate(-1)} />
        <h1 className="ml-4 text-xl font-bold drop-shadow-lg">Reels</h1>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
        {safePosts.map((post, index) => (
          <div key={post._id} className="h-full w-full relative snap-start flex items-center justify-center bg-black p-2 md:p-4">
            
            {/* Reel Frame - Rounded and Fit */}
            <div 
              className="relative w-full h-full max-w-[450px] bg-zinc-900 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl"
              onClick={() => handleDoubleTap(post._id)}
            >
              {/* Media Content - Handle both video and image posts */}
              {post.mediaType === 'video' || 
               post.mimetype?.includes('video') || 
               (post.image && post.image.match(/\.(mp4|mov|webm|quicktime)$/i)) ? (
                <video
                  ref={el => {
                    videoRefs.current[index] = el;
                    // Auto-play the video when it comes into view
                    if (el) {
                      const observer = new IntersectionObserver(
                        ([entry]) => {
                          if (entry.isIntersecting) {
                            el.play().catch(e => console.log('Auto-play failed:', e));
                          } else {
                            el.pause();
                          }
                        },
                        { threshold: 0.5 }
                      );
                      observer.observe(el);
                      // Store observer for cleanup
                      el._observer = observer;
                    }
                  }}
                  src={post.mediaUrl || post.video || post.image}
                  className="w-full h-full object-cover"
                  loop 
                  muted 
                  playsInline 
                  crossOrigin="anonymous"
                  onClick={(e) => {
                    e.stopPropagation();
                    const video = videoRefs.current[index];
                    if (video.paused) {
                      video.play().catch(e => console.log('Play failed:', e));
                    } else {
                      video.pause();
                    }
                  }}
                  onError={(e) => {
                    console.error('Error loading video:', e);
                    // Fallback to image if video fails to load
                    e.target.outerHTML = `
                      <img 
                        src="${post.image || post.mediaUrl || '/placeholder-reel.jpg'}" 
                        class="w-full h-full object-cover" 
                        alt="reel"
                        crossorigin="anonymous"
                      />
                    `;
                  }}
                />
              ) : (
                <img
                  src={post.mediaUrl || post.image || '/placeholder-reel.jpg'}
                  className="w-full h-full object-cover"
                  alt="reel"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    console.error('Error loading image:', e);
                    e.target.src = '/placeholder-reel.jpg';
                  }}
                />
              )}

              {/* Heart Animation */}
              {showHeart[post._id] && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                  <HeartIconSolid className="w-24 h-24 text-white/90 animate-ping" />
                </div>
              )}

              {/* ACTION SIDEBAR (FIXED: Upar and Functioning) */}
              <div className="absolute right-4 bottom-32 flex flex-col items-center space-y-7 z-30">
                <div className="flex flex-col items-center">
                  <button onClick={(e) => { e.stopPropagation(); handleLike(post._id); }}>
                    {liked[post._id] ? <HeartIconSolid className="w-9 h-9 text-red-500" /> : <HeartIcon className="w-9 h-9 text-white" />}
                  </button>
                  <span className="text-xs font-bold mt-1 drop-shadow-md">{post.likesCount || 0}</span>
                </div>
                
                {/* Comment Button - Navigates to Post Details */}
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    navigate(`/p/${post._id}`); 
                  }}
                  className="flex flex-col items-center"
                >
                  <ChatBubbleLeftRightIcon className="w-9 h-9 text-white drop-shadow-lg" />
                  <span className="text-xs font-bold mt-1">{post.comments?.length || 0}</span>
                </button>

                {/* SHARE: NATIVE OPEN */}
                <button onClick={(e) => { e.stopPropagation(); handleShare(post); }}>
                  <PaperAirplaneIcon className="w-9 h-9 text-white -rotate-45 drop-shadow-lg" />
                </button>

                {/* Save Button */}
                <div className="flex flex-col items-center">
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation();
                      handleSave(post._id);
                    }}
                  >
                    {saved[post._id] ? (
                      <BookmarkIconSolid className="w-9 h-9 text-white drop-shadow-lg" />
                    ) : (
                      <BookmarkIcon className="w-9 h-9 text-white drop-shadow-lg" />
                    )}
                  </button>
                  <span className="text-xs font-bold mt-1">{post.savedBy?.length || 0}</span>
                </div>
              </div>

              {/* USER INFO AREA (FIXED: Upar Shifted) */}
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 via-black/30 to-transparent z-20">
                <div className="flex items-center space-x-3 mb-4">
                  <img src={post.author?.profilePic || '/default-avatar.png'} className="w-10 h-10 rounded-full border border-white/40 shadow-sm" alt="avatar" />
                  <span className="font-bold text-sm drop-shadow-md">{post.author?.username || 'user'}</span>
                  <button className="bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ml-2">Follow</button>
                </div>
                <p className="text-sm line-clamp-2 drop-shadow-md pr-12">{post.caption}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}