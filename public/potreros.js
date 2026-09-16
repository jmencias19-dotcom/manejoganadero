// ==========================================================================
// Módulo: Planificación de Tareas - Hato Laguna Brava
// Integración con Firebase Firestore v10+ y Telemetría del Semáforo
// ==========================================================================
import { initializeApp } from "https://gstatic.com";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    deleteDoc, 
    doc,
    updateDoc,
    serverTimestamp 
} from "https://gstatic.com";

// 1. Inicialización Única de la Plataforma Cloud
const firebaseConfig = {
    apiKey: "AIzaSyADbn4gV6ROrppvanBM835IRyX3U8wdAnk", 
    authDomain: "://firebaseapp.com",
    projectId: "hato-laguna-brava",
    storageBucket: "hato-laguna-brava.firebasestorage.app",
    messagingSenderId: "1053099733476",
    appId: "1:1053099733476:web:624514d41b08d1b347d7f1",
    measurementId: "G-2E517DTZFS"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // Línea 21 unificada para evitar el error de doble declaración

// 2. Referencias a los Elementos de Interfaz (DOM)
const taskForm = document.getElementById('taskForm');
const tasksWrapper = document.getElementById('tasks-wrapper');
const alertSound = document.getElementById('alert-sound');
const btnUndoTask = document.getElementById('btn-undo-task');

// Selectores inteligentes para el Semáforo de Red
const semaforo = document.getElementById('sync-semaphore') || document.getElementById('sync-semaphore-main');
const syncText = document.getElementById('sync-text') || document.getElementById('sync-text-main');

// Variable global en memoria para rastrear el ID del último documento guardado en la sesión
let ultimoDocId = null;

// 3. Funciones de Feedback Técnico para el Personal de Campo
function emitirAlertaSonora() {
    if (alertSound) {
        alertSound.currentTime = 0;
        // Blindaje contra errores de Vercel si la ruta local no fue cargada correctamente
        if (alertSound.src.endsWith('.co') || alertSound.src.endsWith('.co/') || alertSound.src.includes('404')) {
            alertSound.src = "https://mixkit.co";
        }
        alertSound.play().catch(err => console.log("Audio retenido temporalmente por políticas del navegador.", err));
    }
}

function ejecutarSincronizacionVisual(estado) {
    if (!semaforo || !syncText) return;

    if (estado === 'sincronizado') {
        semaforo.className = 'semaphore online';
        semaforo.style.backgroundColor = '#2e7d32'; // Verde Sabana
        syncText.textContent = 'Sincronizado';
        syncText.style.color = '#2e7d32';
    } else if (estado === 'procesando') {
        semaforo.className = 'semaphore processing';
        semaforo.style.backgroundColor = '#f57c00'; // Naranja Satelital
        syncText.textContent = 'Sincronizando...';
        syncText.style.color = '#f57c00';
    } else {
        semaforo.className = 'semaphore offline';
        semaforo.style.backgroundColor = '#d32f2f'; // Rojo Alerta
        syncText.textContent = 'Error de Red';
        syncText.style.color = '#d32f2f';
    }
}

// 4. Envío de Órdenes de Trabajo a la Colección en la Nube
if (taskForm) {
    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        emitirAlertaSonora();
        ejecutarSincronizacionVisual('procesando');

        // Captura estructurada de las casillas de entrada
        const personal = document.getElementById('task-personal').value;
        const potrero = document.getElementById('task-potrero').value;
        const labor = document.getElementById('task-labor').value;
        const fecha = document.getElementById('task-fecha').value;
        const observaciones = document.getElementById('task-obs').value.trim();

        const nuevaTarea = {
            personal_asignado: personal,
            potrero_ubicacion: potrero,
            tipo_labor: labor,
            fecha_programada: fecha,
            observaciones_instrucciones: observaciones || 'Ninguna',
            estatus_codigo: 'COLA', // Estatus base por defecto (En Cola, En Proceso, Ejecutada)
            timestamp: serverTimestamp()
        };

        try {
            const docRef = await addDoc(collection(db, "ordenes_trabajo"), nuevaTarea);
            ultimoDocId = docRef.id; // Almacenar referencia para la función "Deshacer"
            
            if (btnUndoTask) btnUndoTask.style.display = 'inline-flex';
            
            ejecutarSincronizacionVisual('sincronizado');
            taskForm.reset();
        } catch (error) {
            console.error("Error al transmitir orden de trabajo: ", error);
            ejecutarSincronizacionVisual('error');
            alert("Error crítico de transmisión. Verifique la antena satelital del hato.");
        }
    });
}

