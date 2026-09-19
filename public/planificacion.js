/* ==========================================================================
   SISTEMA GANADERO - HATO LAGUNA BRAVA
   MOTOR OFICIAL DE PLANIFICACIÓN DE LABORES - CORREGIDO
   ========================================================================== */

const STORAGE_KEY = 'laguna_brava_tareas';

document.addEventListener("DOMContentLoaded", () => {
    establecerFechaHoy();
    ejecutarDepuracionPrimerDiaMes();
    renderTasks();
    inicializarEventosFormulario();
});

function establecerFechaHoy() {
    const today = new Date().toISOString().split('T')[0];
    const fechaInput = document.getElementById('fecha');
    if (fechaInput) fechaInput.value = today;
}

function emitirAlarmaOperativa(type = 'success') {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        if (type === 'success') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
        } else if (type === 'delete') {
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(293.66, audioCtx.currentTime);
        } else if (type === 'ai') {
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime);
        }

        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
        console.log("Audio restringido por políticas del navegador.");
    }
}

function updateSyncStatus(state, text) {
    const light = document.getElementById('light');
    const statusText = document.getElementById('statusText');
    if (statusText) statusText.innerText = text;
    if (light) {
        light.style.backgroundColor = state === 'syncing' ? '#f4a261' : (state === 'success' ? 'var(--success)' : 'var(--danger)');
        light.style.boxShadow = `0 0 8px ${light.style.backgroundColor}`;
    }
}

function showToast(message) {
    const toast = document.getElementById('toast');
    const msgSpan = document.getElementById('toastMsg');
    if (toast && msgSpan) {
        msgSpan.innerText = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3500);
    }
}

function getTasks() {
    try {
        updateSyncStatus('syncing', 'Sincronizando...');
        const data = localStorage.getItem(STORAGE_KEY);
        const tasks = data ? JSON.parse(data) : [];
        setTimeout(() => updateSyncStatus('success', 'Sincronizado Local'), 250);
        return tasks;
    } catch (e) {
        updateSyncStatus('error', 'Fallo de Lectura');
        return [];
    }
}

function saveTasks(tasks) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return true;
    } catch (e) {
        showToast("⚠️ Error: Memoria llena.");
        return false;
    }
}

function ejecutarDepuracionPrimerDiaMes() {
    const hoy = new Date();
    const diaDelMes = hoy.getDate();
    if (diaDelMes === 1) {
        let tasks = getTasks();
        const inicialCount = tasks.length;
        const pendientesParaRetomar = tasks.filter(t => t.status !== 'ejecutada');
        if (pendientesParaRetomar.length < inicialCount) {
            saveTasks(pendientesParaRetomar);
            setTimeout(() => {
                emitirAlarmaOperativa('ai');
                showToast("📅 ¡Primero de mes! Se limpió el registro de tareas ejecutadas.");
            }, 1000);
        }
    }
}

function inicializarEventosFormulario() {
    const form = document.getElementById('taskForm');
    const btnRehacer = document.getElementById('btnRehacer');

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const newTask = {
                fecha: document.getElementById('fecha').value,
                labor: document.getElementById('labor').value.trim(),
                prioridad: document.getElementById('prioridad-labor').value,
                personal: document.getElementById('personal').value.trim(),
                horario: document.getElementById('horario-labor').value,
                potrero: document.getElementById('potrero-afectado').value.trim(),
                observaciones: document.getElementById('observaciones').value.trim(),
                status: 'cola'
            };

            const tasks = getTasks();
            tasks.push(newTask);
            
            if (saveTasks(tasks)) {
                emitirAlarmaOperativa('success');
                showToast("💾 Tarea registrada con éxito.");
                form.reset();
                establecerFechaHoy();
                renderTasks();
            }
        });
    }

    if (btnRehacer) {
        btnRehacer.addEventListener('click', () => {
            if (form) form.reset();
            establecerFechaHoy();
            emitirAlarmaOperativa('success');
            showToast("🔄 Campos restablecidos.");
        });
    }
}

