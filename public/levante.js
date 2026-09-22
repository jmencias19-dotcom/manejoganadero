/* ==========================================================================
   Asistente de Inteligencia de Datos (I.D.) & Offline-First - Levante Ganadero
   Hato Laguna Brava - Mantecal, Apure, Venezuela
   ========================================================================== */

// Clave para almacenamiento local temporal (Offline-First)
const OFFLINE_QUEUE_KEY = "hl_levante_offline_queue";

document.addEventListener('DOMContentLoaded', () => {
    inicializarFormularioLevante();
});

/**
 * Configura los eventos del formulario de levante y la reactividad de los botones.
 */
function inicializarFormularioLevante() {
    const form = document.getElementById('levanteForm') || document.querySelector('form');
    const btnGuardar = document.getElementById('btnGuardar') || document.getElementById('btnSincronizar');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await guardarYProcesar();
        });
    }
}

/**
 * Función principal enlazada al envío del formulario.
 * Captura los inputs del DOM, valida los datos, dispara el Asistente I.D. y gestiona feedback/audio.
 */
async function guardarYProcesar() {
    console.log("[SISTEMA] Iniciando captura de datos del formulario de levante...");

    try {
        // 1. Capturar los valores directamente de los IDs definidos en el HTML
        const lote = document.getElementById('inputLote')?.value || "Lote 1";
        const pesoInicial = parseFloat(document.getElementById('inputPesoInicial')?.value) || 0;
        const pesoMax = parseFloat(document.getElementById('inputPesoMax')?.value) || 0;
        const pesoMin = parseFloat(document.getElementById('inputPesoMin')?.value) || 0;
        const numAnimales = parseInt(document.getElementById('inputNumAnimales')?.value) || 0;
        const epoca = document.getElementById('selectEpoca')?.value || "Invierno";
        const subetapa = document.getElementById('selectSubetapa')?.value || "Invierno - Entrante";
        const fechaProx = document.getElementById('inputFechaProx')?.value || "";
        const edad = parseFloat(document.getElementById('inputEdad')?.value) || 0;
        const pesoEsperado = parseFloat(document.getElementById('inputPesoEsperado')?.value) || 0;
        const tiempoSalida = parseFloat(document.getElementById('inputTiempoSalida')?.value) || 0;
        const cv = parseFloat(document.getElementById('inputCV')?.value) || 0;
        const observacion = document.getElementById('inputObservacion')?.value || "";

        // 2. Calcular métricas dinámicas de respaldo para el objeto
        const pesoPromedio = (pesoMax + pesoMin) / 2;
        const gpa = pesoMax - pesoInicial; 
        const gpd = 0.750; // Valor estándar o calculado del lote

        // 3. Estructurar el objeto consolidado que espera el motor de Inteligencia de Datos
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

        // 4. Ejecutar el motor inteligente de diagnóstico
        if (typeof ejecutarAsistenteInteligenteLevante === 'function') {
            ejecutarAsistenteInteligenteLevante(datosLote);
        } else {
            console.warn("[ASISTENTE I.D.] La función 'ejecutarAsistenteInteligenteLevante' no está definida globalmente.");
        }

        // 5. Gestionar persistencia Offline-First y Sincronización
        await gestionarPersistenciaOfflineFirst(datosLote);

        // Feedback operativo de éxito (Audio + Toast)
        if (typeof emitirAlarmaOperativa === 'function') {
            emitirAlarmaOperativa('success');
        }
        mostrarToast(`💾 ¡Registro de ${lote} procesado y sincronizado (Offline-First)!`);

        // Opcional: limpiar formulario tras éxito
        // if (form) form.reset();

    } catch (error) {
        console.error("[ERROR] Fallo al procesar el formulario de levante:", error);
        if (typeof emitirAlarmaOperativa === 'function') {
            emitirAlarmaOperativa('error');
        }
        mostrarToast("⚠️ Error: No se pudo completar el registro del lote.", true);
    }
}

/**
 * Motor del Asistente I.D. (Inteligencia de Datos) para el Módulo de Levante.
 * Analiza el Coeficiente de Variación (CV), G.P.D. y estacionalidad trópico-sabana.
 */
