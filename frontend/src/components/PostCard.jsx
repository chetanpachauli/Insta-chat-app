import React, { useState, useEffect, useContext } from 'react'
import AuthContext from '../context/AuthContext'
import axios from 'axios'
import { Heart, MessageCircle, Bookmark, Send } from 'lucide-react'
import Avatar from './Avatar'

export default function PostCard({ post, onLikeChanged }){
  const { user } = useContext(AuthContext)
  const [liked, setLiked] = useState((post.likes||[]).map(x=>String(x)).includes(String(user?.id)))
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0)
  const [saved, setSaved] = useState(Boolean(post._saved))
  const [dblLikeAnim, setDblLikeAnim] = useState(false)
  const [comments, setComments] = useState(post.comments || [])
  const [commentText, setCommentText] = useState('')

  useEffect(()=>{
    setLiked((post.likes||[]).map(x=>String(x)).includes(String(user?.id)))
    setLikesCount(post.likes?.length || 0)
  },[post, user])

  const toggleLike = async () => {
    try{
      const res = await axios.post(`/api/posts/${post._id}/like`)
      setLiked(res.data.action === 'liked')
      setLikesCount(res.data.likes)
      if (onLikeChanged) onLikeChanged(post._id, res.data.likes)
    }catch(err){ console.error(err) }
  }

  const submitComment = async () => {
    if (!commentText.trim()) return
    try{
      const res = await axios.post(`/api/posts/${post._id}/comment`, { text: commentText })
      setComments((c)=>[...c, res.data.comment])
      setCommentText('')
    }catch(err){ console.error(err) }
  }

  const toggleSave = async () => {
    try{
      const res = await axios.post(`/api/posts/${post._id}/save`)
      setSaved(res.data.saved)
    }catch(err){ console.error(err) }
  }

  const onDoubleTap = async () => {
    // like on double tap
    try{
      await toggleLike()
      setDblLikeAnim(true)
      setTimeout(()=>setDblLikeAnim(false), 900)
    }catch(e){ }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-md overflow-hidden">
      <div className="p-3 flex items-center gap-3">
        <Avatar user={post.author} size={40} />
        <div>
          <div className="font-semibold text-white">{post.author?.username}</div>
          <div className="text-sm text-gray-400">{new Date(post.createdAt).toLocaleString()}</div>
        </div>
      </div>

      <div className="relative w-full bg-black flex items-center justify-center" onDoubleClick={onDoubleTap}>
        {post.mediaType === 'video' ? (
          <video 
            src={post.image} 
            className="max-h-[600px] w-auto object-contain"
            controls
            crossOrigin="anonymous"
          />
        ) : (
          <img 
            src={post.image} 
            alt={post.caption || 'Post'} 
            className="max-h-[600px] w-auto object-contain"
            crossOrigin="anonymous"
          />
        )}
        {dblLikeAnim && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-6xl text-white opacity-90 animate-pulse">❤️</div>
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={toggleLike} className={`p-2 rounded ${liked ? 'text-red-400' : 'text-gray-300'}`} aria-label="Like"><Heart /></button>
          <button className="p-2 rounded text-gray-300" aria-label="Comment"><MessageCircle /></button>
          <div className="ml-auto flex items-center gap-2">
            <button className="p-2 rounded text-gray-300" aria-label="Share"><Send /></button>
            <button onClick={toggleSave} className={`p-2 rounded ${saved ? 'text-yellow-400' : 'text-gray-300'}`} aria-label="Save"><Bookmark /></button>
          </div>
        </div>
        <div className="text-sm text-gray-300 font-semibold mb-2">{likesCount} likes</div>
        <div className="text-gray-200 mb-2">{post.caption}</div>
        <div className="space-y-2">
          {comments.map(c => (
            <div key={c._id} className="text-sm text-gray-300"><strong className="mr-2">{c.author?.username || 'User'}</strong>{c.text}</div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="Add a comment..." className="flex-1 px-3 py-2 bg-zinc-800 rounded" />
          <button onClick={submitComment} className="px-3 py-2 text-sm text-blue-400">Post</button>
        </div>
      </div>
    </div>
  )
}