function procesarInteligenciaIntuitiva(tasks) {
    const aiContainer = document.getElementById('ai-sugerencias-content');
    if (!aiContainer) return;

    if (tasks.length === 0) {
        aiContainer.innerHTML = `<p style="margin:0; font-style:italic;">No hay registros suficientes para modelar el comportamiento.</p>`;
        return;
    }

    let sugerencias = [];
    const conteoLabores = {};
    let tareasEnProcesoCritico = 0;

    tasks.forEach(t => {
        conteoLabores[t.labor.toLowerCase()] = (conteoLabores[t.labor.toLowerCase()] || 0) + 1;
        if (t.status === 'proceso' && t.prioridad === 'alta') tareasEnProcesoCritico++;
    });

    if (tareasEnProcesoCritico >= 2) {
        sugerencias.push(`🚨 <strong>Alerta:</strong> Tienes ${tareasEnProcesoCritico} labores ALTA en proceso. Monitoree retrasos.`);
    }

    Object.keys(conteoLabores).forEach(l => {
        if (conteoLabores[l] >= 2 && (l.includes('vacuna') || l.includes('sanit'))) {
            sugerencias.push(`💉 <strong>Sugerencia Sanitaria:</strong> Labores recurrentes de salud. Verifique stock en inventario.`);
        }
        if (conteoLabores[l] >= 2 && (l.includes('cerca') || l.includes('potrero'))) {
            sugerencias.push(`🌱 <strong>Sugerencia de Suelos:</strong> Labores de cercado activas. Verifique tiempos de descanso.`);
        }
    });

    if (sugerencias.length === 0) {
        sugerencias.push(`💡 <strong>Mecanismo Estable:</strong> Flujo operativo balanceado en los potreros.`);
    }

    aiContainer.innerHTML = sugerencias.map(s => `<div style="margin-bottom:6px;">${s}</div>`).join('');
}

function renderTasks() {
    const tasks = getTasks();

    tasks.sort((a, b) => new Date(a.fecha + 'T00:00:00') - new Date(b.fecha + 'T00:00:00'));

    const container = document.getElementById('resumenContainer');
    if (!container) return;
    container.innerHTML = '';

    let cCola = 0;
    let cProceso = 0;
    let cEjecutadas = 0;

    if (tasks.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 20px;">No hay tareas programadas actualmente.</p>`;
        actualizarContadoresCategorias(0, 0, 0);
        procesarInteligenciaIntuitiva([]);
        return;
    }

    tasks.forEach((task, index) => {
        let statusClass = 'status-cola';
        if (task.status === 'cola') cCola++;
        if (task.status === 'proceso') {
            statusClass = 'status-proceso';
            cProceso++;
        }
        if (task.status === 'ejecutada') {
            statusClass = 'status-ejecutada';
            cEjecutadas++;
        }

        const card = document.createElement('div');
        card.className = 'task-card-item';
        
        // SOLUCIÓN: Se eliminó la barra invertida errónea en task.observaciones para evitar roturas del DOM
        card.innerHTML = `
            <div class="task-card-row">
                <span class="task-card-date">📅 ${task.fecha}</span>
                <span class="task-card-meta">Responsable: <strong>${task.personal}</strong></span>
            </div>
            <div class="task-card-labor" style="margin-top:6px;">
                <strong>${task.labor}</strong>
            </div>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px; display:flex; gap:10px;">
                <span>Prioridad: ${task.prioridad === 'alta' ? '🔴 Alta' : (task.prioridad === 'media' ? '🟡 Media' : '🟢 Baja')}</span>
                <span>Horario: ${task.horario === 'manana' ? '🌅 Mañana' : (task.horario === 'tarde' ? '☀️ Tarde' : '📅 Todo el día')}</span>
            </div>
            <div style="font-size:0.82rem; color:var(--primary-color); margin-top:4px; background:#f0f4f1; padding:3px 8px; border-radius:4px; display:inline-block;">
                <i class="fa-solid fa-location-dot"></i> Potrero: <strong>${task.potrero}</strong>
            </div>
            ${task.observaciones ? `<div class="task-card-obs" style="margin-top:8px;">📝 ${task.observaciones}</div>` : ''}
            <div class="task-card-actions">
                <select class="status-select ${statusClass}" onchange="updateStatus(${index}, this.value)">
                    <option value="cola" ${task.status === 'cola' ? 'selected' : ''}>En Cola</option>
                    <option value="proceso" ${task.status === 'proceso' ? 'selected' : ''}>En Proceso</option>
                    <option value="ejecutada" ${task.status === 'ejecutada' ? 'selected' : ''}>Ejecutada</option>
                </select>
