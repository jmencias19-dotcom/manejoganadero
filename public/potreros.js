// ==========================================================================
// Módulo: Gestión de Potreros y Carga UGM (Bovino / Bufalino)
// Versión Multi-Especie y Estado Fisiológico - Hato Laguna Brava
// ==========================================================================

const PASTOREO_STORAGE_KEY = 'laguna_brava_pastoreo_movimientos';

// Base de Datos Estructurada de los Potreros del Hato (Nombres y Áreas Exactas)
const DATA_POTREROS_HATO = {
    "432": "Macanillal",
    "569": "El Galpón",
    "80": "Mata del Muerto",
    "234": "Manguito",
    "205": "Mata de Piña",
    "102": "Las Rallas",
    "703": "Potrero del Medio",
    "77": "Cuatro Esquinas",
    "418": "Paulero",
    "422": "Jobo Gacho",
    "40": "Curva del Peligro",
    "36": "Módulo", // Manejado dinámicamente por índice si se repite Ha
    "143": "Módulo F",
    "125": "Saladillal",
    "142": "Carretera",
    "32": "María del Carmen",
    "26": "Casa"
};

// Matrices Técnicas de Conversión Ganadera Oficiales del Hato
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

let especieActiva = 'Bovino';

document.addEventListener('DOMContentLoaded', () => {
    initModuloPastoreo();
});

function initModuloPastoreo() {
    inyectarSelectorEspecie();
    inyectarCamposCategorias();
    establecerFechaHoy();
    renderPastoreo();
    
    document.getElementById('form-mod1').addEventListener('submit', function(e) {
        e.preventDefault();
        guardarRegistroMod1();
    });
}

function inyectarSelectorEspecie() {
    const form = document.getElementById('form-mod1');
    const containerEtarios = document.getElementById('m1-etarios-container');
    if (!form || !containerEtarios) return;

    if (!document.getElementById('wrapper-especie')) {
        const divEspecie = document.createElement('div');
        divEspecie.id = 'wrapper-especie';
        divEspecie.className = 'input-group';
        divEspecie.style.marginBottom = '10px';
        divEspecie.innerHTML = `
            <label style="color: var(--primary-color); font-weight: bold;">Especie a Registrar:</label>
            <select id="m1-especie" class="form-control" style="background-color: #fceddb; border-color: #ddb892; font-weight: bold; color: #7f5539;" onchange="cambiarEspecie(this.value)">
                <option value="Bovino">🐂 Vacuno / Bovino</option>
                <option value="Bufalino">🦬 Bufalino</option>
            </select>
        `;
        containerEtarios.parentNode.insertBefore(divEspecie, containerEtarios);
    }
}

function cambiarEspecie(nuevaEspecie) {
    especieActiva = nuevaEspecie;
    inyectarCamposCategorias();
    calcularUGM1();
}

function inyectarCamposCategorias() {
    const container = document.getElementById('m1-etarios-container');
    if (!container) return;
    container.innerHTML = '';
    
    const listaCategorias = especieActiva === 'Bovino' ? CATEGORIAS_BOVINOS : CATEGORIAS_BUFALINOS;
    
    listaCategorias.forEach(cat => {
        const div = document.createElement('div');
        div.className = 'etario-item';
        div.innerHTML = `
            <label>${cat.nombre}:</label>
            <input type="number" id="cat-${cat.id}" class="form-control" value="0" min="0" oninput="calcularUGM1()">
        `;
        container.appendChild(div);
    });
}

function calcularUGM1() {
    const selectPotrero = document.getElementById('m1-potrero');
    if (!selectPotrero) return { totalCabezas: 0, totalUGM: 0, cargaHa: 0 };
    
    const hectareas = parseFloat(selectPotrero.value) || 1;
    const listaCategorias = especieActiva === 'Bovino' ? CATEGORIAS_BOVINOS : CATEGORIAS_BUFALINOS;
    
    let totalCabezas = 0;
    let totalUGM = 0;
    
    listaCategorias.forEach(cat => {
        const input = document.getElementById(`cat-${cat.id}`);
        const cantidad = input ? parseInt(input.value) || 0 : 0;
        
        totalCabezas += cantidad;
        totalUGM += (cantidad * cat.factor);
    });
    
    const cargaHa = totalUGM / hectareas;
    
    if(document.getElementById('m1-total-cabezas')) document.getElementById('m1-total-cabezas').value = totalCabezas;
    if(document.getElementById('m1-total-ugm')) document.getElementById('m1-total-ugm').value = totalUGM.toFixed(1) + " UGM";
    if(document.getElementById('m1-carga-ha')) document.getElementById('m1-carga-ha').value = cargaHa.toFixed(2) + " UGM/ha";
    
    return { totalCabezas, totalUGM, cargaHa };
}

