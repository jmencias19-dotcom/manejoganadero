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

    // Poblar dinámicamente las categorías zootécnicas al cambiar de especie
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

    if (selectEspecie) {
        selectEspecie.addEventListener('change', actualizarCategorias);
        actualizarCategorias(); // Carga inicial por defecto (Bovinos)
    }

    // Sincronización en Tiempo Real y Consolidación por Potrero (Múltiples fechas / Lotes acumulados)
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

            // Diccionario para agrupar registros por Nombre de Potrero
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

            // Renderizar cada potrero consolidado
            Object.keys(potrerosAgrupados).forEach(nombrePotrero => {
                const grupo = potrerosAgrupados[nombrePotrero];
                const cargaHa = grupo.totalUgm / grupo.areaHa;
                const tieneFechasMultiples = grupo.fechasIngreso.size > 1;

                acumuladoCabezasGlobal += grupo.totalCabezas;
                acumuladoUgmGlobal += grupo.totalUgm;
                sumaCargaPromedioGlobal += cargaHa;
                totalPotrerosActivos++;

                // Construir resumen de categorías y especies
                const resumenCategorias = grupo.registros.map(r => 
                    `• ${r.cabezas} cab. de ${r.nombreCategoria || r.categoria} (${r.especie || 'BOVINOS'}) [Ingreso: ${r.fechaIngreso}]`
                ).join('<br>');

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
                        <select class="status-select ${getStatusClass(cargaHa, 'INVIERNO')}" data-potrero="${nombrePotrero}" disabled>
                            <option value="ESTABLE">Carga ${cargaHa.toFixed(2)} UGM/ha</option>
                        </select>
                        <button class="btn-delete" data-ids="${grupo.registros.map(r => r.id).join(',')}" title="Limpiar / Vaciar Potrero completo"><i class="fa-solid fa-trash-can"></i> Vaciar Potrero</button>
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

    function vincularEventosAccionesMultiples() {
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

    // Sincronización en Tiempo Real con Firebase Firestore
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

            let acumuladoCabezas = 0;
            let acumuladoUgm = 0;
            let sumaCargaPromedio = 0;
            let totalLotes = 0;

            snapshot.forEach((docSnap) => {
                const item = docSnap.data();
                const id = docSnap.id;

                const cabezas = parseFloat(item.cabezas) || 0;
                const ugm = parseFloat(item.ugm) || 0;
                const cargaHa = parseFloat(item.cargaHa) || 0;

                acumuladoCabezas += cabezas;
                acumuladoUgm += ugm;
                sumaCargaPromedio += cargaHa;
                totalLotes++;

                const div = document.createElement('div');
                div.className = 'potrero-card-item';
                div.innerHTML = `
                    <div class="potrero-card-row">
                        <span class="potrero-card-title-item"><i class="fa-solid fa-map-pin" style="color: var(--primary-color);"></i> ${item.potrero}</span>
                        <span class="potrero-card-tag">${item.especie || 'BOVINOS'}</span>
                    </div>
                    <div class="potrero-card-meta">
                        <b>Categoría:</b> ${item.nombreCategoria || item.categoria} | <b>Cabezas:</b> ${cabezas} | <b>UGM:</b> ${ugm.toFixed(2)} (${cargaHa.toFixed(2)} UGM/ha)
                    </div>
                    <div class="potrero-card-meta">
                        <b>Época:</b> ${item.temporada} | <b>Ingreso:</b> ${item.fechaIngreso} al ${item.fechaSalida}
                    </div>
                    <div class="potrero-card-meta">
                        <b>Responsable:</b> ${item.responsable}
                    </div>
                    ${item.observaciones ? `<div class="potrero-card-obs"><i class="fa-solid fa-note-sticky"></i> ${item.observaciones}</div>` : ''}
                    
                    <div class="potrero-card-actions">
                        <select class="status-select ${getStatusClass(cargaHa, item.temporada)}" data-id="${id}">
                            <option value="ESTABLE" ${item.estadoCarga === 'ESTABLE' ? 'selected' : ''}>🟢 Estable (${cargaHa.toFixed(2)} UGM/ha)</option>
                            <option value="MODERADO" ${item.estadoCarga === 'MODERADO' ? 'selected' : ''}>🟡 Moderado</option>
                            <option value="CRITICO" ${item.estadoCarga === 'CRITICO' ? 'selected' : ''}>🔴 Crítico / Sobrepasado</option>
                        </select>
                        <button class="btn-delete" data-id="${id}" title="Eliminar registro"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                `;
                potrerosContainer.appendChild(div);
            });

            const promedioGeneralCarga = totalLotes > 0 ? (sumaCargaPromedio / totalLotes) : 0;
            actualizarKPIsGlobales(acumuladoCabezas, acumuladoUgm, promedioGeneralCarga);
            vincularEventosAcciones();
        }, (error) => {
            console.error("Error al sincronizar con Firestore: ", error);
            potrerosContainer.innerHTML = '<p style="text-align: center; color: #c1121f; padding: 20px;">Error de sincronización con la base de datos.</p>';
        });
    }

    function getStatusClass(cargaHa, temporada) {
        const esInvierno = temporada && temporada.includes('INVIERNO');
        const umbral = esInvierno ? UMBRAL_INVIERNO : UMBRAL_VERANO;
        if (cargaHa > umbral) return 'status-critico';
        if (cargaHa > (umbral * 0.85)) return 'status-moderado';
        return 'status-estable';
    }

    function actualizarKPIsGlobales(cabezas, ugm, promedioCarga) {
        if (kpiTotalCabezas) kpiTotalCabezas.textContent = cabezas;
        if (kpiTotalUgm) kpiTotalUgm.textContent = ugm.toFixed(2);
        if (kpiCargaPromedio) kpiCargaPromedio.textContent = promedioCarga.toFixed(2);
    }

    function vincularEventosAcciones() {
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const id = e.target.dataset.id;
                const nuevoEstado = e.target.value;
                try {
                    await updateDoc(doc(db, COLLECTION_NAME, id), { estadoCarga: nuevoEstado });
                    mostrarToast("Estado de carga actualizado correctamente.");
                } catch (error) {
                    console.error("Error al actualizar estado:", error);
                    mostrarToast("No se pudo actualizar el estado.", true);
                }
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                if (confirm("¿Está seguro de eliminar este registro de asignación del potrero?")) {
                    try {
                        await deleteDoc(doc(db, COLLECTION_NAME, id));
                        mostrarToast("Registro eliminado con éxito.");
                    } catch (error) {
                        console.error("Error al eliminar registro:", error);
                        mostrarToast("Error al eliminar el registro.", true);
                    }
                }
            });
        });
    }

    // Registro de Asignación desde el Formulario
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
