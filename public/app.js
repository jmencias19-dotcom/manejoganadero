// ==========================================
// APP.JS - NÚCLEO, RED Y MÓDULO DE PLANIFICACIÓN
// Hato Laguna Brava
// ==========================================

import { guardarLocalmente, sincronizarConServidor } from './syncManager.js';

// 1. Función global para actualizar el semáforo y texto de sincronización en tu header
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
    // 2. Sincronización automática inicial al abrir la app si hay internet
    sincronizarConServidor(actualizarUIEstadoSync);

    // 3. Escuchas automáticas de cambios en la red del dispositivo
    window.addEventListener('online', () => {
        console.log("Conexión restablecida. Sincronizando pendientes...");
        sincronizarConServidor(actualizarUIEstadoSync);
    });

    window.addEventListener('offline', () => {
        actualizarUIEstadoSync(false, "Modo Offline");
    });

    // 4. Botón manual de sincronización en la cabecera (si existe)
    const btnSync = document.getElementById("btn-sync");
    if (btnSync) {
        btnSync.addEventListener("click", () => {
            sincronizarConServidor(actualizarUIEstadoSync);
        });
    }

    // ==========================================
    // CAPTURA DEL FORMULARIO DE PLANIFICACIÓN (#taskForm)
    // ==========================================
    const taskForm = document.getElementById("taskForm");
    
    if (taskForm) {
        taskForm.addEventListener("submit", async (e) => {
            e.preventDefault(); // Evita la recarga de página

            // Construcción del registro local mapeando exactamente con tu HTML
            const nuevaLabor = {
                tipo: 'tarea', // Vital para que el servidor en Vercel lo encrute bien
                id: crypto.randomUUID(),
                fecha: document.getElementById("fecha").value,
                labor: document.getElementById("labor").value,
                prioridad: document.getElementById("prioridad-labor").value,
                responsable: document.getElementById("personal").value,
                horario: document.getElementById("horario-labor").value,
                potrero: document.getElementById("potrero-afectado").value,
                observaciones: document.getElementById("observaciones").value,
                status: 'cola' // Alineado con tu indicador inicial "En Cola"
            };

            // Guardar localmente en IndexedDB
            const exito = await guardarLocalmente(nuevaLabor);

            if (exito) {
                actualizarUIEstadoSync(false, "Guardado offline");
                alert("¡Labor registrada localmente con éxito!");
                taskForm.reset(); // Limpia los campos del formulario de forma limpia
                
                // Intenta enviar al servidor de inmediato si hay red
                sincronizarConServidor(actualizarUIEstadoSync);
            } else {
                alert("Error al guardar la labor en el dispositivo.");
            }
        });
    }

    // 5. Botón de rehacer / limpiar formulario
    const btnRehacer = document.getElementById("btnRehacer");
    if (btnRehacer && taskForm) {
        btnRehacer.addEventListener("click", () => {
            taskForm.reset();
        });
    }
});
