const CACHE_NAME = 'laguna-brava-v1.6';

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './potreros.css',
    './manifest.json',
    './planificacion.html',
    './historial-pastoreo.html',
    './potreros.html',
    './levante.html',
    './inventario-sanitario.html',
    './combustible.html',
    './indicadores-gestion.html'
];

// 1. Instalación: Cachear recursos críticos
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// 2. Activación: Limpieza de cachés antiguas
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

// 3. Interceptación de Red (Fetch) blindada contra redirecciones de Vercel
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Ignorar dominios externos y métodos distintos a GET
    if (url.origin !== location.origin || event.request.method !== 'GET') {
        return;
    }

    // Manejo especial para navegación HTML (evita errores de redirección de Vercel)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request, { redirect: 'follow' })
                .catch(() => caches.match('./index.html'))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            // Petición de red con soporte obligatorio para redirecciones
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
                    // Fallback general
                    return caches.match('./index.html');
                });
        })
    );
});
