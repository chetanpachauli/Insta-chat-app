import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, HeartIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import axios from 'axios';

// Mock data - replace with actual API calls
export default function Notifications() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch notifications from API
    const fetchNotifications = async () => {
      try {
        const response = await axios.get('/api/notifications');
        setNotifications(response.data);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'all') return true;
    return notification.type === activeTab;
  });

  // Group notifications by date
  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const date = new Date(notification.createdAt).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(notification);
    return groups;
  }, {});

  const renderNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return <HeartIconSolid className="w-5 h-5 text-red-500" />;
      case 'comment':
        return <ChatBubbleLeftRightIcon className="w-5 h-5 text-blue-400" />;
      case 'follow':
        return <HeartIconSolid className="w-5 h-5 text-purple-500" />;
      default:
        return <HeartIcon className="w-5 h-5" />;
    }
  };

  const renderNotificationMessage = (notification) => {
    switch (notification.type) {
      case 'like':
        return `${notification.from?.username || 'Someone'} liked your post`;
      case 'comment':
        return `${notification.from?.username || 'Someone'} commented: ${notification.comment?.text || ''}`;
      case 'follow':
        return `${notification.from?.username || 'Someone'} started following you`;
      default:
        return 'New notification';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black bg-opacity-80 backdrop-blur-sm p-4 border-b border-gray-800">
        <div className="flex items-center">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 mr-4 hover:bg-gray-800 rounded-full"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Notifications</h1>
        </div>
        
        {/* Tabs */}
        <div className="flex space-x-4 mt-4 border-b border-gray-800">
          <button
            className={`pb-3 px-1 font-medium ${
              activeTab === 'all' ? 'text-white border-b-2 border-white' : 'text-gray-400'
            }`}
            onClick={() => setActiveTab('all')}
          >
            All
          </button>
          <button
            className={`pb-3 px-1 font-medium ${
              activeTab === 'like' ? 'text-white border-b-2 border-white' : 'text-gray-400'
            }`}
            onClick={() => setActiveTab('like')}
          >
            Likes
          </button>
          <button
            className={`pb-3 px-1 font-medium ${
              activeTab === 'comment' ? 'text-white border-b-2 border-white' : 'text-gray-400'
            }`}
            onClick={() => setActiveTab('comment')}
          >
            Comments
          </button>
          <button
            className={`pb-3 px-1 font-medium ${
              activeTab === 'follow' ? 'text-white border-b-2 border-white' : 'text-gray-400'
            }`}
            onClick={() => setActiveTab('follow')}
          >
            Follows
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="divide-y divide-gray-800">
        {Object.entries(groupedNotifications).length > 0 ? (
          Object.entries(groupedNotifications).map(([date, dateNotifications]) => (
            <div key={date} className="mb-6">
              <div className="px-4 py-2 text-sm text-gray-400">{date}</div>
              {dateNotifications.map((notification) => (
                <div 
                  key={notification._id} 
                  className="flex items-center p-4 hover:bg-gray-900 cursor-pointer transition-colors"
                  onClick={() => notification.postId && navigate(`/p/${notification.postId}`)}
                >
                  <div className="flex-shrink-0 mr-3">
                    <div className="relative">
                      <img
                        src={notification.from?.profilePic || '/default-avatar.png'}
                        alt={notification.from?.username || 'User'}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5">
                        {renderNotificationIcon(notification.type)}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold">{notification.from?.username || 'Someone'}</span>{' '}
                      {renderNotificationMessage(notification)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {notification.postImage && (
                    <div className="ml-4 flex-shrink-0">
                      <img
                        src={notification.postImage}
                        alt="Post preview"
                        className="w-12 h-12 rounded-md object-cover"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
              <HeartIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">No notifications yet</h3>
            <p className="text-gray-400 max-w-xs">
              When you get notifications, they'll appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
