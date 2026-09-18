const CACHE_NAME = 'laguna-brava-v1.8';

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './planificacion.html',
    './historial-pastoreo.html',
    './potreros.html',
    './levante.html',
    './inventario-sanitario.html',
    './combustible.html',
    './indicadores-gestion.html',
    './potreros.css',
    './manifest.json'
];

// 1. Instalación robusta a prueba de redirecciones de Vercel
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Usamos Promise.allSettled en lugar de cache.addAll para evitar 
            // que una redirección de Vercel detenga o corrompa el almacenamiento en caché.
            return Promise.allSettled(
                ASSETS_TO_CACHE.map((url) => 
                    fetch(url, { redirect: 'follow' }).then((response) => {
                        if (response && response.status === 200) {
                            return cache.put(url, response);
                        }
                    }).catch(() => {
                        // Ignora errores individuales de red en assets secundarios al instalar
                    })
                )
            );
        })
    );
    self.skipWaiting();
});

// 2. Activación
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

// 3. Interceptación de Red con manejo estricto de redirección
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (url.origin !== location.origin || event.request.method !== 'GET') {
        return;
    }

    // Manejo de navegación HTML
    if (event.request.mode === 'navigate' || event.request.headers.get('accept').includes('text/html')) {
        event.respondWith(
            fetch(event.request, { redirect: 'follow' })
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    return caches.match(event.request).then((cached) => {
                        return cached || caches.match('./index.html');
                    });
                })
        );
        return;
    }

    // Recursos estáticos
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request, { redirect: 'follow' }).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return networkResponse;
            });
        })
    );
});
