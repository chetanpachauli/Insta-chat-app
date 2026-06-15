import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import CreatePost from '../components/CreatePost';
import { useAuth } from '../context/AuthContext';

export default function CreatePostPage() {
  const navigate = useNavigate();
  const { user, isCheckingAuth } = useAuth();
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => navigate(-1), 200);
  };

  useEffect(() => {
    if (!isCheckingAuth && !user) {
      navigate('/login', { state: { from: '/create' }, replace: true });
    }
  }, [user, isCheckingAuth, navigate]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="card p-6 flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-dark-200">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className={`min-h-screen bg-dark-900/95 flex items-start justify-center pt-12 transition-opacity duration-200 ${
      isClosing ? 'opacity-0' : 'opacity-100'
    }`}>
      <div className="w-full max-w-lg card overflow-hidden shadow-2xl animate-scale-in">
        <div className="border-b border-dark-700 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create Post</h2>
          <button onClick={handleClose} className="btn-icon text-dark-400 hover:text-white">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="max-h-[85vh] overflow-y-auto scrollbar-thin">
          <CreatePost onCreated={() => handleClose()} />
        </div>
      </div>
    </div>
  );
}
