/* ==========================================================================
   Módulo: Registro y Control de Eventos Críticos (Versión Compatible HTML)
   Hato Laguna Brava - Mantecal, Apure, Venezuela
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {  
    initializeFirestore,  
    persistentLocalCache,
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

// Inicialización moderna con caché persistente (Soporte offline total en campo)
const db = initializeFirestore(app, {
    localCache: persistentLocalCache()
});

const COLLECTION_NAME = "hato_eventos";

// Caché global en memoria para filtros reactivos
let eventosCache = [];
let imagenBase64Actual = "";

document.addEventListener('DOMContentLoaded', () => {
    const eventoForm = document.getElementById('eventoForm');
    const tablaEventosBody = document.getElementById('tablaEventosBody');
    const sinRegistros = document.getElementById('sinRegistros');
    const inputFoto = document.getElementById('foto-evento');
    
    // Contadores de KPIs según tu HTML
    const kpiMortalidad = document.getElementById('kpi-mortalidad');
    const kpiReproductivos = document.getElementById('kpi-reproductivos'); // Abortos y Natimortos
    const kpiMovimientos = document.getElementById('kpi-movimientos');     // Consumo, Donación, Traslado

    // Elementos de Filtro Reactivo
    const filtroCategoria = document.getElementById('filtro-categoria');
    const filtroGrupoEtario = document.getElementById('filtro-grupo-etario');

    // Semáforo Cloud UI
    const syncSemaphore = document.getElementById('syncSemaphore');
    const syncTextLabel = document.getElementById('syncTextLabel');

    // Función auxiliar para notificaciones Toast
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

    // Manejo de Geolocalización GPS en campo
    const btnCapturarGps = document.getElementById('btn-capturar-gps');
    const gpsInfo = document.getElementById('gps-info');
    const gpsLat = document.getElementById('gps-lat');
    const gpsLng = document.getElementById('gps-lng');

    if (btnCapturarGps) {
        btnCapturarGps.addEventListener('click', () => {
            if (!navigator.geolocation) {
                mostrarToast("La geolocalización no está soportada en este dispositivo", "error");
                return;
            }
            gpsInfo.textContent = "Obteniendo coordenadas GPS...";
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude.toFixed(6);
                    const lng = position.coords.longitude.toFixed(6);
                    gpsLat.value = lat;
                    gpsLng.value = lng;
                    gpsInfo.textContent = `Lat: ${lat}, Lng: ${lng}`;
                    mostrarToast("Coordenadas GPS fijadas con éxito");
                },
                (error) => {
                    console.error("Error GPS:", error);
                    gpsInfo.textContent = "Error al obtener GPS (verifique permisos)";
                    mostrarToast("No se pudo capturar la posición GPS", "error");
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
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

    // Sincronización en tiempo real con Firestore
    function iniciarSincronizacionEventos() {
        if (!tablaEventosBody) return;

        const q = query(collection(db, COLLECTION_NAME), orderBy("fecha", "desc"));
        
        onSnapshot(q, (snapshot) => {
            eventosCache = [];  
            
            snapshot.forEach((docSnap) => {
                eventosCache.push({
                    id: docSnap.id,
                    ...docSnap.data()
                });
            });

            // Actualizar semáforo a online
            if (syncSemaphore) syncSemaphore.classList.add('online');
            if (syncTextLabel) syncTextLabel.textContent = "Cloud Sincronizado";

            actualizarOpcionesFiltroEtarios(eventosCache);
            window.renderizarEventosFiltrados();

        }, (error) => {
            console.error("Error al sincronizar eventos:", error);
            if (syncSemaphore) syncSemaphore.classList.remove('online');
            if (syncTextLabel) syncTextLabel.textContent = "Modo Offline";
            mostrarToast("Trabajando en modo offline (datos locales)", "error");
            
            // Renderizar con caché local disponible
            window.renderizarEventosFiltrados();
        });
    }

    // Renderizado dinámico y filtrado en la Tabla HTML
    window.renderizarEventosFiltrados = function() {
        if (!tablaEventosBody) return;

        const catSeleccionada = filtroCategoria ? filtroCategoria.value.toLowerCase() : '';
        const etarioSeleccionado = filtroGrupoEtario ? filtroGrupoEtario.value.toLowerCase() : '';

        const eventosFiltrados = eventosCache.filter(ev => {
            const coincideCat = !catSeleccionada || (ev.categoria && ev.categoria.toLowerCase() === catSeleccionada);
            const coincideEtario = !etarioSeleccionado || (ev.grupoEtario && ev.grupoEtario.toLowerCase().includes(etarioSeleccionado));
            return coincideCat && coincideEtario;
        });

        tablaEventosBody.innerHTML = '';

        if (eventosFiltrados.length === 0) {
            if (sinRegistros) sinRegistros.style.display = 'block';
            actualizarContadoresDashboard({ mortalidad: 0, reproductivos: 0, movimientos: 0 });
            return;
        }

        if (sinRegistros) sinRegistros.style.display = 'none';

        let conteoMortalidad = 0;
        let conteoReproductivos = 0; // Abortos + Natimortos
        let conteoMovimientos = 0;     // Consumo + Donacion + Traslado

        eventosFiltrados.forEach(ev => {
            const catLower = (ev.categoria || '').toLowerCase();
            
            if (catLower === 'mortalidad') conteoMortalidad++;
            else if (catLower === 'aborto' || catLower === 'natimorto') conteoReproductivos++;
            else if (catLower === 'consumo' || catLower === 'donacion' || catLower === 'traslado') conteoMovimientos++;

            // Asignar color de badge institucional según tipo
            let badgeClass = 'badge-operativo';
            if (catLower === 'mortalidad') badgeClass = 'badge-mortalidad';
            else if (catLower === 'aborto' || catLower === 'natimorto') badgeClass = 'badge-reproductivo';

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
                    ${ev.fotoBase64 ? `<div style="margin-top: 4px;"><a href="${ev.fotoBase64}" target="_blank" style="font-size: 0.65rem; color: var(--secondary-color);">Ver Foto Evidencia</a></div>` : ''}
                </td>
                <td>
                    <div style="font-size: 0.72rem;"><b>Resp:</b> ${ev.responsable || 'General'}</div>
                    ${ev.lat && ev.lng ? `<div style="font-size: 0.62rem; color: #1d3557;"><i class="fa-solid fa-location-dot"></i> ${ev.lat},${ev.lng}</div>` : '<div style="font-size: 0.62rem; color: #adb5bd;">Sin GPS</div>'}
                </td>
                <td style="text-align: center;">
                    <button class="btn-danger btn-delete" data-id="${ev.id}" title="Eliminar registro">Eliminar</button>
                </td>
            `;
            tablaEventosBody.appendChild(tr);
        });

        actualizarContadoresDashboard({
            mortalidad: conteoMortalidad,
            reproductivos: conteoReproductivos,
            movimientos: conteoMovimientos
        });

        vincularEventosEliminacion();
    };

    // Poblar dinámicamente selectores de grupos etarios
    function actualizarOpcionesFiltroEtarios(data) {
        if (!filtroGrupoEtario) return;
        const valorActual = filtroGrupoEtario.value;
        
        // Mantener opción por defecto
        filtroGrupoEtario.innerHTML = '<option value="">Todos los Etarios</option>';
        
        const etariosUnicos = [...new Set(data.map(e => e.grupoEtario).filter(Boolean))].sort();
        etariosUnicos.forEach(et => {
            const opt = document.createElement('option');
            opt.value = et;
            opt.textContent = et;
            if (et === valorActual) opt.selected = true;
            filtroGrupoEtario.appendChild(opt);
        });
    }

    // Event listeners para filtros reactivos
    if (filtroCategoria) filtroCategoria.addEventListener('change', window.renderizarEventosFiltrados);
    if (filtroGrupoEtario) filtroGrupoEtario.addEventListener('change', window.renderizarEventosFiltrados);

    // Actualizar los KPIs en la interfaz
    function actualizarContadoresDashboard(c) {
        if (kpiMortalidad) kpiMortalidad.textContent = c.mortalidad;
        if (kpiReproductivos) kpiReproductivos.textContent = c.reproductivos;
        if (kpiMovimientos) kpiMovimientos.textContent = c.movimientos;
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
                        mostrarToast("Error al eliminar el registro", "error");
                    }
                }
            });
        });
    }

    // Manejo de envío del formulario de eventos
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
            
            const lat = gpsLat ? gpsLat.value : '';
            const lng = gpsLng ? gpsLng.value : '';

            if (!categoria || !grupoEtario || !fecha || !descripcion) {
                mostrarToast("Complete los campos obligatorios (*)", "error");
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
                lat,
                lng,
                fotoBase64: imagenBase64Actual,
                timestamp: Date.now()
            };

            try {
                await addDoc(collection(db, COLLECTION_NAME), nuevoEvento);
                eventoForm.reset();
                imagenBase64Actual = "";
                if (gpsLat) gpsLat.value = '';
                if (gpsLng) gpsLng.value = '';
                if (gpsInfo) gpsInfo.textContent = "GPS no capturado";
                
                // Restablecer fecha por defecto a hoy
                const ahora = new Date();
                const today = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
                const inputFecha = document.getElementById('fecha-evento');
                if (inputFecha) inputFecha.value = today;

                mostrarToast("💾 Evento crítico registrado y sincronizado con éxito");
            } catch (error) {
                console.error("Error al guardar evento:", error);
                mostrarToast("Guardado localmente. Se sincronizará al conectar", "error");
            } finally {
                if (btnSubmit) btnSubmit.disabled = false;
            }
        });
    }

    // Inicializar fecha actual por defecto en el formulario
    const inputFecha = document.getElementById('fecha-evento');
    if (inputFecha && !inputFecha.value) {
        const ahora = new Date();
        inputFecha.value = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
    }

    // Iniciar sincronización en tiempo real
    iniciarSincronizacionEventos();
});
