import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from './common/Loader';

const ProtectedRoute = ({ children, requireAuth = true }) => {
  const { user, isCheckingAuth } = useAuth();
  const location = useLocation();
  const [isInitialCheckDone, setIsInitialCheckDone] = useState(false);

  // Track if this is the initial auth check
  useEffect(() => {
    if (!isCheckingAuth) {
      // Small delay to prevent flash of content
      const timer = setTimeout(() => {
        setIsInitialCheckDone(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isCheckingAuth]);

  // If we're still checking auth, show a loader
  if (isCheckingAuth || !isInitialCheckDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader size="lg" />
      </div>
    );
  }

  // If route requires auth but user is not logged in, redirect to login
  if (requireAuth && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If route is auth-only (like login/signup) but user is logged in, redirect to home
  if (!requireAuth && user) {
    return <Navigate to="/" replace />;
  }

  // If we get here, render the children
  return children;
};

export default ProtectedRoute;