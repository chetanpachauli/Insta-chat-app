import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import { 
  UserCircleIcon, 
  HomeIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon,
  ChatBubbleLeftRightIcon,
  HeartIcon,
  BookmarkIcon,
  EllipsisHorizontalIcon,
  ArrowLeftIcon,
  UserPlusIcon,
  UserMinusIcon,
  PhotoIcon,
  ArrowRightOnRectangleIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid, BookmarkIcon as BookmarkIconSolid, PlusIcon } from '@heroicons/react/24/solid';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useRef } from 'react';
import { uploadImageToCloudinary } from '../utils/cloudinary';
import api from '../utils/axiosConfig';

// Follow Button Component with improved UX
const FollowButton = ({ profile, onUpdate, setProfile }) => {
  const [loading, setLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const { user: me } = useContext(AuthContext);

  // Update follow status when profile or me changes
  useEffect(() => {
    if (profile && profile.followers) {
      const isUserFollowing = profile.followers.some(follower => 
        typeof follower === 'string' ? 
        follower === me?._id : 
        follower._id === me?._id
      );
      setIsFollowing(isUserFollowing);
    }
  }, [profile, me?._id]);

  const toggleFollow = async () => {
    if (loading) return;
    setLoading(true);
    
    try {
      if (isFollowing) {
        console.log('Unfollowing user:', profile._id);
        await axios.post(`http://localhost:5000/api/profile/${profile._id}/unfollow`, {}, {
          withCredentials: true
        });
        console.log('Successfully unfollowed user');
        toast.success(`Unfollowed ${profile.username}`);
      } else {
        console.log('Following user:', profile._id);
        await axios.post(`http://localhost:5000/api/profile/${profile._id}/follow`, {}, {
          withCredentials: true
        });
        console.log('Successfully followed user');
        toast.success(`Followed ${profile.username}`);
      }
      
      // Update the local state to reflect the change
      setProfile(prev => ({
        ...prev,
        followers: isFollowing 
          ? prev.followers.filter(id => id !== me._id)
          : [...prev.followers, me._id],
        followersCount: isFollowing 
          ? prev.followersCount - 1 
          : prev.followersCount + 1
      }));
      
      // Update the isFollowing state
      setIsFollowing(!isFollowing);
      
    } catch (err) {
      console.error('Error toggling follow status:', err);
      toast.error(err.response?.data?.message || 'Failed to update follow status');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <button 
        className="px-4 py-2 bg-gray-800 text-white rounded-md w-full flex items-center justify-center" 
        disabled
      >
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
        {isFollowing ? 'Unfollowing...' : 'Following...'}
      </button>
    );
  }

  return (
    <button
      onClick={toggleFollow}
      className={`px-4 py-2 rounded-md w-full flex items-center justify-center space-x-2 transition-all duration-200 ${
        isFollowing 
          ? 'bg-gray-800 text-white hover:bg-gray-700' 
          : 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white hover:opacity-90'
      }`}
    >
      {isFollowing ? (
        <>
          <UserMinusIcon className="w-5 h-5" />
          <span>Following</span>
        </>
      ) : (
        <>
          <UserPlusIcon className="w-5 h-5" />
          <span>Follow</span>
        </>
      )}
    </button>
  );
};

// Post Grid Item Component with enhanced hover effects and delete functionality
const PostGridItem = ({ post, onClick, isOwnProfile = false, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    setIsDeleting(true);
    try {
      await axios.delete(`/api/posts/${post._id}`, { withCredentials: true });
      toast.success('Post deleted successfully');
      if (onDelete) onDelete(post._id);
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error(error.response?.data?.message || 'Failed to delete post');
    } finally {
      setIsDeleting(false);
    }
  };

  // Format numbers for display (e.g., 1500 -> 1.5K)
  const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Handle image loading and errors
  const handleImageError = (e) => {
    if (!imageError) {
      setImageError(true);
      e.target.style.display = 'none';
    }
  };

  // Get image URL with fallback
  const getImageUrl = () => {
    if (post?.image?.includes('res.cloudinary.com')) {
      return post.image;
    } else if (post?.imageUrl) {
      return post.imageUrl;
    } else if (post?.mediaUrl) {
      return post.mediaUrl;
    }
    return `https://source.unsplash.com/random/300x300/?${Math.random()}`;
  };

  return (
    <div 
      className="relative w-full h-0 pb-[100%] overflow-hidden bg-gray-900 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Delete button - only show on hover and if it's the user's own profile */}
      {isOwnProfile && (isHovered || isDeleting) && (
        <div className="absolute top-2 right-2 z-10">
          <button 
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1.5 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors"
            title="Delete post"
          >
            {isDeleting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <TrashIcon className="w-4 h-4" />
            )}
          </button>
        </div>
      )}
      <div className="absolute inset-0 w-full h-full">
        {!imageError ? (
          <img 
            src={getImageUrl()}
            alt="Post" 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            onError={handleImageError}
            loading="lazy"
            style={{ minWidth: '100%', minHeight: '100%' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <div className="text-center p-4">
              <PhotoIcon className="w-8 h-8 mx-auto text-gray-600 mb-2" />
              <span className="text-gray-400 text-sm">Couldn't load image</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Hover overlay with like/comment counts */}
      <div className={`
        absolute inset-0 transition-all duration-300 flex items-center justify-center gap-6 text-white bg-black/50
        ${isHovered ? 'opacity-100' : 'opacity-0'}
      `}>
        <div className="flex items-center">
          <HeartIconSolid className="w-5 h-5 mr-1.5" />
          <span className="font-medium">{formatNumber(post?.likes?.length || 0)}</span>
        </div>
        <div className="flex items-center">
          <ChatBubbleLeftRightIcon className="w-5 h-5 mr-1.5" />
          <span className="font-medium">{formatNumber(post?.comments?.length || 0)}</span>
        </div>
      </div>
    </div>
  );
};

// Edit Profile Modal Component
const EditProfileModal = ({ isOpen, onClose, user, onSave }) => {
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(user?.photo || '');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    
    try {
      await onSave({
        username,
        bio,
        photo: photo, // Send the file object directly
      });
      
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-zinc-900 p-6 text-left align-middle shadow-xl transition-all border border-zinc-800">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-white mb-6"
                >
                  Edit Profile
                </Dialog.Title>

                <form onSubmit={handleSubmit}>
                  <div className="mb-6">
                    <div className="relative w-32 h-32 mx-auto mb-4 group">
                      <img
                        src={photoPreview || '/default-avatar.png'}
                        alt="Profile"
                        className="w-full h-full rounded-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full hover:bg-blue-700 transition-colors"
                      >
                        <PlusIcon className="w-5 h-5 text-white" />
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handlePhotoChange}
                          accept="image/*"
                          className="hidden"
                        />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
                          Username
                        </label>
                        <input
                          type="text"
                          id="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter your username"
                        />
                      </div>

                      <div>
                        <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-1">
                          Bio
                        </label>
                        <textarea
                          id="bio"
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          rows="3"
                          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Tell us about yourself..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isUploading}
                      className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        isUploading ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                    >
                      {isUploading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

const Profile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  
  // Debug auth state
  console.log("Current Auth State:", auth);
  
  // Safety check for auth context
  if (!auth) {
    return <div className="flex items-center justify-center min-h-screen">Auth context not available...</div>;
  }
  
  const { user: me, logout, updateProfile } = auth;
  
  // Redirect to login if no user
  if (!me) {
    navigate('/login');
    return null;
  }
  
  // Initialize with empty profile data structure to prevent null reference errors
  const [profile, setProfile] = useState({
    name: '',
    username: '',
    bio: '',
    profilePic: '',
    followers: [],
    following: [],
    posts: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('posts');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: '',
    bio: '',
    profilePic: ''
  });
  
  // Debug log
  console.log('Profile params:', { username, me });
  
  const isOwnProfile = !username || username === me?.username;

  // Handle post click
  const handlePostClick = (postId) => {
    navigate(`/p/${postId}`);
  };

  // Handle post deletion
  const handleDeletePost = (deletedPostId) => {
    setProfile(prev => ({
      ...prev,
      posts: prev.posts.filter(post => post._id !== deletedPostId)
    }));
  };

  // Handle back navigation
  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  // Handle update profile with file upload
  const handleUpdateProfile = async (updatedProfile) => {
    try {
      setLoading(true);
      const formData = new FormData();
      
      // Append text fields
      if (updatedProfile.username) formData.append('name', updatedProfile.username);
      if (updatedProfile.bio !== undefined) formData.append('bio', updatedProfile.bio);
      
      // Handle file upload if a new photo was selected
      if (updatedProfile.photo && updatedProfile.photo instanceof File) {
        formData.append('photo', updatedProfile.photo);
      } else if (updatedProfile.photo) {
        // If it's a string (URL), just update the profilePic
        formData.append('profilePic', updatedProfile.photo);
      }
      
      // Make the API call
      const res = await axios.put('/api/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true,
      });
      
      // Update the local profile state
      const updatedUserData = res.data;
      setProfile(prev => ({
        ...prev,
        ...updatedUserData,
        followers: prev?.followers || [],
        following: prev?.following || []
      }));
      
      // Update auth context if available
      if (auth?.updateUser) {
        auth.updateUser(updatedUserData);
      }
      
      toast.success('Profile updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Handle share profile
  const handleShareProfile = () => {
    const profileUrl = `${window.location.origin}/profile/${profile?._id}`;
    navigator.clipboard.writeText(profileUrl).then(() => {
      toast.success('Profile link copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  };

  // Handle delete account
  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      try {
        await api.delete('/auth/delete-account');
        toast.success('Account deleted successfully');
        logout();
        navigate('/login');
      } catch (error) {
        console.error('Error deleting account:', error);
        toast.error(error.response?.data?.message || 'Failed to delete account');
      }
    }
  };

  // Handle settings
  const handleSettings = () => {
    navigate('/accounts/settings/');
  };

  useEffect(() => {
    const getProfile = async () => {
      try {
        console.log("Fetching profile for:", username);
        setLoading(true);
        const token = localStorage.getItem('accessToken');
        console.log('Current token:', token);
        
        const res = await axios.get(`/api/profile/${username}`, {
          withCredentials: true,
          timeout: 10000,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('Profile data received:', res.data);
        setProfile({
          ...res.data,
          followers: Array.isArray(res.data.followers) ? res.data.followers : [],
          following: Array.isArray(res.data.following) ? res.data.following : [],
          posts: Array.isArray(res.data.posts) ? res.data.posts : []
        });
      } catch (err) {
        console.error("Profile fetch error:", err);
        setError(err.response?.data?.message || "User not found");
      } finally {
        setLoading(false);
      }
    };
    
    if (username) {
      getProfile();
    } else {
      console.error("No username provided for profile fetch");
      setError("No user specified");
      setLoading(false);
    }
  }, [username]);

  // Show loading state only if we have no profile data yet
  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
        <p className="text-gray-300">Loading profile data...</p>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!auth.isCheckingAuth && !auth.user) {
    navigate('/login');
    return null;
  }
  
  if (!profile) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Profile not found</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white max-w-4xl mx-auto px-4 md:px-6 lg:px-8">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-gray-800 p-3 mt-4 mx-4 rounded-2xl">
        <div className="flex items-center max-w-4xl mx-auto">
          <button 
            onClick={handleBack}
            className="p-2 hover:bg-gray-800 rounded-full mr-4 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">{profile?.username || 'Profile'}</h1>
            <p className="text-xs text-gray-400">
              {profile?.posts?.length || 0} posts • {profile?.followers?.length || 0} followers • {profile?.following?.length || 0} following
            </p>
          </div>
          {isOwnProfile ? (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSettings}
                  className="p-2 hover:bg-gray-800 rounded-full"
                  aria-label="Settings"
                >
                  <EllipsisHorizontalIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={logout}
                  className="p-2 text-blue-500 hover:bg-gray-800 rounded-full"
                  aria-label="Logout"
                  title="Logout"
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="p-2 text-red-500 hover:bg-gray-800 rounded-full"
                  aria-label="Delete account"
                  title="Delete Account"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleShareProfile}
                className="p-2 hover:bg-gray-800 rounded-full"
                aria-label="Share profile"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
              <FollowButton 
                profile={profile} 
                onUpdate={(updatedProfile) => setProfile(prev => ({
                  ...prev,
                  ...updatedProfile,
                  followers: updatedProfile.followers || prev.followers,
                  following: updatedProfile.following || prev.following
                }))}
                setProfile={setProfile}
              />
            </div>
          )}
        </div>
      </header>

      {/* Profile Info */}
      <div className="p-4 mt-4 bg-gray-900/50 rounded-3xl">
        <div className="flex items-start space-x-8 mb-6">
          {/* Profile Picture */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 p-0.5">
              <div className="bg-black rounded-full p-0.5 w-full h-full">
                {profile?.profilePic ? (
                  <img 
                    src={profile.profilePic} 
                    alt={profile.username}
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
                    }}
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center">
                    <UserCircleIcon className="w-12 h-12 md:w-16 md:h-16 text-gray-400" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <div className="mb-4">
              <h1 className="text-xl font-bold">{profile?.name || profile?.username}</h1>
              <p className="text-sm text-gray-300">Digital Creator</p>
              {profile?.bio && (
                <p className="text-sm mt-2 text-gray-300">{profile.bio}</p>
              )}
              {profile?.website && (
                <a 
                  href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 text-sm hover:underline block mt-1"
                >
                  {profile.website}
                </a>
              )}
            </div>

            {/* Follow/Edit Button */}
            <div className="flex space-x-2">
              {isOwnProfile ? (
                <button 
                  onClick={() => setEditing(true)}
                  className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-1.5 px-4 rounded-md text-sm flex-1"
                >
                  Edit Profile
                </button>
              ) : (
                <button className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-1.5 px-6 rounded-md text-sm">
                  Follow
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-gray-800">
          <div className="flex">
            <button 
              className={`flex-1 py-3 text-center flex items-center justify-center space-x-1 ${
                tab === 'posts' 
                  ? 'text-white border-t-2 border-white' 
                  : 'text-gray-400 hover:bg-gray-900'
              }`}
              onClick={() => setTab('posts')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span className="text-xs font-medium">POSTS</span>
            </button>
            
            <button 
              className={`flex-1 py-3 text-center flex items-center justify-center space-x-1 ${
                tab === 'saved' 
                  ? 'text-white border-t-2 border-white' 
                  : 'text-gray-400 hover:bg-gray-900'
              }`}
              onClick={() => setTab('saved')}
            >
              <BookmarkIcon className="w-5 h-5" />
              <span className="text-xs font-medium">SAVED</span>
            </button>
            
            <button 
              className={`flex-1 py-3 text-center flex items-center justify-center space-x-1 ${
                tab === 'tagged' 
                  ? 'text-white border-t-2 border-white' 
                  : 'text-gray-400 hover:bg-gray-900'
              }`}
              onClick={() => setTab('tagged')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span className="text-xs font-medium">TAGGED</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="min-h-[300px] w-full">
            {tab === 'posts' && (
              <div className="grid grid-cols-3 gap-2 w-full">
                {profile?.posts?.length > 0 ? (
                  profile.posts.map((post, index) => (
                    <div key={post._id} className="aspect-square w-full overflow-hidden group">
                      <PostGridItem 
                        post={post} 
                        onClick={() => handlePostClick(post._id)}
                        isOwnProfile={isOwnProfile}
                        onDelete={handleDeletePost}
                      />
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full border-2 border-gray-700 flex items-center justify-center mb-4">
                      <PhotoIcon className="w-8 h-8 text-gray-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-100 mb-2">No Posts Yet</h3>
                    <p className="text-gray-400 max-w-md">
                      When you share photos and videos, they'll appear on your profile.
                    </p>
                  </div>
                )}
              </div>
            )}

            {tab === 'saved' && (
              <div className="py-16 text-center">
                <div className="mx-auto w-16 h-16 rounded-full border-2 border-gray-700 flex items-center justify-center mb-4">
                  <BookmarkIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Saved</h3>
                <p className="text-gray-400 max-w-xs mx-auto">
                  Save photos and videos that you want to see again. No one is notified, and only you can see what you've saved.
                </p>
              </div>
            )}

            {tab === 'tagged' && (
              <div className="py-16 text-center">
                <div className="mx-auto w-16 h-16 rounded-full border-2 border-gray-700 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Photos of You</h3>
                <p className="text-gray-400 max-w-xs mx-auto">
                  When people tag you in photos, they'll appear here.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom spacing for mobile */}
        <div className="h-16 md:hidden"></div>
      </div>
      
      {/* Edit Profile Modal */}
      <EditProfileModal 
        isOpen={editing}
        onClose={() => setEditing(false)}
        user={profile}
        onSave={handleUpdateProfile}
      />
    </div>
  );
};

export default Profile;