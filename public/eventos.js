/* ==========================================================================
   Módulo: Registro y Control de Eventos Críticos (Versión Oficial 3.0 Integrada)
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

// Inicialización moderna con caché persistente integrada (Soporte offline total para campo)
const db = initializeFirestore(app, {
    localCache: persistentLocalCache()
});

const COLLECTION_NAME = "hato_eventos";

// Caché global en memoria para filtros reactivos y bloques mensuales
let eventosCache = [];
let imagenBase64Actual = "";

document.addEventListener('DOMContentLoaded', () => {
    const eventoForm = document.getElementById('eventoForm');
    const eventosContainer = document.getElementById('eventos-container');
    const inputFoto = document.getElementById('foto-evento');
    
    // Contadores de KPIs e Indicadores Mensuales Independientes
    const kpiMortalidad = document.getElementById('kpi-mortalidad');
    const kpiAbortos = document.getElementById('kpi-abortos');         // Específico para Abortos
    const kpiNatimortos = document.getElementById('kpi-natimortos');   // Específico para Natimortos
    const kpiNatalidad = document.getElementById('kpi-natalidad');     // Específico para Natalidad
    const kpiConsumo = document.getElementById('kpi-consumo');         // Específico para Consumo Interno
    const kpiTraslados = document.getElementById('kpi-traslados');     // Específico para Traslados
    const kpiDonaciones = document.getElementById('kpi-donaciones');   // Específico para Donaciones

    // Elementos de Filtro Reactivo y Búsqueda
    const filtroCategoria = document.getElementById('filtro-categoria');
    const filtroGrupoEtario = document.getElementById('filtro-grupo-etario');
    const filtroMes = document.getElementById('filtro-mes'); // Bloque mensual (YYYY-MM)
    const inputBusquedaChip = document.getElementById('busqueda-chip'); // Búsqueda rápida por Chip/Caravana

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

    // Procesar imagen subida a Base64 (Validando obligatoriedad por categoría crítica/operativa)
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
                // Extracción automática del bloque mensual (YYYY-MM)
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
            eventosContainer.innerHTML = '<p style="text-align: center; color: #c1121f; padding: 20px;">Modo offline activo. Los registros se almacenan de forma local y se sincronizarán al recuperar señal.</p>';
            mostrarToast("Sincronización offline activa", "error");
        });
    }

    // Renderizado dinámico y filtrado universal de eventos
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
            actualizarContadoresDashboard({ mortalidad: 0, aborto: 0, natimorto: 0, natalidad: 0, consumo: 0, traslado: 0, donacion: 0 });
            return;
        }

        // Acumuladores independientes para cada categoría del hato
        let contadores = {
            mortalidad: 0,
            aborto: 0,
            natimorto: 0,
            natalidad: 0,
            consumo: 0,
            traslado: 0,
            donacion: 0
        };

        eventosFiltrados.forEach(ev => {
            const catLower = (ev.categoria || '').toLowerCase();
            
            if (catLower === 'mortalidad') contadores.mortalidad++;
            else if (catLower === 'aborto') contadores.aborto++;
            else if (catLower === 'natimorto') contadores.natimorto++;
            else if (catLower === 'natalidad') contadores.natalidad++;
            else if (catLower === 'consumo') contadores.consumo++;
            else if (catLower === 'traslado') contadores.traslado++;
            else if (catLower === 'donacion') contadores.donacion++;

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

        actualizarContadoresDashboard(contadores);
        vincularEventosEliminacion();
    };

    // Poblar dinámicamente selectores de filtros (Grupos etarios y Bloques mensuales YYYY-MM)
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
                opt.textContent = `Bloque Mensual: ${mes}`;
                filtroMes.appendChild(opt);
            });
        }
    }

    // Event listeners para filtros reactivos
    if (filtroCategoria) filtroCategoria.addEventListener('change', window.renderizarEventosFiltrados);
    if (filtroGrupoEtario) filtroGrupoEtario.addEventListener('change', window.renderizarEventosFiltrados);
    if (filtroMes) filtroMes.addEventListener('change', window.renderizarEventosFiltrados);
    if (inputBusquedaChip) inputBusquedaChip.addEventListener('input', window.renderizarEventosFiltrados);

    // Actualizar los acumuladores independientes en la interfaz del panel
    function actualizarContadoresDashboard(c) {
        if (kpiMortalidad) kpiMortalidad.textContent = c.mortalidad;
        if (kpiAbortos) kpiAbortos.textContent = c.aborto;
        if (kpiNatimortos) kpiNatimortos.textContent = c.natimorto;
        if (kpiNatalidad) kpiNatalidad.textContent = c.natalidad;
        if (kpiConsumo) kpiConsumo.textContent = c.consumo;
        if (kpiTraslados) kpiTraslados.textContent = c.traslado;
        if (kpiDonaciones) kpiDonaciones.textContent = c.donacion;
    }

    function vincularEventosEliminacion() {
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                if (confirm("¿Está seguro de eliminar este evento crítico del registro histórico del hato?")) {
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
            const descripcion = document.getElementById('descripcion-evento')?.value.trim();
            const responsable = document.getElementById('responsable-evento')?.value.trim() || 'General';

            if (!categoria || !grupoEtario || !fecha || !descripcion) {
                mostrarToast("Complete los campos obligatorios del evento", "error");
                return;
            }

            // Validación de fotografía obligatoria para operaciones críticas y de salida
            const categoriasFotoObligatoria = ["consumo", "mortalidad", "traslado", "donacion"];
            if (categoriasFotoObligatoria.includes(categoria.toLowerCase()) && !imagenBase64Actual) {
                mostrarToast(`La evidencia fotográfica es obligatoria para la categoría: ${categoria}`, "error");
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

                mostrarToast("💾 Evento crítico registrado e integrado con éxito");
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
