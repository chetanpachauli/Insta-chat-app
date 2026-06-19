import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Avatar from '../components/Avatar'
import { Link, useNavigate } from 'react-router-dom'
import { MagnifyingGlassIcon, HeartIcon, ChatBubbleLeftRightIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'

export default function Search() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [trendingTags, setTrendingTags] = useState([])
  const [tagResults, setTagResults] = useState([])
  const [selectedTag, setSelectedTag] = useState('')

  useEffect(() => {
    if (!q) {
      setResults([])
      setSelectedTag('')
      setTagResults([])
      return
    }
    const t = setTimeout(async () => {
      try {
        if (q.startsWith('#')) {
          const tag = q.slice(1);
          if (tag.trim()) {
            const res = await axios.get(`/api/hashtags/search/${encodeURIComponent(tag.trim())}`)
            setTagResults(res.data || [])
            setSelectedTag(tag.trim())
          } else {
            setTagResults([])
            setSelectedTag('')
          }
        } else {
          const res = await axios.get(`/api/auth/search?query=${encodeURIComponent(q)}`)
          setResults(res.data || [])
          setSelectedTag('')
        }
      } catch (e) { 
        setResults([]) 
        setTagResults([])
      }
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    axios.get('/api/hashtags/trending')
      .then(res => setTrendingTags(res.data || []))
      .catch(() => {})
  }, [])

  const handleTagClick = async (tag) => {
    setSelectedTag(tag)
    setQ('')
    try {
      const res = await axios.get(`/api/hashtags/search/${encodeURIComponent(tag)}`)
      setTagResults(res.data || [])
    } catch (e) {
      setTagResults([])
    }
  }

  const clearTag = () => {
    setSelectedTag('')
    setTagResults([])
  }

  const formatNumber = (num) => {
    if (!num && num !== 0) return '0'
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white pb-20 md:pb-0">
      <div className="max-w-[600px] mx-auto p-4">
        <div className="relative mb-4">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search users or #hashtags"
            className="w-full pl-10 pr-10 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all text-sm"
          />
          {q && (
            <button
              onClick={() => { setQ(''); setSelectedTag(''); setTagResults([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white p-0.5 rounded-full hover:bg-dark-700 transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {!q && !selectedTag && trendingTags.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-dark-300 mb-3">Trending hashtags</h2>
            <div className="flex flex-wrap gap-2">
              {trendingTags.map((tag) => (
                <button
                  key={tag._id || tag.tag || tag}
                  onClick={() => handleTagClick(tag.tag || tag)}
                  className="px-3 py-1.5 bg-dark-800 border border-dark-700 rounded-full text-sm text-dark-200 hover:bg-dark-700 hover:text-brand-400 transition-all"
                >
                  #{tag.tag || tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedTag && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-dark-300">#{selectedTag}</h2>
              <button onClick={clearTag} className="text-xs text-brand-400 hover:underline">Clear</button>
            </div>
            {tagResults.length > 0 ? (
              <div className="grid grid-cols-3 gap-1">
                {tagResults.map(post => (
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
            ) : (
              <div className="text-center text-dark-400 py-8 text-sm">No posts found for this tag</div>
            )}
          </div>
        )}

        <div className="space-y-1">
          {!selectedTag && (results.length === 0 && q ? (
            <div className="text-center text-dark-400 py-8">User not found</div>
          ) : (
            results.map(u => (
              <Link
                key={u.id}
                to={`/profile/${u.username}`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-dark-800/50 transition-colors"
              >
                <Avatar user={u} size={44} />
                <div>
                  <div className="font-semibold text-sm">{u.username}</div>
                  <div className="text-xs text-dark-400">{u.bio}</div>
                </div>
              </Link>
            ))
          ))}
        </div>
      </div>
    </div>
  )
}
