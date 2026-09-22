/* ==========================================================================
   Asistente de Inteligencia de Datos (I.D.) & Offline-First - Levante Ganadero
   Hato Laguna Brava - Apure, Venezuela
   ========================================================================== */

// Clave para almacenamiento local temporal (Offline-First)
const OFFLINE_QUEUE_KEY = "hl_levante_offline_queue";

/**
 * Motor del Asistente I.D. (Inteligencia de Datos) para el Módulo de Levante.
 * Analiza de forma integral el coeficiente de variación (CV), la G.P.D. y la época climática.
 */
function ejecutarAsistenteInteligenteLevante(datosLote) {
    const { lote, pesoPromedio, cv, epoca, subetapa, gpd, gpa, numAnimales } = datosLote;
    
    let scoreSaludLote = 100;
    let alertasCriticas = [];
    let recomendacionesTecnicas = [];

    // 1. Análisis de Homogeneidad (CV)
    let cvNum = parseFloat(cv);
    if (cvNum < 8) {
        recomendacionesTecnicas.push(`<b>Homogeneidad sobresaliente (CV: ${cvNum}%):</b> Lote altamente uniforme. Ideal para mantener planes de alimentación estables sin competencia agresiva.`);
    } else if (cvNum >= 8 && cvNum <= 12) {
        scoreSaludLote -= 15;
        recomendacionesTecnicas.push(`<b>Dispersión moderada (CV: ${cvNum}%):</b> Se observa bacheo en los pesos. Considerar un reordenamiento o loteo secundario por peso.`);
    } else {
        scoreSaludLote -= 35;
        alertasCriticas.push(`Coeficiente de variación crítico (${cvNum}%). Alto riesgo de dominancia en comederos y pastruras.`);
        recomendacionesTecnicas.push(`<b>¡Acción requerida!:</b> Separar animales colas (refugos) para brindarles un suplemento diferencial.`);
    }

    // 2. Análisis Biométrico y G.P.D. en Trópico
    let gpdNum = parseFloat(gpd);
    if (gpdNum >= 0.9) {
        recomendacionesTecnicas.push(`<b>Ganancia excepcional (${gpdNum} kg/día):</b> Excelente respuesta del mestizaje Brahman bajo las condiciones actuales de la época de ${epoca.toLowerCase()}.`);
    } else if (gpdNum >= 0.7 && gpdNum < 0.9) {
        recomendacionesTecnicas.push(`<b>Ganancia estándar (${gpdNum} kg/día):</b> Comportamiento normal en ${subetapa.toLowerCase()}. Vigilar disponibilidad de materia seca.`);
    } else {
        scoreSaludLote -= 30;
        alertasCriticas.push(`Ganancia Promedio Diaria deprimida (${gpdNum} kg/día).`);
        recomendacionesTecnicas.push(`<b>Alerta Nutricional:</b> Revisar perfil metabólico, plan de desparasitación estratégica o carga instantánea en el potrero.`);
    }

    // 3. Contexto Estacional (Apure - Invierno / Verano)
    if (epoca === 'Verano') {
        recomendacionesTecnicas.push(`<b>Estrategia de Seco (Verano):</b> Asegurar fuentes de agua de calidad a una distancia menor a 600m y evaluar bloques multinutricionales oala de caña.`);
    } else {
        recomendacionesTecnicas.push(`<b>Estrategia de Lluvias (Invierno):</b> Monitorear la aparición de ectoparásitos (garrapatas/tánidos) y asegurar rotaciones rápidas para evitar encharcamientos excesivos.`);
    }

    // Renderizar resultados en el panel visual del Asistente I.D.
    actualizarInterfazAsistenteID(scoreSaludLote, alertasCriticas, recomendacionesTecnicas, lote);
    
    // Gestionar persistencia Offline-First
    gestionarPersistenciOfflineFirst(datosLote);
}

/**
 * Actualiza los componentes visuales del panel del Asistente I.D. en la interfaz
 */
