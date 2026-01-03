// import { createContext, useState, useEffect, useCallback, useContext, useMemo } from 'react';
// import axios from 'axios';
// import { useNavigate, useLocation } from 'react-router-dom';

// export const AuthContext = createContext();

// function AuthProvider({ children }) {
//   const [user, setUser] = useState(() => {
//     try { 
//       const storedUser = localStorage.getItem('user');
//       return storedUser ? JSON.parse(storedUser) : null;
//     } catch { 
//       return null;
//     }
//   });

//   const [isCheckingAuth, setIsCheckingAuth] = useState(true);
//   const navigate = useNavigate();
//   const location = useLocation();

//   // Axios defaults setup
//   axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
//   axios.defaults.withCredentials = true;

//   const setSession = useCallback(({ user: u, accessToken }) => {
//     if (!u) return;
//     try {
//       localStorage.setItem('user', JSON.stringify(u));
//       if (accessToken) {
//         localStorage.setItem('token', accessToken);
//         axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
//       }
//       setUser(u);
//     } catch (error) {
//       console.error('Error setting session:', error);
//       localStorage.removeItem('user');
//       localStorage.removeItem('token');
//       setUser(null);
//     }
//   }, []);

//   const checkAuth = useCallback(async () => {
//     try {
//       const token = localStorage.getItem('token');
//       if (!token) return { isAuthenticated: false, user: null };

//       axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
//       const res = await axios.get('/api/auth/check', { timeout: 5000 });

//       if (res.data?.user) {
//         setUser(res.data.user);
//         if (res.data.accessToken) {
//           localStorage.setItem('token', res.data.accessToken);
//         }
//         return { isAuthenticated: true, user: res.data.user };
//       }
//       throw new Error('Invalid user');
//     } catch (err) {
//       setUser(null);
//       localStorage.removeItem('token');
//       localStorage.removeItem('user');
//       delete axios.defaults.headers.common['Authorization'];
//       return { isAuthenticated: false, user: null };
//     }
//   }, []);

//   useEffect(() => {
//     let isMounted = true;
//     let timeoutId;
    
//     const verify = async () => {
//       try {
//         const result = await checkAuth();
//         if (!isMounted) return;

//         const path = location.pathname;
//         const isAuthPage = path === '/login' || path === '/signup';
        
//         // Public paths that don't require authentication
//         const allowedPaths = ['/', '/explore', '/reels', '/search', '/create', '/notifications', '/messages'];
//         const isProfilePath = path.startsWith('/profile/') || path.startsWith('/p/');

//         if (!result.isAuthenticated) {
//           // Redirect to login if trying to access protected route
//           const isProtected = !allowedPaths.includes(path) && !isProfilePath && !isAuthPage;
//           if (isProtected) {
//             navigate('/login', { replace: true, state: { from: location } });
//           }
//         } else if (isAuthPage) {
//           // Redirect to home if already logged in and trying to access auth pages
//           navigate('/', { replace: true });
//         }
//       } catch (error) {
//         console.error('Auth verification error:', error);
//       } finally {
//         // Add a small delay to prevent UI flicker
//         timeoutId = setTimeout(() => {
//           if (isMounted) {
//             setIsCheckingAuth(false);
//           }
//         }, 300);
//       }
//     };

//     verify();
    
//     return () => {
//       isMounted = false;
//       if (timeoutId) clearTimeout(timeoutId);
//     };
//   }, [checkAuth, navigate, location]);

//   const login = useCallback(async (credentials) => {
//     try {
//       const res = await axios.post('/api/auth/login', credentials);
//       setSession({ user: res.data.user, accessToken: res.data.accessToken });
//       navigate('/');
//       return { success: true };
//     } catch (err) {
//       return { success: false, error: err.response?.data?.message || 'Login failed' };
//     }
//   }, [navigate, setSession]);

//   const logout = useCallback(async () => {
//     localStorage.clear();
//     delete axios.defaults.headers.common['Authorization'];
//     setUser(null);
//     window.location.href = '/login';
//   }, []);

//   // Memoize the auth context value to prevent unnecessary re-renders
//   const authValue = useMemo(() => ({
//     user,
//     isCheckingAuth,
//     login,
//     logout,
//     setSession,
//     checkAuth
//   }), [user?._id, isCheckingAuth, login, logout, setSession, checkAuth]);

//   return (
//     <AuthContext.Provider value={authValue}>
//       {children}
//     </AuthContext.Provider>
//   );
// }

// export const useAuth = () => useContext(AuthContext);
// export default AuthProvider;










import { createContext, useState, useEffect, useCallback, useContext } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

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

  const setSession = useCallback(({ user: u, accessToken }) => {
    if (!u) return;
    try {
      localStorage.setItem('user', JSON.stringify(u));
      if (accessToken) {
        localStorage.setItem('token', accessToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      }
      setUser(u);
    } catch (error) {
      console.error('Error setting session:', error);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setUser(null);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return { isAuthenticated: false, user: null };

      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const res = await axios.get('/api/auth/check', { timeout: 5000 });

      if (res.data?.user) {
        setUser(res.data.user);
        if (res.data.accessToken) {
          localStorage.setItem('token', res.data.accessToken);
        }
        return { isAuthenticated: true, user: res.data.user };
      }
      throw new Error('Invalid user');
    } catch (err) {
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization'];
      return { isAuthenticated: false, user: null };
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const verify = async () => {
      const result = await checkAuth();
      if (!isMounted) return;

      const path = location.pathname;
      const isAuthPage = path === '/login' || path === '/signup';
      
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
      setSession({ user: res.data.user, accessToken: res.data.accessToken });
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
      setSession({ user: res.data.user, accessToken: res.data.accessToken });
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
    localStorage.clear();
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    window.location.href = '/login';
  }, []);

  const value = { user, isCheckingAuth, login,signup, logout, setSession, checkAuth };

  return (
    <AuthContext.Provider value={value}>
      {!isCheckingAuth && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export default AuthProvider;