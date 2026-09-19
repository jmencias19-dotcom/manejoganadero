/* ==========================================================================
   SISTEMA GANADERO - HATO LAGUNA BRAVA
   MOTOR DE INTELIGENCIA Y PERSISTENCIA OFFLINE PARA PLANIFICACIÓN DE LABORES
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

// ALARMA SONORA: Notifica al equipo con una frecuencia limpia de asignación
function emitirAlarmaOperativa(type = 'success') {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        if (type === 'success') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // Nota La
            oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
        } else if (type === 'delete') {
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(293.66, audioCtx.currentTime); // Nota Re
        } else if (type === 'ai') {
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime); // Nota Mi
        }

        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
        console.log("Salida de audio restringida por políticas del navegador.");
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
        showToast("⚠️ Error: Memoria del dispositivo saturada.");
        return false;
    }
}

// DEPURACIÓN AUTOMÁTICA DE PRIMEROS DE MES
function ejecutarDepuracionPrimerDiaMes() {
    const hoy = new Date();
    const diaDelMes = hoy.getDate();
    
    // Verificamos si estamos en el primer día del mes corriente
    if (diaDelMes === 1) {
        let tasks = getTasks();
        const inicialCount = tasks.length;
        
        // Filtramos eliminando de forma definitiva todas las ya ejecutadas
        const pendientesParaRetomar = tasks.filter(t => t.status !== 'ejecutada');
        
        if (pendientesParaRetomar.length < inicialCount) {
            saveTasks(pendientesParaRetomar);
            setTimeout(() => {
                emitirAlarmaOperativa('ai');
                showToast("📅 ¡Primero de mes! Se eliminaron las tareas ejecutadas y se consolidó lo pendiente.");
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
                playBeep('success'); // Alarma sonora física
                showToast("💾 Tarea registrada y sincronizada.");
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
            playBeep('success');
            showToast("🔄 Campos restablecidos.");
        });
    }
}

// MOTOR DE APRENDIZAJE E INTELIGENCIA INTUITIVA (I.D.)
function procesarInteligenciaIntuitiva(tasks) {
    const aiContainer = document.getElementById('ai-sugerencias-content');
    if (!aiContainer) return;

    if (tasks.length === 0) {
        aiContainer.innerHTML = `<p style="margin:0; font-style:italic;">No hay registros suficientes para modelar el comportamiento del hato.</p>`;
        return;
    }

    let sugerencias = [];
    
    // Contar labores recurrentes para aprender prioridades
    const conteoLabores = {};
    let tareasEnProcesoCritico = 0;

    tasks.forEach(t => {
        conteoLabores[t.labor.toLowerCase()] = (conteoLabores[t.labor.toLowerCase()] || 0) + 1;
        if (t.status === 'proceso' && t.prioridad === 'alta') tareasEnProcesoCritico++;
    });

    // Regla de aprendizaje 1: Sobrecarga crítica
    if (tareasEnProcesoCritico >= 2) {
        sugerencias.push(`🚨 <strong>Alerta de Gestión:</strong> Tienes ${tareasEnProcesoCritico} labores ALTA en proceso. Se sugiere delegar personal para evitar retrasos.`);
    }

    // Regla de aprendizaje 2: Detección de patrones recurrentes
    Object.keys(conteoLabores).forEach(l => {
        if (conteoLabores[l] >= 2 && l.includes('vacunación' || 'sanitario' || 'control')) {
            sugerencias.push(`💉 <strong>Sugerencia Sanitaria:</strong> Se detecta recurrencia en labores de salud. Recuerde verificar el stock en el Inventario Sanitario.`);
        }
        if (conteoLabores[l] >= 2 && l.includes('cerca' || 'potrero' || 'mantenimiento')) {
            sugerencias.push(`🌱 <strong>Recordatorio de Suelos:</strong> Labores de cercado activas. Monitoree el tiempo de descanso en la matriz de Pastoreo.`);
        }
    });

    // Caso base por defecto si no hay alertas críticas
    if (sugerencias.length === 0) {
        sugerencias.push(`💡 <strong>Mecanismo de Trabajo Estable:</strong> Flujo operativo balanceado. Buen ritmo de asignación en los potreros.`);
    }

    // Inyección limpia en el bloque visual
    aiContainer.innerHTML = sugerencias.map(s => `<div style="margin-bottom:6px;">${s}</div>`).join('');
}

// RENDERIZADO Y CONTROL DE CONTADORES CON ORDENACIÓN CRONOLÓGICA
function renderTasks() {
    const tasks = getTasks();

    // ORGANIZAR POR FECHAS (Cronología estricta de la más vieja a la más futura)
    tasks.sort((a, b) => new Date(a.fecha + 'T00:00:00') - new Date(b.fecha + 'T00:00:00'));

    const container = document.getElementById('resumenContainer');
    if (!container) return;
    container.innerHTML = '';

    // Variables de conteo mensual para las tres categorías requeridas
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
        card.innerHTML = `
            <div class="task-card-row">
                <span class="task-card-date">📅 ${task.fecha}</span>
                <span class="task-card-meta">Responsable: <strong>${task.personal}</strong></span>
            </div>
            <div class="task-card-labor" style="margin-top:6px;">
                <strong>${task.labor}</strong>
            </div>
