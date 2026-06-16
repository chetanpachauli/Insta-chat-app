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

export default api;
