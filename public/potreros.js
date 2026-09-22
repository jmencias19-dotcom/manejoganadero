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

// Catálogo Oficial y Detallado de Categorías Zootécnicas y Factores UGM (Unidad Gran Ganado = 450 kg)
const CATALOGO_CATEGORIAS = {
    BOVINOS: [
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
    ],
    BUFALINOS: [
        { id: 'bufalas_criando', nombre: 'Búfalas Criando', factor: 1.2 },
        { id: 'bufalas_criando_pre', nombre: 'Búfalas Criando Preñada', factor: 1.2 },
        { id: 'bufalas_vacia', nombre: 'Búfalas Vacías', factor: 1.2 },
        { id: 'bufalas_prenadas', nombre: 'Búfalas Preñadas', factor: 1.2 },
        { id: 'bufalas_descarte', nombre: 'Búfalas Descarte', factor: 1.2 },
        { id: 'buvillas_vacia', nombre: 'Buvillas Vacías', factor: 0.95 },
        { id: 'buvillas_descarte', nombre: 'Buvillas Descarte', factor: 0.95 },
        { id: 'buvillas_prenada', nombre: 'Buvillas Preñadas', factor: 0.95 },
        { id: 'buvillas_monta', nombre: 'Buvillas en Monta', factor: 0.95 },
        { id: 'baute', nombre: 'Baute', factor: 0.6 },
        { id: 'bauta', nombre: 'Bauta', factor: 0.6 },
        { id: 'bucerros', nombre: 'Bucerros', factor: 0.3 },
        { id: 'bucerras', nombre: 'Bucerras', factor: 0.3 },
        { id: 'bufalos_padrote', nombre: 'Búfalos Padrotes', factor: 1.5 },
        { id: 'bufalos_padres_descarte', nombre: 'Búfalos Padres Descarte', factor: 1.5 }
    ]
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
        actualizarCategorias(); // Carga inicial por defecto
    }

    // Clonar opciones del potrero para el filtro superior de visualización
    if (selectPotrero && filtroPotrero) {
        filtroPotrero.innerHTML = '<option value="">Todos los Potreros</option>' + selectPotrero.innerHTML;
    }

    // Evento de envío del formulario
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await registrarAsignacionPotrero();
        });
    }

    // Listener para actualizar el Asistente Forrajero al cambiar parámetros
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
    const listaCategorias = CATALOGO_CATEGORIAS[especie] || [];

    selectCategoria.innerHTML = '<option value="" disabled selected>-- Seleccione Categoría --</option>';
    listaCategorias.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.nombre;
        option.dataset.factor = cat.factor;
        selectCategoria.appendChild(option);
    });
}

/**
 * Obtiene el factor UGM de la categoría seleccionada actualmente
 */
function obtenerFactorUgmSeleccionado() {
    const selectCategoria = document.getElementById('select-categoria');
    if (!selectCategoria || selectCategoria.selectedIndex <= 0) return 1.0;
    const selectedOption = selectCategoria.options[selectCategoria.selectedIndex];
    return parseFloat(selectedOption.dataset.factor) || 1.0;
}

/**
 * Calcula de forma preliminar el impacto de carga antes de enviar
 */
