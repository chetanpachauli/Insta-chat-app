import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ChatContainer from '../components/ChatContainer';
import StoriesBar from '../components/StoriesBar';
import { ChatContext } from '../context/ChatContext';
import { AuthContext } from '../context/AuthContext';
import {
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center">
          <p className="text-red-400 mb-4">Something went wrong.</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const authContext = useContext(AuthContext);
  const chatContext = useContext(ChatContext);
  const { user = null } = authContext || {};
  const { selectedUser } = chatContext || {};

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const userForStories = (user?.id || user?._id) ? user : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-dark-900 text-white pb-20 md:pb-0">
        <div className="max-w-[500px] mx-auto min-h-screen">
          {/* Header */}
          <header className="sticky top-0 z-10 bg-dark-900/80 backdrop-blur-md border-b border-dark-700/50 p-4">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-bold bg-gradient-brand bg-clip-text text-transparent">
                Instagram
              </h1>
              <button
                onClick={() => navigate('/messages')}
                className="btn-icon relative"
                aria-label="Messages"
              >
                <ChatBubbleLeftRightIcon className="w-6 h-6" />
                {selectedUser && <span className="badge" />}
              </button>
            </div>
          </header>

          {/* Stories */}
          <div className="border-b border-dark-700/50 px-4">
            <StoriesBar currentUser={userForStories} />
          </div>

          {/* Content */}
          <main className="p-4 animate-fade-in">
            {!selectedUser ? (
              <div className="flex flex-col items-center justify-center mt-20 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-brand p-[2px] mb-6">
                  <div className="w-full h-full rounded-full bg-dark-900 flex items-center justify-center">
                    <ChatBubbleLeftRightIcon className="w-8 h-8 text-dark-400" />
                  </div>
                </div>
                <h2 className="text-2xl font-semibold mb-2">
                  Welcome{user?.username ? `, ${user.username}` : ''}!
                </h2>
                <p className="text-dark-400 text-sm mb-6 max-w-xs">
                  Connect with friends and share your moments.
                </p>
                <button onClick={() => navigate('/messages')} className="btn-primary">
                  Start Messaging
                </button>
              </div>
            ) : (
              <div className="h-[calc(100vh-140px)]">
                <ChatContainer />
              </div>
            )}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}
