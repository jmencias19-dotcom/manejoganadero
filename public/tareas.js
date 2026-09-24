/* ==========================================================================
   Módulo: Planificación de Tareas y Control Operativo (Integrado v4.5 - Sincronizado)
   Hato Laguna Brava - Mantecal, Apure, Venezuela
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {  
    initializeFirestore,  
    persistentLocalCache, 
    persistentMultipleTabManager,
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

const app = initializeApp(firebaseConfig);

// Inicialización de Firestore optimizada con persistencia offline robusta y multi-pestaña automática
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});

const COLLECTION_NAME = "hato_tareas";

// Caché global en memoria para operaciones reactivas
let tareasCache = [];

document.addEventListener('DOMContentLoaded', () => {
    const taskForm = document.getElementById('taskForm');
    const tasksContainer = document.getElementById('tasks-container');
    
    // Contadores de KPIs
    const kpiCola = document.getElementById('kpi-cola');
    const kpiProceso = document.getElementById('kpi-proceso');
    const kpiEjecutadas = document.getElementById('kpi-ejecutadas');

    // Elementos de Filtro Reactivo
    const filtroPotrero = document.getElementById('filtro-potrero');
    const filtroPersonal = document.getElementById('filtro-personal');

    // Función auxiliar para mostrar notificaciones Toast estandarizadas
    function mostrarToast(mensaje, tipo = "success") {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        if (!toast || !toastMessage) return;

        toastMessage.textContent = mensaje;
        toast.style.borderLeftColor = tipo === "error" ? "#c1121f" : "var(--accent-color, #2d6a4f)";
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3500);
    }

    // Escuchar cambios en tiempo real desde Firestore (Sincronización PC <-> Móvil)
    function iniciarSincronizacionEnTiempoReal() {
        if (!tasksContainer) return;

        const q = query(collection(db, COLLECTION_NAME), orderBy("fecha", "desc"));
        
        onSnapshot(q, (snapshot) => {
            tareasCache = []; 
            
            snapshot.forEach((docSnap) => {
                tareasCache.push({
                    id: docSnap.id,
                    ...docSnap.data()
                });
            });

            // Actualizar opciones de filtros de forma reactiva preservando selección
            actualizarOpcionesFiltros(tareasCache);

            // Renderizar la vista aplicando los filtros actuales
            window.renderizarTareasFiltradas();

        }, (error) => {
            console.error("Error al sincronizar con Firestore: ", error);
            tasksContainer.innerHTML = '<p style="text-align: center; color: #c1121f; padding: 20px;">Trabajando en modo offline. Los cambios se sincronizarán al recuperar señal.</p>';
            mostrarToast("Sincronización offline activa", "error");
        });
    }

    // Función principal de renderizado y aplicación de filtros cruzados
    window.renderizarTareasFiltradas = function() {
        if (!tasksContainer) return;

        const potreroSeleccionado = filtroPotrero ? filtroPotrero.value.toLowerCase() : '';
        const personalSeleccionado = filtroPersonal ? filtroPersonal.value.toLowerCase() : '';

        // Filtrado sobre el caché local
        const tareasFiltradas = tareasCache.filter(tarea => {
            const coincidePotrero = !potreroSeleccionado || (tarea.potrero && tarea.potrero.toLowerCase().includes(potreroSeleccionado));
            const coincidePersonal = !personalSeleccionado || (tarea.personal && tarea.personal.toLowerCase().includes(personalSeleccionado));
            return coincidePotrero && coincidePersonal;
        });

        tasksContainer.innerHTML = '';

        if (tareasFiltradas.length === 0) {
            tasksContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 20px;">No hay labores operativas que coincidan con los filtros seleccionados.</p>';
            actualizarKPIs(0, 0, 0);
            return;
        }

        let cuentaCola = 0;
        let cuentaProceso = 0;
        let cuentaEjecutadas = 0;

        tareasFiltradas.forEach(tarea => {
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
                    <select class="status-select ${getStatusClass(tarea.estado)}" data-id="${tarea.id}">
                        <option value="cola" ${tarea.estado === 'cola' ? 'selected' : ''}>🟡 En Cola</option>
                        <option value="proceso" ${tarea.estado === 'proceso' ? 'selected' : ''}>🔵 En Proceso</option>
                        <option value="ejecutada" ${tarea.estado === 'ejecutada' ? 'selected' : ''}>🟢 Ejecutada</option>
                    </select>
                    <button class="btn-delete" data-id="${tarea.id}" title="Eliminar labor"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            `;
            tasksContainer.appendChild(div);
        });

        actualizarKPIs(cuentaCola, cuentaProceso, cuentaEjecutadas);
        vincularEventosDinamicos();
    };

    // Poblar de forma inteligente los selectores de filtros sin duplicar y conservando el estado
    function actualizarOpcionesFiltros(data) {
        if (filtroPotrero) {
            const valorActual = filtroPotrero.value;
            const potrerosUnicos = [...new Set(data.map(t => t.potrero).filter(Boolean))].sort();
            filtroPotrero.innerHTML = '<option value="">Todos los Potreros</option>';
            potrerosUnicos.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p;
                opt.textContent = p;
                if (p === valorActual) opt.selected = true;
                filtroPotrero.appendChild(opt);
            });
        }

        if (filtroPersonal) {
            const valorActual = filtroPersonal.value;
            const personalesUnicos = [...new Set(data.map(t => t.personal).filter(Boolean))].sort();
            filtroPersonal.innerHTML = '<option value="">Todo el Personal</option>';
            personalesUnicos.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p;
                opt.textContent = p;
                if (p === valorActual) opt.selected = true;
                filtroPersonal.appendChild(opt);
            });
        }
    }

    // Listeners para los filtros
    if (filtroPotrero) filtroPotrero.addEventListener('change', window.renderizarTareasFiltradas);
    if (filtroPersonal) filtroPersonal.addEventListener('change', window.renderizarTareasFiltradas);

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

    // Vincular eventos a los elementos generados dinámicamente
    function vincularEventosDinamicos() {
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const id = e.target.dataset.id;
                const nuevoEstado = e.target.value;
                try {
                    const tareaRef = doc(db, COLLECTION_NAME, id);
                    await updateDoc(tareaRef, { estado: nuevoEstado });
                    mostrarToast("Estado de labor actualizado y sincronizado");
                } catch (error) {
                    console.error("Error al actualizar estado:", error);
                    mostrarToast("No se pudo actualizar el estado", "error");
                }
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                if (confirm("¿Está seguro de eliminar esta labor del registro operativo?")) {
                    try {
                        await deleteDoc(doc(db, COLLECTION_NAME, id));
                        mostrarToast("Labor eliminada y sincronizada");
                    } catch (error) {
                        console.error("Error al eliminar la tarea:", error);
                        mostrarToast("Error al eliminar la labor", "error");
                    }
                }
            });
        });
    }

    // Manejo robusto de envío del formulario de planificación y sincronización
    if (taskForm) {
        taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const inputLabor = document.getElementById('labor');
            const laborTexto = inputLabor ? inputLabor.value.trim() : '';

            if (!laborTexto) {
                mostrarToast("La descripción de la labor es obligatoria", "error");
                if (inputLabor) inputLabor.focus();
                return;
            }

            const btnSubmit = taskForm.querySelector('button[type="submit"]');
            if (btnSubmit) btnSubmit.disabled = true;

            const nuevaTarea = {
                fecha: document.getElementById('fecha')?.value || '',
                labor: laborTexto,
                prioridad: document.getElementById('prioridad-labor')?.value || 'media',
                personal: document.getElementById('personal')?.value.trim() || 'General',
                horario: document.getElementById('horario-labor')?.value || 'Todo el día',
                potrero: document.getElementById('potrero-afectado')?.value.trim() || 'General',
                observaciones: document.getElementById('observaciones')?.value.trim() || '',
                estado: 'cola',
                timestamp: Date.now()
            };

            try {
                await addDoc(collection(db, COLLECTION_NAME), nuevaTarea);
                taskForm.reset();
                
                // Restablecer fecha actual por defecto tras el envío exitoso
                const ahora = new Date();
                const today = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
                const inputFecha = document.getElementById('fecha');
                if (inputFecha) inputFecha.value = today;

                mostrarToast("Labor planificada y sincronizada en tiempo real");
            } catch (error) {
                console.error("Error al guardar la tarea en Firestore:", error);
                mostrarToast("Guardado localmente. Se sincronizará al conectar", "error");
            } finally {
                if (btnSubmit) btnSubmit.disabled = false;
            }
        });
    }

    // Inicializar fecha por defecto en el formulario si está vacío
    const inputFecha = document.getElementById('fecha');
    if (inputFecha && !inputFecha.value) {
        const ahora = new Date();
        inputFecha.value = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
    }

    // Iniciar el canal abierto de sincronización en tiempo real (CRÍTICO)
    iniciarSincronizacionEnTiempoReal();
});