function calcularImpactoForrajeroPreliminar() {
    const selectPotrero = document.getElementById('select-potrero');
    const selectCategoria = document.getElementById('select-categoria');
    const inputCabezas = document.getElementById('cantidad-cabezas');
    const aiBox = document.getElementById('ai-potrero-content');

    if (!selectPotrero || !selectCategoria || !inputCabezas || !aiBox) return;

    const selectedOption = selectPotrero.options[selectPotrero.selectedIndex];
    const areaHa = parseFloat(selectedOption.getAttribute('data-ha')) || 0;
    const categoriaId = selectCategoria.value;
    const cabezas = parseInt(inputCabezas.value) || 0;

    if (areaHa === 0 || !categoriaId || cabezas === 0) {
        aiBox.innerHTML = `<p style="margin: 0; font-style: italic;">Seleccione potrero, categoría y cantidad de cabezas para estimar el balance forrajero...</p>`;
        return;
    }

    const factorUgm = obtenerFactorUgmSeleccionado();
    const totalUgm = cabezas * factorUgm;
    const cargaHa = totalUgm / areaHa;

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
            <i class="fa-solid fa-calculator"></i> <b>Estima:</b> ${totalUgm.toFixed(2)} UGM | ${cargaHa.toFixed(2)} UGM/ha (${estado.toUpperCase()})
        </div>
        <p style="margin: 4px 0 0 0;">${mensajeRecomendacion}</p>
    `;
}

/**
 * Guarda la asignación activa en Firestore y limpia el formulario
 */
async function registrarAsignacionPotrero() {
    try {
        const selectPotrero = document.getElementById('select-potrero');
        const selectedOption = selectPotrero.options[selectPotrero.selectedIndex];
        const selectCategoria = document.getElementById('select-categoria');
        const catSelectedOption = selectCategoria.options[selectCategoria.selectedIndex];
        
        const potreroNombre = selectPotrero.value;
        const areaHa = parseFloat(selectedOption.getAttribute('data-ha')) || 0;
        const especie = document.getElementById('select-especie').value;
        const categoriaId = selectCategoria.value;
        const nombreCategoriaLegible = catSelectedOption ? catSelectedOption.textContent : categoriaId;
        const cabezas = parseInt(document.getElementById('cantidad-cabezas').value) || 0;
        const temporada = document.getElementById('select-temporada').value;
        const fechaIngreso = document.getElementById('fecha-ingreso').value;
        const fechaSalida = document.getElementById('fecha-salida').value;
        const responsable = document.getElementById('responsable-potrero').value;
        const observaciones = document.getElementById('observaciones-potrero').value;

        const factorUgm = obtenerFactorUgmSeleccionado();
        const totalUgm = cabezas * factorUgm;
        const cargaHa = totalUgm / areaHa;

        let estadoCarga = "estable";
        if (cargaHa > 0.8 && cargaHa <= 1.2) estadoCarga = "moderado";
        if (cargaHa > 1.2) estadoCarga = "critico";

        const nuevoLote = {
            potrero: potreroNombre,
            areaHa: areaHa,
            especie: especie,
            categoria: categoriaId,
            nombreCategoria: nombreCategoriaLegible,
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
        
        document.getElementById('potreroForm').reset();
        actualizarCategorias();
        
        const aiBox = document.getElementById('ai-potrero-content');
        if (aiBox) {
            aiBox.innerHTML = `<p style="margin: 0; font-style: italic;">Seleccione un potrero y categoría para estimar el impacto forrajero...</p>`;
        }

        mostrarToast("Lote asignado y sincronizado con éxito");
    } catch (error) {
        console.error("Error al registrar lote en potrero:", error);
        mostrarToast("Error al guardar en la base de datos", true);
    }
}

/**
 * Sincroniza en tiempo real los lotes activos y actualiza los KPIs globales.
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

        const fPotrero = filtroPotreroEl ? filtroPotreroEl.value : "";
        const fEspecie = filtroEspecieEl ? filtroEspecieEl.value : "";
        const fEstado = filtroEstadoEl ? filtroEstadoEl.value : "";

        const lotesFiltrados = lotes.filter(l => {
            if (fPotrero && l.potrero !== fPotrero) return false;
            if (fEspecie && l.especie !== fEspecie) return false;
            if (fEstado && l.estadoCarga !== fEstado) return false;
            return true;
        });

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

        if (lotesFiltrados.length === 0) {
            contenedor.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 20px;">No hay lotes activos registrados con los filtros seleccionados.</p>`;
            return;
        }

        let htmlTarjetas = '';
        lotesFiltrados.forEach(lote => {
            let claseEstado = "status-estable";
            if (lote.estadoCarga === "moderado") claseEstado = "status-moderado";
            else if (lote.estadoCarga === "critico") claseEstado = "status-critico";

            const nombreCatDisplay = lote.nombreCategoria || lote.categoria.replace(/_/g, ' ');

            htmlTarjetas += `
                <div class="potrero-card-item" data-id="${lote.id}">
                    <div class="potrero-card-row">
                        <span class="potrero-card-title-item"><i class="fa-solid fa-map-pin"></i> ${lote.potrero} (${lote.areaHa} ha)</span>
                        <span class="potrero-card-tag">${lote.especie}</span>
                    </div>
                    <div class="potrero-card-meta">
                        <b>Categoría:</b> ${nombreCatDisplay} | <b>Cabezas:</b> ${lote.cabezasIniciales} (${lote.totalUgm.toFixed(2)} UGM)
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
                        <button class="btn-delete" onclick="window.vaciarYArchivarPotrero('${lote.id}', '${lote.potrero}', ${encodeURIComponent(JSON.stringify(lote))})" title="Vaciar potrero y enviar al historial indefinido">
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

    [filtroPotreroEl, filtroEspecieEl, filtroEstadoEl].forEach(el => {
        if (el) el.addEventListener('change', () => sincronizarLotesActivos());
    });
}

/**
 * Función global para vaciar un potrero y archivar con los datos reales del lote
 */
window.vaciarYArchivarPotrero = async function(idLote, nombrePotrero, datosLoteEncoded) {
    if (!confirm(`¿Confirma el vaciado del potrero "${nombrePotrero}"? Esto registrará el ciclo de forma indefinida para las rutas de pastoreo.`)) {
        return;
    }

    try {
        const datosLote = JSON.parse(decodeURIComponent(datosLoteEncoded));
        await archivarCicloAlVaciarse(nombrePotrero, datosLote);
        await deleteDoc(doc(db, COL_LOTES_ACTIVOS, idLote));
        mostrarToast(`Potrero ${nombrePotrero} vaciado y archivado en memoria histórica.`);
    } catch (error) {
        console.error("Error al vaciar el potrero:", error);
        mostrarToast("Error al procesar el vaciado", true);
    }
};

/**
 * Función exportable que archiva de forma permanente el récord del ciclo en Firestore.
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
            totalCabezasInicial: datosLoteActivo.cabezasIniciales || 0,
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

window.actualizarEstadoLote = async function(idLote, nuevoEstado) {
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
 * Sincroniza la memoria indefinida y alimenta el sistema predictivo de rutas.
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
