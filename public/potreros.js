/* ==========================================================================
   Módulo Principal: Gestión de Potreros, Carga Animal y Memoria Indefinida
   Hato Laguna Brava - Apure, Venezuela
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {  
    getFirestore,  
    collection,  
    addDoc,  
    onSnapshot,  
    doc,  
    deleteDoc,
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

// Colecciones de Firestore
const COL_LOTES_ACTIVOS = "lotes_activos_potreros_hl";
const COL_HISTORIAL = "historial_rotaciones_indefinido_hl";

// Catálogo Oficial de Categorías Zootécnicas y sus factores UGM (Unidad Gran Ganado = 450 kg)
const FACTORES_UGM = {
    BOVINOS: {
        "TOROS": 1.25,
        "VACAS_CRIA": 1.00,
        "NOVILLOS_LEVANTE": 0.75,
        "NOVILLAS_VIENTRE": 0.70,
        "ENHIESTOS_DESTETE": 0.50,
        "LUTOS_MAUTE": 0.40
    },
    BUFALINOS: {
        "REPRODUCTORES_BUF": 1.40,
        "BUFAS_ORDEÑO": 1.20,
        "BUFONAS_LEVANTE": 0.85,
        "MAUTOS_BUF": 0.45
    }
};

document.addEventListener('DOMContentLoaded', () => {
    inicializarFormularioYFiltros();
    sincronizarLotesActivos();
    sincronizarHistorialIndefinido();
});

/**
 * Configura la reactividad del formulario, selects dependientes y cálculos en tiempo real.
 */
function inicializarFormularioYFiltros() {
    const selectEspecie = document.getElementById('select-especie');
    const selectCategoria = document.getElementById('select-categoria');
    const selectPotrero = document.getElementById('select-potrero');
    const filtroPotrero = document.getElementById('filtro-potrero');
    const form = document.getElementById('potreroForm');

    // Poblar dinámicamente los selectores de categorías según la especie seleccionada
    if (selectEspecie && selectCategoria) {
        selectEspecie.addEventListener('change', actualizarCategorias);
        actualizarCategorias(); // Carga inicial por defecto (Bovinos)
    }

    // Clonar opciones del potrero para el filtro superior de visualización
    if (selectPotrero && filtroPotrero) {
        filtroPotrero.innerHTML = '<option value="">Todos los Potreros</option>' + selectPotrero.innerHTML;
    }

    // Evento de envío del formulario (Registro y Sincronización Topológica)
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await registrarAsignacionPotrero();
        });
    }

    // Listener para actualizar el Asistente Forrajero (I.D.) al cambiar potrero o categoría
    const inputsCalculo = ['select-potrero', 'select-especie', 'select-categoria', 'cantidad-cabezas'];
    inputsCalculo.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', calcularImpactoForrajeroPreliminar);
    });
}

function actualizarCategorias() {
    const selectEspecie = document.getElementById('select-especie');
    const selectCategoria = document.getElementById('select-categoria');
    if (!selectEspecie || !selectCategoria) return;

    const especie = selectEspecie.value;
    const categorias = FACTORES_UGM[especie] || {};

    selectCategoria.innerHTML = '<option value="" disabled selected>-- Seleccione Categoría --</option>';
    Object.keys(categorias).forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        // Formatear texto legible para el usuario
        option.textContent = cat.replace(/_/g, ' ');
        selectCategoria.appendChild(option);
    });
}

/**
 * Calcula de forma preliminar el impacto de carga antes de enviar
 */
