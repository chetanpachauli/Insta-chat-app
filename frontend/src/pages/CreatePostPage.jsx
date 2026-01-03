import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import CreatePost from '../components/CreatePost';
import { useAuth } from '../context/AuthContext';

export default function CreatePostPage() {
  const navigate = useNavigate();
  const { user, isCheckingAuth } = useAuth();
  const [isClosing, setIsClosing] = useState(false);

  // Handle closing animation and navigation
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      navigate(-1);
    }, 200);
  };

  // Check authentication status
  useEffect(() => {
    if (!isCheckingAuth && !user) {
      console.log('User not authenticated, redirecting to login');
      navigate('/login', { 
        state: { from: '/create' },
        replace: true 
      });
    }
  }, [user, isCheckingAuth, navigate]);

  // Show loading state while checking auth
  if (isCheckingAuth) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-gray-900 p-6 rounded-lg shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-white">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, we'll be redirected by the effect
  if (!user) {
    return null;
  }

  return (
    <div className={`fixed inset-0 bg-black/80 flex items-center justify-center z-50 transition-opacity duration-200 ${
      isClosing ? 'opacity-0' : 'opacity-100'
    }`}>
      <div className="relative w-full max-w-2xl bg-gray-900 rounded-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="border-b border-gray-800 p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Create Post</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        {/* Create Post Component */}
        <div className="max-h-[90vh] overflow-y-auto">
          <CreatePost 
            onCreated={() => {
              console.log('Post created, closing modal...');
              handleClose();
            }} 
          />
        </div>
      </div>
    </div>
  );
}
