document.addEventListener('DOMContentLoaded', () => {
    console.log('Matrices técnicas del Hato Laguna Brava cargadas de forma modular.');

    // Matrices Oficiales corregidas sintácticamente
    const CATEGORIAS_BOVINOS = [
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

    const CATEGORIAS_BUFALINOS = [
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

    // Cargar registros almacenados
    let ocupacionHato = JSON.parse(localStorage.getItem('hato_ocupacion_v2')) || [];

    // Captura de elementos DOM
    const formulario = document.getElementById('form-mod1');
    const selectEspecie = document.getElementById('select-especie');
    const selectCategoria = document.getElementById('select-categoria');
    const listaContenedor = document.querySelector('.potreros-container');
    const kpiCabezas = document.getElementById('kpi-total-cabezas');
    const kpiUgm = document.getElementById('kpi-total-ugm');

    // Función para renderizar el listado dinámico de categorías según la especie elegida
    function cargarCategorias() {
        const especie = selectEspecie.value;
        const lista = especie === 'BOVINOS' ? CATEGORIAS_BOVINOS : CATEGORIAS_BUFALINOS;
        
        selectCategoria.innerHTML = lista.map(c => 
            `<option value="${c.id}" data-factor="${c.factor}">${c.nombre} (Factor: ${c.factor})</option>`
        ).join('');
    }

    if (selectEspecie) {
        selectEspecie.addEventListener('change', cargarCategorias);
    }

    // Calcular y pintar resultados
    function refrescarTablero() {
        if (!listaContenedor) return;

        let globalCabezas = 0;
        let globalUgm = 0.0;

        ocupacionHato.forEach(reg => {
            globalCabezas += Number(reg.cabezas);
            globalUgm += parseFloat(reg.ugmTotal);
        });

        if (kpiCabezas) kpiCabezas.textContent = globalCabezas;
        if (kpiUgm) kpiUgm.textContent = globalUgm.toFixed(2);

        if (ocupacionHato.length === 0) {
            listaContenedor.innerHTML = `
                <div style="text-align:center; padding:30px; color:var(--text-muted); border: 2px dashed var(--border-color); border-radius:8px;">
                    <p style="font-weight:bold;">Hato actualmente libre de ganado.</p>
                    <p style="font-size:0.85rem;">Todos los potreros se encuentran en descanso ecológico.</p>
                </div>`;
            return;
        }

        listaContenedor.innerHTML = ocupacionHato.map((item, index) => {
            const cargaPorHa = (parseFloat(item.ugmTotal) / Number(item.ha)).toFixed(3);
            return `
                <div class="potreros-ugm-card">
                    <div class="potreros-ugm-header">
                        <span class="potreros-ugm-title">🏞️ ${item.potrero}</span>
                        <span style="font-size:0.75rem; font-weight:bold; color:white; background-color:var(--primary-color); padding:3px 8px; border-radius:12px;">${item.especie}</span>
                    </div>
                    <div style="font-size:0.85rem; color:var(--text-main); line-height:1.5;">
                        <p><strong>Área base:</strong> ${item.ha} Hectáreas</p>
                        <p><strong>Lote asignado:</strong> ${item.cabezas} cabezas de <em>${item.categoriaNombre}</em></p>
                        <p><strong>Carga equivalente:</strong> <span style="color:var(--secondary-color); font-weight:bold;">${parseFloat(item.ugmTotal).toFixed(2)} UGM</span></p>
                        <p><strong>Presión de pastoreo:</strong> <strong>${cargaPorHa} UGM/Ha</strong></p>
                    </div>
                    <div style="text-align: right; border-top: 1px solid var(--divider-color); padding-top:6px; margin-top:8px;">
                        <button onclick="retirarLote(${index})" style="background:none; border:none; color:var(--danger); font-size:0.85rem; font-weight:bold; cursor:pointer;">
                            🚨 Retirar Ganado (Vaciar)
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Evento para procesar el envío del formulario
    if (formulario) {
        formulario.addEventListener('submit', (e) => {
            e.preventDefault();

            const selectPot = document.getElementById('select-potrero');
            const potreroNombre = selectPot.value;
            const haPotrero = selectPot.options[selectPot.selectedIndex].getAttribute('data-ha');
            
            const especie = selectEspecie.value;
            const catOption = selectCategoria.options[selectCategoria.selectedIndex];
            const categoriaNombre = catOption.text.split(' (')[0];
            const factorConversion = parseFloat(catOption.getAttribute('data-factor'));
            
            const cabezas = parseInt(document.getElementById('cantidad-cabezas').value);

            // Fórmula zootécnica de UGM
            const ugmCalculado = cabezas * factorConversion;

            const nuevaCarga = {
                potrero: potreroNombre,
                ha: haPotrero,
                especie: especie,
                categoriaNombre: categoriaNombre,
                cabezas: cabezas,
                ugmTotal: ugmCalculado
            };

            ocupacionHato.push(nuevaCarga);
            localStorage.setItem('hato_ocupacion_v2', JSON.stringify(ocupacionHato));
            
            document.getElementById('cantidad-cabezas').value = '';
            refrescarTablero();
        });
    }

    // Borrar / desocupar potrero
    window.retirarLote = function(index) {
        if (confirm('¿Confirmas el movimiento de desocupación para este potrero?')) {
            ocupacionHato.splice(index, 1);
            localStorage.setItem('hato_ocupacion_v2', JSON.stringify(ocupacionHato));
            refrescarTablero();
        }
    };

    // Arranque inicial
    cargarCategorias();
    refrescarTablero();
});
