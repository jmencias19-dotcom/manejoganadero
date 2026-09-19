/* ==========================================================================
   SERVICE WORKER OFICIAL (v5.0) - HATO LAGUNA BRAVA
   Soporte Offline Robusto y Control de Caché Antivolcado de Vercel
   ========================================================================== */

// Elevamos la versión para obligar a los teléfonos y PC a vaciar el almacenamiento roto
const CACHE_NAME = 'laguna-brava-v5.0';

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
    './potreros.css?v=4.0',
    './icon-192.png',  /* Directo en la raíz */
    './icon-512.png',  /* Directo en la raíz */
    './manifest.json'
];

// 1. Instalación robusta a prueba de redirecciones de Vercel
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.allSettled(
                ASSETS_TO_CACHE.map((url) => 
                    fetch(url, { redirect: 'follow' }).then((response) => {
                        if (response && response.status === 200) {
                            return cache.put(url, response);
                        }
                    }).catch((err) => {
                        console.warn(`No se pudo cachear en pre-fetch: ${url}`, err);
                    })
                )
            );
        })
    );
    self.skipWaiting();
});

// 2. Activación y Limpieza Autónoma de Cachés Obsoletas
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    // Si el caché almacenado no coincide con la versión actual, se elimina de inmediato
                    if (cache !== CACHE_NAME) {
                        console.log(`[Service Worker] Purgando caché obsoleto: ${cache}`);
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

    // Filtrar peticiones ajenas o métodos de escritura (POST, PUT, DELETE)
    if (url.origin !== location.origin || event.request.method !== 'GET') {
        return;
    }

    // A) MANEJO DE NAVEGACIÓN HTML
    if (event.request.mode === 'navigate' || (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'))) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    // Si Vercel redirigió el HTML (ej. trailing slashes), limpiamos el objeto respuesta
                    if (networkResponse.redirected) {
                        return new Response(networkResponse.body, {
                            status: networkResponse.status,
                            statusText: networkResponse.statusText,
                            headers: networkResponse.headers
                        });
                    }

                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Respaldo de navegación offline para el hato
                    return caches.match(event.request).then((cached) => {
                        return cached || caches.match('./planificacion.html') || caches.match('./index.html');
                    });
                })
        );
        return;
    }

    // B) MANEJO DE RECURSOS ESTÁTICOS (CSS, JS, Manifest, etc.)
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            
            return fetch(event.request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200) {
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
