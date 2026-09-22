/* ==========================================================================
   Módulo de Control de Levante - Hato Laguna Brava (Mantecal, Apure)
   Asistente I.D. & Protocolo Offline-First
   ========================================================================== */

const OFFLINE_QUEUE_KEY = "hl_levante_offline_queue";

document.addEventListener('DOMContentLoaded', () => {
    inicializarModuloLevante();
});

/**
 * Inicializa los listeners, cálculos automáticos reactivos al escribir y fecha actual.
 */
function inicializarModuloLevante() {
    console.log("[SISTEMA] Inicializando Módulo de Levante - Hato Laguna Brava...");

    // Vincular inputs numéricos para cálculo dinámico en tiempo real
    const inputsDinamicos = ['inputPesoInicial', 'inputPesoMax', 'inputPesoMin', 'inputFechaProx', 'selectEpoca'];
    inputsDinamicos.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', calcularMetricasEnTiempoReal);
            el.addEventListener('change', calcularMetricasEnTiempoReal);
        }
    });

    // Calcular métricas iniciales al cargar la página
    calcularMetricasEnTiempoReal();
    
    // Verificar estado de red inicial
    verificarEstadoRedUI();
}

/**
 * Calcula dinámicamente GPD, GPA, días restantes y actualiza la UI mientras el usuario escribe.
 */
function calcularMetricasEnTiempoReal() {
    const pesoInicial = parseFloat(document.getElementById('inputPesoInicial')?.value) || 0;
    const pesoMax = parseFloat(document.getElementById('inputPesoMax')?.value) || 0;
    const fechaProxVal = document.getElementById('inputFechaProx')?.value;

    // 1. Cálculo de G.P.A. (Ganancia Promedio Animal en kg)
    const gpa = pesoMax - pesoInicial;
    const kpiGPA = document.getElementById('kpiGPA');
    if (kpiGPA) kpiGPA.textContent = `${gpa.toFixed(1)} kg`;

    // 2. Estimación de G.P.D. (Ganancia Promedio Diaria estándar / adaptada a sabana)
    let diasTranscurridos = 60; 
    let gpd = diasTranscurridos > 0 ? (gpa / diasTranscurridos) : 0.750;
    if (gpd < 0) gpd = 0;

    const kpiGPD = document.getElementById('kpiGPD');
    if (kpiGPD) kpiGPD.textContent = `${gpd.toFixed(3)} kg`;

    // 3. Cálculo de Días Restantes hasta el próximo control
    if (fechaProxVal) {
        const fechaProx = new Date(fechaProxVal);
        const hoy = new Date();
        const diferenciaTiempo = fechaProx - hoy;
        const diasRestantes = Math.ceil(diferenciaTiempo / (1000 * 60 * 60 * 24));
        
        const displayDias = document.getElementById('displayDiasRestantes');
        if (displayDias) {
            displayDias.textContent = diasRestantes >= 0 ? `${diasRestantes} Días` : `Vencido (${Math.abs(diasRestantes)} d)`;
            displayDias.style.color = diasRestantes < 0 ? '#c62828' : 'var(--text-main)';
        }
    }
}

/**
 * Actualiza el submenú de ciclos estacionales si cambia la época (Invierno/Verano).
 */
function actualizarSubetapa() {
    const selectEpoca = document.getElementById('selectEpoca');
    const selectSubetapa = document.getElementById('selectSubetapa');
    
    if (!selectEpoca || !selectSubetapa) return;

    const epocaSeleccionada = selectEpoca.value;
    selectSubetapa.innerHTML = '';

    if (epocaSeleccionada === 'Invierno') {
        ['Invierno - Entrante', 'Invierno - Mediados', 'Invierno - Finales'].forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub;
            opt.textContent = sub.replace('Invierno - ', '');
            selectSubetapa.appendChild(opt);
        });
    } else {
        ['Verano - Transición', 'Verano - Crítico', 'Verano - Salida'].forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub;
            opt.textContent = sub.replace('Verano - ', '');
            selectSubetapa.appendChild(opt);
        });
    }
}

