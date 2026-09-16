// Matriz de Equivalencias Zootécnicas para Carga Animal (Base UGM = 450-500 kg)
const EQUIVALENCIAS_UGM = {
    "BOVINOS": {
        "Vacas Paridas": 1.00,
        "Vacas Escoteras": 0.85,
        "Novillas (2-3 años)": 0.75,
        "Maute / Torete": 0.60,
        "Becerros/as": 0.30,
        "Toros Padrotes": 1.30
    },
    "BUFALINOS": {
        "Búfalas de Ordeño": 1.20,
        "Búfalas Secas": 1.00,
        "Bubillas": 0.80,
        "Búfalos de Engorde": 0.85,
        "Bucerros/as": 0.40,
        "Búfalos Padrotes": 1.50
    }
};

// Base de Datos Temporal en Memoria (Sincronizada con LocalStorage para persistencia local)
let inventarioCargas = JSON.parse(localStorage.getItem('hato_cargas_v1')) || [];

// Elementos del DOM con validación de existencia (Doble Entorno: Index vs Potreros)
const form = document.getElementById('form-mod1');
const selectEspecie = document.getElementById('select-especie');
const selectCategoria = document.getElementById('select-categoria');
const alertSound = document.getElementById('alert-sound');

// Selectores dinámicos para el Semáforo (Detecta si es Panel Principal o Módulo Potreros)
const semaforo = document.getElementById('sync-semaphore') || document.getElementById('sync-semaphore-main');
const syncText = document.getElementById('sync-text') || document.getElementById('sync-text-main');

// 1. Cargar Categorías Zootécnicas Dinámicas (Solo si el formulario existe en pantalla)
function actualizarCategorias() {
    if (!selectEspecie || !selectCategoria) return;
    
    const especieSeleccionada = selectEspecie.value;
    selectCategoria.innerHTML = '';
    
    if (EQUIVALENCIAS_UGM[especieSeleccionada]) {
        Object.keys(EQUIVALENCIAS_UGM[especieSeleccionada]).forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = `${cat} (Factor: ${EQUIVALENCIAS_UGM[especieSeleccionada][cat]} UGM)`;
            selectCategoria.appendChild(option);
        });
    }
}

// 2. Alarma Sonora para alertar a los operarios en campo
function emitirAlertaSonora() {
    if (alertSound) {
        alertSound.currentTime = 0;
        alertSound.play().catch(error => console.log("Se requiere interacción previa del usuario para reproducir audio corporativo.", error));
    }
}

// 3. Control de Estados del Semáforo de Sincronización
function ejecutarSincronizacionVisual(estado) {
    if (!semaforo || !syncText) return;

    if (estado === 'sincronizado') {
        semaforo.style.backgroundColor = '#2e7d32'; // Verde Sabana
        if (form) {
            syncText.textContent = 'Sincronizado';
        } else {
            syncText.textContent = 'Sistema En Línea'; // Texto específico para Index
        }
    } else if (estado === 'procesando') {
        semaforo.style.backgroundColor = '#f57c00'; // Naranja (Subiendo datos)
        syncText.textContent = 'Sincronizando datos...';
    } else {
        semaforo.style.backgroundColor = '#d32f2f'; // Rojo Alerta
        syncText.textContent = 'Desconectado / Error';
    }
}

// 4. Procesamiento Técnico del Formulario (Solo se ejecuta en potreros.html)
if (form) {
    selectEspecie.addEventListener('change', actualizarCategorias);

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Ejecución inmediata de controles analógicos y de red
        emitirAlertaSonora();
        ejecutarSincronizacionVisual('procesando');

        // Captura de datos estructurales del potrero seleccionado
        const potreroSelect = document.getElementById('select-potrero');
        const potreroNombre = potreroSelect.value;
        const hectareas = parseFloat(potreroSelect.options[potreroSelect.selectedIndex].getAttribute('data-ha'));
        
        const especie = selectEspecie.value;
        const categoria = selectCategoria.value;
        const cantidadCabezas = parseInt(document.getElementById('cantidad-cabezas').value);
        const temporada = document.getElementById('select-temporada').value;
        
        const fIngreso = new Date(document.getElementById('fecha-ingreso').value + 'T00:00:00');
        const fSalida = new Date(document.getElementById('fecha-salida').value + 'T00:00:00');

        // Cálculo matemático exacto de Días de Ocupación
        const diferenciaTiempo = fSalida.getTime() - fIngreso.getTime();
        const diasOcupacion = Math.max(0, Math.ceil(diferenciaTiempo / (1000 * 60 * 60 * 24)));

        // Cálculo de Carga Ecológica bajo normas zootécnicas
        const factorUGM = EQUIVALENCIAS_UGM[especie][categoria];
        const totalUGM = cantidadCabezas * factorUGM;
        const cargaEcologica = totalUGM / hectareas; 

        // Empaquetado del registro de pastoreo
        const nuevaCarga = {
            id: Date.now(),
            potreroNombre,
            hectareas,
            especie,
            categoria,
            cantidadCabezas,
            temporada,
            diasOcupacion,
            totalUGM,
            cargaEcologica: cargaEcologica.toFixed(2)
        };

        // Persistencia y actualización de estructuras
        inventarioCargas.push(nuevaCarga);
        localStorage.setItem('hato_cargas_v1', JSON.stringify(inventarioCargas));

        // Simulación de retraso de red satelital en hato (800ms) antes de confirmar sincronización
        setTimeout(() => {
            renderizarTableroKPI();
            renderizarTarjetasPotreros();
            ejecutarSincronizacionVisual('sincronizado');
            form.reset();
            actualizarCategorias();
        }, 800);
    });
}