// 5. Función de Emergencia Técnica: Deshacer Último Registro Erróneo
if (btnUndoTask) {
    btnUndoTask.addEventListener('click', async () => {
        if (!ultimoDocId) return;
        
        if (confirm('¿Desea revocar y eliminar de la nube el último registro de tarea ingresado?')) {
            emitirAlertaSonora();
            ejecutarSincronizacionVisual('procesando');
            
            try {
                await deleteDoc(doc(db, "ordenes_trabajo", ultimoDocId));
                ultimoDocId = null;
                btnUndoTask.style.display = 'none';
                ejecutarSincronizacionVisual('sincronizado');
                alert("Último registro revocado con éxito de la base de datos.");
            } catch (error) {
                console.error("Error al revocar documento: ", error);
                ejecutarSincronizacionVisual('error');
            }
        }
    });
}

// 6. Transmisión Bidireccional en Tiempo Real (Firestore -> Pantalla)
function inicializarEscuchadorTareas() {
    if (!tasksWrapper) return;

    ejecutarSincronizacionVisual('procesando');

    // Consulta ordenada cronológicamente (Marcas de tiempo del servidor más recientes primero)
    const q = query(collection(db, "ordenes_trabajo"), orderBy("timestamp", "desc"));

    onSnapshot(q, (snapshot) => {
        tasksWrapper.innerHTML = '';

        if (snapshot.empty) {
            tasksWrapper.innerHTML = `<p style="color:var(--text-muted); font-style:italic; text-align:center; padding:20px;">No existen labores programadas en este ciclo.</p>`;
            ejecutarSincronizacionVisual('sincronizado');
            return;
        }

        snapshot.forEach((docSnap) => {
            const id = docSnap.id;
            const data = docSnap.data();

            // Determinar clases dinámicas del selector de estatus según el valor guardado
            let claseEstatus = 'status-cola';
            if (data.estatus_codigo === 'PROCESO') claseEstatus = 'status-proceso';
            if (data.estatus_codigo === 'EJECUTADA') claseEstatus = 'status-ejecutada';

            const taskCard = document.createElement('article');
            taskCard.className = 'task-card-item';
            taskCard.style.marginBottom = '12px';

            taskCard.innerHTML = `
                <div class="task-card-row">
                    <span class="task-card-date">📅 Prog: ${data.fecha_programada || 'N/A'}</span>
                    <span style="font-size:0.8rem; font-weight:bold; color:var(--text-muted);">ID: ${id.substring(0,6)}...</span>
                </div>
                <h3 class="task-card-labor">🔨 ${data.tipo_labor}</h3>
                <div class="task-card-meta">
                    <p><strong>Ubicación:</strong> ${data.potrero_ubicacion}</p>
                    <p><strong>Responsable:</strong> ${data.personal_asignado}</p>
                </div>
                ${data.observaciones_instrucciones !== 'Ninguna' ? `
                    <p class="task-card-obs">"${data.observaciones_instrucciones}"</p>
                ` : ''}
                
                <div class="task-card-actions">
                    <!-- Control dinámico que permite a los encargados mutar el estatus desde los corrales -->
                    <select class="status-select ${claseEstatus}" data-id="${id}">
                        <option value="COLA" ${data.estatus_codigo === 'COLA' ? 'selected' : ''}>⏳ En Cola (Pendiente)</option>
                        <option value="PROCESO" ${data.estatus_codigo === 'PROCESO' ? 'selected' : ''}>⚡ En Proceso</option>
                        <option value="EJECUTADA" ${data.estatus_codigo === 'EJECUTADA' ? 'selected' : ''}>✅ Ejecutada</option>
                    </select>
                    <button class="btn-delete-task" data-id="${id}" style="background-color:var(--danger); color:white; padding:0 12px; font-size:0.85rem; border-radius:6px; height:38px; cursor:pointer; width:auto; border:none; font-weight:700;">❌</button>
                </div>
            `;
            tasksWrapper.appendChild(taskCard);
        });

        // 7. Enlazar Eventos Dinámicos a los Elementos Inyectados (Estatus y Borrado)
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const docId = e.target.getAttribute('data-id');
                const nuevoEstatus = e.target.value;
                ejecutarSincronizacionVisual('procesando');
                
                try {
                    await updateDoc(doc(db, "ordenes_trabajo", docId), { estatus_codigo: nuevoEstatus });
                    ejecutarSincronizacionVisual('sincronizado');
                } catch (err) {
                    console.error("Error al actualizar estatus: ", err);
                    ejecutarSincronizacionVisual('error');
                }
            });
        });

        document.querySelectorAll('.btn-delete-task').forEach(btn => {

