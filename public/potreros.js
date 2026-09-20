/* ==========================================================================
    Módulo: Control, Gestión y Carga Animal de Potreros (Con Firestore Real-Time)
    Hato Laguna Brava
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

// Inicializar Firebase y Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const COLLECTION_NAME = "hato_potreros";

// Umbrales ecológicos estándar para el trópico / sabana inundable
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
        toast.style.borderLeftColor = esError ? '#c1121f' : 'var(--accent-color)';
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3500);
    }

    // 1. Asistente de Carga Animal
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
            <div style="font-weight: 600; padding: 4px 8px; border-radius: 4px; display: inline-block;" class="${estadoClase}">
                ${mensajeAlerta}
            </div>
        `;
    }

    // 2. Actualizar Categorías
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
                potrerosContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 20px;">No hay lotes activos registrados en los potreros.</p>';
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
                const cargaHa = grupo.totalUgm / grupo.areaHa;
                const tieneFechasMultiples = grupo.fechasIngreso.size > 1;

                acumuladoCabezasGlobal += grupo.totalCabezas;
                acumuladoUgmGlobal += grupo.totalUgm;
                sumaCargaPromedioGlobal += cargaHa;
                totalPotrerosActivos++;

                // Generación del desglose con botón de Salida individual por sub-lote
                const resumenCategorias = grupo.registros.map(r => `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; border-bottom: 1px dashed #dee2e6; padding-bottom: 4px;">
                        <span>• <b>${r.cabezas} cab.</b> de ${r.nombreCategoria || r.categoria} (${r.especie || 'BOVINOS'}) [Ing: ${r.fechaIngreso}]</span>
                        <div>
                            <button class="btn-retirar-lote" data-id="${r.id}" title="Retirar este lote específico del potrero" style="background: #e63946; color: white; border: none; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; cursor: pointer; margin-right: 4px;">
                                <i class="fa-solid fa-right-from-bracket"></i> Salida
                            </button>
                        </div>
                    </div>
                `).join('');

                const div = document.createElement('div');
                div.className = 'potrero-card-item';
                div.innerHTML = `
                    <div class="potrero-card-row">
                        <span class="potrero-card-title-item">
                            <i class="fa-solid fa-map-pin" style="color: var(--primary-color);"></i> ${nombrePotrero} (${grupo.areaHa} ha)
                        </span>
                        ${tieneFechasMultiples ? '<span class="potrero-card-tag" style="background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;"><i class="fa-solid fa-triangle-exclamation"></i> Fechas Múltiples / Ingresos Desfasados</span>' : '<span class="potrero-card-tag">Lote Consolidado</span>'}
                    </div>
                    
                    <div class="potrero-card-meta" style="margin-top: 6px;">
                        <b>Inventario Actual:</b> ${grupo.totalCabezas} Cabezas | <b>Total UGM:</b> ${grupo.totalUgm.toFixed(2)} | <b>Carga:</b> <span style="font-weight:750;">${cargaHa.toFixed(2)} UGM/ha</span>
                    </div>

                    <div class="potrero-card-meta" style="background: #f8f9fa; padding: 6px 8px; border-radius: 4px; margin-top: 4px; font-size: 0.8rem;">
                        <b>Desglose por Lotes / Ingresos:</b><br>
                        ${resumenCategorias}
                    </div>

                    <div class="potrero-card-meta">
                        <b>Responsable(s):</b> ${Array.from(grupo.responsables).join(', ')}
                    </div>

                    <div class="potrero-card-actions">
                        <select class="status-select" disabled style="background-color: #e9ecef; cursor: default;">
                            <option value="">Carga ${cargaHa.toFixed(2)} UGM/ha</option>
                        </select>
                        <button class="btn-delete-all btn-delete" data-ids="${grupo.registros.map(r => r.id).join(',')}" title="Vaciar Potrero completo"><i class="fa-solid fa-trash-can"></i> Vaciar Potrero</button>
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

    // 4. Gestión de Eventos para Salidas Individuales y Borrado Masivo
    function vincularEventosAccionesMultiples() {
        // Botón para retirar un sub-lote individual (Salida parcial/específica)
        document.querySelectorAll('.btn-retirar-lote').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                if (confirm("¿Confirma la salida de este lote específico del potrero?")) {
                    try {
                        await deleteDoc(doc(db, COLLECTION_NAME, id));
                        mostrarToast("Lote retirado del potrero con éxito.");
                    } catch (error) {
                        console.error("Error al retirar el lote:", error);
                        mostrarToast("Error al procesar la salida.", true);
                    }
                }
            });
        });

        // Botón para vaciar todo el potrero de golpe
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const idsString = e.currentTarget.dataset.ids;
                if (!idsString) return;
                const ids = idsString.split(',');

                if (confirm(`¿Está seguro de vaciar este potrero eliminando los ${ids.length} registro(s) asociados?`)) {
                    try {
                        for (const id of ids) {
                            await deleteDoc(doc(db, COLLECTION_NAME, id));
                        }
                        mostrarToast("Potrero vaciado y registros eliminados con éxito.");
                    } catch (error) {
                        console.error("Error al vaciar el potrero:", error);
                        mostrarToast("Error al procesar la eliminación.", true);
                    }
                }
            });
        });
    }

    // Asignación de Eventos en el DOM
    if (selectEspecie) {
        selectEspecie.addEventListener('change', actualizarCategorias);
        actualizarCategorias(); // Inicializa por defecto
    }

    [selectPotrero, selectCategoria, selectTemporada, inputCabezas].forEach(el => {
        if (el) el.addEventListener('change', actualizarAnalisisInteligente);
        if (el) el.addEventListener('input', actualizarAnalisisInteligente);
    });

    // Envío del Formulario
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
            const cargaHa = ugm / areaHa;
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
                fechaIngreso: document.getElementById('fecha-ingreso').value,
                fechaSalida: document.getElementById('fecha-salida').value,
                responsable: document.getElementById('responsable-potrero').value.trim(),
                observaciones: document.getElementById('observaciones-potrero').value.trim(),
                estadoCarga: estadoCarga,
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
