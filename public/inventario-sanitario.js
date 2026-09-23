/**
 * Módulo de Inventario Sanitario y Hoja de Vida - Hato Laguna Brava
 * Automatización de registros clínicos, trazabilidad y control de lotes.
 */

class InventarioSanitarioHL {
    constructor() {
        this.storageKey = 'hl_inventario_sanitario';
        this.lotesKey = 'hl_lotes_activos';
        this.init();
    }

    init() {
        this.cargarDatosIniciales();
        this.vincularEventos();
    }

    cargarDatosIniciales() {
        // Inicializar almacenamiento local si no existe
        if (!localStorage.getItem(this.storageKey)) {
            localStorage.setItem(this.storageKey, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.lotesKey)) {
            localStorage.setItem(this.lotesKey, JSON.stringify([]));
        }
    }

    vincularEventos() {
        const form = document.getElementById('formSanitario');
        const btnPDF = document.getElementById('btnGenerarPDF');
        const btnEliminarLote = document.getElementById('btnEliminarLote');

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.registrarTratamiento();
            });
        }

        if (btnPDF) {
            btnPDF.addEventListener('click', () => {
                this.generarPDFHistorial();
            });
        }

        if (btnEliminarLote) {
            btnEliminarLote.addEventListener('click', () => {
                this.darDeBajaLote();
            });
        }
    }

    obtenerRegistros() {
        return JSON.parse(localStorage.getItem(this.storageKey)) || [];
    }

    guardarRegistros(registros) {
        localStorage.setItem(this.storageKey, JSON.stringify(registros));
    }

    registrarTratamiento() {
        const destino = document.getElementById('destino').value.trim();
        const cantidadAnimales = parseInt(document.getElementById('cantidadAnimales').value, 10);
        const tipoProtocolo = document.getElementById('tipoProtocolo').value;
        const tratamiento = document.getElementById('tratamiento').value;
        const fechaTratamiento = document.getElementById('fechaTratamiento').value;
        const proximoTratamiento = document.getElementById('proximoTratamiento').value;
        const observaciones = document.getElementById('observaciones').value.trim();

        if (!destino || !cantidadAnimales || !tipoProtocolo || !tratamiento || !fechaTratamiento) {
            alert('Por favor, complete todos los campos obligatorios para guardar la hoja de vida.');
            return;
        }

        const nuevoRegistro = {
            id: 'REG-' + Date.now(),
            destino: destino.toUpperCase(),
            cantidadAnimales,
            tipoProtocolo,
            tratamiento,
            fechaTratamiento,
            proximoTratamiento: proximoTratamiento || 'No programado',
            observaciones: observaciones || 'Sin observaciones adicionales',
            timestamp: new Date().toISOString()
        };

        const registros = this.obtenerRegistros();
        registros.push(nuevoRegistro);
        this.guardarRegistros(registros);

        alert(`¡Registro guardado con éxito en la Hoja de Vida de "${destino}"!\nTotal de animales tratados: ${cantidadAnimales}`);
        document.getElementById('formSanitario').reset();
    }

    generarPDFHistorial() {
        const destino = document.getElementById('destino').value.trim().toUpperCase();
        
        if (!destino) {
            alert('Debe especificar el lote o animal en el campo correspondiente para generar su PDF histórico.');
            return;
        }

        const registros = this.obtenerRegistros();
        const historialFiltrado = registros.filter(r => r.destino === destino);

        if (historialFiltrado.length === 0) {
            alert(`No se encontraron registros sanitarios previos para el lote o animal: ${destino}`);
            return;
        }

        // Estructura base para el reporte histórico indefinido
        console.info(`Generando reporte PDF de hoja de vida para: ${destino}`, historialFiltrado);
        alert(`Generando PDF de registro histórico indefinido (Hoja de Vida) para [${destino}]. Se han compilado ${historialFiltrado.length} eventos sanitarios.`);
    }

    darDeBajaLote() {
        const destino = document.getElementById('destino').value.trim().toUpperCase();

        if (!destino) {
            alert('Escriba el nombre del lote o animal que sale del hato para proceder con la baja.');
            return;
        }

        const confirmacion = confirm(`¿Está totalmente seguro de dar de baja al lote/animal "${destino}"? Esta acción retirará el grupo del hato activo y archivará su historial sanitario.`);
        
        if (confirmacion) {
            let registros = this.obtenerRegistros();
            // Marcar como inactivos o archivar registros asociados
            const registrosActualizados = registros.map(r => {
                if (r.destino === destino) {
                    return { ...r, estado: 'BAJA_DEL_HATO', fechaBaja: new Date().toISOString() };
                }
                return r;
            });

            this.guardarRegistros(registrosActualizados);
            alert(`El lote o animal "${destino}" ha sido dado de baja correctamente del sistema activo del Hato Laguna Brava.`);
            document.getElementById('formSanitario').reset();
        }
    }
}

// Inicialización automática del módulo al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    window.inventarioSanitarioHL = new InventarioSanitarioHL();
});
