import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { HeartIcon, ChatBubbleLeftRightIcon, PaperAirplaneIcon, BookmarkIcon, XMarkIcon, TrashIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid, BookmarkIcon as BookmarkIconSolid } from '@heroicons/react/24/solid';
import { AuthContext } from '../context/AuthContext';

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

    if (currentUser) {
      fetchPost();
    }
  }, [postId, currentUser?._id, navigate]);

  const handleLike = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const newLikeStatus = !isLiked;
    
    // Optimistic update
    setIsLiked(newLikeStatus);
    setLikesCount(prev => newLikeStatus ? prev + 1 : Math.max(0, prev - 1));
    
    try {
      await axios.post(`/api/posts/${postId}/like`, {
        action: newLikeStatus ? 'like' : 'unlike'
      }, { withCredentials: true });
      
      // Update the post data with the new like status
      setPost(prev => ({
        ...prev,
        likes: newLikeStatus 
          ? [...(prev?.likes || []), currentUser._id]
          : (prev?.likes || []).filter(id => String(id) !== String(currentUser._id))
      }));
    } catch (error) {
      console.error('Error updating like:', error);
      // Revert on error
      setIsLiked(!newLikeStatus);
      setLikesCount(prev => newLikeStatus ? Math.max(0, prev - 1) : prev + 1);
      toast.error('Failed to update like');
    }
  };

  const handleSave = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const newSaveStatus = !isSaved;
    
    // Optimistic update
    setIsSaved(newSaveStatus);
    
    try {
      await axios.post(`/api/posts/${postId}/save`, {
        action: newSaveStatus ? 'save' : 'unsave'
      }, { withCredentials: true });
      
      // Update the post data with the new save status
      setPost(prev => ({
        ...prev,
        savedBy: newSaveStatus
          ? [...(prev?.savedBy || []), currentUser._id]
          : (prev?.savedBy || []).filter(id => String(id) !== String(currentUser._id))
      }));
    } catch (error) {
      console.error('Error updating save status:', error);
      // Revert on error
      setIsSaved(!newSaveStatus);
      toast.error('Failed to update save status');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    setIsDeleting(true);
    try {
      await axios.delete(`/api/posts/${postId}`, { withCredentials: true });
      toast.success('Post deleted successfully');
      if (post?.author?.username) {
        navigate(`/profile/${post.author.username}`);
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error(error.response?.data?.message || 'Failed to delete post');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    
    try {
      const res = await axios.post(`/api/posts/${postId}/comment`, {
        text: comment
      }, { withCredentials: true });
      
      setPost(prev => ({
        ...prev,
        comments: [...(prev.comments || []), res.data.comment]
      }));
      
      setComment('');
      toast.success('Comment added');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-t-transparent border-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <p>Post not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm p-4 border-b border-gray-800">
        <div className="flex items-center">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gray-800"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold ml-4">Post</h1>
        </div>
      </header>

      {/* Post Content */}
      <div className="max-w-2xl mx-auto">
        {/* Author Info */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <img 
              src={post?.author?.profilePic || '/default-avatar.png'} 
              alt={post?.author?.username} 
              className="w-8 h-8 rounded-full object-cover"
              onClick={() => post?.author?.username && navigate(`/profile/${post.author.username}`)}
              style={{ cursor: 'pointer' }}
            />
            <span 
              className="font-semibold hover:underline cursor-pointer"
              onClick={() => post?.author?.username && navigate(`/profile/${post.author.username}`)}
            >
              {post?.author?.username}
            </span>
          </div>
          {post?.author?._id === currentUser?._id ? (
            <div className="relative">
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                title="Delete post"
              >
                {isDeleting ? (
                  <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <TrashIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          ) : (
            <button>
              <EllipsisHorizontalIcon className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {/* Post Media */}
        <div className="bg-black">
          {post.mediaType === 'video' ? (
            <video 
              src={post.mediaUrl || post.video} 
              className="w-full max-h-[80vh] object-contain"
              controls
              autoPlay
              loop
              muted
              playsInline
              crossOrigin="anonymous"
            />
          ) : (
            <img 
              src={post.mediaUrl || post.image} 
              alt="Post" 
              className="w-full max-h-[80vh] object-contain"
              crossOrigin="anonymous"
            />
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 space-y-2">
          <div className="flex justify-between">
            <div className="flex space-x-4">
              <button onClick={handleLike} className="p-1">
                {isLiked ? (
                  <HeartIconSolid className="w-7 h-7 text-red-500" />
                ) : (
                  <HeartIcon className="w-7 h-7" />
                )}
              </button>
              <button 
                onClick={() => document.getElementById('commentInput')?.focus()} 
                className="p-1"
              >
                <ChatBubbleLeftRightIcon className="w-7 h-7" />
              </button>
              <button className="p-1">
                <PaperAirplaneIcon className="w-7 h-7 -rotate-45" />
              </button>
            </div>
            <button onClick={handleSave} className="p-1">
              {isSaved ? (
                <BookmarkIconSolid className="w-7 h-7" />
              ) : (
                <BookmarkIcon className="w-7 h-7" />
              )}
            </button>
          </div>

          {/* Likes Count */}
          <p className="font-semibold">{likesCount.toLocaleString()} likes</p>

          {/* Caption */}
          <div className="mt-1">
            <span className="font-semibold mr-2">{post.author?.username}</span>
            <span>{post.caption}</span>
          </div>

          {/* Comments */}
          <div className="mt-2">
            {post.comments?.length > 0 && (
              <button 
                className="text-gray-400 text-sm"
                onClick={() => {}}
              >
                View all {post.comments.length} comments
              </button>
            )}
            
            {/* Comments List */}
            <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
              {post.comments?.map(comment => (
                <div key={comment._id} className="flex items-start">
                  <span className="font-semibold mr-2">{comment.user?.username}</span>
                  <span>{comment.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Timestamp */}
          <p className="text-xs text-gray-400 mt-2">
            {new Date(post.createdAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric'
            })}
          </p>

          {/* Add Comment */}
          <form onSubmit={handleAddComment} className="flex items-center mt-4 border-t border-gray-800 pt-4">
            <input
              id="commentInput"
              type="text"
              placeholder="Add a comment..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button 
              type="submit"
              className={`font-semibold ${comment.trim() ? 'text-blue-400' : 'text-blue-200'} text-sm`}
              disabled={!comment.trim()}
            >
              Post
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PostDetails;