// Guardar Movimiento Extrayendo la Línea Completa del Selector del Hato
function guardarRegistroMod1() {
    const selectPotrero = document.getElementById('m1-potrero');
    if (!selectPotrero) return;
    
    const hectareas = parseFloat(selectPotrero.value) || 0;
    // CORREGIDO: Captura de forma íntegra el texto completo del Potrero (Nombre + Ha) para las tarjetas fijas
    const textoCompletoPotrero = selectPotrero.options[selectPotrero.selectedIndex].text;
    
    const { totalCabezas, totalUGM, cargaHa } = calcularUGM1();
    const listaCategorias = especieActiva === 'Bovino' ? CATEGORIAS_BOVINOS : CATEGORIAS_BUFALINOS;
    
    let detalleCategorias = [];
    listaCategorias.forEach(cat => {
        const input = document.getElementById(`cat-${cat.id}`);
        const cant = input ? parseInt(input.value) || 0 : 0;
        if(cant > 0) detalleCategorias.push(`${cat.nombre}: ${cant}`);
    });

    const nuevoMovimiento = {
        especie: especieActiva,
        potrero: textoCompletoPotrero, // Almacena Ej. "Paulero (418 ha)" completo
        ha: hectareas,
        epoca: document.getElementById('m1-epoca').value,
        movimiento: document.getElementById('m1-movimiento').value,
        fIngreso: document.getElementById('m1-f-ingreso').value,
        fSalida: document.getElementById('m1-f-salida').value || 'N/A',
        responsable: document.getElementById('m1-responsable').value.trim(),
        obs: document.getElementById('m1-obs').value.trim() || 'Sin notas',
        cabezas: totalCabezas,
        ugmHa: cargaHa.toFixed(2),
        totalUgmRecord: totalUGM.toFixed(1),
        detalle: detalleCategorias.join(', ') || 'Ninguno'
    };

    const registros = JSON.parse(localStorage.getItem(PASTOREO_STORAGE_KEY)) || [];
    registros.push(nuevoMovimiento);
    localStorage.setItem(PASTOREO_STORAGE_KEY, JSON.stringify(registros));
    
    showToastNotification("✅ Registro de carga de potrero guardado.");
    limpiarFormMod1();
    renderPastoreo();
}

function renderPastoreo() {
    const registros = JSON.parse(localStorage.getItem(PASTOREO_STORAGE_KEY)) || [];
    const container = document.getElementById('cardsPastoreoContainer');
    
    let globalCabezas = 0;
    let globalUGM = 0;
    
    if (container) container.innerHTML = '';

    registros.forEach((reg, index) => {
        globalCabezas += reg.cabezas;
        globalUGM += parseFloat(reg.totalUgmRecord);

        if (container) {
            const statusClass = reg.movimiento === 'Ingreso' ? 'status-ocupado' : 'status-vacio';
            const iconoEspecie = reg.especie === 'Bovino' ? '🐂' : '🦬';
            
            const card = document.createElement('div');
            card.className = 'potreros-ugm-card';
            card.innerHTML = `
                <div class="potreros-ugm-header">
                    <span class="potreros-ugm-title">🌿 Potrero: ${reg.potrero}</span>
                    <span class="status-badge ${statusClass}">${reg.movimiento}</span>
                </div>
                <div class="potrero-meta">Especie: <strong>${iconoEspecie} ${reg.especie}</strong> | Época: <strong>${reg.epoca}</strong></div>
                <div class="potrero-meta">Responsable: <strong>${reg.responsable}</strong></div>
