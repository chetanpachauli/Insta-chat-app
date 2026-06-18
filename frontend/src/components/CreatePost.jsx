import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PaperClipIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import compressImage from '../utils/compressImage';

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
      let uploadFile = file;
      if (mediaType === 'image') {
        uploadFile = await compressImage(file, 1200, 0.85);
        console.log(`Image compressed: ${(file.size / 1024 / 1024).toFixed(1)}MB -> ${(uploadFile.size / 1024 / 1024).toFixed(1)}MB`);
      }

      // Upload to Cloudinary
      console.log('Uploading file to Cloudinary...');
      const { url: mediaUrl, type: mediaType } = await uploadToCloudinary(uploadFile);
      
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
            className="border-2 border-dashed border-dark-700 rounded-2xl p-12 text-center cursor-pointer hover:bg-dark-800/30 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <PaperClipIcon className="w-12 h-12 mx-auto text-dark-400 mb-4" />
            <h3 className="text-lg font-medium text-white mb-1">
              Drag photos and videos here
            </h3>
            <p className="text-dark-400 mb-4">
              or click to browse files
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="btn-primary"
            >
              Select from computer
            </button>
            <p className="mt-4 text-sm text-dark-400">
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
              <label htmlFor="caption" className="block text-sm font-medium text-dark-300">
                Caption
              </label>
              <textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption..."
                className="input-field"
                rows="3"
                maxLength="2200"
                disabled={loading}
              />
              <p className="text-xs text-dark-400 text-right">{caption.length}/2,200</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-dark-700">
        <button type="submit" disabled={!file || loading} className="btn-primary w-full">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Posting...
            </span>
          ) : 'Share Post'}
        </button>
      </div>
    </form>
  );
}