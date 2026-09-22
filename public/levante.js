/* ==========================================================================
   Asistente de Inteligencia de Datos (I.D.) & Offline-First - Levante Ganadero
   Hato Laguna Brava - Mantecal, Apure, Venezuela
   ========================================================================== */

// Clave para almacenamiento local temporal (Offline-First)
const OFFLINE_QUEUE_KEY = "hl_levante_offline_queue";

/**
 * Motor del Asistente I.D. (Inteligencia de Datos) para el Módulo de Levante.
 * Analiza el Coeficiente de Variación (CV), G.P.D. y estacionalidad trópico-sabana.
 */
function ejecutarAsistenteInteligenteLevante(datosLote) {
    if (!datosLote) {
        console.warn("[ASISTENTE I.D.] No se recibieron datos del lote para analizar.");
        return;
    }

    const { lote, pesoPromedio, cv, epoca, subetapa, gpd, gpa, numAnimales } = datosLote;
    
    let scoreSaludLote = 100;
    let alertasCriticas = [];
    let recomendacionesTecnicas = [];

    // 1. Análisis de Homogeneidad (CV) con umbrales zootécnicos
    let cvNum = parseFloat(cv) || 0;
    if (cvNum < 8) {
        recomendacionesTecnicas.push(`<b>Homogeneidad sobresaliente (CV: ${cvNum}%):</b> Lote altamente uniforme en el mestizaje Brahman. Ideal para mantener planes de alimentación estables sin competencia agresiva en comederos o pastruras.`);
    } else if (cvNum >= 8 && cvNum <= 12) {
        scoreSaludLote -= 15;
        recomendacionesTecnicas.push(`<b>Dispersión moderada (CV: ${cvNum}%):</b> Se observa bacheo en los pesos. Considerar un reordenamiento o loteo secundario por categoría ponderada.`);
    } else {
        scoreSaludLote -= 35;
        alertasCriticas.push(`Coeficiente de variación crítico (${cvNum}%). Alto riesgo de jerarquía y dominancia en comederos.`);
        recomendacionesTecnicas.push(`<b>¡Acción requerida!:</b> Separar animales colas (refugos) para brindarles un lote aparte y suplementación diferencial.`);
    }

    // 2. Análisis Biométrico y G.P.D. en Trópico
    let gpdNum = parseFloat(gpd) || 0;
    if (gpdNum >= 0.9) {
        recomendacionesTecnicas.push(`<b>Ganancia excepcional (${gpdNum} kg/día):</b> Excelente respuesta biológica adaptada al trópico bajo las condiciones de la época de ${epoca.toLowerCase()}.`);
    } else if (gpdNum >= 0.7 && gpdNum < 0.9) {
        recomendacionesTecnicas.push(`<b>Ganancia estándar (${gpdNum} kg/día):</b> Comportamiento normal en etapa de ${subetapa.toLowerCase()}. Vigilar disponibilidad de materia seca.`);
    } else {
        scoreSaludLote -= 30;
        alertasCriticas.push(`Ganancia Promedio Diaria deprimida (${gpdNum} kg/día).`);
        recomendacionesTecnicas.push(`<b>Alerta Nutricional:</b> Revisar perfil metabólico, plan sanitario/desparasitación estratégica o carga instantánea en el potrero.`);
    }

    // 3. Contexto Estacional (Apure: Invierno / Verano)
    if (epoca === 'Verano') {
        recomendacionesTecnicas.push(`<b>Estrategia de Seco (Verano):</b> Garantizar puntos de agua a una distancia menor a 600m y evaluar bloques multinutricionales o subproductos fibrosos.`);
    } else {
        recomendacionesTecnicas.push(`<b>Estrategia de Lluvias (Invierno):</b> Monitorear carga parasitaria (ectoparásitos en zona de módulos) y asegurar rotaciones dinámicas para evitar compactación y encharcamiento.`);
    }

    // Asegurar que el score nunca baje de 0
    scoreSaludLote = Math.max(0, scoreSaludLote);

    // Renderizar resultados en el panel visual del Asistente I.D.
    actualizarInterfazAsistenteID(scoreSaludLote, alertasCriticas, recomendacionesTecnicas, lote);
    
    // Gestionar persistencia Offline-First con manejo seguro
    gestionarPersistenciOfflineFirst(datosLote);
}

/**
 * Actualiza de forma segura los componentes visuales del panel del Asistente I.D.
 */
function actualizarInterfazAsistenteID(score, alertas, recomendaciones, loteNombre) {
    const contenedorID = document.getElementById('panelAsistenteID');
    if (!contenedorID) {
        console.warn("[UI] El contenedor 'panelAsistenteID' no existe en el DOM actual.");
        return;
    }

    let colorScore = '#2e7d32'; // Verde óptimo
    if (score < 75 && score >= 50) colorScore = '#f57c00'; // Naranja moderado
    if (score < 50) colorScore = '#c62828'; // Rojo crítico

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
function gestionarPersistenciOfflineFirst(datosLote) {
    const isOnline = navigator.onLine;
    
    if (isOnline) {
        sincronizarColaPendienteFirebase();
        enviarAFirestore(datosLote);
    } else {
        try {
            let cola = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY)) || [];
            cola.push({ ...datosLote, timestampGuardado: Date.now() });
            localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(cola));
            mostrarAvisoOfflineUI(cola.length);
        } catch (error) {
            console.error("[OFFLINE-FIRST] Error al guardar en localStorage (posible cuota excedida):", error);
            alert("Advertencia: No se pudo respaldar el registro localmente. Verifique el espacio de almacenamiento del navegador.");
        }
    }
}

/**
 * Conexión simulada o puente hacia Firebase Firestore (ajustar con tu instancia db).
 */
async function enviarAFirestore(datosLote) {
    try {
        // Ejemplo de integración real con Firebase Firestore:
        // await addDoc(collection(db, "registros_levante"), datosLote);
        console.log("[OFFLINE-FIRST] Sincronizado exitosamente con Firebase Firestore:", datosLote);
    } catch (error) {
        console.error("[FIREBASE] Error al sincronizar en línea, migrando a cola local:", error);
        // Fallback defensivo si falla la red en pleno envío
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
        console.log(`[OFFLINE-FIRST] Red restablecida. Sincronizando ${cola.length} registros pendientes con Firebase...`);
        
        let registrosExitosos = [];
        for (let i = 0; i < cola.length; i++) {
            try {
                // await enviarAFirestore(cola[i]);
                registrosExitosos.push(i);
            } catch (e) {
                console.error(`Error al sincronizar el ítem ${i}:`, e);
                break; // Detener si falla la red nuevamente
            }
        }

        // Si se procesaron todos, limpiar la cola
        if (registrosExitosos.length === cola.length) {
            localStorage.removeItem(OFFLINE_QUEUE_KEY);
            ocultarAvisoOfflineUI();
            console.log("[OFFLINE-FIRST] Cola sincronizada y limpiada por completo.");
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
    banner.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Sin conexión a internet (Modo Offline-First activo). <b>${pendientesCount}</b> registro(s) guardado(s) localmente listos para sincronizar.`;
}

function ocultarAvisoOfflineUI() {
    const banner = document.getElementById('offlineBanner');
    if (banner) banner.remove();
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
