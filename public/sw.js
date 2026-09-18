const CACHE_NAME = 'laguna-brava-v1.3';

// 1. Fase de Instalación: Cachear recursos críticos locales
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                './index.html',
                './potreros.css',
                './manifest.json'
                // Añade aquí otros archivos locales esenciales
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

// 3. Interceptación de Red (Fetch) con filtrado anti-CORS y anti-redirección
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Ignorar dominios externos (ej. gstatic, APIs externas)
    if (url.origin !== location.origin) {
        return;
    }

    // Solo interceptar peticiones GET
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            // CORRECCIÓN CLAVE: Se añade { redirect: 'follow' } para soportar redirecciones de Vercel
            return fetch(event.request, { redirect: 'follow' })
                .then((networkResponse) => {
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
                    // Fallback para páginas HTML en caso de pérdida total de señal
                    if (event.request.headers.get('accept').includes('text/html')) {
                        return caches.match('./index.html');
                    }
                });
        })
    );
});