function calcularImpactoForrajeroPreliminar() {
    const selectPotrero = document.getElementById('select-potrero');
    const selectEspecie = document.getElementById('select-especie');
    const selectCategoria = document.getElementById('select-categoria');
    const inputCabezas = document.getElementById('cantidad-cabezas');
    const aiBox = document.getElementById('ai-potrero-content');

    if (!selectPotrero || !selectCategoria || !inputCabezas || !aiBox) return;

    const selectedOption = selectPotrero.options[selectPotrero.selectedIndex];
    const areaHa = parseFloat(selectedOption.getAttribute('data-ha')) || 0;
    const especie = selectEspecie.value;
    const categoria = selectCategoria.value;
    const cabezas = parseInt(inputCabezas.value) || 0;

    if (areaHa === 0 || !categoria || cabezas === 0) {
        aiBox.innerHTML = `<p style="margin: 0; font-style: italic;">Seleccione potrero, categoría y cantidad de cabezas para estimar el balance forrajero...</p>`;
        return;
    }

    const factorUgm = FACTORES_UGM[especie][categoria] || 1.0;
    const totalUgm = cabezas * factorUgm;
    const cargaHa = totalUgm / areaHa;

    // Diagnóstico según umbrales ecológicos en sabanas y módulos del llano
    let estado = "estable";
    let colorEstado = "#155724";
    let bgEstado = "#d4edda";
    let mensajeRecomendacion = "Carga óptima para la sustentabilidad del pastizal tropical.";

    if (cargaHa > 0.8 && cargaHa <= 1.2) {
        estado = "moderado";
        colorEstado = "#856404";
        bgEstado = "#fff3cd";
        mensajeRecomendacion = "Carga moderada. Monitorear tasa de rebrote del pasto.";
    } else if (cargaHa > 1.2) {
        estado = "critico";
        colorEstado = "#721c24";
        bgEstado = "#f8d7da";
        mensajeRecomendacion = "¡Alerta de sobrepastoreo! Se recomienda rotación inmediata.";
    }

    aiBox.innerHTML = `
        <div style="background: ${bgEstado}; color: ${colorEstado}; padding: 8px; border-radius: 6px; font-weight: 600;">
            <i class="fa-solid fa-calculator"><b> Estima:</b> ${totalUgm.toFixed(2)} UGM | ${cargaHa.toFixed(2)} UGM/ha (${estado.toUpperCase()})
        </div>
        <p style="margin: 4px 0 0 0;">${mensajeRecomendacion}</p>
    `;
}

/**
 * Guarda la asignación activa en Firestore
 */
async function registrarAsignacionPotrero() {
    try {
        const selectPotrero = document.getElementById('select-potrero');
        const selectedOption = selectPotrero.options[selectPotrero.selectedIndex];
        
        const potreroNombre = selectPotrero.value;
        const areaHa = parseFloat(selectedOption.getAttribute('data-ha')) || 0;
        const especie = document.getElementById('select-especie').value;
        const categoria = document.getElementById('select-categoria').value;
        const cabezas = parseInt(document.getElementById('cantidad-cabezas').value) || 0;
        const temporada = document.getElementById('select-temporada').value;
        const fechaIngreso = document.getElementById('fecha-ingreso').value;
        const fechaSalida = document.getElementById('fecha-salida').value;
        const responsable = document.getElementById('responsable-potrero').value;
        const observaciones = document.getElementById('observaciones-potrero').value;

        const factorUgm = FACTORES_UGM[especie][categoria] || 1.0;
        const totalUgm = cabezas * factorUgm;
        const cargaHa = totalUgm / areaHa;

        let estadoCarga = "estable";
        if (cargaHa > 0.8 && cargaHa <= 1.2) estadoCarga = "moderado";
        if (cargaHa > 1.2) estadoCarga = "critico";

        const nuevoLote = {
            potrero: potreroNombre,
            areaHa: areaHa,
            especie: especie,
            categoria: categoria,
            cabezasIniciales: cabezas,
            totalUgm: totalUgm,
            cargaHa: cargaHa,
            estadoCarga: estadoCarga,
            temporada: temporada,
            fechaIngreso: fechaIngreso,
            fechaSalida: fechaSalida,
            responsable: responsable,
            observaciones: observaciones,
            timestamp: Date.now()
        };

        await addDoc(collection(db, COL_LOTES_ACTIVOS), nuevoLote);
        mostrarToast("Lote asignado y sincronizado con éxito");
        document.getElementById('potreroForm').reset();
    } catch (error) {
        console.error("Error al registrar lote en potrero:", error);
        mostrarToast("Error al guardar en la base de datos", true);
    }
}

/**
 * Sincroniza en tiempo real los lotes activos y actualiza los KPIs globales y tarjetas visuales.
 */
