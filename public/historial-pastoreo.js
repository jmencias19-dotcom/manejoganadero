/* ==========================================================================
   Módulo: Historial, Memoria Indefinida y Rutas de Pastoreo Inteligentes
   Hato Laguna Brava - Apure, Venezuela
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {  
    getFirestore,  
    collection,  
    addDoc,  
    onSnapshot,  
    doc,  
    getDoc,  
    deleteDoc,  
    query,  
    orderBy,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyADbn4gV6ROrppvanBM835IRyX3U8wdAnk",
    authDomain: "hato-laguna-brava.firebaseapp.com",
    projectId: "hato-laguna-brava",
    storageBucket: "hato-laguna-brava.firebasestorage.app",
    messagingSenderId: "1053099733476",
    appId: "1:1053099733476:web:624514d41b08d1b347d7f1",
    measurementId: "G-2E517DTZFS"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COL_ACTUAL = "hato_potreros_actual";
const COL_HISTORIAL = "historial_rotaciones_indefinido_hl";

// Catálogo Oficial de los 20 Potreros de Hato Laguna Brava
const CATALOGO_POTREROS = [
    { potrero: "Macanillal", area: 432 },
    { potrero: "El Galpón", area: 569 },
    { potrero: "Mata del Muerto", area: 80 },
    { potrero: "Manguito", area: 234 },
    { potrero: "Mata de Piña", area: 205 },
    { potrero: "Las Rallas", area: 102 },
    { potrero: "Potrero del Medio", area: 703 },
    { potrero: "Cuatro Esquinas", area: 77 },
    { potrero: "Paulero", area: 418 },
    { potrero: "Jobo Gacho", area: 422 },
    { potrero: "Curva del Peligro", area: 40 },
    { potrero: "Módulo A", area: 36 },
    { potrero: "Módulo B", area: 36 },
    { potrero: "Módulo C", area: 36 },
    { potrero: "Módulo D", area: 36 },
    { potrero: "Módulo E", area: 156 },
    { potrero: "Saladillal", area: 125 },
    { potrero: "Carretera", area: 142 },
    { potrero: "María del Carmen", area: 32 },
    { potrero: "Casa", area: 26 }
];

document.addEventListener('DOMContentLoaded', () => {
    sincronizarHistorialIndefinido();
});

/**
 * Motor analítico que procesa la memoria indefinida y alimenta el sistema de rutas
 */
