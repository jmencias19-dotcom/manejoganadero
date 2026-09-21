import { syncManager } from './js/syncManager.js'; // O la ruta correspondiente de tu gestor de datos

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Iniciando módulo de Historial de Potreros...");
    
    // 1. Cargar datos iniciales y poblar selectores
    await inicializarHistorialPotreros();

    // 2. Configurar eventos de los botones y filtros
    const btnBuscar = document.getElementById('btn-sincronizar-historial');
    if (btnBuscar) {
        btnBuscar.addEventListener('click', filtrarHistorial);
    }
});

async function inicializarHistorialPotreros() {
    try {
        // Ejemplo de obtención de datos desde localStorage o Firebase vía syncManager
        const datosPotreros = JSON.parse(localStorage.getItem('hlab_potreros_data')) || [];
        
        poblarSelectorPotreros(datosPotreros);
        renderizarTablaHistorial(datosPotreros);
        actualizarMetricasGlobales(datosPotreros);
        generarSugerenciasPastoreo(datosPotreros);
        ejecutarAsistenteInteligente(datosPotreros);

    } catch (error) {
        console.error("Error al cargar el historial de potreros:", error);
        mostrarToast("Error al sincronizar los registros de potreros.", "error");
    }
}

function poblarSelectorPotreros(potreros) {
    const select = document.getElementById('filtro-historial-potrero');
    if (!select) return;

    // Limpiar opciones previas manteniendo la opción por defecto
    select.innerHTML = '<option value="">Todos los Potreros</option>';

    potreros.forEach(p => {
        const option = document.createElement('option');
        option.value = p.nombre || p.id;
        option.textContent = p.nombre || `Potrero ${p.id}`;
        select.appendChild(option);
    });
}

function renderizarTablaHistorial(potreros) {
    const tbody = document.getElementById('tabla-potreros-body');
    if (!tbody) return;

    if (!potreros || potreros.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 15px;">No hay registros de potreros disponibles.</td></tr>`;
        return;
    }

    let htmlRows = '';
    potreros.forEach(p => {
        // Estructura adaptada a las propiedades de tu base de datos local
        htmlRows += `
            <tr>
                <td><b>${p.nombre || 'Sin Nombre'}</b></td>
                <td>${p.hectareas || 0} ha</td>
                <td><span style="color: ${p.ocupado ? '#e63946' : '#28a745'}; font-weight: 600;">${p.ocupado ? 'Ocupado' : 'Disponible'}</span></td>
                <td>${p.diasDescanso || 0} días</td>
                <td>${p.ugmHa ? p.ugmHa.toFixed(2) : '0.00'}</td>
            </tr>
        `;
    });
    tbody.innerHTML = htmlRows;
}

function actualizarMetricasGlobales(potreros) {
    // Filtrar o calcular métricas del potrero activo principal
    const activo = potreros.find(p => p.ocupado === true) || potreros[0];
    
    if (activo) {
        document.getElementById('metric-potrero').textContent = activo.nombre || '--';
        document.getElementById('metric-dias-ocupacion').textContent = `${activo.diasOcupacion || 0} d`;
        document.getElementById('metric-dias-descanso').textContent = `${activo.diasDescanso || 0} d`;
        document.getElementById('metric-presion').textContent = activo.ugmHa ? activo.ugmHa.toFixed(2) : '0.00';
    }
}

function generarSugerenciasPastoreo(potreros) {
    const lista = document.getElementById('lista-potreros-sugeridos');
    if (!lista) return;

    // Filtrar potreros con mayor tiempo de descanso (listos para rotación)
    const disponibles = potreros
        .filter(p => !p.ocupado)
        .sort((a, b) => (b.diasDescanso || 0) - (a.diasDescanso || 0))
        .slice(0, 3); // Top 3 sugerencias

    if (disponibles.length === 0) {
        lista.innerHTML = `<li class="suggested-item"><span>No hay potreros con descanso suficiente registrado.</span></li>`;
        return;
    }

    lista.innerHTML = disponibles.map(p => `
        <li class="suggested-item" style="cursor: pointer;" onclick="window.location.href='./potrero_detalle.html?id=${p.id || ''}'">
            <span><b>${p.nombre}</b> — Descanso óptimo: ${p.diasDescanso || 0} días</span>
            <i class="fa-solid fa-chevron-right" style="font-size: 0.7rem; color: var(--accent-color);"></i>
        </li>
    `).join('');
}

function ejecutarAsistenteInteligente(potreros) {
    const contenedorAI = document.getElementById('ai-sugerencias-content');
    if (!contenedorAI) return;

    const activos = potreros.filter(p => p.ocupado);
    let mensaje = "La rotación actual se encuentra dentro de los parámetros estables para el hato.";

    if (activos.length > 0) {
        const altaPresion = activos.some(p => (p.ugmHa || 0) > 1.5);
        if (altaPresion) {
            mensaje = "⚠️ Alerta de carga: Se detectan potreros con alta presión UGM/ha. Considere evaluar el traslado inmediato del lote hacia un potrero con mayor disponibilidad de forraje.";
        } else {
            mensaje = "✅ Carga animal equilibrada en los potreros activos. El tiempo de ocupación promedio cumple con la recuperación estimada del pasto tropical.";
        }
    }

    contenedorAI.innerHTML = `<p style="margin: 0;">${mensaje}</p>`;
}

function filtrarHistorial() {
    const potreroSeleccionado = document.getElementById('filtro-historial-potrero').value;
    const datosPotreros = JSON.parse(localStorage.getItem('hlab_potreros_data')) || [];
    
    if (!potreroSeleccionado) {
        renderizarTablaHistorial(datosPotreros);
        mostrarToast("Mostrando todos los potreros", "info");
        return;
    }

    const filtrado = datosPotreros.filter(p => (p.nombre || p.id) === potreroSeleccionado);
    renderizarTablaHistorial(filtrado);
    mostrarToast(`Filtro aplicado: ${potreroSeleccionado}`, "success");
}

function mostrarToast(mensaje, tipo = 'success') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    if (!toast || !toastMsg) return;

    toastMsg.textContent = mensaje;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
