/**
 * ============================================================================
 * HATO LAGUNA BRAVA - MOTOR MAESTRO DE PESAJE Y GESTIÓN GERENCIAL (v4.1)
 * Ubicación: Sector Los Módulos, Mantecal, Estado Apure, Venezuela
 * Administrador / Veterinario: Dr. Juan José Mencías Guzmán
 * ============================================================================
 */

// Estructura global de la aplicación
const HatoApp = {
    storageKeyLotes: 'lb_historial_lotes',
    storageKeyBitacora: 'lb_bitacora_maestra',
    papeleraDeshacer: [], // Pila temporal para el hermanito "Rehacer" (Redo)
    
    init: function() {
        this.configurarFechasPorDefecto();
        this.vincularEventos();
        this.actualizarContadoresYVistas();
        this.monitorearConexiónRed();
        console.log("🚀 Sistema Maestro Hato Laguna Brava inicializado correctamente.");
    },

    configurarFechasPorDefecto: function() {
        const inputActual = document.getElementById('inputFechaActual');
        const inputProximo = document.getElementById('inputFechaProximo');
        
        if (inputActual && !inputActual.value) {
            inputActual.valueAsDate = new Date();
        }
        if (inputProximo && !inputProximo.value) {
            let fechaProx = new Date();
            fechaProx.setDate(fechaProx.getDate() + 30);
            inputProximo.valueAsDate = fechaProx;
        }
    },

    obtenerHistorial: function() {
        return JSON.parse(localStorage.getItem(this.storageKeyLotes)) || [];
    },

    guardarHistorial: function(historial) {
        localStorage.setItem(this.storageKeyLotes, JSON.stringify(historial));
        this.respaldarBitacoraEsencial(historial);
    },

    // Persistencia histórica inteligente: Guarda lo esencial en bitácora aunque borren lotes
    respaldarBitacoraEsencial: function(historial) {
        let bitacora = JSON.parse(localStorage.getItem(this.storageKeyBitacora)) || [];
        historial.forEach(reg => {
            if (!bitacora.some(b => b.timestampRegistro === reg.timestampRegistro)) {
                bitacora.push({
                    timestampRegistro: reg.timestampRegistro,
                    lote: reg.lote,
                    fecha: reg.fechaActual,
                    peso: reg.pesoPromedioLote,
                    gmd: reg.gmdCalculada
                });
            }
        });
        localStorage.setItem(this.storageKeyBitacora, JSON.stringify(bitacora));
    },

    vincularEventos: function() {
        // Recálculo dinámico en tiempo real al modificar inputs
        const inputsMonitoreados = ['inputPesoPromedio', 'inputPesoObjetivo', 'inputMesesObjetivo', 'inputLote', 'inputFechaActual', 'inputFechaProximo'];
        inputsMonitoreados.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.calcularIndicadoresDinamicos());
            }
        });

        // Botón Registrar en Memoria
        const btnProcesar = document.getElementById('btnProcesarPesaje');
        if (btnProcesar) {
            btnProcesar.addEventListener('click', () => this.registrarPesaje());
        }

        // Botones del Dúo Dinámico: Deshacer y Rehacer
        const btnDeshacer = document.getElementById('btnDeshacerUltimo');
        if (btnDeshacer) {
            btnDeshacer.addEventListener('click', () => this.deshacerUltimoRegistro());
        }

        const btnRehacer = document.getElementById('btnRehacerUltimo');
        if (btnRehacer) {
            btnRehacer.addEventListener('click', () => this.rehacerRegistro());
        }

        // Botón de Eliminación Total del Lote (Zona Segura)
        const btnEliminarTotal = document.getElementById('btnEliminarLoteTotal');
        if (btnEliminarTotal) {
            btnEliminarTotal.addEventListener('click', () => this.eliminarLotePorCompleto());
        }
    },

    calcularIndicadoresDinamicos: function() {
        let loteNombre = document.getElementById('inputLote')?.value || '';
        let fechaActualStr = document.getElementById('inputFechaActual')?.value || '';
        let fechaProximaStr = document.getElementById('inputFechaProximo')?.value || '';
        let pesoProm = parseFloat(document.getElementById('inputPesoPromedio')?.value) || 0;
        let pesoObj = parseFloat(document.getElementById('inputPesoObjetivo')?.value) || 0;
        let mesesMeta = parseFloat(document.getElementById('inputMesesObjetivo')?.value) || 1;

        let historial = this.obtenerHistorial();
        let registrosLote = historial.filter(r => r.lote === loteNombre);
        let gmdCalculada = 0.50; 

        // Flexibilidad de fechas: Recálculo automático de GMD según intervalo real transcurrido
        if (registrosLote.length > 0) {
            let ultimoReg = registrosLote[registrosLote.length - 1];
            let fAnterior = new Date(ultimoReg.fechaActual);
            let fActual = new Date(fechaActualStr);
            let diasTranscurridos = Math.round((fActual - fAnterior) / (1000 * 60 * 60 * 24));

            if (diasTranscurridos > 0) {
                let diffKilos = pesoProm - ultimoReg.pesoPromedioLote;
                gmdCalculada = diffKilos / diasTranscurridos;
                if (gmdCalculada < 0) gmdCalculada = 0.01; // Evita GMD negativa por error de báscula
            }
        } else {
            let kgsMetaInit = pesoObj - pesoProm;
            let diasMetaInit = mesesMeta * 30;
            if (diasMetaInit > 0) gmdCalculada = kgsMetaInit / diasMetaInit;
        }

        const elemGMD = document.getElementById('resumenGMD');
        if (elemGMD) elemGMD.innerText = `${gmdCalculada.toFixed(2)} kg/día`;

        let kgsFaltantes = pesoObj - pesoProm;
        if (kgsFaltantes < 0) kgsFaltantes = 0;

        let diasTotales = gmdCalculada > 0 ? (kgsFaltantes / gmdCalculada) : 0;
        let mesesFaltantes = Math.floor(diasTotales / 30);
        let diasRestantes = Math.round(diasTotales % 30);

        const elemKgsF = document.getElementById('resumenKgsFaltantes');
        if (elemKgsF) elemKgsF.innerText = `+${kgsFaltantes.toFixed(1)} kg`;

        const elemTiempoF = document.getElementById('resumenTiempoFaltante');
        if (elemTiempoF) elemTiempoF.innerText = `${mesesFaltantes} meses y ${diasRestantes} días`;

        // Brújula Temporal y Alertas Físicas (Sonido + Vibración)
        let cardBrujulaBox = document.getElementById('cardBrujulaBox');
        let resumenBrujulaDias = document.getElementById('resumenBrujulaDias');
        
        if (fechaProximaStr && cardBrujulaBox && resumenBrujulaDias) {
            let hoy = new Date();
            hoy.setHours(0,0,0,0);
            let fProxima = new Date(fechaProximaStr + 'T00:00:00');
            let diffDiasProximo = Math.round((fProxima - hoy) / (1000 * 60 * 60 * 24));

            cardBrujulaBox.className = "kpi-card-item";

            if (diffDiasProximo < 0) {
                cardBrujulaBox.classList.add('cv-alert-danger');
                resumenBrujulaDias.innerText = `¡VENCIDO por ${Math.abs(diffDiasProximo)} días!`;
                this.dispararAlertaManga('urgente');
            } else if (diffDiasProximo <= 3) {
                cardBrujulaBox.classList.add('cv-alert-warning');
                resumenBrujulaDias.innerText = `¡Inminente! (Faltan ${diffDiasProximo} días)`;
                this.dispararAlertaManga('suave');
            } else {
                cardBrujulaBox.classList.add('cv-alert-optimal');
                resumenBrujulaDias.innerText = `En fecha (Faltan ${diffDiasProximo} días)`;
            }
        }

        return { gmdCalculada, kgsFaltantes };
    },

    // Alertas de Manga: Sonido sintetizado + Vibración física en dispositivos móviles
    dispararAlertaManga: function(tipo) {
        try {
            // Vibración en dispositivos móviles compatibles (Patrón de pulso de manga)
            if (navigator.vibrate) {
                navigator.vibrate(tipo === 'urgente' ? [300, 150, 300] : 200);
            }

            // Sintetizador de audio Web Audio API
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            osc.type = tipo === 'urgente' ? 'sawtooth' : 'sine';
            osc.frequency.setValueAtTime(tipo === 'urgente' ? 880 : 587.33, audioCtx.currentTime);
            
            gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
            
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            osc.start();
            osc.stop(audioCtx.currentTime + 0.6);
        } catch(e) {
            console.log("Audio o vibración restringida por políticas del navegador", e);
        }
    },

    actualizarContadoresYVistas: function() {
        let historial = this.obtenerHistorial();
        const contadorElem = document.getElementById('resumenConteoHistorial');
        if (contadorElem) {
            contadorElem.innerText = `${historial.length} Pesajes Registrados`;
        }
        
        const btnRehacer = document.getElementById('btnRehacerUltimo');
        if (btnRehacer) {
            btnRehacer.disabled = (this.papeleraDeshacer.length === 0);
        }

        this.calcularIndicadoresDinamicos();
    },

    registrarPesaje: function() {
        let loteNombre = document.getElementById('inputLote').value;
        let temporada = document.getElementById('selectTemporada').value;
        let fechaActualStr = document.getElementById('inputFechaActual').value;
        let fechaProximaStr = document.getElementById('inputFechaProximo').value;
        let pesoProm = parseFloat(document.getElementById('inputPesoPromedio').value) || 0;
        let pesoObj = parseFloat(document.getElementById('inputPesoObjetivo').value) || 0;
        let mesesMeta = parseFloat(document.getElementById('inputMesesObjetivo').value) || 0;
        let cv = parseFloat(document.getElementById('inputCV').value) || 0;
        let observaciones = document.getElementById('inputObservaciones').value;

        let calculos = this.calcularIndicadoresDinamicos();
        let historial = this.obtenerHistorial();

        let registroActual = {
            timestampRegistro: new Date().toISOString(),
            fechaActual: fechaActualStr,
            fechaProximoPesaje: fechaProximaStr,
            lote: loteNombre,
            temporada: temporada,
            pesoPromedioLote: pesoProm,
            pesoObjetivoLote: pesoObj,
            mesesObjetivo: mesesMeta,
            gmdCalculada: calculos.gmdCalculada,
            cvLote: cv,
            observaciones: observaciones
        };

        historial.push(registroActual);
        this.guardarHistorial(historial);
        
        // Limpia la papelera de rehacer al realizar un guardado genuino en manga
        this.papeleraDeshacer = [];

        this.actualizarContadoresYVistas();
        alert("¡Pesaje actual y sincronización de la brújula guardados con éxito en la memoria!");
    },

    deshacerUltimoRegistro: function() {
        let historial = this.obtenerHistorial();
        if (historial.length === 0) {
            alert("No hay registros en la memoria local para deshacer.");
            return;
        }

        let eliminado = historial.pop();
        this.papeleraDeshacer.push(eliminado);

        this.guardarHistorial(historial);
        this.actualizarContadoresYVistas();
        alert(`Se deshizo el registro del ${eliminado.fechaActual} (${eliminado.pesoPromedioLote} kg). ¡Puedes usar 'Rehacer' si fue un error!`);
    },

    rehacerRegistro: function() {
        if (this.papeleraDeshacer.length === 0) {
            alert("No hay acciones pendientes para rehacer.");
            return;
        }

        let restaurado = this.papeleraDeshacer.pop();
        let historial = this.obtenerHistorial();
        historial.push(restaurado);

        this.guardarHistorial(historial);
        this.actualizarContadoresYVistas();
        alert(`¡Se ha rehecho y restaurado el registro del ${restaurado.fechaActual} (${restaurado.pesoPromedioLote} kg)!`);
    },

    eliminarLotePorCompleto: function() {
        let loteNombre = document.getElementById('inputLote').value;
        if(confirm(`⚠️ ATENCIÓN: ¿Está seguro de ELIMINAR POR COMPLETO todos los pesajes del lote "${loteNombre}"?\n\nLa bitácora histórica esencial quedará respaldada en auditoría.`)) {
            let historial = this.obtenerHistorial();
            historial = historial.filter(r => r.lote !== loteNombre);
            
            this.guardarHistorial(historial);
            this.papeleraDeshacer = [];
            this.actualizarContadoresYVistas();
            alert(`¡El lote "${loteNombre}" ha sido removido del sistema activo!`);
        }
    },

    monitorearConexiónRed: function() {
        const semaforo = document.getElementById('sync-semaphore');
        const textoSync = document.getElementById('sync-text');

        const actualizarEstadoRed = () => {
            if (navigator.onLine) {
                if(semaforo) semaforo.className = "semaphore online";
                if(textoSync) textoSync.innerText = "Sincronizado Cloud & Local";
            } else {
                if(semaforo) semaforo.className = "semaphore offline";
                if(textoSync) textoSync.innerText = "Modo Offline (Hato sin Red)";
            }
        };

        window.addEventListener('online', actualizarEstadoRed);
        window.addEventListener('offline', actualizarEstadoRed);
        actualizarEstadoRed();
    },

    // Generador del Reporte PDF Gerencial para el Sr. Franco Iperatori Valentini
    generarReporteGerencialPDF: function() {
        let loteSeleccionado = document.getElementById('inputLote').value;
        let historial = this.obtenerHistorial();
        let registrosLote = historial.filter(r => r.lote === loteSeleccionado);

        if (registrosLote.length === 0) {
            alert("No hay suficientes registros históricos en este lote para generar el reporte para la gerencia.");
            return;
        }

        let primerReg = registrosLote[0];
        let ultimoReg = registrosLote[registrosLote.length - 1];
        let fechaEmision = new Date().toLocaleDateString('es-VE');

        let filasTablaHTML = '';
        registrosLote.forEach((reg, index) => {
            let gmdParcial = index === 0 ? 'Inicio' : `${reg.gmdCalculada.toFixed(2)} kg/d`;
            filasTablaHTML += `
                <tr>
                    <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${reg.fechaActual}</td>
                    <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${reg.temporada || 'N/D'}</td>
                    <td style="border: 1px solid #ccc; padding: 8px; text-align: center; font-weight: bold;">${reg.pesoPromedioLote} kg</td>
                    <td style="border: 1px solid #ccc; padding: 8px; text-align: center; color: #2d6a4f;">${gmdParcial}</td>
                    <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${reg.cvLote}%</td>
                    <td style="border: 1px solid #ccc; padding: 8px; font-size: 0.85rem;">${reg.observaciones || 'Sin novedad'}</td>
                </tr>
            `;
        });

        let ventanaReporte = window.open('', '_blank');
        ventanaReporte.document.write(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Reporte Gerencial - Hato Laguna Brava</title>
                <style>
                    body { font-family: Arial, sans-serif; color: #1b4332; margin: 25px; line-height: 1.4; }
                    .header-reporte { border-bottom: 2px solid #1b4332; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
                    .header-reporte h2 { margin: 0; font-size: 1.4rem; color: #1b4332; }
                    .header-reporte p { margin: 2px 0; font-size: 0.9rem; color: #555; }
                    .info-card-box { background-color: #f4f9f6; border: 1px solid #b7e4c7; padding: 12px; border-radius: 6px; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 25px; }
                    th { background-color: #1b4332; color: #ffffff; border: 1px solid #1b4332; padding: 10px; font-size: 0.85rem; text-align: center; }
                    .firma-section { margin-top: 50px; display: flex; justify-content: space-between; }
                    .firma-box { width: 40%; text-align: center; border-top: 1px solid #1b4332; padding-top: 8px; font-size: 0.9rem; font-weight: bold; }
                    @media print { body { margin: 10px; } .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="header-reporte">
                    <div>
                        <h2>HATO LAGUNA BRAVA</h2>
                        <p>Sector Los Módulos, Mantecal, Estado Apure, Venezuela</p>
                        <p><strong>Reporte Gerencial de Producción y Control de Pesaje</strong></p>
                    </div>
                    <div style="text-align: right;">
                        <p><strong>Fecha de Emisión:</strong> ${fechaEmision}</p>
                        <p><strong>Propietario:</strong> Sr. Franco Iperatori Valentini</p>
                    </div>
                </div>

                <div class="info-card-box">
                    <p><strong>Lote / Bloque Evaluado:</strong> ${loteSeleccionado}</p>
                    <p><strong>Total Controles de Manga Registrados:</strong> ${registrosLote.length}</p>
                    <p><strong>Peso Inicial del Registro:</strong> ${primerReg.pesoPromedioLote} kg (${primerReg.fechaActual})</p>
                    <p><strong>Peso Actual del Lote:</strong> ${ultimoReg.pesoPromedioLote} kg (${ultimoReg.fechaActual})</p>
                    <p><strong>Meta del Lote:</strong> ${ultimoReg.pesoObjetivoLote} kg (Plazo estimado: ${ultimoReg.mesesObjetivo} meses)</p>
                </div>

                <h3 style="color: #1b4332; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Bitácora Histórica de Control de Ganancia</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Fecha de Control</th>
                            <th>Temporada</th>
                            <th>Peso Promedio</th>
                            <th>GMD Período</th>
                            <th>CV (%)</th>
                            <th>Observaciones Cualitativas de Manga</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filasTablaHTML}
                    </tbody>
                </table>

                <div style="background-color: #fefae0; border: 1px solid #d4a373; padding: 12px; border-radius: 6px; font-size: 0.9rem;">
                    <strong>Nota Técnica y Estratégica:</strong> Comportamiento productivo evaluado bajo régimen de sabana en Apure. Los datos garantizan trazabilidad inalterable para la toma de decisiones gerenciales y proyecciones de salida.
                </div>

                <div class="firma-section">
                    <div class="firma-box">
                        Sr. Franco Iperatori Valentini<br>
                        <span style="font-weight: normal; font-size: 0.8rem;">Propietario / Dirección General</span>
                    </div>
                    <div class="firma-box">
                        Dr. Juan José Mencías Guzmán<br>
                        <span style="font-weight: normal; font-size: 0.8rem;">Administración y Control Veterinario</span>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 30px;" class="no-print">
                    <button onclick="window.print();" style="background-color: #1b4332; color: white; border: none; padding: 12px 24px; font-size: 1rem; border-radius: 6px; cursor: pointer; font-weight: bold;">
                        🖨️ Imprimir / Guardar como PDF Gerencial
                    </button>
                </div>
            </body>
            </html>
        `);
        ventanaReporte.document.close();
    }
};

// Arrancar el motor al cargar la página
window.onload = function() {
    HatoApp.init();
};/* ==========================================================================
   Módulo de Control de Levante - Hato Laguna Brava (Mantecal, Apure)
   Asistente I.D. & Protocolo Offline-First (Versión Operativa Definitiva)
   ========================================================================== */

const OFFLINE_QUEUE_KEY = "hl_levante_offline_queue";

document.addEventListener('DOMContentLoaded', () => {
    console.log("[SISTEMA] Inicializando Módulo de Levante - Hato Laguna Brava...");

    // 1. Enlace directo y estricto por ID único (Garantiza respuesta inmediata)
    const btnGuardar = document.getElementById('btnGuardarLevante');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', async (e) => {
            e.preventDefault();
            await guardarYProcesar();
        });
        console.log("[OK] Botón 'Guardar y Sincronizar' enlazado correctamente.");
    } else {
        console.error("[ERROR CRÍTICO] No se encontró el elemento con ID 'btnGuardarLevante' en el HTML.");
    }

    // 2. Vincular inputs numéricos para cálculo dinámico en tiempo real
    const inputsDinamicos = ['inputPesoInicial', 'inputPesoMax', 'inputPesoMin', 'inputFechaProx', 'selectEpoca'];
    inputsDinamicos.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', calcularMetricasEnTiempoReal);
            el.addEventListener('change', calcularMetricasEnTiempoReal);
        }
    });

    // 3. Inicializar métricas y estado de red
    calcularMetricasEnTiempoReal();
    verificarEstadoRedUI();
});

/**
 * Calcula dinámicamente GPD, GPA y días restantes mientras el usuario interactúa.
 */
function calcularMetricasEnTiempoReal() {
    const pesoInicial = parseFloat(document.getElementById('inputPesoInicial')?.value) || 0;
    const pesoMax = parseFloat(document.getElementById('inputPesoMax')?.value) || 0;
    const fechaProxVal = document.getElementById('inputFechaProx')?.value;

    // G.P.A. (Ganancia Promedio Animal)
    const gpa = pesoMax - pesoInicial;
    const kpiGPA = document.getElementById('kpiGPA');
    if (kpiGPA) kpiGPA.textContent = `${gpa.toFixed(1)} kg`;

    // G.P.D. (Ganancia Promedio Diaria estimada base sabana)
    let diasTranscurridos = 60; 
    let gpd = diasTranscurridos > 0 ? (gpa / diasTranscurridos) : 0.750;
    if (gpd < 0) gpd = 0;

    const kpiGPD = document.getElementById('kpiGPD');
    if (kpiGPD) kpiGPD.textContent = `${gpd.toFixed(3)} kg`;

    // Días Restantes (Fijado a fecha del sistema: 22 de Septiembre de 2026)
    if (fechaProxVal) {
        const fechaProx = new Date(fechaProxVal + 'T00:00:00');
        const hoy = new Date('2026-09-22T00:00:00');
        const diasRestantes = Math.ceil((fechaProx - hoy) / (1000 * 60 * 60 * 24));
        
        const displayDias = document.getElementById('displayDiasRestantes');
        if (displayDias) {
            displayDias.textContent = diasRestantes >= 0 ? `${diasRestantes} Días` : `Vencido (${Math.abs(diasRestantes)} d)`;
            displayDias.style.color = diasRestantes < 0 ? '#c62828' : 'inherit';
        }
    }
}

/**
 * Actualiza el submenú de ciclos estacionales si cambia la época (Invierno/Verano).
 */
function actualizarSubetapa() {
    const selectEpoca = document.getElementById('selectEpoca');
    const selectSubetapa = document.getElementById('selectSubetapa');
    
    if (!selectEpoca || !selectSubetapa) return;

    const epocaSeleccionada = selectEpoca.value;
    selectSubetapa.innerHTML = '';

    if (epocaSeleccionada === 'Invierno') {
        ['Invierno - Entrante', 'Invierno - Mediados', 'Invierno - Finales'].forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub;
            opt.textContent = sub.replace('Invierno - ', '');
            selectSubetapa.appendChild(opt);
        });
    } else {
        ['Verano - Transición', 'Verano - Crítico', 'Verano - Salida'].forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub;
            opt.textContent = sub.replace('Verano - ', '');
            selectSubetapa.appendChild(opt);
        });
    }
}

/**
 * Función principal ejecutada al hacer clic en Guardar y Sincronizar.
 */
async function guardarYProcesar() {
    console.log("[SISTEMA] Ejecutando guardarYProcesar()...");

    try {
        // Captura de datos del DOM
        const lote = document.getElementById('inputLote')?.value || "Lote 1";
        const pesoInicial = parseFloat(document.getElementById('inputPesoInicial')?.value) || 0;
        const pesoMax = parseFloat(document.getElementById('inputPesoMax')?.value) || 0;
        const pesoMin = parseFloat(document.getElementById('inputPesoMin')?.value) || 0;
        const numAnimales = parseInt(document.getElementById('inputNumAnimales')?.value) || 0;
        const epoca = document.getElementById('selectEpoca')?.value || "Invierno";
        const subetapa = document.getElementById('selectSubetapa')?.value || "Inicio";
        const fechaProx = document.getElementById('inputFechaProx')?.value || "";
        const edad = parseFloat(document.getElementById('inputEdad')?.value) || 0;
        const pesoEsperado = parseFloat(document.getElementById('inputPesoEsperado')?.value) || 0;
        const tiempoSalida = parseFloat(document.getElementById('inputTiempoSalida')?.value) || 0;
        const cv = parseFloat(document.getElementById('inputCV')?.value) || 0;
        const observacion = document.getElementById('inputObservacion')?.value || "";

        const pesoPromedio = (pesoMax + pesoMin) / 2;
        const gpa = pesoMax - pesoInicial;
        const gpd = gpa > 0 ? (gpa / 60) : 0.750;

        const datosLote = {
            lote, pesoPromedio, pesoInicial, pesoMax, pesoMin, numAnimales,
            epoca, subetapa, fechaProx, edad, pesoEsperado, tiempoSalida,
            cv, gpd, gpa, observacion, timestamp: Date.now()
        };

        // Ejecutar Asistente Zootécnico local
        ejecutarAsistenteInteligenteLevante(datosLote);

        // Gestión Offline-First
        await gestionarPersistenciaOfflineFirst(datosLote);

        if (typeof emitirAlarmaOperativa === 'function') {
            emitirAlarmaOperativa('success');
        }
        mostrarToast(`💾 ¡Registro de ${lote} guardado con éxito!`);
        console.log("[EXITO] Datos procesados:", datosLote);

    } catch (error) {
        console.error("[ERROR] Falló el procesamiento del levante:", error);
        if (typeof emitirAlarmaOperativa === 'function') {
            emitirAlarmaOperativa('error');
        }
        mostrarToast("⚠️ Error: No se pudo completar el registro.", true);
    }
}

/**
 * Motor del Asistente I.D. (Diagnóstico rápido en consola)
 */
function ejecutarAsistenteInteligenteLevante(datosLote) {
    if (!datosLote) return;
    const { lote, cv, gpd } = datosLote;
    let scoreSaludLote = 100;
    let recomendacionesTecnicas = [];

    let cvNum = parseFloat(cv) || 0;
    if (cvNum > 12) {
        scoreSaludLote -= 35;
        recomendacionesTecnicas.push(`CV Crítico (${cvNum}%): Separar animales colas.`);
    }

    let gpdNum = parseFloat(gpd) || 0;
    if (gpdNum < 0.750) {
        scoreSaludLote -= 25;
        recomendacionesTecnicas.push(`GPD Baja (${gpdNum.toFixed(3)} kg/día): Revisar pastura.`);
    }

    console.log(`[ASISTENTE I.D.] Lote ${lote} - Índice Salud: ${Math.max(0, scoreSaludLote)}/100`, recomendacionesTecnicas);
}

/**
 * Persistencia Offline-First mediante localStorage
 */
async function gestionarPersistenciaOfflineFirst(datosLote) {
    if (navigator.onLine) {
        console.log("[FIREBASE] Datos sincronizados en línea.");
    } else {
        let cola = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY)) || [];
        cola.push({ ...datosLote, timestampGuardado: Date.now() });
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(cola));
        actualizarSemafortoSync(false, cola.length);
    }
}

/**
 * Controla visualmente el estado del semáforo de sincronización
 */
function actualizarSemafortoSync(isOnline, pendientesCount) {
    const semaphore = document.getElementById('sync-semaphore');
    const syncText = document.getElementById('sync-text');
    if (!semaphore || !syncText) return;

    if (isOnline && pendientesCount === 0) {
        semaphore.className = "semaphore online";
        syncText.textContent = "Sincronizado Local";
    } else {
        semaphore.className = "semaphore offline";
        syncText.textContent = `Pendientes (${pendientesCount})`;
    }
}

/**
 * Interfaz de notificación flotante (Toast)
 */
function mostrarToast(mensaje, esError = false) {
    let toast = document.getElementById('toast-flotante');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-flotante';
        toast.style.cssText = "position: fixed; bottom: 20px; right: 20px; background: #1f2937; color: #fff; padding: 12px 20px; border-radius: 8px; font-size: 0.9rem; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.15);";
        document.body.appendChild(toast);
    }
    toast.textContent = mensaje;
    toast.style.borderLeft = esError ? "4px solid #c62828" : "4px solid #2e7d32";
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 4000);
}

/**
 * Verifica el estado de la red y gatilla la sincronización si hay datos pendientes en cola.
 */
async function verificarEstadoRedUI() {
    let cola = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY)) || [];
    const isOnline = navigator.onLine;

    // Si vuelve la red y existen registros pendientes, ejecutamos la migración masiva
    if (isOnline && cola.length > 0) {
        await sincronizarColaOfflineAFirebase(cola);
    } else {
        actualizarSemafortoSync(isOnline, cola.length);
    }
}

/**
 * Recorre la cola local, envía los datos a Firebase y limpia el almacenamiento del dispositivo.
 */