// 5. Renderizado de Métricas Globales del Hato (KPIs)
function renderizarTableroKPI() {
    if (!document.getElementById('kpi-total-cabezas')) return;

    const totalCabezas = inventarioCargas.reduce((sum, item) => sum + item.cantidadCabezas, 0);
    const totalUGM = inventarioCargas.reduce((sum, item) => sum + item.totalUGM, 0);

    document.getElementById('kpi-total-cabezas').textContent = totalCabezas;
    document.getElementById('kpi-total-ugm').textContent = totalUGM.toFixed(2);
}

// 6. Generación Dinámica de Bloques de Control por Potrero Trabajado
function renderizarTarjetasPotreros() {
    const contenedor = document.querySelector('.potreros-container');
    if (!contenedor) return;
    
    contenedor.innerHTML = '';

    if (inventarioCargas.length === 0) {
        contenedor.innerHTML = `<p style="color:#666; font-style:italic; text-align:center; padding:20px;">No hay cargas animales registradas en este ciclo.</p>`;
        return;
    }

    // Muestra los registros ordenados desde el más reciente en la parte superior
    [...inventarioCargas].reverse().forEach(item => {
        const card = document.createElement('div');
        card.className = 'potrero-card-activa';
        
        // Estilos en línea estructurados para control visual de los operarios
        card.style.borderLeft = '5px solid #2e7d32';
        card.style.backgroundColor = '#ffffff';
        card.style.padding = '16px';
        card.style.marginBottom = '14px';
        card.style.borderRadius = '8px';
        card.style.boxShadow = '0 3px 6px rgba(0,0,0,0.08)';

        // Mapeo técnico legible de la temporada agroecológica
        const formatoTemporada = item.temporada.replace('_', ' ').toLowerCase();

        card.innerHTML = `
            <div style="display:flex; justify-content:between; align-items:center; border-bottom:1px solid #eee; padding-bottom:6px; margin-bottom:8px;">
                <h3 style="margin: 0; color: #1b5e20; font-size:1.15rem;">📍 ${item.potreroNombre}</h3>
                <span style="font-size:0.85rem; background:#e8f5e9; color:#2e7d32; padding:2px 8px; border-radius:12px; font-weight:bold;">${item.hectareas} Ha</span>
            </div>
            <p style="margin: 4px 0; font-size:0.95rem;"><strong>Lote:</strong> ${item.cantidadCabezas} Cabezas — ${item.especie} (${item.categoria})</p>
            <p style="margin: 4px 0; font-size:0.95rem; text-transform: capitalize;"><strong>Época:</strong> ${formatoTemporada}</p>
            <p style="margin: 6px 0; color: #b71c1c; font-weight:bold; font-size:0.95rem;"><strong>⏱️ Ocupación Activa:</strong> ${item.diasOcupacion} Días </p>
            <div style="margin-top:10px; padding-top:6px; border-top:1px dashed #ddd; display:flex; justify-content:space-between; font-size:0.9rem;">
                <span><strong>Presión:</strong> ${item.totalUGM.toFixed(2)} UGM</span>
                <span style="color:#2e7d32; font-weight:bold;"><strong>Carga Real:</strong> ${item.cargaEcologica} UGM/Ha</span>
            </div>
        `;
        contenedor.appendChild(card);
    });
}

// Inicialización Automática según entorno de ejecución
document.addEventListener('DOMContentLoaded', () => {
    actualizarCategorias();
    renderizarTableroKPI();
    renderizarTarjetasPotreros();
    ejecutarSincronizacionVisual('sincronizado');
});
