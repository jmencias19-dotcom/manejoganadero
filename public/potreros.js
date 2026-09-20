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

    // Lógica del Asistente de Carga Animal en Tiempo Real
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

    [selectPotrero, selectCategoria, selectTemporada, inputCabezas].forEach(el => {
        if (el) el.addEventListener('change', actualizarAnalisisInteligente);
        if (el) el.addEventListener('input', actualizarAnalisisInteligente);
    });

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
