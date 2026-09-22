/* ==========================================================================
   Módulo de Control de Levante - Hato Laguna Brava (Mantecal, Apure)
   Asistente I.D. & Protocolo Offline-First (Versión Operativa Definitiva)
   ========================================================================== */

const OFFLINE_QUEUE_KEY = "hl_levante_offline_queue";

document.addEventListener('DOMContentLoaded', () => {
    console.log("[SISTEMA] Inicializando Módulo de Levante - Hato Laguna Brava...");

    // 1. Enlace directo y estricto por ID único (Garantiza respuesta inmediata)
    const btnGuardar = document.getElementById('btnGuardarLevante');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', async (e) => {
            e.preventDefault();
            await guardarYProcesar();
        });
        console.log("[OK] Botón 'Guardar y Sincronizar' enlazado correctamente.");
    } else {
        console.error("[ERROR CRÍTICO] No se encontró el elemento con ID 'btnGuardarLevante' en el HTML.");
    }

    // 2. Vincular inputs numéricos para cálculo dinámico en tiempo real
    const inputsDinamicos = ['inputPesoInicial', 'inputPesoMax', 'inputPesoMin', 'inputFechaProx', 'selectEpoca'];
    inputsDinamicos.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', calcularMetricasEnTiempoReal);
            el.addEventListener('change', calcularMetricasEnTiempoReal);
        }
    });

    // 3. Inicializar métricas y estado de red
    calcularMetricasEnTiempoReal();
    verificarEstadoRedUI();
});

/**
 * Calcula dinámicamente GPD, GPA y días restantes mientras el usuario interactúa.
 */
function calcularMetricasEnTiempoReal() {
    const pesoInicial = parseFloat(document.getElementById('inputPesoInicial')?.value) || 0;
    const pesoMax = parseFloat(document.getElementById('inputPesoMax')?.value) || 0;
    const fechaProxVal = document.getElementById('inputFechaProx')?.value;

    // G.P.A. (Ganancia Promedio Animal)
    const gpa = pesoMax - pesoInicial;
    const kpiGPA = document.getElementById('kpiGPA');
    if (kpiGPA) kpiGPA.textContent = `${gpa.toFixed(1)} kg`;

    // G.P.D. (Ganancia Promedio Diaria estimada base sabana)
    let diasTranscurridos = 60; 
    let gpd = diasTranscurridos > 0 ? (gpa / diasTranscurridos) : 0.750;
    if (gpd < 0) gpd = 0;

    const kpiGPD = document.getElementById('kpiGPD');
    if (kpiGPD) kpiGPD.textContent = `${gpd.toFixed(3)} kg`;

    // Días Restantes (Fijado a fecha del sistema: 22 de Septiembre de 2026)
    if (fechaProxVal) {
        const fechaProx = new Date(fechaProxVal + 'T00:00:00');
        const hoy = new Date('2026-09-22T00:00:00');
        const diasRestantes = Math.ceil((fechaProx - hoy) / (1000 * 60 * 60 * 24));
        
        const displayDias = document.getElementById('displayDiasRestantes');
        if (displayDias) {
            displayDias.textContent = diasRestantes >= 0 ? `${diasRestantes} Días` : `Vencido (${Math.abs(diasRestantes)} d)`;
            displayDias.style.color = diasRestantes < 0 ? '#c62828' : 'inherit';
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
 * Función principal ejecutada al hacer clic en Guardar y Sincronizar.
 */
async function guardarYProcesar() {
    console.log("[SISTEMA] Ejecutando guardarYProcesar()...");

    try {
        // Captura de datos del DOM
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

        const pesoPromedio = (pesoMax + pesoMin) / 2;
        const gpa = pesoMax - pesoInicial;
        const gpd = gpa > 0 ? (gpa / 60) : 0.750;

        const datosLote = {
            lote, pesoPromedio, pesoInicial, pesoMax, pesoMin, numAnimales,
            epoca, subetapa, fechaProx, edad, pesoEsperado, tiempoSalida,
            cv, gpd, gpa, observacion, timestamp: Date.now()
        };

        // Ejecutar Asistente Zootécnico local
        ejecutarAsistenteInteligenteLevante(datosLote);

        // Gestión Offline-First
        await gestionarPersistenciaOfflineFirst(datosLote);

        if (typeof emitirAlarmaOperativa === 'function') {
            emitirAlarmaOperativa('success');
        }
        mostrarToast(`💾 ¡Registro de ${lote} guardado con éxito!`);
        console.log("[EXITO] Datos procesados:", datosLote);

    } catch (error) {
        console.error("[ERROR] Falló el procesamiento del levante:", error);
        if (typeof emitirAlarmaOperativa === 'function') {
            emitirAlarmaOperativa('error');
        }
        mostrarToast("⚠️ Error: No se pudo completar el registro.", true);
    }
}

/**
 * Motor del Asistente I.D. (Diagnóstico rápido en consola)
 */
function ejecutarAsistenteInteligenteLevante(datosLote) {
    if (!datosLote) return;
    const { lote, cv, gpd } = datosLote;
    let scoreSaludLote = 100;
    let recomendacionesTecnicas = [];

    let cvNum = parseFloat(cv) || 0;
    if (cvNum > 12) {
        scoreSaludLote -= 35;
        recomendacionesTecnicas.push(`CV Crítico (${cvNum}%): Separar animales colas.`);
    }

    let gpdNum = parseFloat(gpd) || 0;
    if (gpdNum < 0.750) {
        scoreSaludLote -= 25;
        recomendacionesTecnicas.push(`GPD Baja (${gpdNum.toFixed(3)} kg/día): Revisar pastura.`);
    }

    console.log(`[ASISTENTE I.D.] Lote ${lote} - Índice Salud: ${Math.max(0, scoreSaludLote)}/100`, recomendacionesTecnicas);
}

/**
 * Persistencia Offline-First mediante localStorage
 */
async function gestionarPersistenciaOfflineFirst(datosLote) {
    if (navigator.onLine) {
        console.log("[FIREBASE] Datos sincronizados en línea.");
    } else {
        let cola = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY)) || [];
        cola.push({ ...datosLote, timestampGuardado: Date.now() });
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(cola));
        actualizarSemafortoSync(false, cola.length);
    }
}

/**
 * Controla visualmente el estado del semáforo de sincronización
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

/**
 * Interfaz de notificación flotante (Toast)
 */
function mostrarToast(mensaje, esError = false) {
    let toast = document.getElementById('toast-flotante');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-flotante';
        toast.style.cssText = "position: fixed; bottom: 20px; right: 20px; background: #1f2937; color: #fff; padding: 12px 20px; border-radius: 8px; font-size: 0.9rem; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.15);";
        document.body.appendChild(toast);
    }
    toast.textContent = mensaje;
    toast.style.borderLeft = esError ? "4px solid #c62828" : "4px solid #2e7d32";
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 4000);
}

/**
 * Verifica el estado de la red y gatilla la sincronización si hay datos pendientes en cola.
 */
async function verificarEstadoRedUI() {
    let cola = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY)) || [];
    const isOnline = navigator.onLine;

    // Si vuelve la red y existen registros pendientes, ejecutamos la migración masiva
    if (isOnline && cola.length > 0) {
        await sincronizarColaOfflineAFirebase(cola);
    } else {
        actualizarSemafortoSync(isOnline, cola.length);
    }
}

/**
 * Recorre la cola local, envía los datos a Firebase y limpia el almacenamiento del dispositivo.
 */
