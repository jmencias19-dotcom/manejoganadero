/**
 * ============================================================================
 * SISTEMA DE GESTIÓN SANITARIA - HATO LAGUNA BRAVA
 * Módulo de Lógica y Persistencia de Datos (JavaScript)
 * ============================================================================
 */

class ControlSanitarioHato {
    constructor() {
        this.STORAGE_KEY = 'HL_HistorialSanitario';
        this.init();
    }

    init() {
        // Inicializar al cargar el DOM
        document.addEventListener('DOMContentLoaded', () => {
            this.configurarFechasPorDefecto();
            this.registrarEventos();
            this.renderizarHistorial();
            this.verificarEstadoRed();
        });

        // Escuchar cambios de conectividad en tiempo real (Semáforo)
        window.addEventListener('online', () => this.actualizarEstadoConectividad(true));
        window.addEventListener('offline', () => this.actualizarEstadoConectividad(false));
    }

    configurarFechasPorDefecto() {
        const inputFecha = document.getElementById('fechaAplicacion');
        if (inputFecha && !inputFecha.value) {
            inputFecha.valueAsDate = new Date();
        }
    }

    registrarEventos() {
        // Evento de envío del formulario
        const form = document.getElementById('formSanitario');
        if (form) {
            form.addEventListener('submit', (e) => this.guardarTratamiento(e));
        }

        // Evento de búsqueda / filtrado en tiempo real
        const inputBuscador = document.getElementById('buscadorHistorial');
        if (inputBuscador) {
            inputBuscador.addEventListener('input', (e) => {
                this.renderizarHistorial(e.target.value.toLowerCase());
            });
        }
    }

