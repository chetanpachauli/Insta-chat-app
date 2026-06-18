import React, { useEffect, useState, useRef, useCallback } from 'react'
import axios from 'axios'
import PostCard from '../components/PostCard'
import { PostCardSkeleton } from '../components/SkeletonLoaders'
import EmptyState from '../components/EmptyState'

export default function Feed() {
  const [posts, setPosts] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const loaderRef = useRef(null)

  const fetchPosts = useCallback(async (pageNum) => {
    setLoading(true)
    try {
      if (pageNum === 1) {
        try {
          const cached = sessionStorage.getItem('feed_cache')
          if (cached) {
            const parsed = JSON.parse(cached)
            if (Array.isArray(parsed) && parsed.length > 0) {
              setPosts(parsed)
              setLoading(false)
            }
          }
        } catch { /* ignore */ }
      }
      const [res, me] = await Promise.all([
        axios.get(`/api/posts/feed?page=${pageNum}&limit=10`),
        axios.get('/api/profile/me')
      ])
      const saved = (me.data.savedPosts || []).map(x => String(x._id || x))
      const newPosts = (res.data.posts || []).map(p => ({ ...p, _saved: saved.includes(String(p._id)) }))
      if (pageNum === 1) {
        try { sessionStorage.setItem('feed_cache', JSON.stringify(newPosts)) } catch { /* ignore */ }
      }
      setPosts(prev => pageNum === 1 ? newPosts : [...prev, ...newPosts])
      setHasMore(pageNum < (res.data.totalPages || 1))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchPosts(1) }, [fetchPosts])

  useEffect(() => {
    if (!loaderRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasMore && !loading) setPage(p => p + 1) },
      { threshold: 0.1 }
    )
    observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [hasMore, loading])

  useEffect(() => {
    if (page > 1) fetchPosts(page)
  }, [page, fetchPosts])

  const handleDelete = (postId) => setPosts(p => p.filter(x => x._id !== postId))

  return (
    <div className="min-h-screen bg-dark-900 text-white pb-20 md:pb-0">
      <div className="max-w-[600px] mx-auto p-4 space-y-4">
        {posts.map(p => (
          <PostCard key={p._id} post={p} onDeleted={handleDelete} />
        ))}
        <div ref={loaderRef} className="h-10 flex items-center justify-center">
          {loading && <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />}
          {!hasMore && posts.length > 0 && (
            <p className="text-dark-500 text-sm">You're all caught up</p>
          )}
        </div>
        {posts.length === 0 && !loading ? (
          <EmptyState
            type="feed"
            title="No posts yet"
            subtitle="Follow some users to see their posts in your feed"
            action={() => window.location.href = '/explore'}
            actionLabel="Explore"
          />
        ) : posts.length === 0 && loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <PostCardSkeleton key={i} />)}
          </div>
        ) : null}
      </div>
    </div>
  )
}
