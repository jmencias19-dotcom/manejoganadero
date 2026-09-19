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

// ==========================================
// RENDERIZADO DE TAREAS PROGRAMADAS
// ==========================================

import { obtenerDatosLocales } from './syncManager.js'; // Asegúrate de importar tu función de lectura

async function cargarTareasEnPantalla() {
    // 1. Buscamos el contenedor donde deben listarse las tarjetas (asegúrate de darle un ID a ese contenedor en tu HTML si no lo tiene)
    // O si las inyectas en una sección específica, aquí las leemos de IndexedDB:
    const tareas = await obtenerDatosLocales(); // O la función específica que uses para leer tus registros locales
    
    if (!tareas || tareas.length === 0) return;

    // Filtramos solo las que sean de tipo 'tarea'
    const listaTareas = tareas.filter(t => t.tipo === 'tarea');

    // Contadores para los KPIs
    let countCola = 0;
    let countProceso = 0;
    let countEjecutada = 0;

    listaTareas.forEach(t => {
        if (t.status === 'cola') countCola++;
        if (t.status === 'proceso') countProceso++;
        if (t.status === 'ejecutada') countEjecutada++;
    });

    // Actualizamos los números en las tarjetas KPI superiores si existen
    const elCola = document.getElementById("kpi-cola");
    const elProceso = document.getElementById("kpi-proceso");
    if (elCola) elCola.textContent = countCola;
    if (elProceso) elProceso.textContent = countProceso;
}

// Y llamamos a esta función al iniciar la página dentro del DOMContentLoaded:
// cargarTareasEnPantalla();