    /**
     * Captura los datos del formulario, valida selección múltiple y almacena localmente.
     */
    guardarTratamiento(e) {
        e.preventDefault();

        const selectFarmacos = document.getElementById('farmacosSelect');
        const farmacosSeleccionados = Array.from(selectFarmacos.selectedOptions).map(opt => opt.value);

        if (farmacosSeleccionados.length === 0) {
            alert('Atención: Debe seleccionar al menos un fármaco o producto aplicado.');
            return;
        }

        const nuevoRegistro = {
            id: 'HL-SAN-' + Date.now(),
            loteChip: document.getElementById('loteChip').value.trim(),
            clasificacion: document.getElementById('clasificacion').value,
            farmacos: farmacosSeleccionados,
            fechaAplicacion: document.getElementById('fechaAplicacion').value,
            fechaProximo: document.getElementById('fechaProximo').value || 'No programado',
            observaciones: document.getElementById('observaciones').value.trim() || 'Sin observaciones',
            timestampSincronizacion: null // Para futura cola de sync con Firebase/Supabase
        };

        try {
            let historial = this.obtenerHistorialLocal();
            historial.unshift(nuevoRegistro); // Añadir al inicio para ver lo más reciente
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(historial));

            // Feedback visual rápido y limpieza de formulario
            alert(`¡Registro guardado con éxito en el dispositivo!\nLote/Chip: ${nuevoRegistro.loteChip}\nFármacos: ${farmacosSeleccionados.join(', ')}`);
            
            document.getElementById('formSanitario').reset();
            this.configurarFechasPorDefecto();
            this.renderizarHistorial();

            // Intentar sincronización en background si hay red
            this.intentarSincronizacionRemota(nuevoRegistro);

        } catch (err) {
            console.error("Error crítico al guardar en localStorage:", err);
            alert("Error: No se pudo almacenar el registro en la memoria local del dispositivo.");
        }
    }

    obtenerHistorialLocal() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || [];
        } catch (err) {
            console.error("Error al leer el almacenamiento local:", err);
            return [];
        }
    }

    /**
     * Renderiza la tabla de historial aplicando filtros de búsqueda.
     */
    renderizarHistorial(filtro = '') {
        const historial = this.obtenerHistorialLocal();
        const tbody = document.getElementById('tablaHistorialBody');
        const sinRegistros = document.getElementById('sinRegistros');

        if (!tbody) return;

        const filtrados = historial.filter(r => {
            const farmacosStr = Array.isArray(r.farmacos) ? r.farmacos.join(', ') : (r.farmacoNombre || '');
            return r.loteChip.toLowerCase().includes(filtro) ||
                   farmacosStr.toLowerCase().includes(filtro) ||
                   r.clasificacion.toLowerCase().includes(filtro) ||
                   r.observaciones.toLowerCase().includes(filtro) ||
                   r.fechaAplicacion.includes(filtro);
        });

        if (filtrados.length === 0) {
            tbody.innerHTML = '';
            if (sinRegistros) sinRegistros.style.display = 'block';
            return;
        }

        if (sinRegistros) sinRegistros.style.display = 'none';

        tbody.innerHTML = filtrados.map(r => {
            let badgeClass = 'badge-rutinario';
            if (r.clasificacion === 'Generalizado') badgeClass = 'badge-generalizado';
            else if (r.clasificacion === 'Dirigido') badgeClass = 'badge-dirigido';
            else if (r.clasificacion === 'Correctivo') badgeClass = 'badge-correctivo';

           // Dentro de renderizarHistorial() en su script:
const listaFármacos = Array.isArray(r.farmacos) 
    ? `<div class="farmacos-container">` + r.farmacos.map(f => `<span class="farmaco-pill">• ${f}</span>`).join('') + `</div>`
    : `<strong>${r.farmacoNombre || 'N/D'}</strong>`;

            return `
                <tr>
                    <td><strong>${r.fechaAplicacion}</strong></td>
                    <td>${r.loteChip}</td>
                    <td><span class="badge ${badgeClass}">${r.clasificacion}</span></td>
                    <td>${listaFármacos}</td>
                    <td>${r.fechaProximo}</td>
                    <td style="max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${r.observaciones}">${r.observaciones}</td>
                    <td style="text-align: center;">
                        <button type="button" onclick="window.appSanitario.eliminarRegistro('${r.id}')" class="btn-danger" style="padding: 6px 10px; font-size: 0.75rem; width: auto; display: inline-block;" title="Eliminar este registro">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Elimina un registro específico por su ID único.
     */
    eliminarRegistro(id) {
        if (confirm('¿Está seguro de eliminar este registro sanitario del historial local?')) {
            let historial = this.obtenerHistorialLocal();
            historial = historial.filter(r => r.id !== id);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(historial));
            
            const inputBuscador = document.getElementById('buscadorHistorial');
            const filtroActual = inputBuscador ? inputBuscador.value.toLowerCase() : '';
            this.renderizarHistorial(filtroActual);
        }
    }

    verificarEstadoRed() {
        this.actualizarEstadoConectividad(navigator.onLine);
    }

    actualizarEstadoConectividad(isOnline) {
        const semaphore = document.getElementById('syncSemaphore');
        const syncText = document.querySelector('.sync-text');

        if (!semaphore || !syncText) return;

        if (isOnline) {
            semaphore.className = 'semaphore online';
            syncText.textContent = 'Sincronizado';
        } else {
            semaphore.className = 'semaphore offline'; // Puedes definir un color ámbar/rojo en CSS para offline
            semaphore.style.backgroundColor = '#e76f51';
            syncText.textContent = 'Modo Offline (Local)';
        }
    }

    /**
     * Gancho preparado para conectar con Firebase, Supabase o tu backend al recuperar red.
     */
    intentarSincronizacionRemota(registro) {
        if (!navigator.onLine) {
            console.trans?.('Dispositivo offline. El registro queda guardado localmente en Hato Laguna Brava.');
            return;
        }
        // Lógica futura de envío remoto asíncrono (Fetch API / WebSocket)
        console.log("Conectado a la red: Sincronizando registro con servidor...", registro);
    }
}

// Instanciar la aplicación globalmente para control de eventos en la tabla
window.appSanitario = new ControlSanitarioHato();
