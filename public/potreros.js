// ==========================================================================
// Módulo: Gestión de Potreros - Lógica Operativa (Aforo y Capacidad UGM)
// Sincronizado exactamente con el formato unificado - Hato Laguna Brava
// ==========================================================================

const POTREROS_STORAGE_KEY = 'laguna_brava_potreros_ugm';

document.addEventListener('DOMContentLoaded', () => {
    console.log('Módulo de Gestión de Potreros cargado.');
    initPotreros();
});

function initPotreros() {
    renderPotrerosUGM();
    setupFormEventListeners();
}

// 🔊 Sistema de Alertas Sonoras mediante Web Audio API
function playFAENABeep(type = 'success') {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = type === 'delete' ? 'sawtooth' : 'sine';
        oscillator.frequency.setValueAtTime(type === 'delete' ? 220 : 587.33, audioCtx.currentTime);
        if (type === 'success') {
            oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
        }

        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.25);
    } catch (e) {
        console.log("Audio contextual bloqueado o no soportado.");
    }
}

// 📢 Sistema de Notificaciones Flotantes (Toast)
function showPotreroToast(message) {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toastMsg');
    if (msgEl) msgEl.innerText = message;
    if (toast) {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// 💾 Persistencia de Datos con LocalStorage
function getPotrerosFromStorage() {
    try {
        const data = localStorage.getItem(POTREROS_STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("Error al leer LocalStorage:", e);
        return [];
    }
}

function savePotrerosToStorage(potreros) {
    try {
        localStorage.setItem(POTREROS_STORAGE_KEY, JSON.stringify(potreros));
        return true;
    } catch (e) {
        console.error("Error al escribir en LocalStorage:", e);
        showPotreroToast("⚠️ Error: Espacio de memoria lleno.");
        return false;
    }
}

// 🧮 Fórmulas de Cálculo Agropecuario Automatizado
function calcularCapacidadUGM(superficie, tipoPasto) {
    let factorCarga = 0.8; // Carga base por hectárea para Pasto Natural / Sabana
    
    switch (tipoPasto) {
        case 'Brachiaria Humidicola':
            factorCarga = 1.2;
            break;
        case 'Brachiaria Decumbens':
            factorCarga = 1.5;
            break;
        case 'Pasto Guinea / Panicum maximum':
            factorCarga = 2.0; // Mayor aforo bajo pastoreo rotacional eficiente
            break;
        case 'Carimagua':
            factorCarga = 1.0;
            break;
    }
    
    return parseFloat((superficie * factorCarga).toFixed(1));
}

// 🔄 Renderizado Inyectado (CORREGIDO: Sincronizado con las variables del formulario)
function renderPotrerosUGM() {
    const potreros = getPotrerosFromStorage();
    const container = document.getElementById('potrerosContainer');
    
    if (!container) return;
    
    // Limpieza absoluta del contenedor para evitar duplicados en PC y móvil
    container.innerHTML = '';

    if (potreros.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-muted, #6c757d); padding: 25px; font-weight: 500;">No hay potreros registrados actualmente.</p>`;
        return;
    }

    // Ordenar los potreros alfabéticamente
    potreros.sort((a, b) => a.nombre.localeCompare(b.nombre));

    potreros.forEach((potrero, index) => {
        // CORRECCIÓN DE LLAVES: Mapeo exacto de los atributos almacenados
        const capacidadUGM = calcularCapacidadUGM(potrero.superficie, potrero.pasto);
        
        let statusClass = 'status-vacio';
        let statusText = 'Vacío';
        if (potrero.estado === 'ocupado') { statusClass = 'status-ocupado'; statusText = 'Ocupado'; }
        if (potrero.estado === 'descanso') { statusClass = 'status-descanso'; statusText = 'En Descanso'; }

        const card = document.createElement('div');
        card.className = 'potreros-ugm-card';
        card.innerHTML = `
            <div class="potreros-ugm-header">
                <span class="potreros-ugm-title">🌿 ${potrero.nombre}</span>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
            <div class="potrero-meta" style="margin-bottom: 4px; font-size: 0.9rem;">📐 Superficie total: <strong>${potrero.superficie} Ha</strong></div>
            
            <div class="potreros-ugm-metrics">
                <div class="potreros-metric-item">
                    <span class="potreros-metric-label">Capacidad Estimada</span>
                    <span class="potreros-metric-value">${capacidadUGM} UGM</span>
                </div>
                <div class="potreros-metric-item">
                    <span class="potreros-metric-label">Aforo de Pasto</span>
                    <span class="potreros-metric-value" style="font-size: 0.9rem; font-weight: 700;">${potrero.pasto}</span>
                </div>
            </div>

            <div class="potrero-actions">
                <select class="status-select" onchange="updatePotreroEstado(${index}, this.value)" style="padding: 6px; border-radius: 6px; font-weight:600; flex: 1; cursor: pointer; height: 34px; margin-top: 8px; border: 1px solid #cccccc;">
                    <option value="vacio" ${potrero.estado === 'vacio' ? 'selected' : ''}>Marcar Vacío</option>
                    <option value="ocupado" ${potrero.estado === 'ocupado' ? 'selected' : ''}>Marcar Ocupado</option>
                    <option value="descanso" ${potrero.estado === 'descanso' ? 'selected' : ''}>Enviar a Descanso</option>
                </select>
                <button class="btn-delete-card" onclick="deletePotrero(${index})" title="Eliminar Potrero" style="background-color: #e63946; color: white; border: none; padding: 0 12px; border-radius: 6px; cursor: pointer; height: 34px; margin-top: 8px; font-weight: bold; margin-left: 8px;">🗑️</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// 🛠️ Controladores de Eventos del Formulario
function setupFormEventListeners() {
    const form = document.getElementById('potreroForm');
    const btnLimpiar = document.getElementById('btnLimpiar');

    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // CORRECCIÓN DE CAPTURA: Asegurando nombres limpios para el objeto
            const nombre = document.getElementById('nombrePotrero').value.trim();
            const superficie = parseFloat(document.getElementById('superficie').value);
            const pasto = document.getElementById('tipoPasto').value;

            const newPotrero = {
                nombre: nombre,
                superficie: superficie,
                pasto: pasto,
                estado: 'vacio' 
            };

            const potreros = getPotrerosFromStorage();
            potreros.push(newPotrero);
            
            if (savePotrerosToStorage(potreros)) {
                playFAENABeep('success');
                showPotreroToast("✅ Potrero registrado e incorporado al aforo.");
                this.reset();
                renderPotrerosUGM();
            }
        });
    }

    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', function() {
            if (form) form.reset();
            playFAENABeep('success');
            showPotreroToast("🔄 Campos del formulario limpios.");
        });
    }
}

// 🔄 Cambios de Estado Dinámicos
window.updatePotreroEstado = function(index, nuevoEstado) {
    const potreros = getPotrerosFromStorage();
    if (potreros[index]) {
        potreros[index].estado = nuevoEstado;
        if (savePotrerosToStorage(potreros)) {
            playFAENABeep('success');
            renderPotrerosUGM();
            showPotreroToast(`Potrero actualizado a: ${nuevoEstado.toUpperCase()}`);
        }
    }
};

// 🗑️ Remoción de Registros
window.deletePotrero = function(index) {
    if (confirm("¿Estás seguro de eliminar este potrero? Esto removerá permanentemente sus cálculos de aforo.")) {
        const potreros = getPotrerosFromStorage();
        if (potreros[index]) {
            potreros.splice(index, 1);
            if (savePotrerosToStorage(potreros)) {
                playFAENABeep('delete');
                showPotreroToast("🗑️ Potrero eliminado del inventario.");
                renderPotrerosUGM();
            }
        }
    }
};
