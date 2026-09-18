const CACHE_NAME = 'laguna-brava-v1.5';

// 1. Fase de Instalación: Cachear recursos críticos locales
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                './index.html',
                './potreros.css',
                './manifest.json'
            ]);
        })
    );
    self.skipWaiting();
});

// 2. Fase de Activación: Limpieza de cachés antiguas
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 3. Interceptación de Red (Fetch) con manejo estricto de redirección para Vercel
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Ignorar solicitudes a dominios externos o que no sean GET
    if (url.origin !== location.origin || event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            // CORRECCIÓN CLAVE: redirect: 'follow' evita que las redirecciones de Vercel fallen
            return fetch(event.request, { redirect: 'follow' })
                .then((networkResponse) => {
                    // Validar si la respuesta es apta para caché
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }

                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                    return networkResponse;
                })
                .catch(() => {
                    // Fallback en caso de pérdida de red total
                    if (event.request.headers.get('accept').includes('text/html')) {
                        return caches.match('./index.html');
                    }
                });
        })
    );
});
