import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  MagnifyingGlassIcon as SearchIcon, 
  HeartIcon, 
  ChatBubbleLeftRightIcon 
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

export default function Explore(){
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchPosts = useCallback(async () => {
    try { 
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/posts/explore', {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      setPosts(res.data);
      setError(null);
    } catch (e) { 
      console.error('Error fetching posts:', e);
      setError('Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const filtered = posts.filter(p => {
    if (!p) return false;
    const t = (p.caption || '') + ' ' + (p.author?.username || '');
    return t.toLowerCase().includes(q.toLowerCase().trim());
  });

  // Format numbers for display (e.g., 1500 -> 1.5K)
  const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const handlePostClick = (postId) => {
    navigate(`/p/${postId}`);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-[500px] mx-auto bg-black min-h-screen pb-16">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-black p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">Explore</h1>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input 
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search posts or users"
              className="block w-full pl-10 pr-3 py-2 border border-gray-800 rounded-full bg-gray-900 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-3 gap-1">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="aspect-square bg-gray-900 animate-pulse"></div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={fetchPosts}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
            >
              Retry
            </button>
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 p-2">
            {filtered.map(post => (
              <div 
                key={post._id} 
                className="aspect-square w-full relative group cursor-pointer overflow-hidden rounded-md bg-gray-900"
                onClick={() => handlePostClick(post._id)}
              >
                <img 
                  src={post.image} 
                  alt="post"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/500x500?text=Image+Not+Available';
                  }}
                />
                
                {/* Hover overlay with like/comment counts */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <div className="flex items-center text-white">
                    <HeartIconSolid className="w-5 h-5 mr-1" />
                    <span className="text-sm font-medium">{formatNumber(post.likes?.length || 0)}</span>
                  </div>
                  <div className="flex items-center text-white">
                    <ChatBubbleLeftRightIcon className="w-5 h-5 mr-1" />
                    <span className="text-sm font-medium">{formatNumber(post.comments?.length || 0)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 rounded-full border-2 border-gray-700 flex items-center justify-center mb-4">
              <SearchIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">No Posts Found</h3>
            <p className="text-gray-400 max-w-xs mx-auto">
              {q.trim() ? 'Try a different search term' : 'No posts available to explore'}
            </p>
            {q.trim() && (
              <button
                onClick={() => setQ('')}
                className="mt-4 text-blue-400 font-medium text-sm"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
