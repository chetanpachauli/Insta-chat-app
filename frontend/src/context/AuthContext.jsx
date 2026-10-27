import { createContext, useState, useEffect, useCallback, useContext } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/axiosConfig';

export const AuthContext = createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { 
      const storedUser = localStorage.getItem('user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch { 
      return null;
    }
  });

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Axios defaults setup
  axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  axios.defaults.withCredentials = true;

  const setSession = useCallback(({ user: u, accessToken, refreshToken }) => {
    if (!u) return;
    try {
      localStorage.setItem('user', JSON.stringify(u));
      if (accessToken) {
        localStorage.setItem('token', accessToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      }
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      setUser(u);
    } catch (error) {
      console.error('Error setting session:', error);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    const storedRefresh = localStorage.getItem('refreshToken');
    const storedUser = localStorage.getItem('user');

    if (!token && !storedRefresh) {
      setUser(null);
      return { isAuthenticated: false, user: null };
    }

    try {
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      const res = await axios.get('/api/auth/check', { timeout: 25000 });

      if (res.data?.user) {
        setUser(res.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        return { isAuthenticated: true, user: res.data.user };
      }
      throw new Error('Invalid user response');
    } catch (err) {
      // Only clear credentials if backend explicitly said 401 Unauthorized
      if (err.response?.status === 401) {
        if (storedRefresh) {
          try {
            const { data } = await api.post('/auth/refresh-token', { refreshToken: storedRefresh });
            if (data.accessToken && data.user) {
              setSession({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
              return { isAuthenticated: true, user: data.user };
            }
          } catch {
            // Refresh token also failed
            setUser(null);
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            delete axios.defaults.headers.common['Authorization'];
            delete api.defaults.headers.common['Authorization'];
            return { isAuthenticated: false, user: null };
          }
        } else {
          setUser(null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          return { isAuthenticated: false, user: null };
        }
      }

      // If it was a network timeout or Render sleeping (no 401), keep existing local session
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          return { isAuthenticated: true, user: parsed };
        } catch { /* parse failed */ }
      }

      return { isAuthenticated: false, user: null };
    }
  }, [setSession]);

  useEffect(() => {
    let isMounted = true;
    
    const verify = async () => {
      const path = window.location.pathname;
      const isAuthPage = path === '/login' || path === '/signup';

      let result;
      if (isAuthPage) {
        result = { isAuthenticated: !!localStorage.getItem('token'), user };
      } else {
        result = await checkAuth();
      }
      if (!isMounted) return;

      const allowedPaths = ['/', '/explore', '/reels', '/search', '/create', '/notifications', '/messages'];
      const isProfilePath = path.startsWith('/profile/') || path.startsWith('/p/');

      if (!result.isAuthenticated) {
        const isProtected = !allowedPaths.includes(path) && !isProfilePath && !isAuthPage;
        if (isProtected) {
          navigate('/login', { replace: true });
        }
      } else if (isAuthPage) {
        navigate('/', { replace: true });
      }
      setIsCheckingAuth(false);
    };

    verify();
    return () => { isMounted = false; };
  }, [checkAuth, navigate]);

  const login = useCallback(async (credentials) => {
    try {
      const res = await axios.post('/api/auth/login', credentials);
      setSession({ user: res.data.user, accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
      navigate('/');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Login failed' };
    }
  }, [navigate, setSession]);


  // AuthContext.jsx ke andar login ke niche ye add karein
const signup = useCallback(async (userData) => {
  try {
    const res = await axios.post('/api/auth/signup', userData);
    if (res.data.user) {
      setSession({ user: res.data.user, accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
      return { success: true };
    }
  } catch (err) {
    console.error("Signup Error:", err);
    return { 
      success: false, 
      error: err.response?.data?.message || 'Signup failed' 
    };
  }
}, [setSession]);

  const logout = useCallback(async () => {
    try {
      const storedRefresh = localStorage.getItem('refreshToken');
      if (storedRefresh) {
        await axios.post('/api/auth/logout', { refreshToken: storedRefresh }).catch(() => {});
      }
    } catch { /* ignore */ }
    localStorage.clear();
    delete axios.defaults.headers.common['Authorization'];
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    window.location.href = '/login';
  }, []);

  const googleLogin = useCallback(async (credential) => {
    try {
      const res = await axios.post('/api/auth/google', { credential });
      setSession({ user: res.data.user, accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
      navigate('/');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Google login failed' };
    }
  }, [navigate, setSession]);

  const value = { user, isCheckingAuth, login, signup, googleLogin, logout, setSession, checkAuth };

  return (
    <AuthContext.Provider value={value}>
      {!isCheckingAuth && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export default AuthProvider;