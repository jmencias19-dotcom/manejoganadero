/* ==========================================================================
   Módulo: Registro y Control de Eventos Críticos (Versión Oficial 1.0)
   Hato Laguna Brava - Mantecal, Apure, Venezuela
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
    orderBy,
    enableIndexedDbPersistence 
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

// Habilitar persistencia offline para dispositivos móviles en campo
try {
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn("Persistencia falló: múltiples pestañas abiertas.");
        } else if (err.code == 'unimplemented') {
            console.warn("El navegador no soporta persistencia offline.");
        }
    });
} catch (e) {
    console.log("Modo offline ya configurado o no disponible.");
}

const COLLECTION_NAME = "hato_eventos";

// Caché global en memoria para filtros reactivos
let eventosCache = [];
let imagenBase64Actual = "";

document.addEventListener('DOMContentLoaded', () => {
    const eventoForm = document.getElementById('eventoForm');
    const eventosContainer = document.getElementById('eventos-container');
    const btnCapturarGps = document.getElementById('btn-capturar-gps');
    const inputFoto = document.getElementById('foto-evento');
    
    // Contadores de KPIs específicos de eventos
    const kpiMortalidad = document.getElementById('kpi-mortalidad');
    const kpiReproductivos = document.getElementById('kpi-reproductivos'); // Abortos + Natimortos
    const kpiMovimientos = document.getElementById('kpi-movimientos');   // Traslados + Donaciones + Consumo

    // Elementos de Filtro Reactivo
    const filtroCategoria = document.getElementById('filtro-categoria');
    const filtroGrupoEtario = document.getElementById('filtro-grupo-etario');

    // Función auxiliar para notificaciones Toast
    function mostrarToast(mensaje, tipo = "success") {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        if (!toast || !toastMessage) return;

        toastMessage.textContent = mensaje;
        toast.style.borderLeftColor = tipo === "error" ? "#c1121f" : "var(--accent-color, #2d6a4f)";
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3500);
    }

    // Captura automática de coordenadas GPS del campo
    if (btnCapturarGps) {
        btnCapturarGps.addEventListener('click', () => {
            if (!navigator.geolocation) {
                mostrarToast("El navegador no soporta geolocalización", "error");
                return;
            }
            
            mostrarToast("Capturando señal GPS...", "success");
            btnCapturarGps.disabled = true;
            btnCapturarGps.textContent = "Obteniendo GPS...";

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude.toFixed(6);
                    const lng = position.coords.longitude.toFixed(6);
                    
                    const inputLat = document.getElementById('gps-lat');
                    const inputLng = document.getElementById('gps-lng');
                    const spanGpsInfo = document.getElementById('gps-info');

                    if (inputLat) inputLat.value = lat;
                    if (inputLng) inputLng.value = lng;
                    if (spanGpsInfo) spanGpsInfo.textContent = `GPS Fijado: ${lat}, ${lng}`;

                    mostrarToast("Coordenadas GPS capturadas con éxito");
                    btnCapturarGps.disabled = false;
                    btnCapturarGps.textContent = "Actualizar GPS";
                },
                (error) => {
                    console.error("Error GPS:", error);
                    mostrarToast("No se pudo obtener la ubicación GPS", "error");
                    btnCapturarGps.disabled = false;
                    btnCapturarGps.textContent = "Reintentar GPS";
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    }

    // Procesar imagen subida a Base64 para almacenamiento autónomo offline
    if (inputFoto) {
        inputFoto.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(uploadEvent) {
                imagenBase64Actual = uploadEvent.target.result;
                mostrarToast("Fotografía cargada en memoria");
            };
            reader.onerror = function() {
                mostrarToast("Error al leer el archivo de imagen", "error");
            };
            reader.readAsDataURL(file);
        });
    }

    // Sincronización en tiempo real con Firestore
    function iniciarSincronizacionEventos() {
        if (!eventosContainer) return;

        const q = query(collection(db, COLLECTION_NAME), orderBy("fecha", "desc"));
        
        onSnapshot(q, (snapshot) => {
            eventosCache = []; 
            
            snapshot.forEach((docSnap) => {
                eventosCache.push({
                    id: docSnap.id,
                    ...docSnap.data()
                });
            });

            actualizarOpcionesFiltrosEventos(eventosCache);
            window.renderizarEventosFiltrados();

        }, (error) => {
            console.error("Error al sincronizar eventos:", error);
            eventosContainer.innerHTML = '<p style="text-align: center; color: #c1121f; padding: 20px;">Modo offline activo para eventos. Se sincronizará al conectar.</p>';
            mostrarToast("Sincronización offline activa", "error");
        });
    }

    // Renderizado dinámico de tarjetas y aplicación de filtros
    window.renderizarEventosFiltrados = function() {
        if (!eventosContainer) return;

        const catSeleccionada = filtroCategoria ? filtroCategoria.value.toLowerCase() : '';
        const etarioSeleccionado = filtroGrupoEtario ? filtroGrupoEtario.value.toLowerCase() : '';

        const eventosFiltrados = eventosCache.filter(ev => {
            const coincideCat = !catSeleccionada || (ev.categoria && ev.categoria.toLowerCase() === catSeleccionada);
            const coincideEtario = !etarioSeleccionado || (ev.grupoEtario && ev.grupoEtario.toLowerCase().includes(etarioSeleccionado));
            return coincideCat && coincideEtario;
        });

        eventosContainer.innerHTML = '';

        if (eventosFiltrados.length === 0) {
            eventosContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 20px;">No hay eventos registrados que coincidan con los filtros.</p>';
            actualizarKPIsEventos(0, 0, 0);
            return;
        }

        let cuentaMortalidad = 0;
        let cuentaReproductivos = 0;
        let cuentaMovimientos = 0;

        eventosFiltrados.forEach(ev => {
            const catLower = (ev.categoria || '').toLowerCase();
            if (catLower === 'mortalidad') cuentaMortalidad++;
            else if (catLower === 'aborto' || catLower === 'natimorto') cuentaReproductivos++;
            else if (['consumo', 'donacion', 'traslado'].includes(catLower)) cuentaMovimientos++;

            const div = document.createElement('div');
            div.className = 'task-card-item'; // Reutiliza la clase base de tarjetas del sistema
            div.innerHTML = `
                <div class="task-card-row">
                    <span class="task-card-date"><i class="fa-regular fa-calendar"></i> ${ev.fecha || 'Sin fecha'}</span>
                    <span class="task-card-meta"><b>Categoría:</b> <span style="text-transform: uppercase; color: var(--accent-color);">${ev.categoria || 'N/D'}</span></span>
                </div>
                <div class="task-card-labor" style="font-size: 1rem; margin: 6px 0;"><b>Grupo Etario:</b> ${ev.grupoEtario || 'N/D'} | <b>Caravana/Chip:</b> ${ev.chipNumero || 'N/A'}</div>
                <div class="task-card-meta"><i class="fa-solid fa-clipboard-user"></i> <b>Descripción:</b> ${ev.descripcion || 'Sin descripción'}</div>
                <div class="task-card-meta"><i class="fa-solid fa-user-tie"></i> <b>Responsable:</b> ${ev.responsable || 'General'}</div>
                
                ${ev.gpsLat && ev.gpsLng ? `<div class="task-card-meta" style="margin-top: 4px;"><i class="fa-solid fa-location-dot"></i> <b>GPS:</b> ${ev.gpsLat},${ev.gpsLng}</div>` : ''}
                
                ${ev.fotoBase64 ? `
                    <div style="margin-top: 8px;">
                        <img src="${ev.fotoBase64}" alt="Evidencia de evento" style="max-width: 100%; height: 120px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color);" />
                    </div>
                ` : ''}
                
                <div class="task-card-actions" style="margin-top: 10px; justify-content: flex-end;">
                    <button class="btn-delete" data-id="${ev.id}" title="Eliminar registro"><i class="fa-solid fa-trash-can"></i> Eliminar</button>
                </div>
            `;
            eventosContainer.appendChild(div);
        });

        actualizarKPIsEventos(cuentaMortalidad, cuentaReproductivos, cuentaMovimientos);
        vincularEventosEliminacion();
    };

    // Poblar dinámicamente selectores de filtros sin duplicar
    function actualizarOpcionesFiltrosEventos(data) {
        if (filtroGrupoEtario && filtroGrupoEtario.options.length <= 1) {
            const etariosUnicos = [...new Set(data.map(e => e.grupoEtario).filter(Boolean))].sort();
            etariosUnicos.forEach(et => {
                const opt = document.createElement('option');
                opt.value = et;
                opt.textContent = et;
                filtroGrupoEtario.appendChild(opt);
            });
        }
    }

    if (filtroCategoria) filtroCategoria.addEventListener('change', window.renderizarEventosFiltrados);
    if (filtroGrupoEtario) filtroGrupoEtario.addEventListener('change', window.renderizarEventosFiltrados);

    function actualizarKPIsEventos(mortalidad, reproductivos, movimientos) {
        if (kpiMortalidad) kpiMortalidad.textContent = mortalidad;
        if (kpiReproductivos) kpiReproductivos.textContent = reproductivos;
        if (kpiMovimientos) kpiMovimientos.textContent = movimientos;
    }

    function vincularEventosEliminacion() {
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                if (confirm("¿Está seguro de eliminar este evento crítico del registro del hato?")) {
                    try {
                        await deleteDoc(doc(db, COLLECTION_NAME, id));
                        mostrarToast("Registro eliminado y sincronizado");
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

            const categoria = document.getElementById('categoria-evento')?.value;
            const grupoEtario = document.getElementById('grupo-etario')?.value.trim();
            const chipNumero = document.getElementById('chip-numero')?.value.trim() || 'N/A';
            const fecha = document.getElementById('fecha-evento')?.value;
            const descripcion = document.getElementById('descripcion-evento')?.value.trim();
            const responsable = document.getElementById('responsable-evento')?.value.trim() || 'General';
            const gpsLat = document.getElementById('gps-lat')?.value || '';
            const gpsLng = document.getElementById('gps-lng')?.value || '';

            if (!categoria || !grupoEtario || !fecha || !descripcion) {
                mostrarToast("Complete los campos obligatorios del evento", "error");
                return;
            }

            const btnSubmit = eventoForm.querySelector('button[type="submit"]');
            if (btnSubmit) btnSubmit.disabled = true;

            const nuevoEvento = {
                categoria,
                grupoEtario,
                chipNumero,
                fecha,
                descripcion,
                responsable,
                gpsLat,
                gpsLng,
                fotoBase64: imagenBase64Actual,
                timestamp: Date.now()
            };

            try {
                await addDoc(collection(db, COLLECTION_NAME), nuevoEvento);
                eventoForm.reset();
                imagenBase64Actual = "";
                
                const spanGpsInfo = document.getElementById('gps-info');
                if (spanGpsInfo) spanGpsInfo.textContent = "GPS no capturado";

                // Restablecer fecha por defecto
                const ahora = new Date();
                const today = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
                const inputFecha = document.getElementById('fecha-evento');
                if (inputFecha) inputFecha.value = today;

                mostrarToast("Evento crítico registrado y sincronizado");
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
