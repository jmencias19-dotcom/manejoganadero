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
    query,  
    orderBy  
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Credenciales oficiales de Firebase para Hato Laguna Brava
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

const COL_HISTORIAL = "historial_rotaciones_indefinido_hl";

// Catálogo Oficial de los 20 Potreros de Hato Laguna Brava (Áreas en Hectáreas)
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
 * Motor analítico en tiempo real que procesa la memoria indefinida 
 * y alimenta el sistema predictivo de rutas de pastoreo con filtros avanzados.
 */
function sincronizarHistorialIndefinido() {
    const contenedorMatriz = document.getElementById('matriz-historial-container');
    const panelRecomendaciones = document.getElementById('ai-recomendacion-rutas');
    if (!contenedorMatriz && !panelRecomendaciones) return;

    const q = query(collection(db, COL_HISTORIAL), orderBy("fechaVaciadoReal", "desc"));

    onSnapshot(q, (snapshot) => {
        let historialesPorPotrero = {};

        CATALOGO_POTREROS.forEach(cp => {
            historialesPorPotrero[cp.potrero] = {
                area: cp.area,
                totalCiclosAcumulados: 0,
                acumuladoCargaHa: 0,
                ultimoVaciado: 'Sin registro histórico previo',
                especieUltima: 'BOVINOS',
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
                
                if (data.fechaVaciadoReal) {
                    historialesPorPotrero[pot].ultimoVaciado = data.fechaVaciadoReal;
                    historialesPorPotrero[pot].especieUltima = data.especie || 'BOVINOS';
                }
            }
        });

        let potrerosParaRuta = [];

        Object.keys(historialesPorPotrero).forEach(nombrePotrero => {
            const h = historialesPorPotrero[nombrePotrero];
            const cargaHistoricaPromedio = h.totalCiclosAcumulados > 0 ? (h.acumuladoCargaHa / h.totalCiclosAcumulados) : 0;
            
            let diasDescansoReal = 999;
            if (h.ultimoVaciado !== 'Sin registro histórico previo') {
                const diffTime = Math.abs(new Date() - new Date(h.ultimoVaciado));
                diasDescansoReal = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }

            potrerosParaRuta.push({
                potrero: nombrePotrero,
                area: h.area,
                diasDescanso: diasDescansoReal,
                ciclos: h.totalCiclosAcumulados,
                cargaHistorica: cargaHistoricaPromedio,
                especie: h.especieUltima,
                ultimoVaciado: h.ultimoVaciado
            });
        });

        potrerosParaRuta.sort((a, b) => b.diasDescanso - a.diasDescanso);

        // 1. Renderizar Panel Superior de Inteligencia, Filtros y Buscador
        if (panelRecomendaciones) {
            const opt1 = potrerosParaRuta[0] || { potrero: 'Macanillal', diasDescanso: 60 };
            const opt2 = potrerosParaRuta[1] || { potrero: 'El Galpón', diasDescanso: 45 };

            panelRecomendaciones.innerHTML = `
                <div style="background: #e8f5e9; border-left: 4px solid #2e7d32; padding: 14px; border-radius: 6px; font-size: 0.88rem; margin-bottom: 15px;">
                    <div style="font-weight: bold; color: #1b5e20; margin-bottom: 6px; font-size: 0.95rem;">
                        <i class="fa-solid fa-brain"></i> Inteligencia de Rotación y Disponibilidad (Hato Laguna Brava):
                    </div>
                    <p style="margin: 0 0 10px 0; color: #263238; font-size: 0.84rem;">
                        Rutas óptimas sugeridas: <b>1° ${opt1.potrero}</b> (${opt1.diasDescanso === 999 ? 'Disponible' : opt1.diasDescanso + ' días desc.'}) | <b>2° ${opt2.potrero}</b> (${opt2.diasDescanso === 999 ? 'Disponible' : opt2.diasDescanso + ' días desc.'})
                    </p>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 10px;">
                        <input type="text" id="busqueda-potrero-input" placeholder="🔍 Buscar potrero..." style="padding: 6px 10px; border: 1px solid #c8e6c9; border-radius: 4px; font-size: 0.82rem; background: #fff;">
                        <select id="filtro-especie-hist" style="padding: 6px; border: 1px solid #c8e6c9; border-radius: 4px; font-size: 0.82rem; background: #fff;">
                            <option value="">Todas las Especies</option>
                            <option value="BOVINOS">Bovinos</option>
                            <option value="BUFALINOS">Bufalinos</option>
                        </select>
                        <select id="filtro-disponibilidad" style="padding: 6px; border: 1px solid #c8e6c9; border-radius: 4px; font-size: 0.82rem; background: #fff;">
                            <option value="">Filtro Disponibilidad</option>
                            <option value="listos">Listos (> 45 días descanso)</option>
                            <option value="recuperacion">En Recuperación (< 45 días)</option>
                        </select>
                    </div>

                    <div id="lista-disponibilidad-optimizada" style="max-height: 200px; overflow-y: auto; padding-right: 4px;"></div>
                </div>
            `;

            const renderListaFiltrada = (filtroTexto = "", filtroEsp = "", filtroDisp = "") => {
                const contenedorLista = document.getElementById('lista-disponibilidad-optimizada');
                if (!contenedorLista) return;

                const filtrados = potrerosParaRuta.filter(p => {
                    const matchTexto = p.potrero.toLowerCase().includes(filtroTexto.toLowerCase());
                    const matchEsp = filtroEsp ? p.especie === filtroEsp : true;
                    let matchDisp = true;
                    if (filtroDisp === 'listos') matchDisp = p.diasDescanso >= 45;
                    if (filtroDisp === 'recuperacion') matchDisp = p.diasDescanso < 45 && p.diasDescanso !== 999;
                    return matchTexto && matchEsp && matchDisp;
                });

                if (filtrados.length === 0) {
                    contenedorLista.innerHTML = `<p style="text-align: center; color: #555; font-style: italic; margin: 8px 0;">No se encontraron potreros con los criterios seleccionados.</p>`;
                    return;
                }

                let htmlItems = '';
                filtrados.forEach((p, index) => {
                    let badgeColor = p.diasDescanso >= 45 ? '#2e7d32' : (p.diasDescanso >= 30 ? '#f57c00' : '#c62828');
                    let textoDescanso = p.diasDescanso === 999 ? 'Disponible (Sin historial)' : `${p.diasDescanso} días de descanso`;
                    
                    htmlItems += `
                        <div style="background: #ffffff; border: 1px solid #c8e6c9; border-radius: 4px; padding: 6px 10px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem;">
                            <div>
                                <b>#${index + 1} - ${p.potrero}</b> (${p.area} ha) | <span style="color: ${badgeColor}; font-weight: 600;">${textoDescanso}</span>
                            </div>
                            <span style="background: #e0f2f1; color: #00695c; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${p.especie}</span>
                        </div>
                    `;
                });
                contenedorLista.innerHTML = htmlItems;
            };

            renderListaFiltrada();

            document.getElementById('busqueda-potrero-input').addEventListener('input', (e) => {
                renderListaFiltrada(e.target.value, document.getElementById('filtro-especie-hist').value, document.getElementById('filtro-disponibilidad').value);
            });
            document.getElementById('filtro-especie-hist').addEventListener('change', (e) => {
                renderListaFiltrada(document.getElementById('busqueda-potrero-input').value, e.target.value, document.getElementById('filtro-disponibilidad').value);
            });
            document.getElementById('filtro-disponibilidad').addEventListener('change', (e) => {
                renderListaFiltrada(document.getElementById('busqueda-potrero-input').value, document.getElementById('filtro-especie-hist').value, e.target.value);
            });
        }

        // 2. Renderizar la Matriz de Estado General Inferior
        if (contenedorMatriz) {
            let htmlMatriz = '';
            potrerosParaRuta.forEach(h => {
                htmlMatriz += `
                    <div style="background: #ffffff; border: 1px solid #d1e7dd; border-radius: 8px; padding: 12px; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span style="font-weight: 700; color: #0f5132; font-size: 0.95rem;">
                                <i class="fa-solid fa-database"></i> ${h.potrero} (${h.area} ha)
                            </span>
                            <span style="background: #d1e7dd; color: #0f5132; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">
                                Memoria Acumulada: ${h.ciclos} Ciclos
                            </span>
                        </div>
                        <div style="font-size: 0.82rem; color: #495057; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                            <div><b>Carga Histórica Media:</b> ${h.cargaHistorica.toFixed(2)} UGM/ha</div>
                            <div><b>Días de Descanso Actual:</b> <span style="color: #198754; font-weight: 700;">${h.diasDescanso === 999 ? 'N/D' : h.diasDescanso + ' días'}</span></div>
                            <div style="grid-column: span 2;"><b>Último Vaciado Registrado:</b> ${h.ultimoVaciado}</div>
                        </div>
                    </div>
                `;
            });
            contenedorMatriz.innerHTML = htmlMatriz;
        }

    }, (error) => {
        console.error("Error al sincronizar la memoria histórica indefinida:", error);
    });
}