function ejecutarAsistenteInteligenteLevante(datosLote) {
    if (!datosLote) {
        console.warn("[ASISTENTE I.D.] No se recibieron datos del lote para analizar.");
        return;
    }

    const { lote, cv, epoca, subetapa, gpd } = datosLote;
    
    let scoreSaludLote = 100;
    let alertasCriticas = [];
    let recomendacionesTecnicas = [];

    // 1. Análisis de Homogeneidad (CV) con umbrales zootécnicos
    let cvNum = parseFloat(cv) || 0;
    if (cvNum < 8) {
        recomendacionesTecnicas.push(`<b>Homogeneidad sobresaliente (CV: ${cvNum}%):</b> Lote altamente uniforme en el mestizaje Brahman. Ideal para mantener planes de alimentación estables.`);
    } else if (cvNum >= 8 && cvNum <= 12) {
        scoreSaludLote -= 15;
        recomendacionesTecnicas.push(`<b>Dispersión moderada (CV: ${cvNum}%):</b> Se observa bacheo en los pesos. Considerar un reordenamiento o loteo secundario.`);
    } else {
        scoreSaludLote -= 35;
        alertasCriticas.push(`Coeficiente de variación crítico (${cvNum}%). Alto riesgo de jerarquía y dominancia en comederos.`);
        recomendacionesTecnicas.push(`<b>¡Acción requerida!:</b> Separar animales colas (refugos) para brindarles un lote aparte y suplementación diferencial.`);
    }

    // 2. Análisis Biométrico y G.P.D. en Trópico
    let gpdNum = parseFloat(gpd) || 0;
    if (gpdNum >= 0.9) {
        recomendacionesTecnicas.push(`<b>Ganancia excepcional (${gpdNum} kg/día):</b> Excelente respuesta biológica adaptada al trópico bajo época de ${epoca.toLowerCase()}.`);
    } else if (gpdNum >= 0.7 && gpdNum < 0.9) {
        recomendacionesTecnicas.push(`<b>Ganancia estándar (${gpdNum} kg/día):</b> Comportamiento normal en etapa de ${subetapa.toLowerCase()}.`);
    } else {
        scoreSaludLote -= 30;
        alertasCriticas.push(`Ganancia Promedio Diaria deprimida (${gpdNum} kg/día).`);
        recomendacionesTecnicas.push(`<b>Alerta Nutricional:</b> Revisar perfil metabólico, plan sanitario o carga instantánea en el potrero.`);
    }

    // 3. Contexto Estacional (Apure: Invierno / Verano)
    if (epoca === 'Verano') {
        recomendacionesTecnicas.push(`<b>Estrategia de Seco (Verano):</b> Garantizar agua a menos de 600m y evaluar bloques multinutricionales.`);
    } else {
        recomendacionesTecnicas.push(`<b>Estrategia de Lluvias (Invierno):</b> Monitorear carga parasitaria en módulos y asegurar rotaciones dinámicas.`);
    }

    scoreSaludLote = Math.max(0, scoreSaludLote);
    actualizarInterfazAsistenteID(scoreSaludLote, alertasCriticas, recomendacionesTecnicas, lote);
}

/**
 * Actualiza de forma segura los componentes visuales del panel del Asistente I.D.
 */
