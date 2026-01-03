import React, { useContext, Suspense, lazy, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthProvider, { AuthContext, useAuth } from './context/AuthContext';
import ChatProvider from './context/ChatContext';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import { ThemeProvider } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import axios from 'axios';
import { setupAxiosInterceptors } from './utils/axiosConfig';

// Create a dark theme with black background
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#000000',
      paper: '#000000',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b3b3b3',
    },
    primary: {
      main: '#1976d2', // Blue for active states
    },
    secondary: {
      main: '#ffd700', // Gold for highlights
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#000000',
          color: '#ffffff',
        },
      },
    },
  },
});

// Lazy load pages for better performance
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


function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-t-transparent border-purple-500 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-300">Loading...</p>
      </div>
    </div>
  );
}

function AppRoutes(){
  const auth = useContext(AuthContext)
  const user = auth?.user
  const isCheckingAuth = auth?.isCheckingAuth
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      // Setup axios interceptors and get cleanup function
      const cleanupInterceptors = setupAxiosInterceptors(navigate);
      
      try {
        // Check if user is authenticated
        await checkAuth();
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
      
      // Cleanup interceptors on unmount
      return () => {
        if (cleanupInterceptors) {
          cleanupInterceptors();
        }
      };
    };
    
    initialize();
  }, [checkAuth, navigate]);

  // Wrapper component to handle protected routes
const ProtectedRoute = ({ children }) => {
  if (isCheckingAuth) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  
  return (
    <Layout>
      <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
    </Layout>
  );
};

  // Public route wrapper
  const PublicRoute = ({ children }) => {
    if (isCheckingAuth || loading) {
      return <LoadingSpinner />;
    }
    
    if (user) {
      return <Navigate to="/" replace />;
    }
    
    return <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>;
  };

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/signup" element={
        <PublicRoute>
          <Signup />
        </PublicRoute>
      } />

      {/* Protected routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Suspense fallback={<LoadingSpinner />}>
            <Home />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/profile/:username" element={
        <ProtectedRoute>
          <Suspense fallback={<LoadingSpinner />}>
            <Profile />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/explore" element={
        <ProtectedRoute>
          <Suspense fallback={<LoadingSpinner />}>
            <Explore />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/search" element={
        <ProtectedRoute>
          <Suspense fallback={<LoadingSpinner />}>
            <Search />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/reels" element={
        <ProtectedRoute>
          <Suspense fallback={<LoadingSpinner />}>
            <Reels />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/notifications" element={
        <ProtectedRoute>
          <Suspense fallback={<LoadingSpinner />}>
            <Notifications />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/create" element={
        <ProtectedRoute>
          <Suspense fallback={<LoadingSpinner />}>
            <CreatePostPage />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/messages" element={
        <ProtectedRoute>
          <Suspense fallback={<LoadingSpinner />}>
            <Messages />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/p/:postId" element={
        <ProtectedRoute>
          <Suspense fallback={<LoadingSpinner />}>
            <PostDetails />
          </Suspense>
        </ProtectedRoute>
      } />

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Back button component for sub-pages
const BackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Don't show back button on home page
  if (location.pathname === '/') return null;
  
  return (
    <button 
      onClick={() => navigate(-1)}
      className="mr-4 p-1 rounded-full hover:bg-gray-800 transition-colors"
      aria-label="Go back"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
    </button>
  );
};
function AppWithProviders() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AuthProvider>
        <ChatProvider>
          <Toaster 
            position="top-center"
            toastOptions={{
              style: {
                background: '#1a1a1a',
                color: '#fff',
                border: '1px solid #333',
              },
            }}
          />
          <AppRoutes />
        </ChatProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default AppWithProviders;