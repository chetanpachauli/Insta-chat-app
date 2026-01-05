import axios from 'axios';

// Create a single axios instance for the entire app 
const BASE_URL = import.meta.env.VITE_API_URL || 'https://insta-chat-app-q97o.onrender.com';

const api = axios.create({
  baseURL: `${BASE_URL}/api`, // Ensure all requests are prefixed with /api
  withCredentials: true, // Required for cookies to be sent cross-origin
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

let interceptorsSetUp = false;
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const setupAxiosInterceptors = (navigate) => {
  if (interceptorsSetUp) return () => {};
  interceptorsSetUp = true;

  // Request Interceptor
  const requestInterceptor = api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response Interceptor
  const responseInterceptor = api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          const res = await axios.post(`${BASE_URL}/api/auth/refresh-token`, {}, {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json'
            }
          });
          const { accessToken } = res.data;
          localStorage.setItem('token', accessToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (err) {
          localStorage.clear();
          if (navigate) {
            navigate('/login', { replace: true });
          } else {
            window.location.href = '/login';
          }
          return Promise.reject(err);
        }
      }
      return Promise.reject(error);
    }
  );

  // Return cleanup function
  return () => {
    api.interceptors.request.eject(requestInterceptor);
    api.interceptors.response.eject(responseInterceptor);
    interceptorsSetUp = false;
  };
};

export default api; 