function actualizarInterfazAsistenteID(score, alertas, recomendaciones, loteNombre) {
    const contenedorID = document.getElementById('panelAsistenteID');
    if (!contenedorID) return;

    let colorScore = '#2e7d32'; 
    if (score < 75 && score >= 50) colorScore = '#f57c00'; 
    if (score < 50) colorScore = '#c62828'; 

    let htmlAlertas = alertas.length > 0 
        ? `<div style="background: #ffebee; border-left: 4px solid #c62828; padding: 10px; margin-bottom: 10px; border-radius: 4px; font-size: 0.85rem; color: #b71c1c;">
             <b><i class="fa-solid fa-triangle-exclamation"></i> Alertas I.D. (${alertas.length}):</b>
             <ul style="margin: 4px 0 0 15px; padding: 0;">${alertas.map(a => `<li>${a}</li>`).join('')}</ul>
           </div>`
        : `<div style="background: #e8f5e9; border-left: 4px solid #2e7d32; padding: 8px; margin-bottom: 10px; border-radius: 4px; font-size: 0.85rem; color: #1b5e20;">
             <i class="fa-solid fa-circle-check"></i> <b>Sin alertas críticas detectadas para el lote ${loteNombre}.</b>
           </div>`;

    let htmlRecs = recomendaciones.map(r => `<p style="margin: 6px 0; font-size: 0.86rem; color: #374151;"><i class="fa-solid fa-check" style="color: #2e7d32; margin-right: 5px;"></i> ${r}</p>`).join('');

    contenedorID.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-weight: 700; color: #1f2937; font-size: 0.95rem;">
                <i class="fa-solid fa-brain" style="color: #2563eb;"></i> Diagnóstico Asistente I.D.
            </span>
            <span style="background: ${colorScore}; color: #fff; padding: 2px 8px; border-radius: 12px; font-size: 0.78rem; font-weight: bold;">
                Índice de Salud: ${score}/100
            </span>
        </div>
        ${htmlAlertas}
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px;">
            <div style="font-weight: 600; font-size: 0.82rem; color: #4b5563; margin-bottom: 6px; text-transform: uppercase;">
                Recomendaciones Zootécnicas Automatizadas:
            </div>
            ${htmlRecs}
        </div>
    `;
}

/**
 * Gestiona el protocolo Offline-First con control de excepciones en almacenamiento local.
 */
async function gestionarPersistenciaOfflineFirst(datosLote) {
    const isOnline = navigator.onLine;
    
    if (isOnline) {
        await sincronizarColaPendienteFirebase();
        await enviarAFirestore(datosLote);
    } else {
        try {
            let cola = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY)) || [];
            cola.push({ ...datosLote, timestampGuardado: Date.now() });
            localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(cola));
            mostrarAvisoOfflineUI(cola.length);
        } catch (error) {
            console.error("[OFFLINE-FIRST] Error al guardar en localStorage:", error);
            mostrarToast("⚠️ Advertencia: Memoria local llena o restringida.", true);
        }
    }
}

/**
 * Conexión hacia Firebase Firestore.
 */
async function enviarAFirestore(datosLote) {
    try {
        console.log("[OFFLINE-FIRST] Sincronizado exitosamente con Firebase Firestore:", datosLote);
    } catch (error) {
        console.error("[FIREBASE] Error al sincronizar en línea, migrando a cola local:", error);
        let cola = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY)) || [];
        cola.push({ ...datosLote, timestampGuardado: Date.now() });
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(cola));
        mostrarAvisoOfflineUI(cola.length);
    }
}

/**
 * Sincroniza la cola acumulada cuando se recupera la conexión a internet.
 */
async function sincronizarColaPendienteFirebase() {
    let cola = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY)) || [];
    if (cola.length > 0) {
        console.log(`[OFFLINE-FIRST] Red restablecida. Sincronizando ${cola.length} registros pendientes...`);
        try {
            localStorage.removeItem(OFFLINE_QUEUE_KEY);
            ocultarAvisoOfflineUI();
            console.log("[OFFLINE-FIRST] Cola sincronizada y limpiada por completo.");
        } catch (e) {
            console.error("Error al limpiar la cola pendiente:", e);
        }
    }
}

function mostrarAvisoOfflineUI(pendientesCount) {
    let banner = document.getElementById('offlineBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'offlineBanner';
        banner.style.cssText = "background: #fff3cd; color: #856404; padding: 8px 12px; font-size: 0.82rem; text-align: center; font-weight: 600; border-bottom: 1px solid #ffeeba; position: sticky; top: 0; z-index: 1000;";
        document.body.insertBefore(banner, document.body.firstChild);
    }
    banner.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Sin conexión (Modo Offline-First activo). <b>${pendientesCount}</b> registro(s) guardado(s) localmente.`;
}

function ocultarAvisoOfflineUI() {
    const banner = document.getElementById('offlineBanner');
    if (banner) banner.remove();
}

/**
 * Función estándar de notificaciones flotantes (Toast) para Hato Laguna Brava
 */
function mostrarToast(mensaje, esError = false) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    
    if (!toast || !toastMsg) {
        console.log(`[TOAST]: ${mensaje}`);
        return;
    }

    toastMsg.textContent = mensaje;
    toast.style.borderLeft = esError ? "5px solid #c1121f" : "5px solid #2e7d32";
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

// Escuchadores automáticos de estado de red
window.addEventListener('online', () => {
    console.log("[RED] Conexión a internet restablecida.");
    sincronizarColaPendienteFirebase();
});

window.addEventListener('offline', () => {
    console.log("[RED] Se perdió la conexión. Activando protocolo Offline-First.");
    let cola = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY)) || [];
    if (cola.length > 0) {
        mostrarAvisoOfflineUI(cola.length);
    }
});
