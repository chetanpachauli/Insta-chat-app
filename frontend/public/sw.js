const CACHE = 'insta-clone-v1';
const urlsToCache = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(urlsToCache).catch(() => self.skipWaiting())
    )
  );
});

self.addEventListener('fetch', (event) => {
  // Only cache navigation requests (HTML pages), never API/XHR/fetch calls
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request).then((response) => response || fetch(event.request))
    );
    return;
  }
  // Let all other requests (API, images, etc.) pass through normally
  event.respondWith(fetch(event.request));
});
