const CACHE_NAME = 'gestion-ganadera-v2';
const ASSETS_TO_CACHE = [
  '/',
  'index.html',
  'styles.css',
  'dashboard.css',
  'variables.css',
  'manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
