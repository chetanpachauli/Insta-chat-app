import React, { useState, useContext, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import ChatContainer from '../components/ChatContainer';
import { ChatContext } from '../context/ChatContext';
import { AuthContext } from '../context/AuthContext';
import { 
  HomeIcon, 
  MagnifyingGlassIcon as SearchIcon, 
  PlusCircleIcon as PlusSquareIcon, 
  HeartIcon, 
  UserCircleIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error in Home component:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center text-red-500">
          <p>Something went wrong. Please try again later.</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-red-500 text-white rounded-md"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Safe Chat Context Hook
function useSafeChatContext() {
  const context = useContext(ChatContext);
  
  useEffect(() => {
    if (!context) {
      console.warn('ChatContext is not available. Make sure ChatProvider is properly set up.');
    }
  }, [context]);

  // Return default values if context is not available
  if (!context) {
    return { 
      selectedUser: null,
      onlineUsers: [],
      messages: {},
      fetchMessages: async () => [],
      fetchUsers: async () => []
    };
  }

  return context;
}

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedUser, onlineUsers, messages, fetchMessages, fetchUsers } = useSafeChatContext();
  const authContext = useContext(AuthContext);
  
  // Safely destructure user and isCheckingAuth with defaults
  const { user = null, isCheckingAuth = false } = authContext || {};
  
  const [activeTab, setActiveTab] = useState('home');
  const [isLoading, setIsLoading] = useState(true);
  
  // Check if chat features are available
  const isChatAvailable = Boolean(useContext(ChatContext));

  // Update active tab based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path === '/') setActiveTab('home');
    else if (path.startsWith('/explore')) setActiveTab('search');
    else if (path.startsWith('/create')) setActiveTab('create');
    else if (path.startsWith('/notifications')) setActiveTab('activity');
    else if (path.startsWith('/profile')) setActiveTab('profile');
  }, [location]);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  if (isLoading || isCheckingAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-[500px] mx-auto bg-black min-h-screen pb-16">
          {/* Header */}
          <header className="sticky top-0 z-10 bg-black border-b border-gray-800 p-4">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-bold">Instagram</h1>
              <button 
                onClick={() => navigate('/messages')}
                className="p-2 hover:bg-gray-800 rounded-full relative"
                aria-label="Messages"
              >
                <ChatBubbleLeftRightIcon className="w-6 h-6" />
                {selectedUser && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                )}
              </button>
            </div>
          </header>
          
          {/* Main Content */}
          <main className="pb-4">
            {!selectedUser ? (
              <div className="p-4">
                <div className="max-w-md mx-auto text-center mt-10">
                  <h2 className="text-2xl font-semibold mb-2">
                    Welcome{user?.username ? `, ${user.username}` : ' to Instagram'}!
                  </h2>
                  <p className="text-gray-400 text-sm mb-6">
                    Connect with friends and share your moments.
                  </p>
                  <button
                    onClick={() => navigate('/messages')}
                    className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-md font-medium"
                  >
                    Start Messaging
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-[calc(100vh-56px)]">
                <ChatContainer />
              </div>
            )}
          </main>

          {/* Bottom Navigation */}
          <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800">
            <div className="max-w-[500px] mx-auto w-full flex justify-around items-center p-2">
              <button 
                onClick={() => {
                  setActiveTab('home');
                  navigate('/');
                }}
                className={`p-3 ${activeTab === 'home' ? 'text-white' : 'text-gray-400'}`}
                aria-label="Home"
              >
                <HomeIcon className="w-6 h-6" />
              </button>
              
              <button 
                onClick={() => {
                  setActiveTab('search');
                  navigate('/explore');
                }}
                className={`p-3 ${activeTab === 'search' ? 'text-white' : 'text-gray-400'}`}
                aria-label="Search"
              >
                <SearchIcon className="w-6 h-6" />
              </button>
              
              <button 
                onClick={() => {
                  setActiveTab('create');
                  navigate('/create');
                }}
                className={`p-3 ${activeTab === 'create' ? 'text-white' : 'text-gray-400'}`}
                aria-label="Create Post"
              >
                <PlusSquareIcon className="w-6 h-6" />
              </button>
              
              <button 
                onClick={() => {
                  setActiveTab('activity');
                  navigate('/notifications');
                }}
                className={`p-3 ${activeTab === 'activity' ? 'text-white' : 'text-gray-400'}`}
                aria-label="Activity"
              >
                <HeartIcon className="w-6 h-6" />
              </button>
              
              <button 
                onClick={() => {
                  setActiveTab('profile');
                  navigate(`/profile/${user?._id || ''}`);
                }}
                className={`p-3 ${activeTab === 'profile' ? 'text-white' : 'text-gray-400'}`}
                aria-label="Profile"
              >
                <UserCircleIcon className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}