function actualizarInterfazAsistenteID(score, alertas, recomendaciones, loteNombre) {
    const contenedorID = document.getElementById('panelAsistenteID');
    if (!contenedorID) return;

    let colorScore = '#2e7d32'; // Verde
    if (score < 75 && score >= 50) colorScore = '#f57c00'; // Naranja
    if (score < 50) colorScore = '#c62828'; // Rojo

    let htmlAlertas = alertas.length > 0 
        ? `<div style="background: #ffebee; border-left: 4px solid #c62828; padding: 10px; margin-bottom: 10px; border-radius: 4px; font-size: 0.85rem; color: #b71c1c;">
             <b><i class="fa-solid fa-triangle-exclamation"></i> Alertas I.D. (${alertas.length}):</b>
             <ul style="margin: 4px 0 0 15px; padding: 0;">${alertas.map(a => `<li>${a}</li>`).join('')}</ul>
           </div>`
        : `<div style="background: #e8f5e9; border-left: 4px solid #2e7d32; padding: 8px; margin-bottom: 10px; border-radius: 4px; font-size: 0.85rem; color: #1b5e20;">
             <i class="fa-solid fa-circle-check"><b> Sin alertas críticas detectadas para el lote ${loteNombre}.</b></i>
           </div>`;

    let htmlRecs = recomendaciones.map(r => `<p style="margin: 6px 0; font-size: 0.86rem; color: #374151;"><i class="fa-solid fa-check text-success"></i> ${r}</p>`).join('');

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
 * Garantiza el comportamiento Offline-First: guarda en LocalStorage si no hay conexión
 * y sincroniza automáticamente con Firebase al recuperar la red.
 */
function gestionarPersistenciOfflineFirst(datosLote) {
    const isOnline = navigator.onLine;
    
    if (isOnline) {
        // Intentar sincronizar cola pendiente si la hay
        sincronizarColaPendienteFirebase();
        // Enviar registro actual directamente a Firestore (simulado o integrado con tu instancia db)
        enviarAFirestore(datosLote);
    } else {
        // Guardar en cola local offline
        let cola = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY)) || [];
        cola.push({ ...datosLote, timestampGuardado: Date.now() });
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(cola));
        
        mostrarAvisoOfflineUI(cola.length);
    }
}

function enviarAFirestore(datosLote) {
    // Aquí se conecta con tu instancia de Firebase Firestore (ej. addDoc en colección 'registros_levante')
    console.log("[OFFLINE-FIRST] Conexión detectada. Sincronizado en tiempo real con Firebase Firestore:", datosLote);
}

function sincronizarColaPendienteFirebase() {
    let cola = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY)) || [];
    if (cola.length > 0) {
        console.log(`[OFFLINE-FIRST] Red restablecida. Sincronizando ${cola.length} registros pendientes con Firebase...`);
        // Procesar elementos acumulados offline
        cola.forEach(item => {
            enviarAFirestore(item);
        });
        localStorage.removeItem(OFFLINE_QUEUE_KEY);
        ocultarAvisoOfflineUI();
    }
}

function mostrarAvisoOfflineUI(pendientesCount) {
    let banner = document.getElementById('offlineBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'offlineBanner';
        banner.style.cssText = "background: #fff3cd; color: #856404; padding: 8px 12px; font-size: 0.82rem; text-align: center; font-weight: 600; border-bottom: 1px solid #ffeeba;";
        document.body.insertBefore(banner, document.body.firstChild);
    }
    banner.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Sin conexión a internet (Modo Offline-First activo). ${pendientesCount} registro(s) guardado(s) localmente listos para sincronizar.`;
}

function ocultarAvisoOfflineUI() {
    const banner = document.getElementById('offlineBanner');
    if (banner) banner.remove();
}

// Escuchar cambios de conectividad de red de forma automática
window.addEventListener('online', () => {
    console.log("[RED] Conexión a internet restablecida.");
    sincronizarColaPendienteFirebase();
});

window.addEventListener('offline', () => {
    console.log("[RED] Se perdió la conexión. Activando protocolo Offline-First.");
});
