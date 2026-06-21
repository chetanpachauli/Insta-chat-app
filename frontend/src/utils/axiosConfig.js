import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://insta-chat-app-q97o.onrender.com';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor to append authorization token dynamically
api.interceptors.request.use(
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

// Response interceptor to handle auto token refresh on 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 && 
      !originalRequest._retry && 
      originalRequest.url && 
      !originalRequest.url.includes('/auth/refresh-token')
    ) {
      originalRequest._retry = true;
      const storedRefresh = localStorage.getItem('refreshToken');

      if (storedRefresh) {
        try {
          // Use global axios directly to avoid interceptor recursion
          const { data } = await axios.post(`${BASE_URL}/api/auth/refresh-token`, { 
            refreshToken: storedRefresh 
          });

          if (data.accessToken) {
            localStorage.setItem('token', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);

            // Update Authorization headers on both axios and api instances
            axios.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
            api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
            originalRequest.headers['Authorization'] = `Bearer ${data.accessToken}`;

            return api(originalRequest);
          }
        } catch (refreshError) {
          // Token refresh failed
        }
      }

      // If no refresh token or refresh failed, clear credentials and redirect to login
      localStorage.clear();
      delete axios.defaults.headers.common['Authorization'];
      delete api.defaults.headers.common['Authorization'];
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;

