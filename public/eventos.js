/* ==========================================================================
   Módulo: Registro y Control de Eventos Críticos (Modo Offline Blindado)
   Hato Laguna Brava - Mantecal, Apure, Venezuela
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {  
    initializeFirestore,  
    persistentLocalCache,
    persistentMultipleTabManager,
    collection,  
    addDoc,  
    onSnapshot,  
    doc,  
    deleteDoc,  
    query,  
    orderBy,
    enableNetwork,
    disableNetwork
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

// Configuración de Firestore con persistencia local robusta para campo sin internet
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});

const COLLECTION_NAME = "hato_eventos";

let eventosCache = [];
let imagenBase64Actual = "";

// Función global blindada para abrir evidencias Base64 sin restricciones de WebViews/Telegram
window.verEvidencia = function(base64Data) {
    try {
        const arr = base64Data.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
    } catch (e) {
        console.error("Error al abrir evidencia:", e);
        // Si la función mostrarToast está disponible en el ámbito, la usamos; de lo contrario, fallback a alert
        if (typeof mostrarToast === 'function') {
            mostrarToast("No se pudo renderizar la imagen en este dispositivo", "error");
        } else {
            alert("No se pudo renderizar la imagen en este dispositivo");
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const eventoForm = document.getElementById('eventoForm');
    const tablaEventosBody = document.getElementById('tablaEventosBody');
    const sinRegistros = document.getElementById('sinRegistros');
    const inputFoto = document.getElementById('foto-evento');
    
    // Contadores de KPIs (7 indicadores)
    const kpiMortalidad = document.getElementById('kpi-mortalidad');
    const kpiAbortos = document.getElementById('kpi-abortos');
    const kpiNatimortos = document.getElementById('kpi-natimortos');
    const kpiNatalidad = document.getElementById('kpi-natalidad');
    const kpiConsumo = document.getElementById('kpi-consumo');
    const kpiTraslados = document.getElementById('kpi-traslados');
    const kpiDonaciones = document.getElementById('kpi-donaciones');

    // Filtros y Búsqueda
    const filtroCategoria = document.getElementById('filtro-categoria');
    const filtroMes = document.getElementById('filtro-mes');
    const busquedaChip = document.getElementById('busqueda-chip');

    // Semáforo Cloud UI
    const syncSemaphore = document.getElementById('syncSemaphore');
    const syncTextLabel = document.getElementById('syncTextLabel');

    // GESTIÓN DE CONECTIVIDAD DE RED EN VIVO (Blindaje Starlink/Estero)
    window.addEventListener('online', async () => {
        console.log("Conectividad detectada. Reactivando red de Firestore...");
        try {
            await enableNetwork(db);
            if (syncTextLabel) syncTextLabel.textContent = "Sincronizando...";
        } catch (err) {
            console.error("Error al reactivar red Firestore:", err);
        }
    });

    window.addEventListener('offline', async () => {
        console.warn("Señal perdida. Conmutando a Modo Offline estricto.");
        try {
            await disableNetwork(db);
            if (syncSemaphore) syncSemaphore.classList.remove('online');
            if (syncTextLabel) syncTextLabel.textContent = "Modo Offline (Local)";
        } catch (err) {
            console.error("Error al pausar red Firestore:", err);
        }
    });

    function mostrarToast(mensaje, tipo = "success") {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        if (!toast || !toastMessage) return;

        toastMessage.textContent = mensaje;
        toast.style.borderLeftColor = tipo === "error" ? "#c1121f" : "var(--accent-color, #52b788)";
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3500);
    }

    // Procesar imagen subida a Base64
    if (inputFoto) {
        inputFoto.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(uploadEvent) {
                imagenBase64Actual = uploadEvent.target.result;
                mostrarToast("Evidencia fotográfica cargada correctamente");
            };
            reader.onerror = function() {
                mostrarToast("Error al leer el archivo de imagen", "error");
            };
            reader.readAsDataURL(file);
        });
    }

    // Sincronización robusta en tiempo real con soporte offline automático
    function iniciarSincronizacionEventos() {
        if (!tablaEventosBody) return;

        const q = query(collection(db, COLLECTION_NAME), orderBy("fecha", "desc"));
        
        // onSnapshot lee automáticamente de la caché local si no hay red
        onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
            eventosCache = [];  
            
            snapshot.forEach((docSnap) => {
                eventosCache.push({
                    id: docSnap.id,
                    ...docSnap.data()
                });
            });

            // Detectar si los datos vienen del servidor o de la caché local offline
            const desdeCache = snapshot.metadata.fromCache;

            if (desdeCache || !navigator.onLine) {
                if (syncSemaphore) syncSemaphore.classList.remove('online');
                if (syncTextLabel) syncTextLabel.textContent = "Modo Offline (Local)";
            } else {
                if (syncSemaphore) syncSemaphore.classList.add('online');
                if (syncTextLabel) syncTextLabel.textContent = "Cloud Sincronizado";
            }

            actualizarOpcionesMeses(eventosCache);
            window.renderizarEventosFiltrados();

        }, (error) => {
            console.warn("Aviso de conectividad Firestore (operando localmente):", error);
            if (syncSemaphore) syncSemaphore.classList.remove('online');
            if (syncTextLabel) syncTextLabel.textContent = "Modo Offline";
            
            // Renderizamos igual con lo que tenga la caché almacenada
            window.renderizarEventosFiltrados();
        });
    }

    // Renderizado dinámico y filtrado múltiple (Chip, Mes, Categoría)
    window.renderizarEventosFiltrados = function() {
        if (!tablaEventosBody) return;

        const catSeleccionada = filtroCategoria ? filtroCategoria.value.toLowerCase() : '';
        const mesSeleccionado = filtroMes ? filtroMes.value : ''; // Formato YYYY-MM
        const queryChip = busquedaChip ? busquedaChip.value.trim().toLowerCase() : '';

        const eventosFiltrados = eventosCache.filter(ev => {
            const catLower = (ev.categoria || '').toLowerCase();
            const fechaEv = ev.fecha || ''; // YYYY-MM-DD
            const mesEv = fechaEv.substring(0, 7); // YYYY-MM
            const chipEv = (ev.chipNumero || '').toLowerCase();

            const coincideCat = !catSeleccionada || catLower === catSeleccionada;
            const coincideMes = !mesSeleccionado || mesEv === mesSeleccionado;
            const coincideChip = !queryChip || chipEv.includes(queryChip);

            return coincideCat && coincideMes && coincideChip;
        });

        tablaEventosBody.innerHTML = '';

        if (eventosFiltrados.length === 0) {
            if (sinRegistros) sinRegistros.style.display = 'block';
            actualizarContadoresDashboard({ mortalidad: 0, abortos: 0, natimortos: 0, natalidad: 0, consumo: 0, traslados: 0, donaciones: 0 });
            return;
        }

        if (sinRegistros) sinRegistros.style.display = 'none';

        let cMortalidad = 0;
        let cAbortos = 0;
        let cNatimortos = 0;
        let cNatalidad = 0;
        let cConsumo = 0;
        let cTraslados = 0;
        let cDonaciones = 0;

        eventosFiltrados.forEach(ev => {
            const cat = (ev.categoria || '').toLowerCase();
            
            if (cat === 'mortalidad') cMortalidad++;
            else if (cat === 'aborto') cAbortos++;
            else if (cat === 'natimorto') cNatimortos++;
            else if (cat === 'natalidad') cNatalidad++;
            else if (cat === 'consumo') cConsumo++;
            else if (cat === 'traslado') cTraslados++;
            else if (cat === 'donacion') cDonaciones++;

            let badgeClass = 'badge-operativo';
            if (cat === 'mortalidad') badgeClass = 'badge-mortalidad';
            else if (cat === 'aborto' || cat === 'natimorto') badgeClass = 'badge-reproductivo';
            else if (cat === 'natalidad') badgeClass = 'badge-natalidad';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><div style="font-weight: 600;">${ev.fecha || 'N/D'}</div></td>
                <td>
                    <span class="badge ${badgeClass}">${ev.categoria || 'N/D'}</span><br>
                    <span style="font-size: 0.72rem; color: var(--text-muted);">${ev.grupoEtario || 'N/D'}</span>
                </td>
                <td>
                    <div style="font-weight: 600;">Chip: ${ev.chipNumero || 'N/A'}</div>
                    <div style="font-size: 0.73rem; color: #495057; max-width: 220px; white-space: normal;">${ev.descripcion || ''}</div>
                    ${ev.fotoBase64 ? `<div style="margin-top: 4px;"><a href="javascript:void(0);" onclick="window.verEvidencia('${ev.fotoBase64}')" style="font-size: 0.65rem; color: var(--secondary-color); text-decoration: underline; cursor: pointer;">Ver Foto Evidencia</a></div>` : ''}
                </td>
                <td>
                    <div style="font-size: 0.72rem;"><b>Resp:</b> ${ev.responsable || 'General'}</div>
                </td>
                <td style="text-align: center;">
                    <button class="btn-danger btn-delete" data-id="${ev.id}" title="Eliminar registro">Eliminar</button>
                </td>
            `;
            tablaEventosBody.appendChild(tr);
        });

        actualizarContadoresDashboard({
            mortalidad: cMortalidad,
            abortos: cAbortos,
            natimortos: cNatimortos,
            natalidad: cNatalidad,
            consumo: cConsumo,
            traslados: cTraslados,
            donaciones: cDonaciones
        });

        vincularEventosEliminacion();
    };

    // Poblar dinámicamente el selector de meses (YYYY-MM)
    function actualizarOpcionesMeses(data) {
        if (!filtroMes) return;
        const valorActual = filtroMes.value;
        
        filtroMes.innerHTML = '<option value="">Mes (Todos)</option>';
        
        const mesesUnicos = [...new Set(data.map(e => e.fecha ? e.fecha.substring(0, 7) : null).filter(Boolean))].sort().reverse();
        mesesUnicos.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m; 
            if (m === valorActual) opt.selected = true;
            filtroMes.appendChild(opt);
        });
    }

    if (filtroCategoria) filtroCategoria.addEventListener('change', window.renderizarEventosFiltrados);
    if (filtroMes) filtroMes.addEventListener('change', window.renderizarEventosFiltrados);
    if (busquedaChip) busquedaChip.addEventListener('input', window.renderizarEventosFiltrados);

    function actualizarContadoresDashboard(c) {
        if (kpiMortalidad) kpiMortalidad.textContent = c.mortalidad;
        if (kpiAbortos) kpiAbortos.textContent = c.abortos;
        if (kpiNatimortos) kpiNatimortos.textContent = c.natimortos;
        if (kpiNatalidad) kpiNatalidad.textContent = c.natalidad;
        if (kpiConsumo) kpiConsumo.textContent = c.consumo;
        if (kpiTraslados) kpiTraslados.textContent = c.traslados;
        if (kpiDonaciones) kpiDonaciones.textContent = c.donaciones;
    }

    function vincularEventosEliminacion() {
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                if (confirm("¿Está seguro de eliminar este evento crítico del registro del hato?")) {
                    try {
                        await deleteDoc(doc(db, COLLECTION_NAME, id));
                        mostrarToast("Registro eliminado correctamente");
                    } catch (error) {
                        console.error("Error al eliminar evento:", error);
                        mostrarToast("Error al eliminar el registro (verifique conexión)", "error");
                    }
                }
            });
        });
    }

    // Envío del formulario (Soporta alta offline instantánea)
    if (eventoForm) {
        eventoForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const categoriaSelect = document.getElementById('categoria-evento');
            const categoria = categoriaSelect?.value;
            const grupoEtario = document.getElementById('grupo-etario')?.value.trim();
            const chipNumero = document.getElementById('chip-numero')?.value.trim() || 'N/A';
            const fecha = document.getElementById('fecha-evento')?.value;
            const responsable = document.getElementById('responsable-evento')?.value.trim() || 'General';
            const descripcion = document.getElementById('descripcion-evento')?.value.trim();

            if (!categoria || !grupoEtario || !fecha || !descripcion) {
                mostrarToast("Complete los campos obligatorios (*)", "error");
                return;
            }

            // Validación de foto obligatoria
            const categoriasConFoto = ['Consumo', 'Mortalidad', 'Traslado', 'Donacion'];
            if (categoriasConFoto.includes(categoria) && !imagenBase64Actual) {
                mostrarToast(`La fotografía es obligatoria para eventos de ${categoria}`, "error");
                return;
            }

            const btnSubmit = eventoForm.querySelector('button[type="submit"]');
            if (btnSubmit) btnSubmit.disabled = true;

            const nuevoEvento = {
                categoria,
                grupoEtario,
                chipNumero,
                fecha,
                responsable,
                descripcion,
                fotoBase64: imagenBase64Actual,
                timestamp: Date.now()
            };

            try {
                // addDoc escribe de inmediato en la caché local IndexedDB aunque no haya internet
                await addDoc(collection(db, COLLECTION_NAME), nuevoEvento);
                eventoForm.reset();
                imagenBase64Actual = "";
                
                const ahora = new Date();
                const today = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
                const inputFecha = document.getElementById('fecha-evento');
                if (inputFecha) inputFecha.value = today;

                const reqFotoText = document.getElementById('req-foto-text');
                if (reqFotoText) reqFotoText.style.display = 'none';

                mostrarToast("💾 Evento guardado localmente (se sincronizará al conectar)");
            } catch (error) {
                console.error("Error al guardar localmente:", error);
                mostrarToast("Error al procesar el registro en el dispositivo", "error");
            } finally {
                if (btnSubmit) btnSubmit.disabled = false;
            }
        });
    }

    const inputFecha = document.getElementById('fecha-evento');
    if (inputFecha && !inputFecha.value) {
        const ahora = new Date();
        inputFecha.value = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
    }

    iniciarSincronizacionEventos();
});
