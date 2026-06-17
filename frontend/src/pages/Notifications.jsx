import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, HeartIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import axios from 'axios';

export default function Notifications() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'all') return true;
    return notification.type === activeTab;
  });

  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const date = new Date(notification.createdAt).toLocaleDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(notification);
    return groups;
  }, {});

  const renderNotificationIcon = (type) => {
    switch (type) {
      case 'like': return <HeartIconSolid className="w-4 h-4 text-red-400" />;
      case 'comment': return <ChatBubbleLeftRightIcon className="w-4 h-4 text-blue-400" />;
      case 'follow': return <HeartIconSolid className="w-4 h-4 text-brand-400" />;
      default: return <HeartIcon className="w-4 h-4" />;
    }
  };

  const renderNotificationMessage = (notification) => {
    switch (notification.type) {
      case 'like': return `${notification.from?.username || 'Someone'} liked your post`;
      case 'comment': return `${notification.from?.username || 'Someone'} commented: ${notification.comment?.text || ''}`;
      case 'follow': return `${notification.from?.username || 'Someone'} started following you`;
      default: return 'New notification';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white pb-20 md:pb-0">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-dark-900/80 backdrop-blur-md border-b border-dark-700/50">
          <div className="flex items-center p-4">
            <button onClick={() => navigate(-1)} className="btn-icon mr-3">
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">Notifications</h1>
          </div>

          {/* Tabs */}
          <div className="flex px-4 gap-4 border-b border-dark-700/50">
            {['all', 'like', 'comment', 'follow'].map(tab => (
              <button
                key={tab}
                className={`pb-3 text-sm font-medium capitalize ${
                  activeTab === tab
                    ? 'text-white border-b-2 border-brand-500'
                    : 'text-dark-400 hover:text-dark-200'
                } transition-colors`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'like' ? 'Likes' : tab === 'comment' ? 'Comments' : tab === 'follow' ? 'Follows' : 'All'}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="divide-y divide-dark-700/50">
          {Object.entries(groupedNotifications).length > 0 ? (
            Object.entries(groupedNotifications).map(([date, dateNotifications]) => (
              <div key={date}>
                <div className="px-4 py-2 text-xs font-medium text-dark-400 uppercase tracking-wider">{date}</div>
                {dateNotifications.map((notification) => (
                  <div
                    key={notification._id}
                    className="flex items-center p-4 hover:bg-dark-800/50 cursor-pointer transition-colors"
                    onClick={() => notification.post && navigate(`/p/${notification.post}`)}
                  >
                    <div className="relative shrink-0 mr-3">
                      <img
                        src={notification.from?.profilePic || '/default-avatar.png'}
                        alt={notification.from?.username || 'User'}
                        className="w-10 h-10 rounded-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-dark-900 flex items-center justify-center">
                        <div className="w-4 h-4 rounded-full bg-dark-700 flex items-center justify-center">
                          {renderNotificationIcon(notification.type)}
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-semibold">{notification.from?.username || 'Someone'}</span>{' '}
                        {renderNotificationMessage(notification)}
                      </p>
                      <p className="text-xs text-dark-400 mt-0.5">
                        {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {notification.post?.image && (
                      <img src={notification.post.image} alt="" className="w-12 h-12 rounded-lg object-cover ml-3 shrink-0" loading="lazy" />
                    )}
                  </div>
                ))}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-dark-800 flex items-center justify-center mb-4">
                <HeartIcon className="w-8 h-8 text-dark-400" />
              </div>
              <h3 className="text-lg font-bold mb-1">No notifications yet</h3>
              <p className="text-dark-400 text-sm max-w-xs">When you get notifications, they'll appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
