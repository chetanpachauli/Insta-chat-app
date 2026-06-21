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

  // Add global request interceptor to append authorization header dynamically
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.request.eject(requestInterceptor);
  }, []);

  // Axios interceptor for auto-refresh on 401
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (res) => res,
      async (err) => {
        const original = err.config;
        if (err.response?.status === 401 && !original._retry && original.url && !original.url.includes('/refresh-token')) {
          original._retry = true;
          const storedRefresh = localStorage.getItem('refreshToken');
          if (storedRefresh) {
            try {
              const { data } = await axios.post('/api/auth/refresh-token', { refreshToken: storedRefresh });
              if (data.accessToken) {
                localStorage.setItem('token', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
                axios.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
                api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
                original.headers['Authorization'] = `Bearer ${data.accessToken}`;
                return axios(original);
              }
            } catch { /* refresh failed */ }
          }
          localStorage.clear();
          delete axios.defaults.headers.common['Authorization'];
          delete api.defaults.headers.common['Authorization'];
          setUser(null);
          window.location.href = '/login';
        }
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

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
    try {
      let token = localStorage.getItem('token');

      // Try refresh if we have a stored refresh token
      const storedRefresh = localStorage.getItem('refreshToken');
      if (!token && storedRefresh) {
        try {
          const { data } = await axios.post('/api/auth/refresh-token', { refreshToken: storedRefresh });
          if (data.accessToken) {
            token = data.accessToken;
            localStorage.setItem('token', token);
            localStorage.setItem('refreshToken', data.refreshToken);
          }
        } catch { /* refresh failed */ }
      }

      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      const res = await axios.get('/api/auth/check', { timeout: 5000 });

      if (res.data?.user) {
        setUser(res.data.user);
        return { isAuthenticated: true, user: res.data.user };
      }
      throw new Error('Invalid user');
    } catch (err) {
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization'];
      delete api.defaults.headers.common['Authorization'];
      return { isAuthenticated: false, user: null };
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const verify = async () => {
      const path = location.pathname;
      const isAuthPage = path === '/login' || path === '/signup';

      // Skip auth check on login/signup pages
      let result;
      if (isAuthPage) {
        result = { isAuthenticated: false, user: null };
      } else {
        result = await checkAuth();
      }
      if (!isMounted) return;

      // In paths par redirection nahi hoga (Public/Static access)
      const allowedPaths = ['/', '/explore', '/reels', '/search', '/create', '/notifications', '/messages'];
      const isProfilePath = path.startsWith('/profile/') || path.startsWith('/p/'); // For single posts

      if (!result.isAuthenticated) {
        // Agar user login nahi hai aur kisi aisi jagah hai jo allowed nahi hai
        const isProtected = !allowedPaths.includes(path) && !isProfilePath && !isAuthPage;
        if (isProtected) {
          navigate('/login', { replace: true });
        }
      } else {
        // Agar logged in hai toh login/signup pe mat jane do
        if (isAuthPage) {
          navigate('/', { replace: true });
        }
      }
      setIsCheckingAuth(false);
    };

    verify();
    return () => { isMounted = false; };
  }, [checkAuth, navigate, location.pathname]);

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