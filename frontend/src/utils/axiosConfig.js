import axios from 'axios';

// Create a single axios instance for the entire app
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true
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
          const res = await axios.post('http://localhost:5000/api/auth/refresh-token', {}, {
            withCredentials: true
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

export default api; // Is 'api' ko hi ChatContext mein import karna