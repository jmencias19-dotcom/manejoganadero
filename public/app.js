// ==========================================
// APP.JS - NÚCLEO Y GESTIÓN DE CONECTIVIDAD
// ==========================================

import { sincronizarConServidor } from './syncManager.js';

// Función global para actualizar la interfaz del estado de sincronización
export function actualizarUIEstadoSync(esSincronizado, mensaje) {
    const btnSync = document.getElementById("btn-sync");
    const textoSync = document.getElementById("sync-status-text");
    
    if (!btnSync || !textoSync) return;

    if (esSincronizado) {
        btnSync.className = "sync-ok";
        textoSync.textContent = mensaje || "Sincronizado";
    } else {
        btnSync.className = "sync-pending";
        textoSync.textContent = mensaje;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // 1. Sincronización automática inicial al abrir la app si hay internet
    sincronizarConServidor(actualizarUIEstadoSync);

    // 2. Escuchas automáticas de cambios en la red del dispositivo
    window.addEventListener('online', () => {
        console.log("Conexión restablecida. Sincronizando pendientes...");
        sincronizarConServidor(actualizarUIEstadoSync);
    });

    window.addEventListener('offline', () => {
        actualizarUIEstadoSync(false, "Modo Offline");
    });

    // 3. Botón manual de sincronización en la cabecera
    const btnSync = document.getElementById("btn-sync");
    if (btnSync) {
        btnSync.addEventListener("click", () => {
            sincronizarConServidor(actualizarUIEstadoSync);
        });
    }
});

// ==========================================
// MÓDULO DE FORMULARIO - TAREAS Y LABORES
// ==========================================

import { guardarLocalmente, sincronizarConServidor } from './syncManager.js';
import { actualizarUIEstadoSync } from './app.js';

document.addEventListener("DOMContentLoaded", () => {
    const formTarea = document.getElementById("form-tarea");
    
    if (formTarea) {
        formTarea.addEventListener("submit", async (e) => {
            e.preventDefault(); // Evita recarga de página

            // Construcción del registro local con ID único
            const nuevaTarea = {
                tipo: 'tarea', // Vital para que el servidor en Vercel lo encrute bien
                id: crypto.randomUUID(),
                fecha: document.getElementById("input-fecha").value,
                labor: document.getElementById("input-labor").value,
                potrero: document.getElementById("input-potrero").value,
                status: 'pendiente'
            };

            // Guardar localmente en IndexedDB
            const exito = await guardarLocalmente(nuevaTarea);

            if (exito) {
                actualizarUIEstadoSync(false, "Guardado offline");
                alert("¡Tarea registrada localmente con éxito!");
                formTarea.reset(); // Limpia los campos del formulario
                
                // Intenta enviar al servidor de inmediato si hay red
                sincronizarConServidor(actualizarUIEstadoSync);
            } else {
                alert("Error al guardar la tarea en el dispositivo.");
            }
        });
    }
});
