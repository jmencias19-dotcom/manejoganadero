// sw.js - Service Worker Base para Hato Laguna Brava
const CACHE_NAME = 'hato-v1';

self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
    // Retorna la petición normal de red
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
