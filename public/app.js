// ==========================================
// APP.JS - ENRUTADOR CENTRAL Y NÚCLEO DE RED
// Hato Laguna Brava
// ==========================================

import { sincronizarConServidor } from './syncManager.js';
import { inicializarModuloTareas } from './modules/tareas.js';
// Importa aquí futuros módulos cuando los crees:
// import { inicializarModuloInventario } from './modules/inventario.js';

// Función global para actualizar el semáforo y texto de sincronización en tu header
export function actualizarUIEstadoSync(esSincronizado, mensaje) {
    const light = document.getElementById("light");
    const statusText = document.getElementById("statusText");
    
    if (!light || !statusText) return;

    if (esSincronizado) {
        light.className = "semaphore online";
        statusText.textContent = mensaje || "Sincronizado Local";
    } else {
        light.className = "semaphore offline";
        statusText.textContent = mensaje || "Modo Offline";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // 1. Sincronización automática y escuchas de red globales (para todas las vistas)
    sincronizarConServidor(actualizarUIEstadoSync);

    window.addEventListener('online', () => {
        console.log("Conexión restablecida. Sincronizando pendientes...");
        sincronizarConServidor(actualizarUIEstadoSync);
    });

    window.addEventListener('offline', () => {
        actualizarUIEstadoSync(false, "Modo Offline");
    });

    // 2. Botón manual de sincronización en la cabecera (si existe en la vista)
    const btnSync = document.getElementById("btn-sync");
    if (btnSync) {
        btnSync.addEventListener("click", () => {
            sincronizarConServidor(actualizarUIEstadoSync);
        });
    }

    // ==========================================
    // 3. ENRUTADOR INTELIGENTE POR URL / VISTA
    // ==========================================
    const rutaActual = window.location.pathname;

    // Si estamos en la página de planificación o tareas
    if (rutaActual.includes("planificacion.html") || rutaActual.includes("tareas.html")) {
        console.log("Cargando módulo: Planificación de Campo");
        inicializarModuloTareas();
    }
    
    // Si en el futuro creas inventario.html, el enrutador lo activará solo ahí:
    // else if (rutaActual.includes("inventario.html")) {
    //     console.log("Cargando módulo: Inventario Ganadero");
    //     inicializarModuloInventario();
    // }
});