function sincronizarHistorialIndefinido() {
    const contenedorMatriz = document.getElementById('matriz-historial-container');
    const panelRecomendaciones = document.getElementById('ai-recomendacion-rutas');
    if (!contenedorMatriz) return;

    // Consulta global al histórico indefinido ordenado por fecha de vaciado real
    const q = query(collection(db, COL_HISTORIAL), orderBy("fechaVaciadoReal", "desc"));

    onSnapshot(q, (snapshot) => {
        contenedorMatriz.innerHTML = '';
        let historialesPorPotrero = {};

        // Inicializar estructura para los 20 potreros con almacenamiento a largo plazo
        CATALOGO_POTREROS.forEach(cp => {
            historialesPorPotrero[cp.potrero] = {
                area: cp.area,
                totalCiclosAcumulados: 0,
                acumuladoCargaHa: 0,
                ultimoVaciado: 'Sin registro histórico previo',
                historialCiclos: []
            };
        });

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const pot = data.potrero;
            if (historialesPorPotrero[pot]) {
                historialesPorPotrero[pot].totalCiclosAcumulados++;
                historialesPorPotrero[pot].acumuladoCargaHa += (data.cargaPromedioHa || 0);
                historialesPorPotrero[pot].historialCiclos.push(data);
                
                // Tomar la fecha de vaciado más reciente como referencia de descanso actual
                if (data.fechaVaciadoReal) {
                    historialesPorPotrero[pot].ultimoVaciado = data.fechaVaciadoReal;
                }
            }
        });

        let htmlMatriz = '';
        let potrerosParaRuta = [];

        Object.keys(historialesPorPotrero).forEach(nombrePotrero => {
            const h = historialesPorPotrero[nombrePotrero];
            const cargaHistoricaPromedio = h.totalCiclosAcumulados > 0 ? (h.acumuladoCargaHa / h.totalCiclosAcumulados) : 0;
            
            // Cálculo exacto de días de descanso transcurridos desde el último vaciado real
            let diasDescansoReal = 0;
            if (h.ultimoVaciado !== 'Sin registro histórico previo') {
                const diffTime = Math.abs(new Date() - new Date(h.ultimoVaciado));
                diasDescansoReal = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            } else {
                diasDescansoReal = 999; // Máxima prioridad si nunca ha sido usado recientemente
            }

            potrerosParaRuta.push({
                potrero: nombrePotrero,
                diasDescanso: diasDescansoReal,
                ciclos: h.totalCiclosAcumulados,
                cargaHistorica: cargaHistoricaPromedio,
                area: h.area
            });

            htmlMatriz += `
                <div style="background: #ffffff; border: 1px solid #d1e7dd; border-radius: 8px; padding: 12px; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span style="font-weight: 700; color: #0f5132; font-size: 0.95rem;">
                            <i class="fa-solid fa-database"></i> ${nombrePotrero} (${h.area} ha)
                        </span>
                        <span style="background: #d1e7dd; color: #0f5132; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">
                            Memoria Acumulada: ${h.totalCiclosAcumulados} Ciclos
                        </span>
                    </div>
                    <div style="font-size: 0.82rem; color: #495057; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                        <div><b>Carga Histórica Media:</b> ${cargaHistoricaPromedio.toFixed(2)} UGM/ha</div>
                        <div><b>Días de Descanso Actual:</b> <span style="color: #198754; font-weight: 700;">${diasDescansoReal === 999 ? 'N/D' : diasDescansoReal + ' días'}</span></div>
                        <div style="grid-column: span 2;"><b>Último Vaciado Registrado:</b> ${h.ultimoVaciado}</div>
                    </div>
                </div>
            `;
        });

        contenedorMatriz.innerHTML = htmlMatriz;

        // Motor de Inteligencia Predictiva basado en el Histórico Indefinido
        if (panelRecomendaciones) {
            // Ordenar potreros priorizando los que tienen mayor tiempo de reposo biológico
            potrerosParaRuta.sort((a, b) => b.diasDescanso - a.diasDescanso);
            const opt1 = potrerosParaRuta[0] || { potrero: 'Macanillal', diasDescanso: 60 };
            const opt2 = potrerosParaRuta[1] || { potrero: 'El Galpón', diasDescanso: 45 };

            panelRecomendaciones.innerHTML = `
                <div style="background: #e8f5e9; border-left: 4px solid #2e7d32; padding: 12px; border-radius: 4px; font-size: 0.88rem;">
                    <div style="font-weight: bold; color: #1b5e20; margin-bottom: 4px;">
                        <i class="fa-solid fa-brain"></i> Ruta de Pastoreo Óptima (Inteligencia Histórica):
                    </div>
                    <p style="margin: 0 0 6px 0; color: #263238;">
                        Cruzando la memoria acumulada de los ciclos de vaciado en Hato Laguna Brava, la recomendación de rutas para el próximo ingreso es:
                    </p>
                    <ul style="margin: 0; padding-left: 18px; color: #1b5e20;">
                        <li><b>Principal:</b> <b>${opt1.potrero}</b> (${opt1.diasDescanso === 999 ? 'Disponible permanente' : opt1.diasDescanso + ' días de descanso acumulado'}).</li>
                        <li><b>Alternativa:</b> <b>${opt2.potrero}</b> (${opt2.diasDescanso === 999 ? 'Disponible permanente' : opt2.diasDescanso + ' días de descanso acumulado'}).</li>
                    </ul>
                </div>
            `;
        }

    }, (error) => {
        console.error("Error al sincronizar la memoria histórica indefinida:", error);
    });
}

/**
 * Función global que debe invocarse en la app cuando un potrero es VACIADO (cabezas = 0)
 * Esta función toma todo el récord del potrero activo y lo archiva indefinidamente en el histórico.
 */
export async function archivarCicloAlVaciarse(potreroNombre, datosLoteActivo) {
    try {
        const fechaVaciadoReal = new Date().toISOString().split('T')[0];
        
        // Calcular días reales transcurridos desde el ingreso hasta el vaciado completo
        const diffTime = Math.abs(new Date(fechaVaciadoReal) - new Date(datosLoteActivo.fechaIngreso || fechaVaciadoReal));
        const diasOcupacion = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        const registroHistoricoPermanente = {
            potrero: potreroNombre,
            areaHa: datosLoteActivo.areaHa,
            especie: datosLoteActivo.especie || 'BOVINOS',
            categoriaPrincipal: datosLoteActivo.nombreCategoria || 'Lote Mixto',
            totalCabezasInicial: datosLoteActivo.cabezasIniciales || datosLoteActivo.cabezas,
            cargaPromedioHa: datosLoteActivo.cargaHa || 0,
            fechaIngreso: datosLoteActivo.fechaIngreso || fechaVaciadoReal,
            fechaVaciadoReal: fechaVaciadoReal,
            diasOcupacionReales: diasOcupacion,
            temporada: datosLoteActivo.temporada || 'General',
            observacionesFinales: datosLoteActivo.observaciones || 'Cierre por vaciado de potrero',
            timestampArchivo: Date.now()
        };

        // Guardar en la colección de memoria indefinida
        await addDoc(collection(db, COL_HISTORIAL), registroHistoricoPermanente);
        console.log(`[HISTÓRICO INDEFINIDO] El potrero ${potreroNombre} archivó su ciclo de forma exitosa tras su vaciado.`);
    } catch (error) {
        console.error("Error al archivar el ciclo en el histórico indefinido:", error);
    }
}
