/* ==========================================================================
   SISTEMA GANADERO - HATO LAGUNA BRAVA
   MOTOR DE INTELIGENCIA Y PERSISTENCIA OFFLINE - MÓDULO DE EVENTOS
   ========================================================================== */

const STORAGE_KEY_EVENTOS = 'laguna_brava_eventos';

document.addEventListener("DOMContentLoaded", () => {
    establecerFechaHoyEventos();
    ejecutarDepuracionEventosPrimerDiaMes();
    renderEventos();
    inicializarEventosFormularioEventos();
});

function establecerFechaHoyEventos() {
    const today = new Date().toISOString().split('T')[0];
    const fechaInput = document.getElementById('fecha-evento');
    if (fechaInput) fechaInput.value = today;
}

function emitirAlarmaOperativaEvento(type = 'success') {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        if (type === 'success') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // Do5
            oscillator.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.15);
        } else if (type === 'delete') {
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(220, audioCtx.currentTime);
        } else if (type === 'ai') {
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime);
        }

        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
        console.log("Audio restringido por el navegador.");
    }
}

function updateSyncStatusEventos(state, text) {
    const light = document.getElementById('light-eventos');
    const statusText = document.getElementById('statusText-eventos');
    if (statusText) statusText.innerText = text;
    if (light) {
        light.style.backgroundColor = state === 'syncing' ? '#f4a261' : (state === 'success' ? 'var(--success)' : 'var(--danger)');
        light.style.boxShadow = `0 0 8px ${light.style.backgroundColor}`;
    }
}

function showToastEventos(message) {
    const toast = document.getElementById('toast-eventos');
    const msgSpan = document.getElementById('toastMsg-eventos');
    if (toast && msgSpan) {
        msgSpan.innerText = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3500);
    }
}

function getEventos() {
    try {
        updateSyncStatusEventos('syncing', 'Sincronizando Eventos...');
        const data = localStorage.getItem(STORAGE_KEY_EVENTOS);
        const eventos = data ? JSON.parse(data) : [];
        setTimeout(() => updateSyncStatusEventos('success', 'Sincronizado Local'), 250);
        return eventos;
    } catch (e) {
        updateSyncStatusEventos('error', 'Fallo de Lectura');
        return [];
    }
}

function saveEventos(eventos) {
    try {
        localStorage.setItem(STORAGE_KEY_EVENTOS, JSON.stringify(eventos));
        return true;
    } catch (e) {
        showToastEventos("⚠️ Error: Almacenamiento local lleno.");
        return false;
    }
}

function ejecutarDepuracionEventosPrimerDiaMes() {
    const hoy = new Date();
    const diaDelMes = hoy.getDate();
    if (diaDelMes === 1) {
        let eventos = getEventos();
        const inicialCount = eventos.length;
        // Conservamos los eventos que NO estén en estado 'concluido' o 'ejecutado'
        const pendientesParaRetomar = eventos.filter(ev => ev.status !== 'concluido');
        if (pendientesParaRetomar.length < inicialCount) {
            saveEventos(pendientesParaRetomar);
            setTimeout(() => {
                emitirAlarmaOperativaEvento('ai');
                showToastEventos("📅 ¡Primero de mes! Se depuraron los eventos concluidos.");
            }, 1000);
        }
    }
}

function inicializarEventosFormularioEventos() {
    const form = document.getElementById('eventForm');
    const btnRehacer = document.getElementById('btnRehacerEvento');

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const nuevoEvento = {
                fecha: document.getElementById('fecha-evento').value,
                titulo: document.getElementById('titulo-evento').value.trim(),
                tipo: document.getElementById('tipo-evento').value, // Ej: Sanitario, Reproductivo, Climático, Manejo
                lotePotrero: document.getElementById('lote-potrero').value.trim(),
                responsable: document.getElementById('responsable-evento').value.trim(),
                observaciones: document.getElementById('observaciones-evento').value.trim(),
                status: 'programado' // Estados: programado, curso, concluido
            };

            const eventos = getEventos();
            eventos.push(nuevoEvento);
            
            if (saveEventos(eventos)) {
                emitirAlarmaOperativaEvento('success');
                showToastEventos("💾 Evento pecuario registrado con éxito.");
                form.reset();
                establecerFechaHoyEventos();
                renderEventos();
            }
        });
    }

    if (btnRehacer) {
        btnRehacer.addEventListener('click', () => {
            if (form) form.reset();
            establecerFechaHoyEventos();
            emitirAlarmaOperativaEvento('success');
            showToastEventos("🔄 Formulario de eventos restablecido.");
        });
    }
}

