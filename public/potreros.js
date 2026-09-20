/* ==========================================================================
   MÓDULO DE POTREROS Y CARGA ANIMAL (UGM) - HATO LAGUNA BRAVA (ROBUSTO)
   ========================================================================== */

export function inicializarModuloPotreros() {
    console.log("Cargando módulo: Gestión de Potreros y Carga Animal (UGM)");

    // Umbrales ecológicos estándar para el trópico / sabana inundable
    const CARGA_INVIERNO = 1.20;
    const CARGA_VERANO = 0.76;

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

    let registrosGanado = [];
    try {
        registrosGanado = JSON.parse(localStorage.getItem('hato_registros_ganado')) || [];
    } catch (e) {
        console.error("Error al leer localStorage de ganado:", e);
        registrosGanado = [];
    }

    // Ampliación de selectores para asegurar compatibilidad con distintos IDs de formularios
    const formulario = document.getElementById('form-mod1') || document.getElementById('potreroForm') || document.getElementById('potrerosForm');
    const selectEspecie = document.getElementById('select-especie');
    const selectPotrero = document.getElementById('select-potrero');
    const selectCategoria = document.getElementById('select-categoria');
    const selectTemporada = document.getElementById('select-temporada');
    const inputFechaIngreso = document.getElementById('fecha-ingreso');
    const inputFechaSalida = document.getElementById('fecha-salida');
    const inputCabezas = document.getElementById('cantidad-cabezas');
    const inputResponsable = document.getElementById('responsable-potrero');
    const inputObservaciones = document.getElementById('observaciones-potrero');

    const listaContenedor = document.querySelector('.potreros-container') || document.getElementById('potreros-container');
    const kpiCabezas = document.getElementById('kpi-total-cabezas');
    const kpiUgm = document.getElementById('kpi-total-ugm');
    const kpiCargaPromedio = document.getElementById('kpi-carga-promedio');
    const aiContent = document.getElementById('ai-potrero-content');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // Función para mostrar notificaciones Toast
    function mostrarToast(mensaje, tipo = 'success') {
        if (!toast || !toastMessage) return;
        toastMessage.textContent = mensaje;
        toast.style.borderLeftColor = tipo === 'danger' ? '#c1121f' : 'var(--accent-color, #2d6a4f)';
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Cargar categorías dinámicamente según la especie seleccionada
    function cargarCategorias() {
        if (!selectCategoria || !selectEspecie) return;
        const lista = selectEspecie.value === 'BOVINOS' ? BOVINOS : BUFALINOS;
        selectCategoria.innerHTML = lista.map(c => 
            `<option value="${c.id}" data-factor="${c.factor}">${c.nombre} (${c.factor} UGM)</option>`
        ).join('');
        actualizarAsistenteIA();
    }

    if (selectEspecie) {
        selectEspecie.addEventListener('change', cargarCategorias);
    }

    // Asistente Inteligente de Carga (I.D.) al interactuar con el formulario
    function actualizarAsistenteIA() {
        if (!aiContent) return;
        
        if (!selectPotrero || !selectPotrero.value) {
            aiContent.innerHTML = `<p style="margin: 0; font-style: italic;">Seleccione un potrero y categoría para estimar el impacto forrajero...</p>`;
            return;
        }

        const optionPot = selectPotrero.options[selectPotrero.selectedIndex];
        const ha = parseFloat(optionPot.getAttribute('data-ha')) || 0;
        const potreroNombre = optionPot.value;

        if (!selectCategoria || !selectCategoria.value) {
            aiContent.innerHTML = `<p style="margin: 0;"><strong>Potrero:</strong> ${potreroNombre} (${ha} ha). <em>Seleccione una categoría zootécnica.</em></p>`;
            return;
        }

        const optionCat = selectCategoria.options[selectCategoria.selectedIndex];
        const factor = parseFloat(optionCat.getAttribute('data-factor')) || 1.0;
        const cabezas = parseInt(inputCabezas?.value) || 0;
        const ugmEstimada = cabezas * factor;
        const presionEstimada = ha > 0 ? (ugmEstimada / ha).toFixed(3) : 0.00;

        let evalTexto = "✅ Carga dentro de rangos sustentables.";
        let evalColor = "#065f46";

        if (presionEstimada > CARGA_INVIERNO) {
            evalTexto = "🚨 ¡Alerta! Excede la capacidad de sustentación crítica en invierno (> 1.20 UGM/ha).";
            evalColor = "#991b1b";
        } else if (presionEstimada > CARGA_VERANO) {
            evalTexto = "⚠️ Precaución: Presión elevada para época de verano (> 0.76 UGM/ha).";
            evalColor = "#92400e";
        }

        aiContent.innerHTML = `
            <p style="margin: 0;"><strong>Potrero:</strong> ${potreroNombre} (${ha} ha)</p>
            <p style="margin: 0;"><strong>Impacto Lote:</strong> ${cabezas} cabezas = <strong>${ugmEstimada.toFixed(2)} UGM</strong></p>
            <p style="margin: 0;"><strong>Presión Proyectada:</strong> ${presionEstimada} UGM/ha</p>
            <p style="margin: 0; font-weight: bold; color: ${evalColor};">${evalTexto}</p>
        `;
    }

    if (selectPotrero) selectPotrero.addEventListener('change', actualizarAsistenteIA);
    if (selectCategoria) selectCategoria.addEventListener('change', actualizarAsistenteIA);
    if (inputCabezas) inputCabezas.addEventListener('input', actualizarAsistenteIA);

    function refrescarTablero() {
        if (!listaContenedor) return;
        
        let globalCabezas = 0;
        let globalUgm = 0.0;
        const potrerosAgrupados = {};

        registrosGanado.forEach((reg, index) => {
            globalCabezas += Number(reg.cabezas) || 0;
            globalUgm += parseFloat(reg.ugmTotal) || 0;

            if (!potrerosAgrupados[reg.potrero]) {
                potrerosAgrupados[reg.potrero] = {
                    nombre: reg.potrero,
                    ha: Number(reg.ha) || 0,
                    totalCabezas: 0,
                    totalUgm: 0.0,
                    lotes: []
                };
            }
            potrerosAgrupados[reg.potrero].totalCabezas += Number(reg.cabezas) || 0;
            potrerosAgrupados[reg.potrero].totalUgm += parseFloat(reg.ugmTotal) || 0;
            
            potrerosAgrupados[reg.potrero].lotes.push({
                indexOriginal: index,
                descripcion: `${reg.cabezas} cabezas de ${reg.categoriaText} (${reg.especie})`,
                responsable: reg.responsable,
                temporada: reg.temporada || 'No especificada',
                ingreso: reg.fechaIngreso || 'N/A',
                salida: reg.fechaSalida || 'N/A',
                observaciones: reg.observaciones
            });
        });

        // Actualizar KPIs Globales
        if (kpiCabezas) kpiCabezas.textContent = globalCabezas;
        if (kpiUgm) kpiUgm.textContent = globalUgm.toFixed(2);
        
        const nombresPotreros = Object.keys(potrerosAgrupados);
        let promedioUgmHa = 0;
        if (nombresPotreros.length > 0) {
            let acumuladoPresion = 0;
            nombresPotreros.forEach(nom => {
                const p = potrerosAgrupados[nom];
                acumuladoPresion += (p.ha > 0 ? (p.totalUgm / p.ha) : 0);
            });
            promedioUgmHa = acumuladoPresion / nombresPotreros.length;
        }
        if (kpiCargaPromedio) kpiCargaPromedio.textContent = promedioUgmHa.toFixed(2);

        if (nombresPotreros.length === 0) {
            listaContenedor.innerHTML = `
                <div style="text-align:center; padding:30px; color:var(--text-muted); border: 2px dashed var(--border-color); border-radius:8px; background:var(--card-bg);">
                    <p style="font-weight:bold; margin-bottom: 4px;">Hato actualmente libre de ganado en registros activos.</p>
                    <p style="font-size:0.85rem; margin:0;">Todos los potreros se encuentran en descanso ecológico.</p>
                </div>`;
            return;
        }

        listaContenedor.innerHTML = nombresPotreros.map(nombre => {
            const pot = potrerosAgrupados[nombre];
            const presionReal = pot.ha > 0 ? (pot.totalUgm / pot.ha).toFixed(3) : 0.00;
            const presionNum = parseFloat(presionReal);
            
            let colorAlerta = 'var(--success, #065f46)';
            let mensajeAlerta = '✅ Carga Óptima';

            if (presionNum > CARGA_INVIERNO) {
                colorAlerta = 'var(--danger, #991b1b)';
                mensajeAlerta = '🚨 SOBREPASTOREO CRÍTICO';
            } else if (presionNum > CARGA_VERANO) {
                colorAlerta = 'var(--warning, #92400e)';
                mensajeAlerta = '⚠️ Alerta en Verano';
            }

            return `
                <div class="potreros-ugm-card" style="border-left: 6px solid ${colorAlerta}; margin-bottom:15px; background:var(--card-bg); padding:16px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04);">
                    <div class="potreros-ugm-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span class="potreros-ugm-title" style="font-weight:bold; color:var(--primary-color); font-size:1.1rem;">🏞️ Potrero: ${pot.nombre}</span>
                        <span style="font-size:0.75rem; font-weight:bold; color:white; background-color:${colorAlerta}; padding:4px 10px; border-radius:12px;">${mensajeAlerta}</span>
                    </div>
                    
                    <div style="font-size:0.85rem; color:var(--text-main); line-height:1.6; background-color:#fafbfc; padding:10px; border-radius:8px; border:1px solid var(--border-color);">
                        <p style="margin:0;"><strong>Área base:</strong> ${pot.ha} Hectáreas</p>
                        <p style="margin:0;"><strong>Carga equivalente total:</strong> <span style="font-weight:bold; color:var(--primary-color);">${pot.totalUgm.toFixed(2)} UGM</span></p>
                        <p style="margin:0;"><strong>Presión de pastoreo actual:</strong> <span style="font-weight:bold; color:${colorAlerta}; font-size:1rem;">${presionReal} UGM/Ha</span></p>
                    </div>

                    <div style="font-size:0.75rem; margin-top:8px; padding:6px 10px; background-color:#f0f2f0; border-radius:6px; color:var(--text-muted); display:flex; justify-content:space-between;">
                        <span><strong>Carga Rec. Invierno:</strong> ${CARGA_INVIERNO} UGM/Ha</span>
                        <span><strong>Carga Rec. Verano:</strong> ${CARGA_VERANO} UGM/Ha</span>
                    </div>

                    <div style="margin-top:10px; border-top:1px dashed var(--border-color); padding-top:8px;">
                        <p style="font-size:0.8rem; font-weight:bold; color:var(--secondary-color); margin-bottom:5px;">📋 Composición del Rebaño Mixto (${pot.totalCabezas} Cabezas):</p>
                        <ul style="padding-left: 16px; margin: 0; font-size: 0.8rem; display: flex; flex-direction: column; gap: 6px;">
                            ${pot.lotes.map(lote => `
                                <li style="border-bottom: 1px dashed var(--border-color); padding-bottom: 4px;">
                                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                                        <div>
                                            <strong>${lote.descripcion}</strong><br>
                                            <span style="color:var(--text-muted); font-size:0.75rem;">
                                                ${lote.responsable ? `<i class="fa-solid fa-user"></i> Resp: ${lote.responsable} | ` : ''}
                                                <i class="fa-solid fa-calendar"></i> ${lote.ingreso} al ${lote.salida} (${lote.temporada})
                                            </span>
                                            ${lote.observaciones ? `<div style="margin-top:2px; font-style:italic; color:var(--text-muted);">"${lote.observaciones}"</div>` : ''}
                                        </div>
                                        <button type="button" onclick="window.eliminarLoteEspecifico(${lote.indexOriginal})" style="background:none; border:none; color:var(--danger, #c1121f); cursor:pointer; font-size:0.75rem; font-weight:bold;">[Retirar]</button>
                                    </div>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>`;
        }).join('');
    }

    if (formulario) {
        formulario.addEventListener('submit', (e) => {
            e.preventDefault();
            
            if (!selectPotrero || selectPotrero.selectedIndex < 0) {
                alert("Por favor seleccione un potrero válido.");
                return;
            }
            if (!selectCategoria || selectCategoria.selectedIndex < 0) {
                alert("Por favor seleccione una categoría zootécnica válida.");
                return;
            }

            const potOption = selectPotrero.options[selectPotrero.selectedIndex];
            const catOption = selectCategoria.options[selectCategoria.selectedIndex];
            const cabezas = parseInt(inputCabezas?.value) || 0;
            const factorConversion = parseFloat(catOption.getAttribute('data-factor')) || 1.0;

            const nuevoLote = {
                potrero: selectPotrero.value,
                ha: potOption.getAttribute('data-ha') || 0,
                especie: selectEspecie ? selectEspecie.value : 'BOVINOS',
                categoriaText: catOption.text.replace(/\s\([^)]+\)/g, ''),
                temporada: selectTemporada ? selectTemporada.value : 'General',
                fechaIngreso: inputFechaIngreso ? inputFechaIngreso.value : '',
                fechaSalida: inputFechaSalida ? inputFechaSalida.value : '',
                cabezas: cabezas,
                responsable: inputResponsable ? inputResponsable.value.trim() : '',
                observaciones: inputObservaciones ? inputObservaciones.value.trim() : '',
                ugmTotal: cabezas * factorConversion
            };

            registrosGanado.push(nuevoLote);

            try {
                localStorage.setItem('hato_registros_ganado', JSON.stringify(registrosGanado));
            } catch (err) {
                console.error("Error al guardar en localStorage:", err);
                mostrarToast("Error crítico: No se pudo guardar en el almacenamiento local.", "danger");
                return;
            }
            
            formulario.reset();
            cargarCategorias();
            if (aiContent) aiContent.innerHTML = `<p style="margin: 0; font-style: italic;">Seleccione un potrero y categoría para estimar el impacto forrajero...</p>`;
            
            refrescarTablero();
            mostrarToast("Lote registrado y sincronizado con éxito.");
        });
    } else {
        console.warn("Advertencia: No se encontró el formulario de potreros en el DOM.");
    }

    window.eliminarLoteEspecifico = function(index) {
        if (confirm('¿Deseas retirar este lote específico de animales del potrero?')) {
            registrosGanado.splice(index, 1);
            try {
                localStorage.setItem('hato_registros_ganado', JSON.stringify(registrosGanado));
            } catch (err) {
                console.error("Error al actualizar localStorage tras eliminar:", err);
            }
            refrescarTablero();
            mostrarToast("Lote retirado correctamente.", "danger");
        }
    };

    cargarCategorias();
    refrescarTablero();
}

// Auto-inicialización segura si el script se carga de forma directa
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        inicializarModuloPotreros();
    });
} else {
    inicializarModuloPotreros();
}
