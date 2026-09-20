/* ==========================================
   APP.JS - ENRUTADOR CENTRAL Y NÚCLEO DE RED
   Hato Laguna Brava
   ========================================== */

import { sincronizarConServidor } from './syncManager.js';
import { inicializarModuloTareas } from './modules/tareas.js';
import { inicializarModuloPotreros } from './modules/potreros.js'; // 👈 1. Importas el módulo aquí arriba

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
    // 1. Sincronización automática y escuchas de red globales
    sincronizarConServidor(actualizarUIEstadoSync);

    window.addEventListener('online', () => {
        console.log("Conexión restablecida. Sincronizando pendientes...");
        sincronizarConServidor(actualizarUIEstadoSync);
    });

    window.addEventListener('offline', () => {
        actualizarUIEstadoSync(false, "Modo Offline");
    });

    // 2. Botón manual de sincronización en la cabecera
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

    if (rutaActual.includes("planificacion.html") || rutaActual.includes("tareas.html")) {
        console.log("Cargando módulo: Planificación de Campo");
        inicializarModuloTareas();
    }
    else if (rutaActual.includes("potreros.html") || rutaActual.includes("carga.html")) {
        console.log("Cargando módulo: Gestión de Potreros y Carga Animal");
        inicializarModuloPotreros(); // 👈 2. Lo ejecutas solo cuando la app abre la vista de potreros
    }
});
