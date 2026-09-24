/* ==========================================================================
   SISTEMA GANADERO - HATO LAGUNA BRAVA
   MOTOR DE INTELIGENCIA Y PERSISTENCIA OFFLINE - MÓDULO DE LEVANTE Y PESAJE
   ========================================================================== */

const STORAGE_KEY_LEVANTE = 'lb_historial_lotes';
let historialLotes = JSON.parse(localStorage.getItem(STORAGE_KEY_LEVANTE)) || [];
let papeleraDeshacer = []; // Pila temporal para Deshacer / Rehacer

document.addEventListener("DOMContentLoaded", () => {
    inicializarFechasPorDefecto();
    inicializarFormularioLevante();
    renderLevantesYResumen();
    configurarFiltrosYBusqueda();
});

// ==========================================
// UTILIDADES DE INTERFAZ (AUDIO, TOAST, SYNC)
// ==========================================

function emitirAlarmaLevante(tipo = 'success') {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        if (tipo === 'success') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // Do5
            osc.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.15);
        } else if (tipo === 'urgente') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        } else if (tipo === 'warning') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
        }

        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
        console.log("Audio restringido por políticas del navegador.", e);
    }
}

function showToastLevante(mensaje) {
    // Si tienes un elemento toast en tu HTML lo activa, sino usa fallback seguro
    const toast = document.getElementById('toast-levante');
    const msgSpan = document.getElementById('toastMsg-levante');
    if (toast && msgSpan) {
        msgSpan.innerText = mensaje;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3500);
    } else {
        console.log("Toast: " + mensaje);
    }
}

function updateSyncStatusLevante(state, text) {
    const statusText = document.getElementById('sync-text');
    const semaphore = document.getElementById('sync-semaphore');
    if (statusText) statusText.innerText = text;
    if (semaphore) {
        semaphore.className = `semaphore ${state}`;
    }
}

// ==========================================
// GESTIÓN DE DATOS Y PERSISTENCIA OFFLINE
// ==========================================

function getHistorialLevante() {
    try {
        updateSyncStatusLevante('syncing', 'Sincronizando Pesajes...');
        const data = localStorage.getItem(STORAGE_KEY_LEVANTE);
        const registros = data ? JSON.parse(data) : [];
        setTimeout(() => updateSyncStatusLevante('online', 'Sincronizado Local'), 200);
        return registros;
    } catch (e) {
        updateSyncStatusLevante('offline', 'Error de Lectura');
        return [];
    }
}

function saveHistorialLevante(registros) {
    try {
        localStorage.setItem(STORAGE_KEY_LEVANTE, JSON.stringify(registros));
        return true;
    } catch (e) {
        showToastLevante("⚠️ Error crítico: Almacenamiento local lleno.");
        return false;
    }
}

function inicializarFechasPorDefecto() {
    const inputActual = document.getElementById('inputFechaActual');
    const inputProximo = document.getElementById('inputFechaProximo');
    
    if (inputActual && !inputActual.value) {
        inputActual.valueAsDate = new Date();
    }
    if (inputProximo && !inputProximo.value) {
        let fechaProx = new Date();
        fechaProx.setDate(fechaProx.getDate() + 30);
        inputProximo.valueAsDate = fechaProx;
    }
}

// ==========================================
// MOTOR DE CÁLCULO Y BRÚJULA TEMPORAL
// ==========================================