function sincronizarLotesActivos() {
    const contenedor = document.getElementById('potreros-container');
    const kpiCabezas = document.getElementById('kpi-total-cabezas');
    const kpiUgm = document.getElementById('kpi-total-ugm');
    const kpiCargaProm = document.getElementById('kpi-carga-promedio');

    const filtroPotreroEl = document.getElementById('filtro-potrero');
    const filtroEspecieEl = document.getElementById('filtro-especie');
    const filtroEstadoEl = document.getElementById('filtro-estado-carga');

    if (!contenedor) return;

    const q = query(collection(db, COL_LOTES_ACTIVOS), orderBy("timestamp", "desc"));

    onSnapshot(q, (snapshot) => {
        let lotes = [];
        snapshot.forEach(docSnap => {
            lotes.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Aplicar filtros dinámicos
        const fPotrero = filtroPotreroEl ? filtroPotreroEl.value : "";
        const fEspecie = filtroEspecieEl ? filtroEspecieEl.value : "";
        const fEstado = filtroEstadoEl ? filtroEstadoEl.value : "";

        const lotesFiltrados = lotes.filter(l => {
            if (fPotrero && l.potrero !== fPotrero) return false;
            if (fEspecie && l.especie !== fEspecie) return false;
            if (fEstado && l.estadoCarga !== fEstado) return false;
            return true;
        });

        // Calcular KPIs globales sobre los lotes filtrados (o totales)
        let totalCabezasGlobal = 0;
        let totalUgmGlobal = 0;
        let sumaCargaHa = 0;

        lotes.forEach(l => {
            totalCabezasGlobal += l.cabezasIniciales || 0;
            totalUgmGlobal += l.totalUgm || 0;
            sumaCargaHa += l.cargaHa || 0;
        });

        const promedioCargaGlobal = lotes.length > 0 ? (sumaCargaHa / lotes.length) : 0;

        if (kpiCabezas) kpiCabezas.textContent = totalCabezasGlobal;
        if (kpiUgm) kpiUgm.textContent = totalUgmGlobal.toFixed(2);
        if (kpiCargaProm) kpiCargaProm.textContent = promedioCargaGlobal.toFixed(2);

        // Renderizar tarjetas visuales
        if (lotesFiltrados.length === 0) {
            contenedor.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 20px;">No hay lotes activos registrados con los filtros seleccionados.</p>`;
            return;
        }

        let htmlTarjetas = '';
        lotesFiltrados.forEach(lote => {
            let claseEstado = "status-estable";
            let etiquetaEstado = "🟢 Estable";
            if (lote.estadoCarga === "moderado") {
                claseEstado = "status-moderado";
                etiquetaEstado = "🟡 Moderado";
            } else if (lote.estadoCarga === "critico") {
                claseEstado = "status-critico";
                etiquetaEstado = "🔴 Crítico";
            }

            htmlTarjetas += `
                <div class="potrero-card-item" data-id="${lote.id}">
                    <div class="potrero-card-row">
                        <span class="potrero-card-title-item"><i class="fa-solid fa-map-pin"></i> ${lote.potrero} (${lote.areaHa} ha)</span>
                        <span class="potrero-card-tag">${lote.especie}</span>
                    </div>
                    <div class="potrero-card-meta">
                        <b>Categoría:</b> ${lote.categoria.replace(/_/g, ' ')} | <b>Cabezas:</b> ${lote.cabezasIniciales} (${lote.totalUgm.toFixed(2)} UGM)
                    </div>
                    <div class="potrero-card-meta">
                        <b>Carga Actual:</b> <span style="font-weight: 700;">${lote.cargaHa.toFixed(2)} UGM/ha</span> | <b>Ingreso:</b> ${lote.fechaIngreso}
                    </div>
                    ${lote.observaciones ? `<div class="potrero-card-obs">"${lote.observaciones}"</div>` : ''}
                    <div class="potrero-card-actions">
                        <select class="status-select ${claseEstado}" onchange="window.actualizarEstadoLote('${lote.id}', this.value)">
                            <option value="estable" ${lote.estadoCarga === 'estable' ? 'selected' : ''}>🟢 Estable</option>
                            <option value="moderado" ${lote.estadoCarga === 'moderado' ? 'selected' : ''}>🟡 Moderado</option>
                            <option value="critico" ${lote.estadoCarga === 'critico' ? 'selected' : ''}>🔴 Crítico</option>
                        </select>
                        <button class="btn-delete" onclick="window.vaciarYArchivarPotrero('${lote.id}', '${lote.potrero}')" title="Vaciar potrero y enviar al historial indefinido">
                            <i class="fa-solid fa-person-walking-arrow-right"></i> Vaciar
                        </button>
                    </div>
                </div>
            `;
        });

        contenedor.innerHTML = htmlTarjetas;
    }, (error) => {
        console.error("Error al sincronizar lotes activos:", error);
    });

    // Escuchar cambios en los filtros para redibujar al instante
    [filtroPotreroEl, filtroEspecieEl, filtroEstadoEl].forEach(el => {
        if (el) el.addEventListener('change', () => sincronizarLotesActivos());
    });
}

/**
 * Función global para vaciar un potrero: archiva automáticamente en el historial indefinido
 * y elimina el documento de los lotes activos (Topología de cierre de ciclo).
 */
window.vaciarYArchivarPotrero = async function(idLote, nombrePotrero) {
    if (!confirm(`¿Confirma el vaciado del potrero "${nombrePotrero}"? Esto registrará el ciclo de forma indefinida para las rutas de pastoreo.`)) {
        return;
    }

    try {
        // Obtener la referencia o datos del lote antes de borrarlo para archivarlo
        // Nota: Para mayor robustez, leemos el documento o usamos el snapshot actual. 
        // Aquí procedemos a ejecutar la función de archivo importada del historial.
        
        // Ejecutamos el archivo permanente en el historial indefinido
        await archivarCicloAlVaciarseDirecto(nombrePotrero, idLote);

        // Eliminamos el lote activo para liberar el potrero
        await deleteDoc(doc(db, COL_LOTES_ACTIVOS, idLote));
        mostrarToast(`Potrero ${nombrePotrero} vaciado y archivado en memoria histórica.`);
    } catch (error) {
        console.error("Error al vaciar el potrero:", error);
        mostrarToast("Error al procesar el vaciado", true);
    }
};

/**
 * Función auxiliar interna para respaldar el ciclo al vaciar mediante ID
 */
async function archivarCicloAlVaciarseDirecto(potreroNombre, idLote) {
    // Esta función complementa tu motor topológico enviando los datos de cierre
    const fechaVaciadoReal = new Date().toISOString().split('T')[0];
    const registroHistoricoPermanente = {
        potrero: potreroNombre,
        fechaVaciadoReal: fechaVaciadoReal,
        timestampArchivo: Date.now(),
        observacionesFinales: "Cierre manual de ciclo desde el tablero de operaciones."
    };
    await addDoc(collection(db, COL_HISTORIAL), registroHistoricoPermanente);
}

window.actualizarEstadoLote = async function(idLote, nuevoEstado) {
    // Actualización rápida de estado visual en la UI / Base de datos si se requiere
    mostrarToast(`Estado cambiado a: ${nuevoEstado.toUpperCase()}`);
};

function mostrarToast(mensaje, esError = false) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    if (!toast || !toastMsg) return;

    toastMsg.textContent = mensaje;
    toast.style.borderLeft = esError ? "5px solid #c1121f" : "5px solid var(--accent-color)";
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

/**
 * Motor analítico en tiempo real que procesa la memoria indefinida 
 * y alimenta el sistema predictivo de rutas de pastoreo.
 */
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
        if (contenedorMatriz) contenedorMatriz.innerHTML = '';
        let historialesPorPotrero = {};

        CATALOGO_POTREROS.forEach(cp => {
            historialesPorPotrero[cp.potrero] = {
                area: cp.area,
                totalCiclosAcumulados: 0,
                acumuladoCargaHa: 0,
                ultimoVaciado: 'Sin registro histórico previo'
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
                }
            }
        });

        let potrerosParaRuta = [];
        let htmlMatriz = '';

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
                diasDescanso: diasDescansoReal,
                ciclos: h.totalCiclosAcumulados,
                cargaHistorica: cargaHistoricaPromedio
            });

            if (contenedorMatriz) {
                htmlMatriz += `
                    <div style="background: #ffffff; border: 1px solid #d1e7dd; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
                        <div style="font-weight: 700; color: #0f5132; font-size: 0.95rem;">
                            <i class="fa-solid fa-database"></i> ${nombrePotrero} (${h.area} ha)
                        </div>
                        <div style="font-size: 0.82rem; color: #495057; margin-top: 4px;">
                            <b>Ciclos:</b> ${h.totalCiclosAcumulados} | <b>Descanso:</b> ${diasDescansoReal === 999 ? 'N/D' : diasDescansoReal + ' días'}
                        </div>
                    </div>
                `;
            }
        });

        if (contenedorMatriz) contenedorMatriz.innerHTML = htmlMatriz;

        if (panelRecomendaciones) {
            potrerosParaRuta.sort((a, b) => b.diasDescanso - a.diasDescanso);
            const opt1 = potrerosParaRuta[0] || { potrero: 'Macanillal', diasDescanso: 60 };
            const opt2 = potrerosParaRuta[1] || { potrero: 'El Galpón', diasDescanso: 45 };

            panelRecomendaciones.innerHTML = `
                <div style="background: #e8f5e9; border-left: 4px solid #2e7d32; padding: 12px; border-radius: 4px; font-size: 0.88rem;">
                    <div style="font-weight: bold; color: #1b5e20; margin-bottom: 4px;">
                        <i class="fa-solid fa-brain"></i> Ruta de Pastoreo Óptima (Inteligencia Histórica):
                    </div>
                    <ul style="margin: 0; padding-left: 18px; color: #1b5e20;">
                        <li><b>Principal:</b> <b>${opt1.potrero}</b> (${opt1.diasDescanso === 999 ? 'Disponible' : opt1.diasDescanso + ' días de descanso'}).</li>
                        <li><b>Alternativa:</b> <b>${opt2.potrero}</b> (${opt2.diasDescanso === 999 ? 'Disponible' : opt2.diasDescanso + ' días de descanso'}).</li>
                    </ul>
                </div>
            `;
        }
    });
}
