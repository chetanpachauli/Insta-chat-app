import './index.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// Handle dynamic import failures when a new deployment invalidates chunk hashes
window.addEventListener('vite:preloadError', () => {
  const reloaded = sessionStorage.getItem('vite-preload-reload');
  if (!reloaded) {
    sessionStorage.setItem('vite-preload-reload', 'true');
    window.location.reload();
  }
});
window.addEventListener('load', () => {
  sessionStorage.removeItem('vite-preload-reload');
});

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
