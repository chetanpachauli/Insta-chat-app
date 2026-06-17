import React, { useContext, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import AuthProvider, { AuthContext } from './context/AuthContext';
import ChatProvider from './context/ChatContext';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';

import { ConfirmProvider } from './hooks/useConfirm';

const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Profile = lazy(() => import('./pages/Profile'));
const Feed = lazy(() => import('./pages/Feed'));
const Explore = lazy(() => import('./pages/Explore'));
const Search = lazy(() => import('./pages/Search'));
const Reels = lazy(() => import('./pages/Reels'));
const Messages = lazy(() => import('./pages/Messages'));
const Notifications = lazy(() => import('./pages/Notifications'));
const CreatePostPage = lazy(() => import('./pages/CreatePostPage'));
  const PostDetails = lazy(() => import('./pages/PostDetails'));
  const Settings = lazy(() => import('./pages/Settings'));
  const CloseFriends = lazy(() => import('./pages/CloseFriends'));

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-dark-400 text-sm animate-pulse-soft">Loading...</p>
      </div>
    </div>
  );
}

function AppRoutes() {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const isCheckingAuth = auth?.isCheckingAuth;

  const ProtectedRoute = ({ children }) => {
    if (isCheckingAuth) return <LoadingSpinner />;
    if (!user) return <Navigate to="/login" replace />;
    return (
      <Layout>
        <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
      </Layout>
    );
  };

  const PublicRoute = ({ children }) => {
    if (isCheckingAuth) return <LoadingSpinner />;
    if (user) return <Navigate to="/" replace />;
    return <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>;
  };

  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
      <Route path="/profile/:username" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/explore" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
      <Route path="/reels" element={<ProtectedRoute><Reels /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/create" element={<ProtectedRoute><CreatePostPage /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
      <Route path="/p/:postId" element={<ProtectedRoute><PostDetails /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/close-friends" element={<ProtectedRoute><CloseFriends /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppWithProviders() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const content = (
    <AuthProvider>
      <ChatProvider>
        <ConfirmProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#18181b',
                color: '#fff',
                border: '1px solid #27272a',
                borderRadius: '12px',
              },
            }}
          />
          <AppRoutes />
        </ConfirmProvider>
      </ChatProvider>
    </AuthProvider>
  );

  return googleClientId ? (
    <GoogleOAuthProvider clientId={googleClientId}>
      {content}
    </GoogleOAuthProvider>
  ) : content;
}

export default AppWithProviders;
