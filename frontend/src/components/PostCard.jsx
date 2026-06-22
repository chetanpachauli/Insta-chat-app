import React, { useState, useEffect, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Heart, MessageCircle, Bookmark, Send, Trash2, Edit3, Archive, ArchiveRestore } from 'lucide-react'
import toast from 'react-hot-toast'
import { useConfirm } from '../hooks/useConfirm'
import Avatar from './Avatar'
import ShareModal from './ShareModal'
import { motion, AnimatePresence } from 'framer-motion'

function PostCard({ post, onLikeChanged, onDeleted }) {
  const { user } = useContext(AuthContext)
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editCaption, setEditCaption] = useState('')
  const isOwner = user?.id && String(post.author?._id || post.author) === String(user.id)
  const [liked, setLiked] = useState((post.likes || []).map(x => String(x)).includes(String(user?.id)))
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0)
  const [saved, setSaved] = useState(Boolean(post._saved))
  const [dblLikeAnim, setDblLikeAnim] = useState(false)
  const [comments, setComments] = useState(post.comments || [])
  const [commentText, setCommentText] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const [archived, setArchived] = useState(post.isArchived || false)

  useEffect(() => {
    setLiked((post.likes || []).map(x => String(x)).includes(String(user?.id)))
    setLikesCount(post.likes?.length || 0)
  }, [post, user])

  const toggleLike = async () => {
    try {
      const res = await axios.post(`/api/posts/${post._id}/like`)
      setLiked(res.data.action === 'liked')
      setLikesCount(res.data.likes)
      if (onLikeChanged) onLikeChanged(post._id, res.data.likes)
    } catch (err) { console.error(err) }
  }

  const submitComment = async () => {
    if (!commentText.trim()) return
    try {
      const res = await axios.post(`/api/posts/${post._id}/comment`, { text: commentText })
      setComments(c => [...c, res.data.comment])
      setCommentText('')
    } catch (err) { console.error(err) }
  }

  const toggleSave = async () => {
    try {
      const res = await axios.post(`/api/posts/${post._id}/save`)
      setSaved(res.data.saved)
    } catch (err) { console.error(err) }
  }

  const confirmDel = useConfirm();

  const handleArchive = async () => {
    try {
      const res = await axios.put(`/api/posts/${post._id}/archive`, {}, { withCredentials: true });
      setArchived(res.data.isArchived);
      toast.success(res.data.isArchived ? 'Post archived' : 'Post restored');
      if (onDeleted) onDeleted(post._id);
    } catch (err) {
      toast.error('Failed to archive post');
    }
  };

  const handleDelete = async () => {
    if (!(await confirmDel('Delete this post?'))) return
    try {
      await axios.delete(`/api/posts/${post._id}`)
      toast.success('Post deleted')
      if (onDeleted) onDeleted(post._id)
    } catch (err) { toast.error('Failed to delete post') }
  }

  const handleEdit = async () => {
    if (!editCaption.trim()) return
    try {
      const res = await axios.put(`/api/posts/${post._id}`, { caption: editCaption })
      post.caption = editCaption
      toast.success('Post updated')
      setEditing(false)
    } catch (err) { toast.error('Failed to update post') }
  }

  const onDoubleTap = async () => {
    try {
      await toggleLike()
      setDblLikeAnim(true)
      setTimeout(() => setDblLikeAnim(false), 900)
    } catch (e) { }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card overflow-hidden hover:border-dark-600/50 hover:shadow-lg hover:shadow-brand-500/5 transition-all duration-300"
    >
      {/* Header */}
      <div className="p-3 flex items-center gap-3">
        <div onClick={() => post.author?.username && navigate(`/profile/${post.author.username}`)} className="cursor-pointer">
          <Avatar user={post.author} size="md" />
        </div>
        <div className="flex-1">
          <div 
            onClick={() => post.author?.username && navigate(`/profile/${post.author.username}`)} 
            className="font-semibold text-sm cursor-pointer hover:underline"
          >
            {post.author?.username}
          </div>
          <div className="text-xs text-dark-400">{new Date(post.createdAt).toLocaleString()}</div>
        </div>
        {isOwner && (
          <div className="relative">
            <button onClick={() => setShowMenu(s => !s)} className="btn-icon text-dark-400">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
            </button>
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 mt-1 w-36 bg-dark-800 border border-dark-700 rounded-xl shadow-xl z-50 py-1"
                >
                  <button onClick={() => { setShowMenu(false); setEditing(true); setEditCaption(post.caption || ''); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-dark-200 hover:bg-dark-700">
                    <Edit3 className="w-4 h-4" /> Edit
                  </button>
                  <button onClick={() => { setShowMenu(false); handleArchive(); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-dark-200 hover:bg-dark-700">
                    {archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />} {archived ? 'Restore' : 'Archive'}
                  </button>
                  <button onClick={() => { setShowMenu(false); handleDelete(); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-dark-700">
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Media */}
      <motion.div
        className="relative w-full bg-black flex items-center justify-center overflow-hidden"
        onDoubleClick={onDoubleTap}
        whileHover={{ scale: 1.005 }}
        transition={{ duration: 0.2 }}
      >
        {post.mediaType === 'video' ? (
          <video
            src={post.image}
            className="max-h-[600px] w-full object-contain"
            controls
            crossOrigin="anonymous"
          />
        ) : (
          <img
            src={post.image}
            alt={post.caption || 'Post'}
            className="max-h-[600px] w-full object-contain"
            loading="lazy"
            crossOrigin="anonymous"
          />
        )}
        <AnimatePresence>
          {dblLikeAnim && (
            <motion.div
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 1.3, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <Heart className="w-20 h-20 text-white" fill="white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Actions */}
      <div className="p-3">
        <div className="flex items-center gap-3 mb-2">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={toggleLike}
            className={`btn-icon ${liked ? 'text-red-400' : 'text-dark-300'}`}
          >
            <Heart className={`w-5 h-5 ${liked ? 'fill-red-400' : ''}`} />
          </motion.button>
          <motion.button whileTap={{ scale: 0.85 }} className="btn-icon text-dark-300"><MessageCircle className="w-5 h-5" /></motion.button>
          <div className="ml-auto flex items-center gap-1">
            <motion.button whileTap={{ scale: 0.85 }} onClick={() => setShareOpen(true)} className="btn-icon text-dark-300"><Send className="w-5 h-5" /></motion.button>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={toggleSave}
              className={`btn-icon ${saved ? 'text-yellow-400' : 'text-dark-300'}`}
            >
              <Bookmark className={`w-5 h-5 ${saved ? 'fill-yellow-400' : ''}`} />
            </motion.button>
          </div>
        </div>

        <div className="text-sm font-semibold mb-1">{likesCount} likes</div>
        {editing ? (
          <div className="mb-2 flex gap-2">
            <input
              value={editCaption}
              onChange={e => setEditCaption(e.target.value)}
              className="flex-1 input-field text-sm"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleEdit(); if (e.key === 'Escape') setEditing(false); }}
            />
            <button onClick={handleEdit} className="btn-primary text-xs px-3">Save</button>
            <button onClick={() => setEditing(false)} className="btn-ghost text-xs px-3">Cancel</button>
          </div>
        ) : (
          <div className="text-sm mb-2">
            <span 
              onClick={() => post.author?.username && navigate(`/profile/${post.author.username}`)}
              className="font-semibold mr-1.5 cursor-pointer hover:underline"
            >
              {post.author?.username}
            </span>
            {post.caption}
          </div>
        )}

        {/* Comments */}
        <div className="space-y-1.5 mb-2">
          {comments.slice(0, 3).map(c => {
            const commentUser = c.author || c.user;
            return (
              <div key={c._id} className="text-sm text-dark-200">
                <strong 
                  onClick={() => commentUser?.username && navigate(`/profile/${commentUser.username}`)}
                  className="mr-1.5 text-white cursor-pointer hover:underline font-semibold"
                >
                  {commentUser?.username || 'User'}
                </strong>
                {c.text}
              </div>
            );
          })}
          {comments.length > 3 && (
            <button className="text-xs text-dark-400 hover:text-dark-300">
              View all {comments.length} comments
            </button>
          )}
        </div>

        {/* Comment Input */}
        <div className="flex gap-2 border-t border-dark-700/50 pt-3">
          <input
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 bg-transparent text-sm placeholder:text-dark-400 focus:outline-none"
            onKeyDown={(e) => { if (e.key === 'Enter') submitComment() }}
          />
          <button
            onClick={submitComment}
            className={`text-sm font-semibold ${commentText.trim() ? 'text-brand-400' : 'text-dark-500'}`}
            disabled={!commentText.trim()}
          >
            Post
          </button>
        </div>
      </div>
      <ShareModal isOpen={shareOpen} onClose={() => setShareOpen(false)} post={post} />
    </motion.div>
  )
}

export default React.memo(PostCard)
