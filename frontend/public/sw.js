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
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;

  try {
    const url = new URL(event.request.url);

    // Bypass service worker entirely for API requests or cross-origin URLs
    if (url.pathname.startsWith('/api') || url.hostname !== self.location.hostname) {
      return;
    }

    // Handle navigation requests (HTML pages)
    if (event.request.mode === 'navigate') {
      event.respondWith(
        caches.match(event.request).then((response) => response || fetch(event.request))
      );
    } 
    // Handle local main index assets
    else if (urlsToCache.includes(url.pathname)) {
      event.respondWith(
        caches.match(event.request).then((response) => response || fetch(event.request))
      );
    }
  } catch (e) {
    // Fail-safe
  }
});
