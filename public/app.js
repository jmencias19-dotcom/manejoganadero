// ==========================================
// APP.JS - NÚCLEO, RED Y MÓDULO DE PLANIFICACIÓN
// Hato Laguna Brava
// ==========================================

import { guardarLocalmente, sincronizarConServidor, obtenerDatosLocales } from './syncManager.js';

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

// 2. Función para renderizar las tareas en pantalla y actualizar KPIs
async function refrescarVistaTareas() {
    const registros = await obtenerDatosLocales();
    if (!registros) return;

    // Filtramos únicamente los registros que sean de tipo 'tarea'
    const tareas = registros.filter(r => r.tipo === 'tarea');

    const contenedor = document.getElementById("lista-tareas");
    if (!contenedor) return;
    
    contenedor.innerHTML = ""; // Limpia la lista antes de redibujar

    let cCola = 0, cProceso = 0, cEjecutada = 0;

    tareas.forEach(t => {
        // Conteo para las tarjetas KPI superiores
        if (t.status === 'cola') cCola++;
        else if (t.status === 'proceso') cProceso++;
        else if (t.status === 'ejecutada') cEjecutada++;

        // Construcción de la tarjeta visual
        const tarjeta = document.createElement("div");
        tarjeta.className = "task-card-item";
        tarjeta.innerHTML = `
            <div class="task-card-row">
                <span class="task-card-date">📅 ${t.fecha}</span>
                <span class="task-card-meta">👤 ${t.responsable || 'Sin asignar'}</span>
            </div>
            <div class="task-card-labor">${t.labor}</div>
            <div class="task-card-meta"><strong>Potrero:</strong> ${t.potrero} | <strong>Horario:</strong> ${t.horario}</div>
            ${t.observaciones ? `<div class="task-card-obs">"${t.observaciones}"</div>` : ''}
            <div class="task-card-actions">
                <select class="status-select status-${t.status}" data-id="${t.id}">
                    <option value="cola" ${t.status === 'cola' ? 'selected' : ''}>🟡 En Cola</option>
                    <option value="proceso" ${t.status === 'proceso' ? 'selected' : ''}>🔵 En Proceso</option>
                    <option value="ejecutada" ${t.status === 'ejecutada' ? 'selected' : ''}>🟢 Ejecutada</option>
                </select>
            </div>
        `;
        contenedor.appendChild(tarjeta);
    });

    // Actualiza los números en los contadores KPI si existen en el HTML
    const elCola = document.getElementById("kpi-cola");
    const elProceso = document.getElementById("kpi-proceso");
    const elEjecutada = document.getElementById("kpi-ejecutada");

    if (elCola) elCola.textContent = cCola;
    if (elProceso) elProceso.textContent = cProceso;
    if (elEjecutada) elEjecutada.textContent = cEjecutada;
}

document.addEventListener("DOMContentLoaded", () => {
    // Sincronización inicial y carga visual al abrir la vista
    sincronizarConServidor(actualizarUIEstadoSync);
    refrescarVistaTareas();

    // Escuchas automáticas de red
    window.addEventListener('online', () => {
        console.log("Conexión restablecida. Sincronizando pendientes...");
        sincronizarConServidor(actualizarUIEstadoSync);
        refrescarVistaTareas();
    });

    window.addEventListener('offline', () => {
        actualizarUIEstadoSync(false, "Modo Offline");
    });

    // Botón manual de sincronización en la cabecera (si existe)
    const btnSync = document.getElementById("btn-sync");
    if (btnSync) {
        btnSync.addEventListener("click", () => {
            sincronizarConServidor(actualizarUIEstadoSync);
        });
    }

    // Captura del formulario de planificación (#taskForm)
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
                taskForm.reset(); // Limpia los campos del formulario
                
                await refrescarVistaTareas(); // Pinta la tarjeta y actualiza KPIs de inmediato
                
                // Intenta enviar al servidor de inmediato si hay red
                sincronizarConServidor(actualizarUIEstadoSync);
            } else {
                alert("Error al guardar la labor en el dispositivo.");
            }
        });
    }

    // Botón de rehacer / limpiar formulario
    const btnRehacer = document.getElementById("btnRehacer");
    if (btnRehacer && taskForm) {
        btnRehacer.addEventListener("click", () => {
            taskForm.reset();
        });
    }
});
