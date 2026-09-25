import { db } from './db.js';

/* ==========================================================================
   Módulo: Matrices de Conversión Ganadera Oficiales (Hato Laguna Brava)
   Factores de Unidad Animal (UA / UGM) - Bovinos y Bufalinos
   ========================================================================== */

export const CATEGORIAS_BOVINOS = [
    { id: 'vacas_criando', nombre: 'Vacas Criando', factor: 1.0 },
    { id: 'vacas_criando_pre', nombre: 'Vacas Criando Preñada', factor: 1.0 },
    { id: 'vacas_vacia', nombre: 'Vacas Vacías', factor: 1.0 },
    { id: 'vacas_prenadas', nombre: 'Vacas Preñadas', factor: 1.0 },
    { id: 'vacas_descarte', nombre: 'Vacas Descarte', factor: 1.0 },
    { id: 'novillas_vacia', nombre: 'Novillas Vacías', factor: 0.8 },
    { id: 'novillas_descarte', nombre: 'Novillas Descarte', factor: 0.8 },
    { id: 'novillas_prenada', nombre: 'Novillas Preñadas', factor: 0.8 },
    { id: 'novillas_monta', nombre: 'Novillas en Monta', factor: 0.8 },
    { id: 'mautes', nombre: 'Mautes', factor: 0.5 },
    { id: 'mautas', nombre: 'Mautas', factor: 0.5 },
    { id: 'becerros', nombre: 'Becerros', factor: 0.25 },
    { id: 'becerras', nombre: 'Becerras', factor: 0.25 },
    { id: 'toros_padrotes', nombre: 'Toros Padrotes', factor: 1.25 },
    { id: 'toros_padres_descarte', nombre: 'Toros Padres Descarte', factor: 1.25 }
];

export const CATEGORIAS_BUFALINOS = [
    { id: 'bufalas_criando', nombre: 'Búfalas Criando', factor: 1.2 },
    { id: 'bufalas_criando_pre', nombre: 'Búfalas Criando Preñada', factor: 1.2 },
    { id: 'bufalas_vacia', nombre: 'Búfalas Vacías', factor: 1.2 },
    { id: 'bufalas_prenadas', nombre: 'Búfalas Preñadas', factor: 1.2 },
    { id: 'bufalas_descarte', nombre: 'Búfalas Descarte', factor: 1.2 },
    { id: 'buvillas_vacia', nombre: 'Buvillas Vacías', factor: 0.95 },
    { id: 'buvillas_descarte', nombre: 'Buvillas Descarte', factor: 0.95 },
    { id: 'buvillas_prenada', nombre: 'Buvillas Preñadas', factor: 0.95 },
    { id: 'buvillas_monta', nombre: 'Buvillas en Monta', factor: 0.95 },
    { id: 'baute', nombre: 'Bautes', factor: 0.6 },
    { id: 'bauta', nombre: 'Bautas', factor: 0.6 },
    { id: 'bucerros', nombre: 'Bucerros', factor: 0.3 },
    { id: 'bucerras', nombre: 'Bucerras', factor: 0.3 },
    { id: 'bufalos_padrote', nombre: 'Búfalos Padrotes', factor: 1.5 },
    { id: 'bufalos_padres_descarte', nombre: 'Búfalos Padres Descarte', factor: 1.5 }
];

/**
 * Retorna el factor de Unidad Animal (UA / UGM) según la especie y categoría.
 */
export function obtenerFactorUA(especie, categoriaId) {
    const matrices = {
        'BOVINOS': CATEGORIAS_BOVINOS,
        'BUFALINOS': CATEGORIAS_BUFALINOS
    };

    const catalogo = matrices[(especie || 'BOVINOS').toUpperCase()] || CATEGORIAS_BOVINOS;
    const encontrada = catalogo.find(c => c.id === categoriaId);
    
    return encontrada ? encontrada.factor : 1.0; 
}

export async function sincronizarHistorialIndefinidoDexie() {
    const contenedorMatriz = document.getElementById('matriz-historial-container');
    const panelRecomendaciones = document.getElementById('ai-recomendacion-rutas');
    if (!contenedorMatriz && !panelRecomendaciones) return;

    try {
        // 1. Obtener todos los registros del historial de pastoreo local (Dexie)
        const historialRegistros = await db.historial_pastoreo.toArray();

        let historialesPorPotrero = {};

        // Procesar registros locales desde Dexie
        historialRegistros.forEach(data => {
            const pot = data.potrero_id || data.potrero; 
            if (pot) {
                if (!historialesPorPotrero[pot]) {
                    historialesPorPotrero[pot] = {
                        area: data.area || 0,
                        totalCiclosAcumulados: 0,
                        acumuladoCargaHa: 0,
                        ultimoVaciado: 'Sin registro histórico previo',
                        especieUltima: 'GENERAL'
                    };
                }
                historialesPorPotrero[pot].totalCiclosAcumulados++;
                historialesPorPotrero[pot].acumuladoCargaHa += (data.carga_instantanea_UA_ha || data.cargaPromedioHa || 0);
                if (data.fecha_salida || data.fechaVaciadoReal) {
                    historialesPorPotrero[pot].ultimoVaciado = data.fecha_salida || data.fechaVaciadoReal;
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
                especie: h.especieUltima
            });
        });

        // Ordenar por mayor tiempo de descanso
        potrerosParaRuta.sort((a, b) => b.diasDescanso - a.diasDescanso);

        // 2. Renderizar Panel Superior de Inteligencia y Filtros
        if (panelRecomendaciones) {
            panelRecomendaciones.innerHTML = `
                <div style="background: #e8f5e9; border-left: 4px solid #2e7d32; padding: 14px; border-radius: 6px; font-size: 0.88rem; margin-bottom: 15px;">
                    <div style="font-weight: bold; color: #1b5e20; margin-bottom: 8px; font-size: 0.95rem;">
                        <i class="fa-solid fa-brain"></i> Inteligencia de Rotación y Disponibilidad (Hato Laguna Brava):
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 12px;">
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

                    <div id="lista-disponibilidad-optimizada" style="max-height: 220px; overflow-y: auto; padding-right: 4px;">
                        <!-- Inyección dinámica -->
                    </div>
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
                    if (filtroDisp === 'recuperacion') matchDisp = p.diasDescanso < 45;
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

        // 3. Renderizar Matriz de Estado General
        if (contenedorMatriz) {
            let htmlMatriz = '';
            potrerosParaRuta.forEach(h => {
                htmlMatriz += `
                    <div style="background: #ffffff; border: 1px solid #d1e7dd; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
                        <div style="font-weight: 700; color: #0f5132; font-size: 0.95rem;">
                            <i class="fa-solid fa-database"></i> ${h.potrero} (${h.area} ha)
                        </div>
                        <div style="font-size: 0.82rem; color: #495057; margin-top: 4px;">
                            <b>Ciclos:</b> ${h.ciclos} | <b>Descanso:</b> ${h.diasDescanso === 999 ? 'N/D' : h.diasDescanso + ' days'}
                        </div>
                    </div>
                `;
            });
            contenedorMatriz.innerHTML = htmlMatriz;
        }

    } catch (error) {
        console.error("Error al sincronizar el historial de potreros desde Dexie:", error);
    }
}

// Inicialización automática al cargar el DOM
document.addEventListener('DOMContentLoaded', async () => {
    await sincronizarHistorialIndefinidoDexie();
});
