/* ==========================================================================
   Módulo: Registro y Control de Eventos Críticos (Versión Oficial 2.0)
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

// Caché global en memoria para filtros reactivos y mensuales
let eventosCache = [];
let imagenBase64Actual = "";

document.addEventListener('DOMContentLoaded', () => {
    const eventoForm = document.getElementById('eventoForm');
    const eventosContainer = document.getElementById('eventos-container');
    const inputFoto = document.getElementById('foto-evento');
    
    // Contadores de KPIs mensuales
    const kpiMortalidad = document.getElementById('kpi-mortalidad');
    const kpiReproductivos = document.getElementById('kpi-reproductivos'); // Abortos + Natimortos + Natalidad
    const kpiMovimientos = document.getElementById('kpi-movimientos');   // Traslados + Donaciones + Consumo

    // Elementos de Filtro Reactivo y Búsqueda
    const filtroCategoria = document.getElementById('filtro-categoria');
    const filtroGrupoEtario = document.getElementById('filtro-grupo-etario');
    const filtroMes = document.getElementById('filtro-mes'); // Nuevo filtro por bloque de mes (YYYY-MM)
    const inputBusquedaChip = document.getElementById('busqueda-chip'); // Nueva barra de búsqueda por Chip/Caravana

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

    // Procesar imagen subida a Base64 (Validando obligatoriedad según categoría)
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
        if (!eventosContainer) return;

        const q = query(collection(db, COLLECTION_NAME), orderBy("fecha", "desc"));
        
        onSnapshot(q, (snapshot) => {
            eventosCache = [];  
            
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                // Extraer el mes (YYYY-MM) automáticamente de la fecha del evento para los bloques mensuales
                const mesAnio = data.fecha ? data.fecha.substring(0, 7) : "Sin mes";
                
                eventosCache.push({
                    id: docSnap.id,
                    mesAnio,
                    ...data
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

    // Renderizado dinámico de tarjetas, filtros por categoría, etario, mes y chip
    window.renderizarEventosFiltrados = function() {
        if (!eventosContainer) return;

        const catSeleccionada = filtroCategoria ? filtroCategoria.value.toLowerCase() : '';
        const etarioSeleccionado = filtroGrupoEtario ? filtroGrupoEtario.value.toLowerCase() : '';
        const mesSeleccionado = filtroMes ? filtroMes.value : '';
        const textoChip = inputBusquedaChip ? inputBusquedaChip.value.toLowerCase().trim() : '';

        const eventosFiltrados = eventosCache.filter(ev => {
            const coincideCat = !catSeleccionada || (ev.categoria && ev.categoria.toLowerCase() === catSeleccionada);
            const coincideEtario = !etarioSeleccionado || (ev.grupoEtario && ev.grupoEtario.toLowerCase().includes(etarioSeleccionado));
            const coincideMes = !mesSeleccionado || (ev.mesAnio === mesSeleccionado);
            const coincideChip = !textoChip || (ev.chipNumero && ev.chipNumero.toLowerCase().includes(textoChip));
            
            return coincideCat && coincideEtario && coincideMes && coincideChip;
        });

        eventosContainer.innerHTML = '';

        if (eventosFiltrados.length === 0) {
            eventosContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 20px;">No hay eventos registrados que coincidan con los criterios de búsqueda.</p>';
            actualizarKPIsEventos(0, 0, 0);
            return;
        }

        let cuentaMortalidad = 0;
        let cuentaReproductivos = 0; // Incluye Aborto, Natimorto y Natalidad
        let cuentaMovimientos = 0;  // Incluye Consumo, Donación y Traslado

        eventosFiltrados.forEach(ev => {
            const catLower = (ev.categoria || '').toLowerCase();
            
            if (catLower === 'mortalidad') {
                cuentaMortalidad++;
            } else if (['aborto', 'natimorto', 'natalidad'].includes(catLower)) {
                cuentaReproductivos++;
            } else if (['consumo', 'donacion', 'traslado'].includes(catLower)) {
                cuentaMovimientos++;
            }

            const div = document.createElement('div');
            div.className = 'task-card-item';
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

    // Poblar dinámicamente selectores de filtros (Etarios y Meses)
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

        if (filtroMes && filtroMes.options.length <= 1) {
            const mesesUnicos = [...new Set(data.map(e => e.mesAnio).filter(Boolean))].sort().reverse();
            mesesUnicos.forEach(mes => {
                const opt = document.createElement('option');
                opt.value = mes;
                opt.textContent = `Bloque: ${mes}`;
                filtroMes.appendChild(opt);
            });
        }
    }

    // Event listeners para filtros reactivos
    if (filtroCategoria) filtroCategoria.addEventListener('change', window.renderizarEventosFiltrados);
    if (filtroGrupoEtario) filtroGrupoEtario.addEventListener('change', window.renderizarEventosFiltrados);
    if (filtroMes) filtroMes.addEventListener('change', window.renderizarEventosFiltrados);
    if (inputBusquedaChip) inputBusquedaChip.addEventListener('input', window.renderizarEventosFiltrados);

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

    // Manejo de envío del formulario de eventos (Botón Registrar y Sincronizar)
    if (eventoForm) {
        eventoForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const categoriaSelect = document.getElementById('categoria-evento');
            const categoria = categoriaSelect?.value;
            const grupoEtario = document.getElementById('grupo-etario')?.value.trim();
            const chipNumero = document.getElementById('chip-numero')?.value.trim() || 'N/A';
            const fecha = document.getElementById('fecha-evento')?.value;
            const descripcion = document.getElementById('descripcion-evento')?.value.trim();
            const responsable = document.getElementById('responsable-evento')?.value.trim() || 'General';

            if (!categoria || !grupoEtario || !fecha || !descripcion) {
                mostrarToast("Complete los campos obligatorios del evento", "error");
                return;
            }

            // REGLA NUEVA: Evidencia fotográfica obligatoria para categorías específicas
            const categoriasFotoObligatoria = ["consumo", "mortalidad", "traslado", "donacion"];
            if (categoriasFotoObligatoria.includes(categoria.toLowerCase()) && !imagenBase64Actual) {
                mostrarToast(`La evidencia fotográfica es obligatoria para: ${categoria}`, "error");
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
                gpsLat: "", // Opcional / Se puede rellenar desde la foto si aplica
                gpsLng: "",
                fotoBase64: imagenBase64Actual,
                timestamp: Date.now()
            };

            try {
                await addDoc(collection(db, COLLECTION_NAME), nuevoEvento);
                eventoForm.reset();
                imagenBase64Actual = "";
                
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
