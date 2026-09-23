/**
 * ============================================================================
 * HATO LAGUNA BRAVA - MOTOR MAESTRO DE PESAJE Y GESTIÓN GERENCIAL (v4.4)
 * Ubicación: Sector Los Módulos, Mantecal, Estado Apure, Venezuela
 * Administrador / Veterinario: Dr. Juan José Mencías Guzmán
 * ============================================================================
 */

const HatoApp = {
    storageKeyLotes: 'lb_historial_lotes',
    storageKeyBitacora: 'lb_bitacora_maestra',
    papeleraDeshacer: [],
    
    init: function() {
        this.configurarFechasPorDefecto();
        this.vincularEventos();
        this.actualizarContadoresYVistas();
        this.monitorearConexiónRed();
        console.log("🚀 Sistema Maestro Hato Laguna Brava v4.4 inicializado correctamente.");
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

    respaldarBitacoraEsencial: function(historial) {
        let bitacora = JSON.parse(localStorage.getItem(this.storageKeyBitacora)) || [];
        historial.forEach(reg => {
            if (!bitacora.some(b => b.timestampRegistro === reg.timestampRegistro)) {
                bitacora.push({
                    timestampRegistro: reg.timestampRegistro,
                    lote: reg.lote,
                    fecha: reg.fechaActual,
                    peso: reg.pesoPromedioLote,
                    gmd: reg.gmdCalculada,
                    numAnimales: reg.numAnimales || 1
                });
            }
        });
        localStorage.setItem(this.storageKeyBitacora, JSON.stringify(bitacora));
    },

    vincularEventos: function() {
        // Monitoreo completo incluyendo número de animales y peso inicial base del lote
        const inputsMonitoreados = [
            'inputPesoPromedio', 
            'inputPesoObjetivo', 
            'inputMesesObjetivo', 
            'inputLote', 
            'inputFechaActual', 
            'inputFechaProximo', 
            'inputPesoInicial',
            'inputNumAnimales',
            'inputCV',
            'inputEdad'
        ];
        
        inputsMonitoreados.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.calcularIndicadoresDinamicos());
            }
        });

        const btnProcesar = document.getElementById('btnProcesarPesaje');
        if (btnProcesar) {
            btnProcesar.addEventListener('click', () => this.registrarPesaje());
        }

        const btnDeshacer = document.getElementById('btnDeshacerUltimo');
        if (btnDeshacer) {
            btnDeshacer.addEventListener('click', () => this.deshacerUltimoRegistro());
        }

        const btnRehacer = document.getElementById('btnRehacerUltimo');
        if (btnRehacer) {
            btnRehacer.addEventListener('click', () => this.rehacerRegistro());
        }

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
        let pesoInicialLote = parseFloat(document.getElementById('inputPesoInicial')?.value) || 0;
        let numAnimales = parseInt(document.getElementById('inputNumAnimales')?.value) || 1;

        let historial = this.obtenerHistorial();
        let registrosLote = historial.filter(r => r.lote === loteNombre);
        let gmdCalculada = 0.50; 

        // PRIORIDAD 1: Si hay registros históricos previos en el sistema
        if (registrosLote.length > 0) {
            let ultimoReg = registrosLote[registrosLote.length - 1];
            let fAnterior = new Date(ultimoReg.fechaActual);
            let fActual = new Date(fechaActualStr);
            let diasTranscurridos = Math.round((fActual - fAnterior) / (1000 * 60 * 60 * 24));

            if (diasTranscurridos > 0) {
                let diffKilos = pesoProm - ultimoReg.pesoPromedioLote;
                gmdCalculada = diffKilos / diasTranscurridos;
                if (gmdCalculada <= 0.01) gmdCalculada = 0.01;
            }
        } 
        // PRIORIDAD 2: Si no hay historial pero el usuario colocó un Peso Inicial base del lote
        else if (pesoInicialLote > 0 && pesoProm > pesoInicialLote) {
            let kgsMetaInit = pesoObj - pesoProm;
            let diasMetaInit = mesesMeta * 30;
            if (diasMetaInit > 0) gmdCalculada = kgsMetaInit / diasMetaInit;
        } 
        // PRIORIDAD 3: Estimación por defecto basada en la meta global de salida
        else {
            let kgsMetaInit = pesoObj - pesoProm;
            let diasMetaInit = mesesMeta * 30;
            if (diasMetaInit > 0) gmdCalculada = kgsMetaInit / diasMetaInit;
        }

        const elemGMD = document.getElementById('resumenGMD');
        if (elemGMD) elemGMD.innerText = `${gmdCalculada.toFixed(2)} kg/día (por animal)`;

        // Cálculo diferenciado: Por animal vs Lote Total
        let kgsFaltantesPorAnimal = pesoObj - pesoProm;
        if (kgsFaltantesPorAnimal < 0) kgsFaltantesPorAnimal = 0;

        let kgsFaltantesTotalLote = kgsFaltantesPorAnimal * numAnimales;

        let diasTotalesFaltantes = gmdCalculada > 0 ? Math.ceil(kgsFaltantesPorAnimal / gmdCalculada) : 0;
        let mesesFaltantes = Math.floor(diasTotalesFaltantes / 30);
        let diasRestantes = diasTotalesFaltantes % 30;

        const elemKgsF = document.getElementById('resumenKgsFaltantes');
        if (elemKgsF) {
            elemKgsF.innerHTML = `+${kgsFaltantesPorAnimal.toFixed(1)} kg/cab <br><small style="color: #495057; font-weight: 600;">(Total Lote [${numAnimales} cab]: +${kgsFaltantesTotalLote.toFixed(1)} kg)</small>`;
        }

        const elemTiempoF = document.getElementById('resumenTiempoFaltante');
        if (elemTiempoF) elemTiempoF.innerText = `${mesesFaltantes} meses y ${diasRestantes} días`;

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

        return { gmdCalculada, kgsFaltantesPorAnimal, kgsFaltantesTotalLote };
    },

    dispararAlertaManga: function(tipo) {
        try {
            if (navigator.vibrate) {
                navigator.vibrate(tipo === 'urgente' ? [300, 150, 300] : 200);
            }

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
        let temporada = document.getElementById('selectTemporada')?.value || 'General';
        let fechaActualStr = document.getElementById('inputFechaActual').value;
        let fechaProximaStr = document.getElementById('inputFechaProximo').value;
        let pesoProm = parseFloat(document.getElementById('inputPesoPromedio').value) || 0;
        let pesoObj = parseFloat(document.getElementById('inputPesoObjetivo').value) || 0;
        let mesesMeta = parseFloat(document.getElementById('inputMesesObjetivo').value) || 0;
        let cv = parseFloat(document.getElementById('inputCV')?.value) || 0;
        let observaciones = document.getElementById('inputObservaciones')?.value || '';
        let pesoInicialLote = parseFloat(document.getElementById('inputPesoInicial')?.value) || 0;
        let numAnimales = parseInt(document.getElementById('inputNumAnimales')?.value) || 1;

        let historial = this.obtenerHistorial();

        // Autogeneración de registro base fantasma si el lote es nuevo y se indicó peso inicial
        if (historial.filter(r => r.lote === loteNombre).length === 0 && pesoInicialLote > 0) {
            let fechaBaseObj = new Date(fechaActualStr);
            fechaBaseObj.setDate(fechaBaseObj.getDate() - 30); // Base de 30 días previos
            
            let registroBase = {
                timestampRegistro: new Date(Date.now() - 100000).toISOString(),
                fechaActual: fechaBaseObj.toISOString().split('T')[0],
                fechaProximoPesaje: fechaActualStr,
                lote: loteNombre,
                temporada: temporada,
                pesoPromedioLote: pesoInicialLote,
                pesoObjetivoLote: pesoObj,
                mesesObjetivo: mesesMeta,
                gmdCalculada: 0.50,
                cvLote: cv,
                numAnimales: numAnimales,
                observaciones: 'Registro base inicial autogenerado por el sistema.'
            };
            historial.push(registroBase);
        }

        let calculos = this.calcularIndicadoresDinamicos();

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
            numAnimales: numAnimales,
            observaciones: observaciones
        };

        historial.push(registroActual);
        this.guardarHistorial(historial);
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
                    <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${reg.numAnimales || 'N/D'}</td>
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
                    <p><strong>Animales en el Lote:</strong> ${ultimoReg.numAnimales || 'N/D'} cabezas</p>
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
                            <th>Nº Animales</th>
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

window.onload = function() {
    HatoApp.init();
};
