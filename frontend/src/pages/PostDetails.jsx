import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { HeartIcon, ChatBubbleLeftRightIcon, PaperAirplaneIcon, BookmarkIcon, XMarkIcon, TrashIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid, BookmarkIcon as BookmarkIconSolid } from '@heroicons/react/24/solid';
import { AuthContext } from '../context/AuthContext';
import { useConfirm } from '../hooks/useConfirm';
import ShareModal from '../components/ShareModal';

const PostDetails = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useContext(AuthContext) || {};
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const confirmDel = useConfirm();
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await axios.get(`/api/posts/${postId}`, { withCredentials: true });
        const postData = res.data;
        setPost(postData);
        setIsLiked(postData.likes?.some(id => String(id) === String(currentUser?._id)) || false);
        setIsSaved(postData.savedBy?.some(id => String(id) === String(currentUser?._id)) || false);
        setLikesCount(postData.likes?.length || 0);
      } catch (error) {
        console.error('Error fetching post:', error);
        toast.error('Failed to load post');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    if (currentUser) fetchPost();
  }, [postId, currentUser?._id, navigate]);

  const handleLike = async () => {
    if (!currentUser) { navigate('/login'); return; }
    const newLikeStatus = !isLiked;
    setIsLiked(newLikeStatus);
    setLikesCount(prev => newLikeStatus ? prev + 1 : Math.max(0, prev - 1));
    try {
      await axios.post(`/api/posts/${postId}/like`, { action: newLikeStatus ? 'like' : 'unlike' }, { withCredentials: true });
      setPost(prev => ({
        ...prev,
        likes: newLikeStatus ? [...(prev?.likes || []), currentUser._id] : (prev?.likes || []).filter(id => String(id) !== String(currentUser._id))
      }));
    } catch (error) {
      setIsLiked(!newLikeStatus);
      setLikesCount(prev => newLikeStatus ? Math.max(0, prev - 1) : prev + 1);
      toast.error('Failed to update like');
    }
  };

  const handleSave = async () => {
    if (!currentUser) { navigate('/login'); return; }
    const newSaveStatus = !isSaved;
    setIsSaved(newSaveStatus);
    try {
      await axios.post(`/api/posts/${postId}/save`, { action: newSaveStatus ? 'save' : 'unsave' }, { withCredentials: true });
      setPost(prev => ({
        ...prev,
        savedBy: newSaveStatus ? [...(prev?.savedBy || []), currentUser._id] : (prev?.savedBy || []).filter(id => String(id) !== String(currentUser._id))
      }));
    } catch (error) {
      setIsSaved(!newSaveStatus);
      toast.error('Failed to update save status');
    }
  };

  const handleDelete = async () => {
    if (!(await confirmDel('Are you sure you want to delete this post?'))) return;
    setIsDeleting(true);
    try {
      await axios.delete(`/api/posts/${postId}`, { withCredentials: true });
      toast.success('Post deleted');
      navigate(post?.author?.username ? `/profile/${post.author.username}` : '/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete post');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      const res = await axios.post(`/api/posts/${postId}/comment`, { text: comment }, { withCredentials: true });
      setPost(prev => ({ ...prev, comments: [...(prev.comments || []), res.data.comment] }));
      setComment('');
      toast.success('Comment added');
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) {
    return <div className="min-h-screen bg-dark-900 flex items-center justify-center text-white"><p>Post not found</p></div>;
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white pb-20 md:pb-0">
      <header className="sticky top-0 z-10 bg-dark-900/80 backdrop-blur-md border-b border-dark-700/50 p-3">
        <div className="flex items-center max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="btn-icon mr-3">
            <XMarkIcon className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Post</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto">
        {/* Author Info */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700/50">
          <div className="flex items-center gap-3">
            <img
              src={post?.author?.profilePic || '/default-avatar.png'}
              alt={post?.author?.username}
              className="w-8 h-8 rounded-full object-cover cursor-pointer"
              onClick={() => post?.author?.username && navigate(`/profile/${post.author.username}`)}
            />
            <span
              className="font-semibold text-sm cursor-pointer hover:underline"
              onClick={() => post?.author?.username && navigate(`/profile/${post.author.username}`)}
            >
              {post?.author?.username}
            </span>
          </div>
          {post?.author?._id === currentUser?._id ? (
            <button onClick={handleDelete} disabled={isDeleting} className="btn-icon text-red-400">
              {isDeleting ? <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin block" /> : <TrashIcon className="w-5 h-5" />}
            </button>
          ) : (
            <button className="btn-icon"><EllipsisHorizontalIcon className="w-5 h-5" /></button>
          )}
        </div>

        {/* Media */}
        <div className="bg-black">
          {post.mediaType === 'video' ? (
            <video src={post.mediaUrl || post.video} className="w-full max-h-[80vh] object-contain" controls autoPlay loop muted playsInline crossOrigin="anonymous" />
          ) : (
            <img src={post.mediaUrl || post.image} alt="Post" className="w-full max-h-[80vh] object-contain" crossOrigin="anonymous" />
          )}
        </div>

        {/* Actions */}
        <div className="p-4 space-y-3">
          <div className="flex justify-between">
            <div className="flex gap-3">
              <button onClick={handleLike} className="btn-icon">
                {isLiked ? <HeartIconSolid className="w-6 h-6 text-red-400" /> : <HeartIcon className="w-6 h-6" />}
              </button>
              <button onClick={() => document.getElementById('commentInput')?.focus()} className="btn-icon">
                <ChatBubbleLeftRightIcon className="w-6 h-6" />
              </button>
              <button onClick={() => setShareOpen(true)} className="btn-icon"><PaperAirplaneIcon className="w-6 h-6" /></button>
            </div>
            <button onClick={handleSave} className="btn-icon">
              {isSaved ? <BookmarkIconSolid className="w-6 h-6" /> : <BookmarkIcon className="w-6 h-6" />}
            </button>
          </div>

          <p className="font-semibold text-sm">{likesCount.toLocaleString()} likes</p>

          <div className="text-sm">
            <span className="font-semibold mr-2">{post.author?.username}</span>
            {post.caption}
          </div>

          {/* Comments */}
          <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin">
            {post.comments?.map(comment => (
              <div key={comment._id} className="text-sm">
                <span className="font-semibold mr-2">{comment.user?.username || comment.author?.username || 'User'}</span>
                <span className="text-dark-200">{comment.text}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-dark-400">
            {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
          </p>

          {/* Add Comment */}
          <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-3 border-t border-dark-700/50">
            <input
              id="commentInput"
              type="text"
              placeholder="Add a comment..."
              className="flex-1 bg-transparent text-sm placeholder:text-dark-400 focus:outline-none"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button
              type="submit"
              className={`text-sm font-semibold ${comment.trim() ? 'text-brand-400' : 'text-dark-500'}`}
              disabled={!comment.trim()}
            >
              Post
            </button>
          </form>
        </div>
      </div>
      <ShareModal isOpen={shareOpen} onClose={() => setShareOpen(false)} post={post} />
    </div>
  );
};

export default PostDetails;