/**
 * Función global exportable que se ejecuta automáticamente al vaciar un potrero.
 * Archiva de forma permanente e indefinida el récord del ciclo en Firestore.
 */
export async function archivarCicloAlVaciarse(potreroNombre, datosLoteActivo) {
    try {
        const fechaVaciadoReal = new Date().toISOString().split('T')[0];
        const fechaIngreso = datosLoteActivo.fechaIngreso || fechaVaciadoReal;
        
        const diffTime = Math.abs(new Date(fechaVaciadoReal) - new Date(fechaIngreso));
        const diasOcupacion = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        const registroHistoricoPermanente = {
            potrero: potreroNombre,
            areaHa: datosLoteActivo.areaHa || 1,
            especie: datosLoteActivo.especie || 'BOVINOS',
            categoriaPrincipal: datosLoteActivo.nombreCategoria || datosLoteActivo.categoria || 'Lote Mixto',
            totalCabezasInicial: datosLoteActivo.cabezasIniciales || datosLoteActivo.cabezas || 0,
            cargaPromedioHa: datosLoteActivo.cargaHa || 0,
            fechaIngreso: fechaIngreso,
            fechaVaciadoReal: fechaVaciadoReal,
            diasOcupacionReales: diasOcupacion,
            temporada: datosLoteActivo.temporada || 'General',
            observacionesFinales: datosLoteActivo.observaciones || 'Cierre automático por vaciado total de potrero',
            timestampArchivo: Date.now()
        };

        await addDoc(collection(db, COL_HISTORIAL), registroHistoricoPermanente);
        console.log(`[HISTÓRICO INDEFINIDO] El potrero ${potreroNombre} archivó su ciclo exitosamente.`);
    } catch (error) {
        console.error("Error al archivar el ciclo en el histórico indefinido:", error);
    }
}
