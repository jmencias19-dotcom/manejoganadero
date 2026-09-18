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

    // FILTRO 1: Ignorar solicitudes a dominios externos (ej. gstatic.com, fuentes de Google, APIs externas)
    if (url.origin !== location.origin) {
        return; // Deja que el navegador maneje estos recursos de forma estándar
    }

    // FILTRO 2: Ignorar peticiones que no sean GET (como POST de Firebase o analíticas)
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request)
                .then((networkResponse) => {
                    // Validar si la respuesta es válida antes de cachear
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }

                    // Clonar la respuesta para guardarla en caché y enviarla al navegador
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                    return networkResponse;
                })
                .catch(() => {
                    // Respuesta de respaldo en caso de estar totalmente offline y no estar en caché
                    if (event.request.headers.get('accept').includes('text/html')) {
                        return caches.match('./index.html');
                    }
                });
        })
    );
});
