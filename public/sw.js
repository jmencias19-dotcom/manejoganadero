// sw.js - Service Worker Optimizado para Hato Laguna Brava
const CACHE_NAME = 'hato-v1';

self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
    // Intercepta las solicitudes y previene el error de conversión a Response
    e.respondWith(
        fetch(e.request).catch(() => {
            return caches.match(e.request).then((response) => {
                if (response) {
                    return response;
                }
                // Si el caché no tiene el archivo y no hay red, devuelve una respuesta vacía válida
                return new Response('Sin conexión a internet en la sabana.', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
                });
            });
        })
    );
});
