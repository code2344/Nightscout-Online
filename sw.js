const CACHE_NAME = 'nightscout-pwa-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/main.html',
  '/main.js',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/framework7@7/framework7-bundle.min.css',
  'https://cdn.jsdelivr.net/npm/framework7@7/framework7-bundle.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
