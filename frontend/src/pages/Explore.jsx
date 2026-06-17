import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MagnifyingGlassIcon as SearchIcon, HeartIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

export default function Explore() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const loaderRef = useRef(null);

  const fetchPosts = useCallback(async (pageNum) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
        // Try cache
        try {
          const cached = sessionStorage.getItem('explore_cache');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setPosts(parsed);
              setLoading(false);
            }
          }
        } catch { /* ignore */ }
      }
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/posts/explore?page=${pageNum}&limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const newPosts = res.data.posts || [];
      setPosts(prev => pageNum === 1 ? newPosts : [...prev, ...newPosts]);
      setHasMore(pageNum < (res.data.totalPages || 1));
      setError(null);
      if (pageNum === 1) {
        try { sessionStorage.setItem('explore_cache', JSON.stringify(newPosts)); } catch { /* ignore */ }
      }
    } catch (e) {
      console.error('Error fetching posts:', e);
      setError('Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(1); }, [fetchPosts]);

  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasMore && !loading) setPage(p => p + 1); },
      { threshold: 0.1 }
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  useEffect(() => {
    if (page > 1) fetchPosts(page);
  }, [page, fetchPosts]);

  const filtered = posts.filter(p => {
    if (!p) return false;
    const t = (p.caption || '') + ' ' + (p.author?.username || '');
    return t.toLowerCase().includes(q.toLowerCase().trim());
  });

  const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-dark-900 text-white pb-20 md:pb-0">
      <div className="max-w-[500px] mx-auto min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-dark-900/80 backdrop-blur-md p-4 border-b border-dark-700/50">
          <h1 className="text-xl font-bold mb-4 bg-gradient-brand bg-clip-text text-transparent">Explore</h1>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search posts or users"
              className="w-full pl-10 pr-4 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all text-sm"
            />
          </div>
        </div>

        {/* Content */}
        {loading && posts.length === 0 ? (
          <div className="grid grid-cols-3 gap-1 p-2">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="aspect-square bg-dark-800 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={() => fetchPosts(1)} className="btn-primary">Retry</button>
          </div>
        ) : filtered.length > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-1 p-2">
              {filtered.map(post => (
                <div
                  key={post._id}
                  className="aspect-square relative group cursor-pointer overflow-hidden rounded-lg bg-dark-800 animate-fade-in"
                  onClick={() => navigate(`/p/${post._id}`)}
                >
                  <img
                    src={post.image}
                    alt="post"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/500x500?text=Not+Available'; }}
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-6">
                    <div className="flex items-center text-white">
                      <HeartIconSolid className="w-5 h-5 mr-1.5" />
                      <span className="text-sm font-medium">{formatNumber(post.likes?.length || 0)}</span>
                    </div>
                    <div className="flex items-center text-white">
                      <ChatBubbleLeftRightIcon className="w-5 h-5 mr-1.5" />
                      <span className="text-sm font-medium">{formatNumber(post.comments?.length || 0)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div ref={loaderRef} className="h-12 flex items-center justify-center">
              {loading && <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />}
              {!hasMore && posts.length > 0 && (
                <p className="text-dark-500 text-sm">You've seen it all</p>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-dark-800 flex items-center justify-center mx-auto mb-4">
              <SearchIcon className="w-8 h-8 text-dark-400" />
            </div>
            <h3 className="text-lg font-bold mb-1">No Posts Found</h3>
            <p className="text-dark-400 text-sm">
              {q.trim() ? 'Try a different search term' : 'No posts available to explore'}
            </p>
            {q.trim() && (
              <button onClick={() => setQ('')} className="text-brand-400 text-sm font-medium mt-4 hover:underline">
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
