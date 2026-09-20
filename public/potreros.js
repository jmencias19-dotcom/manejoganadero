/* ==========================================================================
   MÓDULO DE POTREROS Y CARGA ANIMAL (UGM)
   Hato Laguna Brava
   ========================================================================== */

export function inicializarModuloPotreros() {
    console.log("Cargando módulo: Gestión de Potreros y Carga Animal (UGM)");

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

    let registrosGanado = JSON.parse(localStorage.getItem('hato_registros_ganado')) || [];

    const formulario = document.getElementById('form-mod1');
    const selectEspecie = document.getElementById('select-especie');
    const selectCategoria = document.getElementById('select-categoria');
    const listaContenedor = document.querySelector('.potreros-container');
    const kpiCabezas = document.getElementById('kpi-total-cabezas');
    const kpiUgm = document.getElementById('kpi-total-ugm');

    function cargarCategorias() {
        if (!selectCategoria || !selectEspecie) return;
        const lista = selectEspecie.value === 'BOVINOS' ? BOVINOS : BUFALINOS;
        selectCategoria.innerHTML = lista.map(c => 
            `<option value="${c.id}" data-factor="${c.factor}">${c.nombre}</option>`
        ).join('');
    }

    if (selectEspecie) {
        selectEspecie.addEventListener('change', cargarCategorias);
    }

    function refrescarTablero() {
        if (!listaContenedor) return;
        let globalCabezas = 0, globalUgm = 0.0;
        const potrerosAgrupados = {};

        registrosGanado.forEach((reg, index) => {
            globalCabezas += Number(reg.cabezas);
            globalUgm += parseFloat(reg.ugmTotal);

            if (!potrerosAgrupados[reg.potrero]) {
                potrerosAgrupados[reg.potrero] = {
                    nombre: reg.potrero, ha: Number(reg.ha), totalCabezas: 0, totalUgm: 0.0, lotes: []
                };
            }
            potrerosAgrupados[reg.potrero].totalCabezas += Number(reg.cabezas);
            potrerosAgrupados[reg.potrero].totalUgm += parseFloat(reg.ugmTotal);
            potrerosAgrupados[reg.potrero].lotes.push({
                indexOriginal: index,
                descripcion: `${reg.cabezas} cabezas de ${reg.categoriaText} (${reg.especie})${reg.responsable ? ' - Resp: ' + reg.responsable : ''}`
            });
        });

        if (kpiCabezas) kpiCabezas.textContent = globalCabezas;
        if (kpiUgm) kpiUgm.textContent = globalUgm.toFixed(2);

        const nombresPotreros = Object.keys(potrerosAgrupados);
        if (nombresPotreros.length === 0) {
            listaContenedor.innerHTML = `
                <div style="text-align:center; padding:30px; color:var(--text-muted); border: 2px dashed var(--border-color); border-radius:8px;">
                    <p style="font-weight:bold;">Hato actualmente libre de ganado.</p>
                    <p style="font-size:0.85rem;">Todos los potreros se encuentran en descanso ecológico.</p>
                </div>`;
            return;
        }

        listaContenedor.innerHTML = nombresPotreros.map(nombre => {
            const pot = potrerosAgrupados[nombre];
            const presionReal = (pot.totalUgm / pot.ha).toFixed(3);
            let colorAlerta = 'var(--success)', mensajeAlerta = '✅ Carga Óptima';

            if (presionReal > CARGA_INVIERNO) {
                colorAlerta = 'var(--danger)'; mensajeAlerta = '🚨 SOBREPASTOREO CRÍTICO';
            } else if (presionReal > CARGA_VERANO) {
                colorAlerta = 'var(--warning)'; mensajeAlerta = '⚠️ Alerta en Verano';
            }

            return `
                <div class="potreros-ugm-card" style="border-left: 6px solid ${colorAlerta}; margin-bottom:15px; background:var(--card-bg); padding:16px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.04);">
                    <div class="potreros-ugm-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span class="potreros-ugm-title" style="font-weight:bold; color:var(--primary-color); font-size:1.1rem;">🏞️ Potrero: ${pot.nombre}</span>
                        <span style="font-size:0.75rem; font-weight:bold; color:white; background-color:${colorAlerta}; padding:4px 10px; border-radius:12px;">${mensajeAlerta}</span>
                    </div>
                    <div style="font-size:0.85rem; color:var(--text-main); line-height:1.6; background-color:#fafbfc; padding:10px; border-radius:8px; border:1px solid var(--border-color);">
                        <p><strong>Área base:</strong> ${pot.ha} Hectáreas</p>
                        <p><strong>Carga equivalente total:</strong> <span style="font-weight:bold; color:var(--primary-color);">${pot.totalUgm.toFixed(2)} UGM</span></p>
                        <p><strong>Presión de pastoreo actual:</strong> <span style="font-weight:bold; color:${colorAlerta}; font-size:1rem;">${presionReal} UGM/Ha</span></p>
                    </div>
                    <div style="font-size:0.75rem; margin-top:8px; padding:6px 10px; background-color:#f0f2f0; border-radius:6px; color:var(--text-muted); display:flex; justify-content:space-between;">
                        <span><strong>Carga Rec. Invierno:</strong> ${CARGA_INVIERNO} UGM/Ha</span>
                        <span><strong>Carga Rec. Verano:</strong> ${CARGA_VERANO} UGM/Ha</span>
                    </div>
                    <div style="margin-top:10px; border-top:1px dashed var(--border-color); padding-top:8px;">
                        <p style="font-size:0.8rem; font-weight:bold; color:var(--secondary-color); margin-bottom:5px;">📋 Composición del Rebaño Mixto (${pot.totalCabezas} Cabezas):</p>
                        <ul style="font-size:0.8rem; padding-left:15px; color:#495057;">
                            ${pot.lotes.map(lote => `
                                <li style="margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;">
                                    <span>${lote.descripcion}</span>
                                    <button onclick="window.eliminarLoteEspecifico(${lote.indexOriginal})" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:0.75rem; font-weight:bold;">[Retirar]</button>
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
            const selectPot = document.getElementById('select-potrero');
            const catOption = selectCategoria.options[selectCategoria.selectedIndex];
            const cabezas = parseInt(document.getElementById('cantidad-cabezas').value) || 0;
            const factorConversion = parseFloat(catOption.getAttribute('data-factor')) || 1.0;

            const nuevoLote = {
                potrero: selectPot.value,
                ha: selectPot.options[selectPot.selectedIndex].getAttribute('data-ha'),
                especie: selectEspecie.value,
                categoriaText: catOption.text,
                cabezas: cabezas,
                responsable: document.getElementById('responsable-potrero') ? document.getElementById('responsable-potrero').value.trim() : '',
                ugmTotal: cabezas * factorConversion
            };

            registrosGanado.push(nuevoLote);
            localStorage.setItem('hato_registros_ganado', JSON.stringify(registrosGanado));
            formulario.reset();
            cargarCategorias();
            refrescarTablero();
        });
    }

    window.eliminarLoteEspecifico = function(index) {
        if (confirm('¿Deseas retirar este lote específico de animales del potrero?')) {
            registrosGanado.splice(index, 1);
            localStorage.setItem('hato_registros_ganado', JSON.stringify(registrosGanado));
            refrescarTablero();
        }
    };

    cargarCategorias();
    refrescarTablero();
}