function calcularIndicadoresDinamicos() {
    let loteNombre = document.getElementById('inputLote')?.value || '';
    let fechaActualStr = document.getElementById('inputFechaActual')?.value || '';
    let fechaProximaStr = document.getElementById('inputFechaProximo')?.value || '';
    let pesoProm = parseFloat(document.getElementById('inputPesoPromedio')?.value) || 0;
    let pesoObj = parseFloat(document.getElementById('inputPesoObjetivo')?.value) || 0;
    let mesesMeta = parseFloat(document.getElementById('inputMesesObjetivo')?.value) || 1;
    let numAnimales = parseInt(document.getElementById('inputNumAnimales')?.value) || 1;

    const labelConteo = document.getElementById('labelConteoCabezasKpi');
    if (labelConteo) labelConteo.innerText = numAnimales;

    let registrosLote = historialLotes.filter(r => r.lote === loteNombre);
    let gmdCalculada = 0.50; 

    if (registrosLote.length > 0) {
        let ultimoReg = registrosLote[registrosLote.length - 1];
        let fAnterior = new Date(ultimoReg.fechaActual || ultimoReg.fecha);
        let fActual = new Date(fechaActualStr);
        let diasTranscurridos = Math.round((fActual - fAnterior) / (1000 * 60 * 60 * 24));

        if (diasTranscurridos > 0) {
            let diffKilos = pesoProm - ultimoReg.pesoPromedioLote;
            gmdCalculada = diffKilos / diasTranscurridos;
            if (gmdCalculada < 0.01) gmdCalculada = 0.01;
        }
    } else {
        let kgsMetaInit = pesoObj - pesoProm;
        let diasMetaInit = mesesMeta * 30;
        if (diasMetaInit > 0) gmdCalculada = kgsMetaInit / diasMetaInit;
    }

    const elGMD = document.getElementById('resumenGMD');
    if (elGMD) elGMD.innerText = `${gmdCalculada.toFixed(2)} kg/día`;

    let kgsFaltantesUnitario = pesoObj - pesoProm;
    if (kgsFaltantesUnitario < 0) kgsFaltantesUnitario = 0;
    let kgsFaltantesTotalLote = kgsFaltantesUnitario * numAnimales;

    let diasTotales = gmdCalculada > 0 ? (kgsFaltantesUnitario / gmdCalculada) : 0;
    let mesesFaltantes = Math.floor(diasTotales / 30);
    let diasRestantes = Math.round(diasTotales % 30);

    const elUnitario = document.getElementById('resumenKgsFaltantesUnitario');
    const elTotal = document.getElementById('resumenKgsFaltantesTotal');
    const elTiempo = document.getElementById('resumenTiempoFaltante');

    if (elUnitario) elUnitario.innerText = `+${kgsFaltantesUnitario.toFixed(1)} kg`;
    if (elTotal) elTotal.innerText = `${kgsFaltantesTotalLote.toFixed(1)} kg`;
    if (elTiempo) elTiempo.innerText = `${mesesFaltantes} meses y ${diasRestantes} días`;

    // Brújula de Pesaje
    let cardBrujulaBox = document.getElementById('cardBrujulaBox');
    let resumenBrujulaDias = document.getElementById('resumenBrujulaDias');

    if (fechaProximaStr && cardBrujulaBox && resumenBrujulaDias) {
        let hoy = new Date();
        hoy.setHours(0,0,0,0);
        let fProxima = new Date(fechaProximaStr + 'T00:00:00');
        let diffDiasProximo = Math.round((fProxima - hoy) / (1000 * 60 * 60 * 24));

        cardBrujulaBox.className = "kpi-card-item";

        if (diffDiasProximo < 0) {
            cardBrujulaBox.classList.add('cv-alert-danger');
            resumenBrujulaDias.innerText = `¡VENCIDO por ${Math.abs(diffDiasProximo)} días!`;
            emitirAlarmaLevante('urgente');
        } else if (diffDiasProximo <= 3) {
            cardBrujulaBox.classList.add('cv-alert-warning');
            resumenBrujulaDias.innerText = `¡Inminente! (Faltan ${diffDiasProximo} días)`;
            emitirAlarmaLevante('warning');
        } else {
            cardBrujulaBox.classList.add('cv-alert-optimal');
            resumenBrujulaDias.innerText = `En fecha (Faltan ${diffDiasProximo} días)`;
        }
    }

    return { gmdCalculada, kgsFaltantesUnitario, kgsFaltantesTotalLote };
}

// ==========================================
// RENDERIZADO, BUSCADOR Y FILTROS
// ==========================================

function renderLevantesYResumen(filtroTexto = '', filtroTemporada = 'todos') {
    historialLotes = getHistorialLevante();
    
    // Ejecutar cálculo actual con los inputs del formulario
    calcularIndicadoresDinamicos();

    const contadorHistorial = document.getElementById('resumenConteoHistorial');
    if (contadorHistorial) {
        contadorHistorial.innerText = `${historialLotes.length} Pesajes Registrados`;
    }

    // Actualizar estado de botones de rehacer
    const btnRehacer = document.getElementById('btnRehacerUltimo');
    if (btnRehacer) {
        btnRehacer.disabled = (papeleraDeshacer.length === 0);
    }
}

function configurarFiltrosYBusqueda() {
    // Escuchar cambios en los inputs principales para recalcular en vivo
    ['inputPesoPromedio', 'inputPesoObjetivo', 'inputMesesObjetivo', 'inputLote', 'inputFechaActual', 'inputFechaProximo', 'inputNumAnimales'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', calcularIndicadoresDinamicos);
        }
    });
}

