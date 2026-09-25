import { db } from './db.js';

export async function sincronizarHistorialIndefinidoDexie() {
    const contenedorMatriz = document.getElementById('matriz-historial-container');
    const panelRecomendaciones = document.getElementById('ai-recomendacion-rutas');
    if (!contenedorMatriz && !panelRecomendaciones) return;

    // Catálogo oficial de potreros de Hato Laguna Brava con sus áreas
    const CATALOGO_POTREROS = [
        { potrero: "Macanillal", area: 432 }, { potrero: "El Galpón", area: 569 },
        { potrero: "Mata del Muerto", area: 80 }, { potrero: "Manguito", area: 234 },
        { potrero: "Mata de Piña", area: 205 }, { potrero: "Las Rallas", area: 102 },
        { potrero: "Potrero del Medio", area: 703 }, { potrero: "Cuatro Esquinas", area: 77 },
        { potrero: "Paulero", area: 418 }, { potrero: "Jobo Gacho", area: 422 },
        { potrero: "Curva del Peligro", area: 40 }, { potrero: "Módulo A", area: 36 },
        { potrero: "Módulo B", area: 36 }, { potrero: "Módulo C", area: 36 },
        { potrero: "Módulo D", area: 36 }, { potrero: "Módulo E", area: 156 },
        { potrero: "Saladillal", area: 125 }, { potrero: "Carretera", area: 142 },
        { potrero: "María del Carmen", area: 32 }, { potrero: "Casa", area: 26 }
    ];

    try {
        // 1. Obtener todos los registros del historial de pastoreo local
        const historialRegistros = await db.historial_pastoreo.toArray();

        let historialesPorPotrero = {};

        // Inicializar estructura por potrero
        CATALOGO_POTREROS.forEach(cp => {
            historialesPorPotrero[cp.potrero] = {
                area: cp.area,
                totalCiclosAcumulados: 0,
                acumuladoCargaHa: 0,
                ultimoVaciado: 'Sin registro histórico previo',
                especieUltima: 'GENERAL'
            };
        });

        // Procesar registros locales
        historialRegistros.forEach(data => {
            const pot = data.potrero_id; // o data.potrero según guardes el nombre/id
            if (historialesPorPotrero[pot]) {
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
                            <b>Ciclos:</b> ${h.ciclos} | <b>Descanso:</b> ${h.diasDescanso === 999 ? 'N/D' : h.diasDescanso + ' días'}
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
function sincronizarHistorialIndefinido() {
    const contenedorMatriz = document.getElementById('matriz-historial-container');
    const panelRecomendaciones = document.getElementById('ai-recomendacion-rutas');
    if (!contenedorMatriz && !panelRecomendaciones) return;

    const CATALOGO_POTREROS = [
        { potrero: "Macanillal", area: 432 }, { potrero: "El Galpón", area: 569 },
        { potrero: "Mata del Muerto", area: 80 }, { potrero: "Manguito", area: 234 },
        { potrero: "Mata de Piña", area: 205 }, { potrero: "Las Rallas", area: 102 },
        { potrero: "Potrero del Medio", area: 703 }, { potrero: "Cuatro Esquinas", area: 77 },
        { potrero: "Paulero", area: 418 }, { potrero: "Jobo Gacho", area: 422 },
        { potrero: "Curva del Peligro", area: 40 }, { potrero: "Módulo A", area: 36 },
        { potrero: "Módulo B", area: 36 }, { potrero: "Módulo C", area: 36 },
        { potrero: "Módulo D", area: 36 }, { potrero: "Módulo E", area: 156 },
        { potrero: "Saladillal", area: 125 }, { potrero: "Carretera", area: 142 },
        { potrero: "María del Carmen", area: 32 }, { potrero: "Casa", area: 26 }
    ];

    const q = query(collection(db, COL_HISTORIAL), orderBy("fechaVaciadoReal", "desc"));

    onSnapshot(q, (snapshot) => {
        let historialesPorPotrero = {};

        CATALOGO_POTREROS.forEach(cp => {
            historialesPorPotrero[cp.potrero] = {
                area: cp.area,
                totalCiclosAcumulados: 0,
                acumuladoCargaHa: 0,
                ultimoVaciado: 'Sin registro histórico previo',
                especieUltima: 'GENERAL'
            };
        });

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const pot = data.potrero;
            if (historialesPorPotrero[pot]) {
                historialesPorPotrero[pot].totalCiclosAcumulados++;
                historialesPorPotrero[pot].acumuladoCargaHa += (data.cargaPromedioHa || 0);
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
                especie: h.especieUltima
            });
        });

        // Ordenar inicialmente por mayor tiempo de descanso (pastizal con más recuperación)
        potrerosParaRuta.sort((a, b) => b.diasDescanso - a.diasDescanso);

        // Renderizar Panel Superior de Inteligencia y Filtros Integrados
        if (panelRecomendaciones) {
            panelRecomendaciones.innerHTML = `
                <div style="background: #e8f5e9; border-left: 4px solid #2e7d32; padding: 14px; border-radius: 6px; font-size: 0.88rem; margin-bottom: 15px;">
                    <div style="font-weight: bold; color: #1b5e20; margin-bottom: 8px; font-size: 0.95rem;">
                        <i class="fa-solid fa-brain"></i> Inteligencia de Rotación y Disponibilidad de Potreros:
                    </div>
                    
                    <!-- Barra de Filtros Avanzada -->
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
                        <!-- Se inyecta dinámicamente la lista filtrada -->
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

            // Eventos para los filtros interactivos
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

        // Renderizar la Matriz de Estado General Inferior
        if (contenedorMatriz) {
            let htmlMatriz = '';
            potrerosParaRuta.forEach(h => {
                htmlMatriz += `
                    <div style="background: #ffffff; border: 1px solid #d1e7dd; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
                        <div style="font-weight: 700; color: #0f5132; font-size: 0.95rem;">
                            <i class="fa-solid fa-database"></i> ${h.potrero} (${h.area} ha)
                        </div>
                        <div style="font-size: 0.82rem; color: #495057; margin-top: 4px;">
                            <b>Ciclos:</b> ${h.ciclos} | <b>Descanso:</b> ${h.diasDescanso === 999 ? 'N/D' : h.diasDescanso + ' días'}
                        </div>
                    </div>
                `;
            });
            contenedorMatriz.innerHTML = htmlMatriz;
        }
    });
}
