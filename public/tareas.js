/* ==========================================================================
   Módulo: Planificación de Tareas y Control Operativo - Hato Laguna Brava
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const taskForm = document.getElementById('taskForm');
    const tasksContainer = document.getElementById('tasks-container');
    
    // Contadores de KPIs
    const kpiCola = document.getElementById('kpi-cola');
    const kpiProceso = document.getElementById('kpi-proceso');
    const kpiEjecutadas = document.getElementById('kpi-ejecutadas');

    // Cargar tareas desde localStorage al iniciar (clave unificada)
    let tareas = JSON.parse(localStorage.getItem('hatoLbTareas')) || [];

    function renderTasks() {
        if (!tasksContainer) return;
        tasksContainer.innerHTML = '';
        
        if (tareas.length === 0) {
            tasksContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 20px;">No hay tareas registradas actualmente.</p>';
            actualizarKPIs(0, 0, 0);
            return;
        }

        let cuentaCola = 0;
        let cuentaProceso = 0;
        let cuentaEjecutadas = 0;

        tareas.forEach((tarea, index) => {
            // Conteo según el estado actual
            if (tarea.estado === 'cola') cuentaCola++;
            else if (tarea.estado === 'proceso') cuentaProceso++;
            else if (tarea.estado === 'ejecutada') cuentaEjecutadas++;

            const div = document.createElement('div');
            div.className = 'task-card-item';
            div.innerHTML = `
                <div class="task-card-row">
                    <span class="task-card-date"><i class="fa-regular fa-calendar"></i> ${tarea.fecha || 'Sin fecha'}</span>
                    <span class="task-card-meta"><b>Prioridad:</b> ${tarea.prioridad.toUpperCase()} | <b>Resp:</b> ${tarea.personal}</span>
                </div>
                <div class="task-card-labor">${tarea.labor}</div>
                <div class="task-card-meta"><i class="fa-solid fa-location-dot"></i> <b>Lote/Potrero:</b> ${tarea.potrero} (${tarea.horario})</div>
                ${tarea.observaciones ? `<div class="task-card-obs"><i class="fa-solid fa-note-sticky"></i> ${tarea.observaciones}</div>` : ''}
                
                <div class="task-card-actions">
                    <select class="status-select ${getStatusClass(tarea.estado)}" data-index="${index}">
                        <option value="cola" ${tarea.estado === 'cola' ? 'selected' : ''}>🟡 En Cola</option>
                        <option value="proceso" ${tarea.estado === 'proceso' ? 'selected' : ''}>🔵 En Proceso</option>
                        <option value="ejecutada" ${tarea.estado === 'ejecutada' ? 'selected' : ''}>🟢 Ejecutada</option>
                    </select>
                    <button class="btn-delete" data-index="${index}" title="Eliminar labor"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            `;
            tasksContainer.appendChild(div);
        });

        actualizarKPIs(cuentaCola, cuentaProceso, cuentaEjecutadas);
        vincularEventosDinamicos();
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
        // Cambiar estado de la tarea desde el selector
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const index = e.target.dataset.index;
                tareas[index].estado = e.target.value;
                saveAndRender();
            });
        });

        // Eliminar tarea con botón de papelera
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.currentTarget.dataset.index;
                tareas.splice(index, 1);
                saveAndRender();
            });
        });
    }

    function saveAndRender() {
        localStorage.setItem('hatoLbTareas', JSON.stringify(tareas));
        renderTasks();
    }

    // Evento de Envío del Formulario
    if (taskForm) {
        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const nuevaTarea = {
                fecha: document.getElementById('fecha').value,
                labor: document.getElementById('labor').value.trim(),
                prioridad: document.getElementById('prioridad-labor').value,
                personal: document.getElementById('personal').value.trim(),
                horario: document.getElementById('horario-labor').value,
                potrero: document.getElementById('potrero-afectado').value.trim(),
                observaciones: document.getElementById('observaciones').value.trim(),
                estado: 'cola' // Estado por defecto al crear
            };

            if (nuevaTarea.labor !== '') {
                tareas.unshift(nuvaTareaSafe = nuevaTarea); // Agrega al inicio de la lista
                taskForm.reset();
                
                // Poner la fecha de hoy por defecto tras resetear
                const today = new Date().toISOString().split('T')[0];
                const inputFecha = document.getElementById('fecha');
                if (inputFecha) inputFecha.value = today;

                saveAndRender();
            }
        });
    }

    // Inicializar fecha de hoy en el input al cargar la página
    const inputFecha = document.getElementById('fecha');
    if (inputFecha && !inputFecha.value) {
        inputFecha.value = new Date().toISOString().split('T')[0];
    }

    renderTasks();
});
