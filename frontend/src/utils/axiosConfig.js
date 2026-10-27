import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://insta-chat-app-q97o.onrender.com';

// Configure global axios defaults
axios.defaults.baseURL = BASE_URL;
axios.defaults.withCredentials = true;

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Setup dynamic token injection
const attachAuthToken = (config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
};

api.interceptors.request.use(attachAuthToken, (error) => Promise.reject(error));
axios.interceptors.request.use(attachAuthToken, (error) => Promise.reject(error));

// Shared mutex and queue for token refresh to avoid race conditions
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor to handle auto token refresh on 401 Unauthorized
const createResponseInterceptor = (instance) => async (error) => {
  const originalRequest = error.config;

  if (
    error.response?.status === 401 &&
    originalRequest &&
    !originalRequest._retry &&
    originalRequest.url &&
    !originalRequest.url.includes('/auth/refresh-token') &&
    !originalRequest.url.includes('/auth/login') &&
    !originalRequest.url.includes('/auth/signup')
  ) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return instance(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const storedRefresh = localStorage.getItem('refreshToken');

    if (storedRefresh) {
      try {
        const { data } = await axios.post(`${BASE_URL}/api/auth/refresh-token`, {
          refreshToken: storedRefresh
        });

        if (data.accessToken) {
          localStorage.setItem('token', data.accessToken);
          if (data.refreshToken) {
            localStorage.setItem('refreshToken', data.refreshToken);
          }
          if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
          }

          axios.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
          api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
          originalRequest.headers['Authorization'] = `Bearer ${data.accessToken}`;

          processQueue(null, data.accessToken);
          return instance(originalRequest);
        }
      } catch (refreshError) {
        // Only force logout if the server explicitly confirmed refresh token is invalid/expired (401/403)
        // If it's a network glitch or server error (500/timeout), do NOT clear credentials!
        if (refreshError.response && (refreshError.response.status === 401 || refreshError.response.status === 403)) {
          processQueue(refreshError, null);
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          delete axios.defaults.headers.common['Authorization'];
          delete api.defaults.headers.common['Authorization'];
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    } else {
      isRefreshing = false;
      // No refresh token available, session is truly expired
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization'];
      delete api.defaults.headers.common['Authorization'];
      window.location.href = '/login';
    }
  }

  return Promise.reject(error);
};

api.interceptors.response.use((r) => r, createResponseInterceptor(api));
axios.interceptors.response.use((r) => r, createResponseInterceptor(axios));

export default api;
