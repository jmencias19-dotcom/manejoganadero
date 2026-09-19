/* ==========================================================================
   Módulo: Planificación de Tareas y Control Operativo (Con Firestore Real-Time)
   Hato Laguna Brava
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    doc, 
    updateDoc, 
    deleteDoc, 
    query, 
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Credenciales oficiales de Firebase para Hato Laguna Brava
const firebaseConfig = {
    apiKey: "AIzaSyADbn4gV6ROrppvanBM835IRyX3U8wdAnk",
    authDomain: "hato-laguna-brava.firebaseapp.com",
    projectId: "hato-laguna-brava",
    storageBucket: "hato-laguna-brava.firebasestorage.app",
    messagingSenderId: "1053099733476",
    appId: "1:1053099733476:web:624514d41b08d1b347d7f1",
    measurementId: "G-2E517DTZFS"
};

// Inicializar Firebase y Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const COLLECTION_NAME = "hato_tareas";

document.addEventListener('DOMContentLoaded', () => {
    const taskForm = document.getElementById('taskForm');
    const tasksContainer = document.getElementById('tasks-container');
    
    // Contadores de KPIs
    const kpiCola = document.getElementById('kpi-cola');
    const kpiProceso = document.getElementById('kpi-proceso');
    const kpiEjecutadas = document.getElementById('kpi-ejecutadas');

    // Escuchar cambios en tiempo real desde Firestore (Sincronización PC <-> Móvil)
    function iniciarSincronizacionEnTiempoReal() {
        if (!tasksContainer) return;

        const q = query(collection(db, COLLECTION_NAME), orderBy("fecha", "desc"));
        
        onSnapshot(q, (snapshot) => {
            tasksContainer.innerHTML = '';
            
            if (snapshot.empty) {
                tasksContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 20px;">No hay tareas registradas actualmente.</p>';
                actualizarKPIs(0, 0, 0);
                return;
            }

            let cuentaCola = 0;
            let cuentaProceso = 0;
            let cuentaEjecutadas = 0;

            snapshot.forEach((docSnap) => {
                const tarea = docSnap.data();
                const id = docSnap.id;

                if (tarea.estado === 'cola') cuentaCola++;
                else if (tarea.estado === 'proceso') cuentaProceso++;
                else if (tarea.estado === 'ejecutada') cuentaEjecutadas++;

                const div = document.createElement('div');
                div.className = 'task-card-item';
                div.innerHTML = `
                    <div class="task-card-row">
                        <span class="task-card-date"><i class="fa-regular fa-calendar"></i> ${tarea.fecha || 'Sin fecha'}</span>
                        <span class="task-card-meta"><b>Prioridad:</b> ${tarea.prioridad ? tarea.prioridad.toUpperCase() : 'MEDIA'} | <b>Resp:</b> ${tarea.personal || 'N/D'}</span>
                    </div>
                    <div class="task-card-labor">${tarea.labor}</div>
                    <div class="task-card-meta"><i class="fa-solid fa-location-dot"></i> <b>Lote/Potrero:</b> ${tarea.potrero || 'General'} (${tarea.horario || 'Todo el día'})</div>
                    ${tarea.observaciones ? `<div class="task-card-obs"><i class="fa-solid fa-note-sticky"></i> ${tarea.observaciones}</div>` : ''}
                    
                    <div class="task-card-actions">
                        <select class="status-select ${getStatusClass(tarea.estado)}" data-id="${id}">
                            <option value="cola" ${tarea.estado === 'cola' ? 'selected' : ''}>🟡 En Cola</option>
                            <option value="proceso" ${tarea.estado === 'proceso' ? 'selected' : ''}>🔵 En Proceso</option>
                            <option value="ejecutada" ${tarea.estado === 'ejecutada' ? 'selected' : ''}>🟢 Ejecutada</option>
                        </select>
                        <button class="btn-delete" data-id="${id}" title="Eliminar labor"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                `;
                tasksContainer.appendChild(div);
            });

            actualizarKPIs(cuentaCola, cuentaProceso, cuentaEjecutadas);
            vincularEventosDinamicos();
        }, (error) => {
            console.error("Error al sincronizar con Firestore: ", error);
            tasksContainer.innerHTML = '<p style="text-align: center; color: var(--danger); padding: 20px;">Error de sincronización con la base de datos.</p>';
        });
    }

    function getStatusClass(estado) {
        if (estado === 'cola') return 'status-cola';
        if (estado === 'proceso') return 'status-proceso';
        if (estado === 'ejecutada') return 'status-ejecutada';
        return 'status-cola';
    }

    function actualizarKPIs(cola, proceso, ejecutadas) {
        if (kpiCola) kpiCola.textContent = cola;
        if (kpiProceso) kpiProceso.textContent = proceso;
        if (kpiEjecutadas) kpiEjecutadas.textContent = ejecutadas;
    }

    function vincularEventosDinamicos() {
        // Actualizar estado en Firestore al cambiar el select
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const id = e.target.dataset.id;
                const nuevoEstado = e.target.value;
                try {
                    const tareaRef = doc(db, COLLECTION_NAME, id);
                    await updateDoc(tareaRef, { estado: nuevoEstado });
                } catch (error) {
                    console.error("Error al actualizar estado:", error);
                }
            });
        });

        // Eliminar documento en Firestore
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                if (confirm("¿Está seguro de eliminar esta labor del registro?")) {
                    try {
                        await deleteDoc(doc(db, COLLECTION_NAME, id));
                    } catch (error) {
                        console.error("Error al eliminar la tarea:", error);
                    }
                }
            });
        });
    }

    // Evento de Envío del Formulario (Guardar en la Nube)
    if (taskForm) {
        taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nuevaTarea = {
                fecha: document.getElementById('fecha').value,
                labor: document.getElementById('labor').value.trim(),
                prioridad: document.getElementById('prioridad-labor').value,
                personal: document.getElementById('personal').value.trim(),
                horario: document.getElementById('horario-labor').value,
                potrero: document.getElementById('potrero-afectado').value.trim(),
                observaciones: document.getElementById('observaciones').value.trim(),
                estado: 'cola',
                timestamp: Date.now()
            };

            if (nuevaTarea.labor !== '') {
                try {
                    await addDoc(collection(db, COLLECTION_NAME), nuevaTarea);
                    taskForm.reset();
                    
                    const today = new Date().toISOString().split('T')[0];
                    const inputFecha = document.getElementById('fecha');
                    if (inputFecha) inputFecha.value = today;
                } catch (error) {
                    console.error("Error al guardar la tarea:", error);
                    alert("No se pudo guardar la tarea. Verifique su conexión.");
                }
            }
        });
    }

    const inputFecha = document.getElementById('fecha');
    if (inputFecha && !inputFecha.value) {
        inputFecha.value = new Date().toISOString().split('T')[0];
    }

    // Arrancar la escucha en tiempo real
    iniciarSincronizacionEnTiempoReal();
});