// ==========================================
// CONTROLADORES DE EVENTOS (FORMULARIO Y ACCIONES)
// ==========================================

function inicializarFormularioLevante() {
    const btnProcesar = document.getElementById('btnProcesarPesaje');
    const btnDeshacer = document.getElementById('btnDeshacerUltimo');
    const btnRehacer = document.getElementById('btnRehacerUltimo');
    const btnEliminarTotal = document.getElementById('btnEliminarLoteTotal');

    if (btnProcesar) {
        btnProcesar.addEventListener('click', () => {
            let loteNombre = document.getElementById('inputLote').value.trim();
            let temporada = document.getElementById('selectTemporada').value;
            let fechaActualStr = document.getElementById('inputFechaActual').value;
            let fechaProximaStr = document.getElementById('inputFechaProximo').value;
            let pesoProm = parseFloat(document.getElementById('inputPesoPromedio').value) || 0;
            let pesoObj = parseFloat(document.getElementById('inputPesoObjetivo').value) || 0;
            let mesesMeta = parseFloat(document.getElementById('inputMesesObjetivo').value) || 0;
            let numAnimales = parseInt(document.getElementById('inputNumAnimales').value) || 0;
            let pesoInicial = parseFloat(document.getElementById('inputPesoInicial').value) || 0;
            let cv = parseFloat(document.getElementById('inputCV').value) || 0;
            let observaciones = document.getElementById('inputObservaciones').value.trim();

            if (!loteNombre || !fechaActualStr || pesoProm <= 0) {
                alert("⚠️ Por favor verifique los campos obligatorios del lote y el peso promedio.");
                return;
            }

            let calculos = calcularIndicadoresDinamicos();

            let registroActual = {
                timestampRegistro: new Date().toISOString(),
                fechaActual: fechaActualStr,
                fechaProximoPesaje: fechaProximaStr,
                lote: loteNombre,
                temporada: temporada,
                pesoPromedioLote: pesoProm,
                pesoInicialBase: pesoInicial,
                pesoObjetivoLote: pesoObj,
                mesesObjetivo: mesesMeta,
                numAnimales: numAnimales,
                gmdCalculada: calculos.gmdCalculada,
                kgsFaltantesUnitario: calculos.kgsFaltantesUnitario,
                kgsFaltantesTotal: calculos.kgsFaltantesTotalLote,
                cvLote: cv,
                observaciones: observaciones
            };

            historialLotes.push(registroActual);
            if (saveHistorialLevante(historialLotes)) {
                papeleraDeshacer = []; // Limpiar papelera al crear nuevo registro
                emitirAlarmaLevante('success');
                showToastLevante("💾 Pesaje registrado y guardado en memoria.");
                renderLevantesYResumen();
            }
        });
    }

    if (btnDeshacer) {
        btnDeshacer.addEventListener('click', () => {
            if (historialLotes.length === 0) {
                alert("No hay registros en la memoria local para deshacer.");
                return;
            }

            let eliminado = historialLotes.pop();
            papeleraDeshacer.push(eliminado);

            saveHistorialLevante(historialLotes);
            renderLevantesYResumen();
            emitirAlarmaLevante('warning');
            showToastLevante(`🔄 Se deshizo el registro del ${eliminado.fechaActual}.`);
        });
    }

    if (btnRehacer) {
        btnRehacer.addEventListener('click', () => {
            if (papeleraDeshacer.length === 0) {
                alert("No hay acciones pendientes para rehacer.");
                return;
            }

            let restaurado = papeleraDeshacer.pop();
            historialLotes.push(restaurado);

            saveHistorialLevante(historialLotes);
            renderLevantesYResumen();
            emitirAlarmaLevante('success');
            showToastLevante(`✅ Se restauró el registro del ${restaurado.fechaActual}.`);
        });
    }

    if (btnEliminarTotal) {
        btnEliminarTotal.addEventListener('click', () => {
            let loteNombre = document.getElementById('inputLote').value.trim();
            if (confirm(`⚠️ ATENCIÓN: ¿Está seguro de ELIMINAR POR COMPLETO todos los pesajes del lote "${loteNombre}"?\n\nEsta acción no se puede deshacer.`)) {
                historialLotes = historialLotes.filter(r => r.lote !== loteNombre);
                saveHistorialLevante(historialLotes);
                papeleraDeshacer = [];
                renderLevantesYResumen();
                emitirAlarmaLevante('urgente');
                showToastLevante(`🗑️ Lote "${loteNombre}" eliminado del sistema.`);
            }
        });
    }
}
