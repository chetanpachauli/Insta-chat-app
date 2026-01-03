import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PaperClipIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function CreatePost({ onCreated }) {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [mediaType, setMediaType] = useState('image');
  const fileInputRef = useRef(null);
  const isMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleFileChange = (e) => {
    try {
      const selectedFile = e.target.files?.[0];
      console.log('File selected:', selectedFile);
      
      if (!selectedFile) {
        console.log('No file selected');
        return;
      }

      // Clean up previous preview URL if it exists
      if (preview) {
        URL.revokeObjectURL(preview);
      }

      const fileType = selectedFile.type.split('/')[0];
      console.log('File type detected:', fileType);

      if (!['image', 'video'].includes(fileType)) {
        toast.error('Please select an image or video file');
        return;
      }

      // Validate file size (50MB for video, 10MB for images)
      const maxSize = fileType === 'video' ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (selectedFile.size > maxSize) {
        toast.error(`File too large. Max size: ${fileType === 'video' ? '50MB' : '10MB'}`);
        return;
      }

      setMediaType(fileType);
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      console.log('Preview URL created');
    } catch (error) {
      console.error('Error handling file selection:', error);
      toast.error('Failed to process the selected file');
    }
  };

  const uploadToCloudinary = useCallback(async (file) => {
    console.log('Starting file upload...');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

    try {
      console.log('Uploading to Cloudinary...');
      const response = await fetch(import.meta.env.VITE_CLOUDINARY_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Cloudinary upload failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.message || 'Upload failed');
      }

      const data = await response.json();
      console.log('Cloudinary upload successful:', {
        url: data.secure_url,
        type: data.resource_type
      });
      return {
        url: data.secure_url,
        type: data.resource_type
      };
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      throw new Error(error.message || 'Failed to upload file. Please try again.');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submission started');
    
    if (!file) {
      console.log('No file selected for upload');
      toast.error('Please select a file to upload');
      return;
    }

    if (loading) {
      console.log('Upload already in progress');
      return;
    }

    setLoading(true);
    console.log('Upload in progress...');

    try {
      // Upload to Cloudinary
      console.log('Uploading file to Cloudinary...');
      const { url: mediaUrl, type: mediaType } = await uploadToCloudinary(file);
      
      // Create post in the database
      console.log('Creating post in database...', {
        image: mediaUrl,
        mediaType,
        caption: caption.trim()
      });

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/posts`,
        {
          image: mediaUrl,
          mediaType,
          caption: caption.trim(),
        },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Post created successfully:', response.data);
      toast.success('Post created successfully!');

      // Reset form
      setFile(null);
      setPreview('');
      setCaption('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Call onCreated callback if provided
      if (onCreated && typeof onCreated === 'function') {
        console.log('Calling onCreated callback');
        onCreated();
      }
    } catch (error) {
      console.error('Error creating post:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      });
      
      const errorMessage = error.response?.data?.message || 
                         error.message || 
                         'Failed to create post. Please try again.';
      toast.error(errorMessage);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        {!file ? (
          <div 
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <PaperClipIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              Drag photos and videos here
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              or click to browse files
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Select from computer
            </button>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Supports JPG, PNG, MP4 (max {mediaType === 'video' ? '50MB' : '10MB'})
            </p>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*,video/*"
              onChange={handleFileChange}
              disabled={loading}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden">
              {mediaType === 'video' ? (
                <video
                  src={preview}
                  className="w-full max-h-[60vh] object-contain"
                  controls
                />
              ) : (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full max-h-[60vh] object-contain"
                />
              )}
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPreview('');
                  setCaption('');
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="absolute top-2 right-2 bg-black/70 text-white p-1.5 rounded-full hover:bg-black/90"
                disabled={loading}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label htmlFor="caption" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Caption
              </label>
              <textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption..."
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                maxLength="2200"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                {caption.length}/2,200
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="submit"
          disabled={!file || loading}
          className={`w-full py-2.5 px-4 rounded-lg font-medium text-white ${
            !file || loading
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          } transition-colors`}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              {loading ? 'Posting...' : 'Share Post'}
            </span>
          ) : (
            'Share Post'
          )}
        </button>
      </div>
    </form>
  );
}