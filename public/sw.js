/* ==========================================================================
   SERVICE WORKER OFICIAL (v5.2) - HATO LAGUNA BRAVA
   Soporte Offline Robusto y Corrección de Redirecciones de Vercel
   ========================================================================== */

const CACHE_NAME = 'laguna-brava-v5.2';

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
    './biblioteca.html',
    './potreros.css?v=4.0',
    './icon-192.png',
    './icon-512.png',
    './manifest.json'
];

// 1. Instalación robusta
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

// 2. Activación y Limpieza de Cachés Obsoletas (Purgará la v5.1 automáticamente)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
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

// Función clave para limpiar los flags de redirección que bloquean los móviles
function limpiarRespuestaRedireccion(response) {
    if (!response) return response;
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
    });
}

// 3. Interceptación de Red con manejo estricto
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (url.origin !== location.origin || event.request.method !== 'GET') {
        return;
    }

    // A) MANEJO DE NAVEGACIÓN HTML
    if (event.request.mode === 'navigate' || (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'))) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse.redirected) {
                        return limpiarRespuestaRedireccion(networkResponse);
                    }
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return networkResponse;
                })
                .catch(async () => {
                    const cached = await caches.match(event.request);
                    if (cached) return limpiarRespuestaRedireccion(cached);
                    
                    const fallbackPlanificacion = await caches.match('./planificacion.html');
                    if (fallbackPlanificacion) return limpiarRespuestaRedireccion(fallbackPlanificacion);
                    
                    const fallbackIndex = await caches.match('./index.html');
                    if (fallbackIndex) return limpiarRespuestaRedireccion(fallbackIndex);

                    return new Response('Sin conexión a la red del hato.', { status: 404, headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
                })
        );
        return;
    }

    // B) MANEJO DE RECURSOS ESTÁTICOS
    event.respondWith(
        caches.match(event.request).then(async (cachedResponse) => {
            if (cachedResponse) {
                return limpiarRespuestaRedireccion(cachedResponse);
            }
            
            try {
                const networkResponse = await fetch(event.request);
                if (!networkResponse || networkResponse.status !== 200) {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return networkResponse;
            } catch (err) {
                return new Response('Recurso no disponible offline', { status: 404 });
            }
        })
    );
});
