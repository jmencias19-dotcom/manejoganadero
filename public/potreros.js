/* ==========================================================================
    Módulo: Control, Gestión y Carga Animal de Potreros (Con Firestore Real-Time)
    Hato Laguna Brava - Versión Optimizada
    ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    doc, 
    updateDoc, 
    deleteDoc, 
    query, 
    orderBy,
    runTransaction
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
const COLLECTION_NAME = "hato_potreros";

// Umbrales ecológicos estándar para el trópico / sabana inundable (Apure)
const UMBRAL_INVIERNO = 1.20;
const UMBRAL_VERANO = 0.76;

// Factores de ponderación por categoría - Bovinos (Mestizos Brahman)
const BOVINOS = [
    { id: 'vacas_criando', nombre: 'Vacas Criando', factor: 1.0 },
    { id: 'vacas_criando_pre', nombre: 'Vacas Criando Preñada', factor: 1.0 },
    { id: 'vacas_vacia', nombre: 'Vacas Vacías', factor: 1.0 },
    { id: 'vacas_prenadas', nombre: 'Vacas Preñadas', factor: 1.0 },
    { id: 'vacas_descarte', nombre: 'Vacas Descarte', factor: 1.0 },
    { id: 'novillas_vacia', nombre: 'Novillas Vacías', factor: 0.8 },
    { id: 'novillas_descarte', nombre: 'Novillas Descarte', factor: 0.8 },
    { id: 'novillas_prenada', nombre: 'Novillas Preñadas', factor: 0.8 },
    { id: 'novillas_monta', nombre: 'Novillas en Monta', factor: 0.8 },
    { id: 'mautes_machos', nombre: 'Mautes Machos', factor: 0.5 },
    { id: 'mautas_hembras', nombre: 'Mautas Hembras', factor: 0.5 },
    { id: 'becerros_lactantes', nombre: 'Becerros / Lactantes', factor: 0.25 },
    { id: 'becerras_lactantes', nombre: 'Becerras / Lactantes', factor: 0.25 },
    { id: 'toros_padrotes', nombre: 'Toros Padrotes', factor: 1.25 },
    { id: 'toros_pad_descarte', nombre: 'Toros Padres Descarte', factor: 1.25 }
];

// Factores de ponderación por categoría - Bufalinos
const BUFALINOS = [
    { id: 'bufalas_criando', nombre: 'Búfalas Criando', factor: 1.2 },
    { id: 'bufalas_criando_pre', nombre: 'Búfalas Criando Preñada', factor: 1.2 },
    { id: 'bufalas_vacia', nombre: 'Búfalas Vacías', factor: 1.2 },
    { id: 'bufalas_prenadas', nombre: 'Búfalas Preñadas', factor: 1.2 },
    { id: 'bufalas_descarte', nombre: 'Búfalas Descarte', factor: 1.2 },
    { id: 'buvillas_vacia', nombre: 'Buvillas Vacías', factor: 0.95 },
    { id: 'buvillas_descarte', nombre: 'Buvillas Descarte', factor: 0.95 },
    { id: 'buvillas_prenada', nombre: 'Buvillas Preñadas', factor: 0.95 },
    { id: 'buvillas_monta', nombre: 'Buvillas en Monta', factor: 0.95 },
    { id: 'baute_machos', nombre: 'Baute Machos (bautes)', factor: 0.6 },
    { id: 'bauta_hembras', nombre: 'Bauta Hembras (bautas)', factor: 0.6 },
    { id: 'bucerros_lactantes', nombre: 'Bucerros / Lactantes', factor: 0.3 },
    { id: 'bucerras_lactantes', nombre: 'Bucerras / Lactantes', factor: 0.3 },
    { id: 'bufalos_padrotes', nombre: 'Búfalos Padrotes', factor: 1.5 },
    { id: 'bufalos_pad_descarte', nombre: 'Búfalos Padres Descarte', factor: 1.5 }
];

document.addEventListener('DOMContentLoaded', () => {
    const potreroForm = document.getElementById('potreroForm');
    const potrerosContainer = document.getElementById('potreros-container');
    const selectEspecie = document.getElementById('select-especie');
    const selectCategoria = document.getElementById('select-categoria');
    const selectPotrero = document.getElementById('select-potrero');
    const selectTemporada = document.getElementById('select-temporada');
    const inputCabezas = document.getElementById('cantidad-cabezas');
    const aiContent = document.getElementById('ai-potrero-content');

    const kpiTotalCabezas = document.getElementById('kpi-total-cabezas');
    const kpiTotalUgm = document.getElementById('kpi-total-ugm');
    const kpiCargaPromedio = document.getElementById('kpi-carga-promedio');

    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    function mostrarToast(mensaje, esError = false) {
        if (!toast || !toastMessage) return;
        toastMessage.textContent = mensaje;
        toast.style.borderLeftColor = esError ? '#c1121f' : 'var(--accent-color, #2a9d8f)';
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3500);
    }

    // 1. Asistente de Carga Animal (Evaluación de presión de pastoreo)
    function actualizarAnalisisInteligente() {
        if (!aiContent) return;

        const potreroOpt = selectPotrero && selectPotrero.selectedOptions[0];
        const categoriaOpt = selectCategoria && selectCategoria.selectedOptions[0];
        const temporadaVal = selectTemporada ? selectTemporada.value : '';
        const cabezas = parseFloat(inputCabezas ? inputCabezas.value : 0) || 0;

        if (!potreroOpt || !potreroOpt.value || !categoriaOpt || !categoriaOpt.value) {
            aiContent.innerHTML = '<p style="margin: 0; font-style: italic;">Seleccione un potrero y categoría zootécnica para estimar el impacto forrajero...</p>';
            return;
        }

        const areaHa = parseFloat(potreroOpt.dataset.ha) || 1;
        const factor = parseFloat(categoriaOpt.dataset.factor) || 1.0;
        const totalUgm = cabezas * factor;
        const cargaHa = totalUgm / areaHa;

        const esInvierno = temporadaVal.includes('INVIERNO');
        const umbralActual = esInvierno ? UMBRAL_INVIERNO : UMBRAL_VERANO;
        const nombreTemporada = esInvierno ? 'Invierno (Lluvias)' : 'Verano (Sequía)';

        let estadoClase = 'status-estable';
        let mensajeAlerta = 'Carga óptima dentro de los límites ecológicos de la sabana.';

        if (cargaHa > umbralActual) {
            estadoClase = 'status-critico';
            mensajeAlerta = `⚠️ Alerta: La carga (${cargaHa.toFixed(2)} UGM/ha) supera el umbral ecológico de ${nombreTemporada} (${umbralActual} UGM/ha). Riesgo de sobrepastoreo.`;
        } else if (cargaHa > (umbralActual * 0.85)) {
            estadoClase = 'status-moderado';
            mensajeAlerta = `⚡ Precaución: Carga cercana al límite máximo sostenible para ${nombreTemporada}.`;
        } else {
            mensajeAlerta = `✅ Sostenible: Carga adecuada bajo el régimen de ${nombreTemporada}.`;
        }

        aiContent.innerHTML = `
            <div><b>Potrero:</b> ${potreroOpt.value} (${areaHa} ha)</div>
            <div><b>Carga Estimada:</b> ${totalUgm.toFixed(2)} UGM (${cargaHa.toFixed(2)} UGM/ha)</div>
            <div style="font-weight: 600; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 4px;" class="${estadoClase}">
                ${mensajeAlerta}
            </div>
        `;
    }

    // 2. Actualizar Dinámica de Categorías por Especie
    function actualizarCategorias() {
        if (!selectEspecie || !selectCategoria) return;
        const especieSeleccionada = selectEspecie.value;
        const lista = especieSeleccionada === 'BUFALINOS' ? BUFALINOS : BOVINOS;

        selectCategoria.innerHTML = '<option value="" disabled selected>-- Seleccione Categoría --</option>';
        lista.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = `${cat.nombre} (Factor: ${cat.factor} UGM)`;
            opt.dataset.factor = cat.factor;
            selectCategoria.appendChild(opt);
        });
        actualizarAnalisisInteligente();
    }

    // 3. Sincronización en Tiempo Real y Consolidación por Potrero
    function iniciarSincronizacionPotreros() {
        if (!potrerosContainer) return;

        const q = query(collection(db, COLLECTION_NAME), orderBy("timestamp", "desc"));
        
        onSnapshot(q, (snapshot) => {
            potrerosContainer.innerHTML = '';
            
            if (snapshot.empty) {
                potrerosContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted, #666); font-size: 0.9rem; padding: 20px;">No hay lotes activos registrados en los potreros.</p>';
                actualizarKPIsGlobales(0, 0, 0);
                return;
            }

            const potrerosAgrupados = {};

            snapshot.forEach((docSnap) => {
                const item = docSnap.data();
                const id = docSnap.id;
                const nombrePotrero = item.potrero || 'Sin nombre';

                if (!potrerosAgrupados[nombrePotrero]) {
                    potrerosAgrupados[nombrePotrero] = {
                        areaHa: parseFloat(item.areaHa) || 1,
                        registros: [],
                        totalCabezas: 0,
                        totalUgm: 0,
                        fechasIngreso: new Set(),
                        responsables: new Set()
                    };
                }

                const cabezas = parseFloat(item.cabezas) || 0;
                const ugm = parseFloat(item.ugm) || 0;

                potrerosAgrupados[nombrePotrero].totalCabezas += cabezas;
                potrerosAgrupados[nombrePotrero].totalUgm += ugm;
                if (item.fechaIngreso) potrerosAgrupados[nombrePotrero].fechasIngreso.add(item.fechaIngreso);
                if (item.responsable) potrerosAgrupados[nombrePotrero].responsables.add(item.responsable);

                potrerosAgrupados[nombrePotrero].registros.push({ id, ...item });
            });

            let acumuladoCabezasGlobal = 0;
            let acumuladoUgmGlobal = 0;
            let sumaCargaPromedioGlobal = 0;
            let totalPotrerosActivos = 0;

            Object.keys(potrerosAgrupados).forEach(nombrePotrero => {
                const grupo = potrerosAgrupados[nombrePotrero];
                const cargaHa = grupo.areaHa > 0 ? (grupo.totalUgm / grupo.areaHa) : 0;
                const tieneFechasMultiples = grupo.fechasIngreso.size > 1;

                acumuladoCabezasGlobal += grupo.totalCabezas;
                acumuladoUgmGlobal += grupo.totalUgm;
                sumaCargaPromedioGlobal += cargaHa;
                totalPotrerosActivos++;

                // A. Lotes de Ingreso Activos (> 0 cabezas)
                const registrosActivos = grupo.registros.filter(r => (r.cabezas || 0) > 0);
                const resumenIngresos = registrosActivos.length > 0 ? registrosActivos.map(r => `
                    <div style="margin-bottom: 8px; border-bottom: 1px dashed #dee2e6; padding-bottom: 6px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                            <span style="font-size: 0.85rem; line-height: 1.2; word-break: break-word; flex: 1;">
                                • <b>${r.cabezas} cab.</b> de ${r.nombreCategoria || r.categoria} (${r.especie || 'BOVINOS'})
                            </span>
                            <button class="btn-retirar-lote" 
                                data-id="${r.id}" 
                                data-cabezas="${r.cabezas}" 
                                data-categoria="${r.nombreCategoria || r.categoria}" 
                                data-potrero="${nombrePotrero}" 
                                data-factor="${r.factorUgm || 1.0}"
                                data-salidas="${encodeURIComponent(JSON.stringify(r.salidas || []))}"
                                title="Retirar animales de este lote" 
                                style="background: #e63946; color: white; border: none; padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; height: 26px; line-height: 1; flex-shrink: 0;">
                                <i class="fa-solid fa-right-from-bracket"></i> Salida
                            </button>
                        </div>
                        <div style="font-size: 0.78rem; color: #555; margin-top: 2px;">
                            <span><b>Ingreso:</b> ${r.fechaIngreso || 'N/D'}</span> | 
                            <span style="color: #c1121f;"><b>Salida Estimada:</b> ${r.fechaSalida || 'No definida'}</span>
                        </div>
                        ${r.observaciones ? `<div style="font-size: 0.78rem; color: #6c757d; font-style: italic; margin-top: 1px;"><b>Obs:</b> ${r.observaciones}</div>` : ''}
                    </div>
                `).join('') : '<div style="font-size: 0.8rem; color: #6c757d; font-style: italic;">Sin lotes activos en ingreso.</div>';
                // B. Historial de Salidas Parciales
                let todasLasSalidas = [];
                grupo.registros.forEach(r => {
                    if (r.salidas && Array.isArray(r.salidas)) {
                        r.salidas.forEach(s => {
                            todasLasSalidas.push({
                                categoria: r.nombreCategoria || r.categoria,
                                especie: r.especie || 'BOVINOS',
                                cabezas: s.cabezas,
                                fecha: s.fecha
                            });
                        });
                    }
                });

                let seccionSalidasHTML = '';
                if (todasLasSalidas.length > 0) {
                    const resumenSalidas = todasLasSalidas.map(s => `
                        <div style="margin-bottom: 4px; border-bottom: 1px dotted #ffeeba; padding-bottom: 4px; font-size: 0.78rem; color: #856404;">
                            <span>• <b>${s.cabezas} cab.</b> de ${s.categoria} (${s.especie}) | <b>Salida:</b> ${s.fecha}</span>
                        </div>
                    `).join('');

                    seccionSalidasHTML = `
                        <div class="potrero-card-meta" style="background: #fff3cd; padding: 8px 10px; border-radius: 6px; margin-top: 6px; font-size: 0.85rem; border: 1px solid #ffeeba;">
                            <div style="font-weight: bold; margin-bottom: 6px; color: #856404;">
                                <i class="fa-solid fa-right-from-bracket"></i> Desglose / Lote de Salida:
                            </div>
                            ${resumenSalidas}
                        </div>
                    `;
                }

                const div = document.createElement('div');
                div.className = 'potrero-card-item';
                div.innerHTML = `
                    <div class="potrero-card-row">
                        <span class="potrero-card-title-item">
                            <i class="fa-solid fa-map-pin" style="color: var(--primary-color);"></i> ${nombrePotrero} (${grupo.areaHa} ha)
                        </span>
                        ${tieneFechasMultiples ? '<span class="potrero-card-tag" style="background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;"><i class="fa-solid fa-triangle-exclamation"></i> Ingresos Desfasados</span>' : '<span class="potrero-card-tag">Lote Consolidado</span>'}
                    </div>
                    
                    <div class="potrero-card-meta" style="margin-top: 6px;">
                        <b>Inventario Actual:</b> ${grupo.totalCabezas} Cabezas | <b>Total UGM:</b> ${grupo.totalUgm.toFixed(2)} | <b>Carga:</b> <span style="font-weight:750;">${cargaHa.toFixed(2)} UGM/ha</span>
                    </div>

                    <div class="potrero-card-meta" style="background: #f8f9fa; padding: 8px 10px; border-radius: 6px; margin-top: 6px; font-size: 0.85rem; border: 1px solid #e9ecef;">
                        <div style="font-weight: bold; margin-bottom: 6px; color: var(--primary-color, #2b2b2b);">
                            <i class="fa-solid fa-list-check"></i> Desglose / Lote de Ingreso:
                        </div>
                        ${resumenIngresos}
                    </div>

                    ${seccionSalidasHTML}

                    <div class="potrero-card-meta" style="margin-top: 6px;">
                        <b>Responsable(s):</b> ${Array.from(grupo.responsables).join(', ') || 'No asignado'}
                    </div>

                    <div class="potrero-card-actions" style="display: flex; justify-content: flex-end; margin-top: 8px;">
                        <button class="btn-delete-all btn-delete" data-ids="${grupo.registros.map(r => r.id).join(',')}" title="Vaciar Potrero completo" style="background: #c1121f; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                            <i class="fa-solid fa-trash-can"></i> Vaciar Potrero
                        </button>
                    </div>
                `;
                potrerosContainer.appendChild(div);
            });

            const promedioGeneralCarga = totalPotrerosActivos > 0 ? (sumaCargaPromedioGlobal / totalPotrerosActivos) : 0;
            actualizarKPIsGlobales(acumuladoCabezasGlobal, acumuladoUgmGlobal, promedioGeneralCarga);
            vincularEventosAccionesMultiples();
        }, (error) => {
            console.error("Error al sincronizar con Firestore: ", error);
            potrerosContainer.innerHTML = '<p style="text-align: center; color: #c1121f; padding: 20px;">Error de sincronización con la base de datos.</p>';
        });
    }

    function actualizarKPIsGlobales(cabezas, ugm, promedioCarga) {
        if (kpiTotalCabezas) kpiTotalCabezas.textContent = cabezas;
        if (kpiTotalUgm) kpiTotalUgm.textContent = ugm.toFixed(2);
        if (kpiCargaPromedio) kpiCargaPromedio.textContent = promedioCarga.toFixed(2);
    }

    // 4. Gestión Atómica de Salidas y Borrado Masivo
    function vincularEventosAccionesMultiples() {
        document.querySelectorAll('.btn-retirar-lote').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                const cabezasActuales = parseInt(e.currentTarget.dataset.cabezas) || 0;
                const categoriaNombre = e.currentTarget.dataset.categoria || 'Lote';
                const potreroNombre = e.currentTarget.dataset.potrero || 'Potrero';
                const factorUgm = parseFloat(e.currentTarget.dataset.factor) || 1.0;
                
                let salidasAnteriores = [];
                try {
                    salidasAnteriores = JSON.parse(decodeURIComponent(e.currentTarget.dataset.salidas || '[]'));
                } catch (err) {
                    salidasAnteriores = [];
                }

                const inputCabezasRetiro = prompt(`Retiro para: ${categoriaNombre}\nInventario actual: ${cabezasActuales} cabezas.\n\n¿Cuántas cabezas salen del potrero?`, cabezasActuales);
                
                if (inputCabezasRetiro === null) return;

                const cabezasRetiradas = parseInt(inputCabezasRetiro);

                if (isNaN(cabezasRetiradas) || cabezasRetiradas <= 0) {
                    mostrarToast("Debe ingresar un número válido de cabezas.", true);
                    return;
                }

                if (cabezasRetiradas > cabezasActuales) {
                    mostrarToast(`No puede retirar ${cabezasRetiradas} cabezas porque el lote solo cuenta con ${cabezasActuales}.`, true);
                    return;
                }

                const fechaSalidaAutomatica = new Date().toISOString().split('T')[0];

                if (confirm(`¿Confirma la salida de ${cabezasRetiradas} cabeza(s) de ${categoriaNombre} en el potrero ${potreroNombre}?`)) {
                    try {
                        const docRef = doc(db, COLLECTION_NAME, id);

                        salidasAnteriores.push({
                            cabezas: cabezasRetiradas,
                            fecha: fechaSalidaAutomatica
                        });

                        const nuevasCabezas = cabezasActuales - cabezasRetiradas;
                        const nuevoUgm = nuevasCabezas * factorUgm;

                        await updateDoc(docRef, {
                            cabezas: nuevasCabezas,
                            ugm: nuevoUgm,
                            salidas: salidasAnteriores
                        });

                        mostrarToast(`Salida de ${cabezasRetiradas} cabeza(s) aplicada con éxito.`);
                    } catch (error) {
                        console.error("Error al procesar la salida:", error);
                        mostrarToast("Error al procesar la salida en la base de datos.", true);
                    }
                }
            });
        });

        document.querySelectorAll('.btn-delete-all').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const idsString = e.currentTarget.dataset.ids;
                if (!idsString) return;
                const ids = idsString.split(',');

                if (confirm(`¿Está seguro de vaciar este potrero eliminando los ${ids.length} registro(s) asociados?`)) {
                    try {
                        for (const id of ids) {
                            await deleteDoc(doc(db, COLLECTION_NAME, id));
                        }
                        mostrarToast("Potrero vaciado con éxito.");
                    } catch (error) {
                        console.error("Error al vaciar el potrero:", error);
                        mostrarToast("Error al procesar la eliminación.", true);
                    }
                }
            });
        });
    }

    if (selectEspecie) {
        selectEspecie.addEventListener('change', actualizarCategorias);
        actualizarCategorias();
    }

    [selectPotrero, selectCategoria, selectTemporada, inputCabezas].forEach(el => {
        if (el) {
            el.addEventListener('change', actualizarAnalisisInteligente);
            el.addEventListener('input', actualizarAnalisisInteligente);
        }
    });

    if (potreroForm) {
        potreroForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const potreroOpt = selectPotrero.selectedOptions[0];
            const categoriaOpt = selectCategoria.selectedOptions[0];
            const especie = selectEspecie.value;
            const potreroNombre = selectPotrero.value;
            const areaHa = parseFloat(potreroOpt.dataset.ha) || 1;
            const categoriaId = selectCategoria.value;
            const nombreCategoria = categoriaOpt.textContent.split(' (Factor')[0];
            const factor = parseFloat(categoriaOpt.dataset.factor) || 1.0;
            const cabezas = parseFloat(inputCabezas.value) || 0;
            const temporada = selectTemporada.value;

            const ugm = cabezas * factor;
            const cargaHa = areaHa > 0 ? (ugm / areaHa) : 0;
            const esInvierno = temporada.includes('INVIERNO');
            const umbral = esInvierno ? UMBRAL_INVIERNO : UMBRAL_VERANO;
            const estadoCarga = cargaHa > umbral ? 'CRITICO' : (cargaHa > (umbral * 0.85) ? 'MODERADO' : 'ESTABLE');

            const nuevoRegistro = {
                potrero: potreroNombre,
                areaHa: areaHa,
                especie: especie,
                categoria: categoriaId,
                nombreCategoria: nombreCategoria,
                factorUgm: factor,
                cabezas: cabezas,
                ugm: ugm,
                cargaHa: cargaHa,
                temporada: selectTemporada.selectedOptions[0].textContent,
                fechaIngreso: document.getElementById('fecha-ingreso')?.value || '',
                fechaSalida: document.getElementById('fecha-salida')?.value || '',
                responsable: document.getElementById('responsable-potrero')?.value.trim() || '',
                observaciones: document.getElementById('observaciones-potrero')?.value.trim() || '',
                estadoCarga: estadoCarga,
                salidas: [],
                timestamp: Date.now()
            };

            try {
                await addDoc(collection(db, COLLECTION_NAME), nuevoRegistro);
                potreroForm.reset();
                actualizarCategorias();
                if (aiContent) aiContent.innerHTML = '<p style="margin: 0; font-style: italic;">Seleccione un potrero y categoría para estimar el impacto forrajero...</p>';
                mostrarToast("¡Carga animal registrada y sincronizada con éxito!");
            } catch (error) {
                console.error("Error al registrar en Firestore:", error);
                mostrarToast("Error al guardar en la base de datos.", true);
            }
        });
    }

    iniciarSincronizacionPotreros();
});