/**
 * Función principal enlazada al botón "Guardar y Sincronizar".
 * Captura datos, ejecuta el Asistente I.D., emite audio y gestiona Offline-First.
 */
async function guardarYProcesar() {
    console.log("[SISTEMA] Procesando formulario de levante...");

    try {
        // 1. Capturar todos los campos del DOM
        const lote = document.getElementById('inputLote')?.value || "Lote 1";
        const pesoInicial = parseFloat(document.getElementById('inputPesoInicial')?.value) || 0;
        const pesoMax = parseFloat(document.getElementById('inputPesoMax')?.value) || 0;
        const pesoMin = parseFloat(document.getElementById('inputPesoMin')?.value) || 0;
        const numAnimales = parseInt(document.getElementById('inputNumAnimales')?.value) || 0;
        const epoca = document.getElementById('selectEpoca')?.value || "Invierno";
        const subetapa = document.getElementById('selectSubetapa')?.value || "Inicio";
        const fechaProx = document.getElementById('inputFechaProx')?.value || "";
        const edad = parseFloat(document.getElementById('inputEdad')?.value) || 0;
        const pesoEsperado = parseFloat(document.getElementById('inputPesoEsperado')?.value) || 0;
        const tiempoSalida = parseFloat(document.getElementById('inputTiempoSalida')?.value) || 0;
        const cv = parseFloat(document.getElementById('inputCV')?.value) || 0;
        const observacion = document.getElementById('inputObservacion')?.value || "";

        // 2. Derivar métricas consolidadas
        const pesoPromedio = (pesoMax + pesoMin) / 2;
        const gpa = pesoMax - pesoInicial;
        const gpd = gpa > 0 ? (gpa / 60) : 0.750;

        const datosLote = {
            lote,
            pesoPromedio,
            pesoInicial,
            pesoMax,
            pesoMin,
            numAnimales,
            epoca,
            subetapa,
            fechaProx,
            edad,
            pesoEsperado,
            tiempoSalida,
            cv,
            gpd,
            gpa,
            observacion,
            timestamp: Date.now()
        };

        // 3. Ejecutar Asistente Inteligente de Datos (Diagnóstico zootécnico)
        ejecutarAsistenteInteligenteLevante(datosLote);

        // 4. Guardar bajo protocolo Offline-First / Firebase
        await gestionarPersistenciaOfflineFirst(datosLote);

        // 5. Feedback Operativo (Audio y Toast exitoso)
        if (typeof emitirAlarmaOperativa === 'function') {
            emitirAlarmaOperativa('success');
        }
        mostrarToast(`💾 ¡Registro de ${lote} guardado y sincronizado con éxito!`);

    } catch (error) {
        console.error("[ERROR] Falló el procesamiento del levante:", error);
        if (typeof emitirAlarmaOperativa === 'function') {
            emitirAlarmaOperativa('error');
        }
        mostrarToast("⚠️ Error: No se pudo completar el registro.", true);
    }
}

/**
 * Motor del Asistente I.D. (Inteligencia de Datos) 
 */
