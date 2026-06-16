import React, { useState, useEffect, useContext } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import { XMarkIcon, MagnifyingGlassIcon, LinkIcon, ShareIcon } from '@heroicons/react/24/outline';

export default function ShareModal({ isOpen, onClose, post }) {
  const { user: currentUser } = useContext(AuthContext) || {};
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(null);

  useEffect(() => {
    const userId = currentUser?._id || currentUser?.id;
    if (!isOpen || !userId) return;
    axios.get(`/api/messages/users/${userId}`, { withCredentials: true })
      .then(res => setUsers(res.data || []))
      .catch(() => {});
  }, [isOpen, currentUser?._id, currentUser?.id]);

  const filtered = users.filter(u =>
    !search || u.username?.toLowerCase().includes(search.toLowerCase())
  );

  const getPostLink = () => `${window.location.origin}/p/${post?._id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(getPostLink());
    toast.success('Link copied!');
    onClose();
  };

  const nativeShare = async () => {
    if (!navigator.share) {
      copyLink();
      return;
    }
    try {
      await navigator.share({
        title: post?.caption || 'Check out this post',
        text: post?.caption || '',
        url: getPostLink(),
      });
      onClose();
    } catch { /* user cancelled */ }
  };

  const handleShare = async (receiver) => {
    const senderId = currentUser?._id || currentUser?.id;
    if (!senderId || !post?._id) return;
    setSending(receiver._id);
    try {
      const link = `${window.location.origin}/p/${post._id}`;
      const authorName = typeof post.author === 'object' ? post.author?.username : 'user';
      const messageText = `📷 Shared a post by ${authorName}\n${post.caption || ''}\n${link}`;
      const formData = new FormData();
      formData.append('message', messageText);
      formData.append('receiverId', receiver._id);

      // Attach the post image so it shows as a rich preview in chat
      if (post.image) {
        const imgRes = await fetch(post.image);
        const imgBlob = await imgRes.blob();
        formData.append('image', imgBlob, 'shared-post.jpg');
      }

      await axios.post(`/api/messages/send/${senderId}`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success(`Shared with ${receiver.username}`);
      onClose();
    } catch (err) {
      toast.error('Failed to share post');
    } finally {
      setSending(null);
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-dark-800 p-4 shadow-xl border border-dark-700">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title as="h3" className="text-lg font-semibold text-white">
                    Share
                  </Dialog.Title>
                  <button onClick={onClose} className="btn-icon text-dark-400 hover:text-white">
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                  {post?.image && (
                  <div className="mb-4 flex items-center gap-3 p-2 rounded-xl bg-dark-700/50">
                    <img src={post.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate text-white">{post.caption || 'Untitled Post'}</p>
                      <p className="text-xs text-dark-400">by {typeof post.author === 'object' ? (post.author?.username || 'unknown') : 'user'}</p>
                    </div>
                  </div>
                )}

                {/* Native share options */}
                <div className="flex gap-3 mb-4">
                  <button
                    onClick={nativeShare}
                    className="flex flex-col items-center gap-1 flex-1 p-3 rounded-xl bg-dark-700/50 hover:bg-dark-700 transition-colors"
                  >
                    <ShareIcon className="w-6 h-6 text-brand-400" />
                    <span className="text-[11px] text-dark-300 font-medium">Share to...</span>
                  </button>
                  <button
                    onClick={copyLink}
                    className="flex flex-col items-center gap-1 flex-1 p-3 rounded-xl bg-dark-700/50 hover:bg-dark-700 transition-colors"
                  >
                    <LinkIcon className="w-6 h-6 text-brand-400" />
                    <span className="text-[11px] text-dark-300 font-medium">Copy Link</span>
                  </button>
                </div>

                <div className="relative mb-3">
                  <MagnifyingGlassIcon className="w-4 h-4 text-dark-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search people..."
                    className="w-full bg-dark-700 text-white pl-9 pr-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 placeholder:text-dark-400"
                  />
                </div>

                <div className="max-h-72 overflow-y-auto space-y-1 -mx-4 px-4">
                  {filtered.length === 0 ? (
                    <p className="text-center text-dark-400 text-sm py-8">No users found</p>
                  ) : (
                    filtered.map(u => (
                      <button
                        key={u._id}
                        onClick={() => handleShare(u)}
                        disabled={sending === u._id}
                        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-dark-700/50 transition-colors text-left"
                      >
                        <img
                          src={u.profilePic || '/default-avatar.png'}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{u.username}</p>
                          <p className="text-xs text-dark-400 truncate">{u.name || u.email}</p>
                        </div>
                        <span className="text-xs text-brand-400 font-semibold shrink-0">
                          {sending === u._id ? 'Sending...' : 'Send'}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