function procesarInteligenciaEventos(eventos) {
    const aiContainer = document.getElementById('ai-sugerencias-eventos-content');
    if (!aiContainer) return;

    if (eventos.length === 0) {
        aiContainer.innerHTML = `<p style="margin:0; font-style:italic;">No hay registros de eventos suficientes para análisis predictivo.</p>`;
        return;
    }

    let sugerencias = [];
    const conteoTipos = {};
    let eventosCriticosCurso = 0;

    eventos.forEach(ev => {
        const tipoEv = ev.tipo ? ev.tipo.toLowerCase() : '';
        conteoTipos[tipoEv] = (conteoTipos[tipoEv] || 0) + 1;
        if (ev.status === 'curso') eventosCriticosCurso++;
    });

    if (eventosCriticosCurso >= 2) {
        sugerencias.push(`🚨 <strong>Atención Operativa:</strong> Hay ${eventosCriticosCurso} eventos activos en curso simultáneamente. Supervise la asignación de personal.`);
    }

    Object.keys(conteoTipos).forEach(t => {
        if (conteoTipos[t] >= 2 && (t.includes('sanitario') || t.includes('vacuna'))) {
            sugerencias.push(`💉 <strong>Alerta Sanitaria:</strong> Alta frecuencia de eventos de inmunización o sanidad registrados. Verifique la cadena de frío y dosis.`);
        }
        if (conteoTipos[t] >= 2 && (t.includes('reproductivo') || t.includes('palpacion'))) {
            sugerencias.push(`🐂 <strong>Control Reproductivo:</strong> Concentración de eventos reproductivos. Revise registros de toretes y toros activos.`);
        }
    });

    if (sugerencias.length === 0) {
        sugerencias.push(`💡 <strong>Bitácora Estable:</strong> Distribución normal de eventos en los potreros de Hato Laguna Brava.`);
    }

    aiContainer.innerHTML = sugerencias.map(s => `<div style="margin-bottom:6px;">${s}</div>`).join('');
}

function actualizarContadoresEventos(p, c, f) {
    const elProg = document.getElementById('kpi-evento-programado');
    const elCurso = document.getElementById('kpi-evento-curso');
    const elConcluido = document.getElementById('kpi-evento-concluido');
    if (elProg) elProg.innerText = p;
    if (elCurso) elCurso.innerText = c;
    if (elConcluido) elConcluido.innerText = f;
}

window.updateStatusEvento = function(index, newStatus) {
    let eventos = getEventos();
    if (eventos[index]) {
        eventos[index].status = newStatus;
        if (saveEventos(eventos)) {
            emitirAlarmaOperativaEvento('success');
            showToastEventos("🔄 Estado del evento actualizado.");
            renderEventos();
        }
    }
};

function renderEventos() {
    const eventos = getEventos();

    eventos.sort((a, b) => new Date(a.fecha + 'T00:00:00') - new Date(b.fecha + 'T00:00:00'));

    const container = document.getElementById('resumenEventosContainer');
    if (!container) return;
    container.innerHTML = '';

    let cProgramado = 0;
    let cCurso = 0;
    let cConcluido = 0;

    if (eventos.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 20px;">No hay eventos registrados actualmente en el hato.</p>`;
        actualizarContadoresEventos(0, 0, 0);
        procesarInteligenciaEventos([]);
        return;
    }

    eventos.forEach((evento, index) => {
        const tipo = evento.tipo || 'General';
        const lotePotrero = evento.lotePotrero || 'General';
        const responsable = evento.responsable || 'Sin asignar';
        const observaciones = evento.observaciones || '';
        
        let statusClass = 'status-programado';
        if (evento.status === 'programado') cProgramado++;
        if (evento.status === 'curso') {
            statusClass = 'status-curso';
            cCurso++;
        }
        if (evento.status === 'concluido') {
            statusClass = 'status-concluido';
            cConcluido++;
        }

        const card = document.createElement('div');
        card.className = 'event-card-item';
        card.innerHTML = `
            <div class="event-card-row">
                <span class="event-card-date">📅 ${evento.fecha}</span>
                <span class="event-card-meta">Responsable: <strong>${responsable}</strong></span>
            </div>
            <div class="event-card-title" style="margin-top:6px;">
                <strong>${evento.titulo}</strong> <span style="font-size:0.75rem; background:#e2e8f0; padding:2px 6px; border-radius:3px;">${tipo}</span>
            </div>
            <div style="font-size:0.82rem; color:var(--primary-color); margin-top:4px; background:#f0f4f1; padding:3px 8px; border-radius:4px; display:inline-block;">
                <i class="fa-solid fa-map-pin"></i> Ubicación / Lote: <strong>${lotePotrero}</strong>
            </div>
            ${observaciones ? `<div class="event-card-obs" style="margin-top:8px;">📝 ${observaciones}</div>` : ''}
            <div class="event-card-actions" style="margin-top:10px;">
                <select class="status-select ${statusClass}" onchange="updateStatusEvento(${index}, this.value)">
                    <option value="programado" ${evento.status === 'programado' ? 'selected' : ''}>🟡 Programado</option>
                    <option value="curso" ${evento.status === 'curso' ? 'selected' : ''}>🔵 En Curso</option>
                    <option value="concluido" ${evento.status === 'concluido' ? 'selected' : ''}>🟢 Concluido</option>
                </select>
            </div>
        `;
        container.appendChild(card);
    });

    actualizarContadoresEventos(cProgramado, cCurso, cConcluido);
    procesarInteligenciaEventos(eventos);
}
