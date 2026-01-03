import React, { useEffect, useState } from 'react'
import axios from 'axios'
import PostCard from '../components/PostCard'
import CreatePost from '../components/CreatePost'

export default function Feed(){
  const [posts, setPosts] = useState([])

  useEffect(() => {
    ;(async () => {
      try{
        const [res, me] = await Promise.all([axios.get('/api/posts/feed'), axios.get('/api/profile/me')])
        const saved = (me.data.savedPosts || []).map(x => String(x._id || x))
        const withSaved = (res.data || []).map(p => ({ ...p, _saved: saved.includes(String(p._id)) }))
        setPosts(withSaved)
      }catch(err){ console.error(err) }
    })()
  }, [])

  const handleLikeChanged = (postId, likes) => {
    setPosts(p=> p.map(x => x._id === postId ? { ...x, likes: Array.from({length: likes}) } : x))
  }

  const onCreated = (newPost) => setPosts(p=> [newPost, ...p])

  return (
    <div className="min-h-screen bg-zinc-950 text-gray-100 p-4 pb-16 md:pb-0">
      <div className="max-w-[600px] mx-auto space-y-4">
        <CreatePost onCreated={onCreated} />
        {posts.map(p => <PostCard key={p._id} post={p} onLikeChanged={handleLikeChanged} />)}
      </div>
    </div>
  )
}
