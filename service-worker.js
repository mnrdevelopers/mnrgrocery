const CACHE_NAME = 'familygrocer-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/app.css',    // Add your CSS file here
  '/app.js',     // Add your JS files here
  '/manifest.json',
  '/icon.png',
  '/icon.png'
];

// Install service worker and cache files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

// Activate service worker and clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    )
  );
});

// Intercept fetch requests and serve cached files if available
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