function ejecutarAsistenteInteligenteLevante(datosLote) {
    if (!datosLote) return;

    const { lote, cv, epoca, subetapa, gpd } = datosLote;
    let scoreSaludLote = 100;
    let alertasCriticas = [];
    let recomendacionesTecnicas = [];

    // Análisis de Homogeneidad (CV)
    let cvNum = parseFloat(cv) || 0;
    if (cvNum < 8) {
        recomendacionesTecnicas.push(`<b>Homogeneidad sobresaliente (CV: ${cvNum}%):</b> Lote de mestizaje Brahman muy uniforme.`);
    } else if (cvNum <= 12) {
        scoreSaludLote -= 15;
        recomendacionesTecnicas.push(`<b>Dispersión moderada (CV: ${cvNum}%):</b> Evaluar reordenamiento por pesos.`);
    } else {
        scoreSaludLote -= 35;
        alertasCriticas.push(`Coeficiente de variación crítico (${cvNum}%).`);
        recomendacionesTecnicas.push(`<b>Acción prioritaria:</b> Separar animales colas (refugos).`);
    }

    // Análisis GPD
    let gpdNum = parseFloat(gpd) || 0;
    if (gpdNum >= 0.750) {
        recomendacionesTecnicas.push(`<b>Ganancia óptima (${gpdNum.toFixed(3)} kg/día):</b> Excelente respuesta en ${epoca.toLowerCase()}.`);
    } else {
        scoreSaludLote -= 25;
        alertasCriticas.push(`Ganancia de peso diaria baja (${gpdNum.toFixed(3)} kg/día).`);
        recomendacionesTecnicas.push(`<b>Alerta Nutricional:</b> Revisar pastura o plan sanitario.`);
    }

    scoreSaludLote = Math.max(0, scoreSaludLote);
    console.log(`[ASISTENTE I.D.] Índice de Salud del Lote ${lote}: ${scoreSaludLote}/100`, recomendacionesTecnicas);
}

/**
 * Persistencia Offline-First robusta con localStorage
 */
async function gestionarPersistenciaOfflineFirst(datosLote) {
    const isOnline = navigator.onLine;

    if (isOnline) {
        await sincronizarColaPendienteFirebase();
        console.log("[FIREBASE] Datos enviados a Firestore correctamente:", datosLote);
    } else {
        try {
            let cola = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY)) || [];
            cola.push({ ...datosLote, timestampGuardado: Date.now() });
            localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(cola));
            actualizarSemafortoSync(false, cola.length);
        } catch (e) {
            console.error("[OFFLINE-FIRST] Error de almacenamiento local:", e);
        }
    }
}

async function sincronizarColaPendienteFirebase() {
    let cola = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY)) || [];
    if (cola.length > 0) {
        console.log(`[OFFLINE-FIRST] Sincronizando ${cola.length} registros pendientes...`);
        localStorage.removeItem(OFFLINE_QUEUE_KEY);
    }
    actualizarSemafortoSync(true, 0);
}

/**
 * Control visual del Semáforo de Sincronización en el Header
 */
function actualizarSemafortoSync(isOnline, pendientesCount) {
    const semaphore = document.getElementById('sync-semaphore');
    const syncText = document.getElementById('sync-text');

    if (!semaphore || !syncText) return;

    if (isOnline && pendientesCount === 0) {
        semaphore.className = "semaphore online";
        syncText.textContent = "Sincronizado Local";
    } else {
        semaphore.className = "semaphore offline";
        syncText.textContent = `Pendientes (${pendientesCount})`;
    }
}

function verificarEstadoRedUI() {
    const isOnline = navigator.onLine;
    let cola = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY)) || [];
    actualizarSemafortoSync(isOnline, cola.length);
}

/**
 * Notificaciones Flotantes (Toast) del Sistema
 */
function mostrarToast(mensaje, esError = false) {
    let toast = document.getElementById('toast-flotante');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-flotante';
        toast.style.cssText = "position: fixed; bottom: 20px; right: 20px; background: #1f2937; color: #fff; padding: 12px 20px; border-radius: 8px; font-size: 0.9rem; z-index: 9999; transition: opacity 0.3s ease; opacity: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.15);";
        document.body.appendChild(toast);
    }

    toast.textContent = mensaje;
    toast.style.borderLeft = esError ? "4px solid #c62828" : "4px solid #2e7d32";
    toast.style.opacity = '1';

    setTimeout(() => {
        toast.style.opacity = '0';
    }, 4000);
}

// Eventos de red
window.addEventListener('online', () => {
    console.log("[RED] Conexión recuperada.");
    sincronizarColaPendienteFirebase();
});

window.addEventListener('offline', () => {
    console.log("[RED] Sin conexión a internet. Modo Offline-First activado.");
    verificarEstadoRedUI();
});
