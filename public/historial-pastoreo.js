// ==========================================
// LÓGICA PRINCIPAL: HISTORIAL DE PASTOREO
// ==========================================

import { obtenerDatosLocales, sincronizarConServidor } from './syncManager.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Inicializando módulo de Historial de Pastoreo - Hato Laguna Brava...");
    
    // 1. Cargar registros locales y poblar la interfaz
    await inicializarHistorialPastoreo();

    // 2. Configurar eventos interactivos
    const btnBuscar = document.getElementById('btn-sincronizar-historial');
    if (btnBuscar) {
        btnBuscar.addEventListener('click', async () => {
            mostrarToast("Actualizando registros y estado de red...");
            await sincronizarConServidor((exito, mensaje) => {
                actualizarSemoforoUI(exito, mensaje);
            });
            await inicializarHistorialPastoreo();
        });
    }

    const filtroPotrero = document.getElementById('filtro-historial-potrero');
    if (filtroPotrero) {
        filtroPotrero.addEventListener('change', (e) => {
            filtrarTablaPorPotrero(e.target.value);
        });
    }
});

// Variable global en memoria para los datos cargados
let cachePastoreo = [];

async function inicializarHistorialPastoreo() {
    try {
        cachePastoreo = await obtenerDatosLocales();
        
        // Mock base para pruebas en campo si la base local está vacía
        if (!cachePastoreo || cachePastoreo.length === 0) {
            cachePastoreo = generarDatosPruebaPastoreo();
        }

        poblarSelectorPotreros(cachePastoreo);
        renderizarTablaHistorial(cachePastoreo);
        actualizarMetricasGlobales(cachePastoreo);
        generarSugerenciasPastoreo(cachePastoreo);
        ejecutarAsistenteInteligente(cachePastoreo);

    } catch (error) {
        console.error("Error al inicializar el historial de pastoreo:", error);
        mostrarToast("Error al leer los registros locales.", "error");
    }
}

function generarDatosPruebaPastoreo() {
    return [
        { id: "P-01", potrero: "Banco Alto 1", area: 32.5, estado: "Ocupado", descanso: 0, ugmHa: 1.42, activo: true, diasOcupacion: 4 },
        { id: "P-02", potrero: "Módulo Bajío 3", area: 45.0, estado: "Descanso", descanso: 38, ugmHa: 0.00, activo: false, diasOcupacion: 0 },
        { id: "P-03", potrero: "Matas de EA", area: 28.0, estado: "Descanso", descanso: 45, ugmHa: 0.00, activo: false, diasOcupacion: 0 },
        { id: "P-04", potrero: "Banco Central", area: 38.2, estado: "Ocupado", descanso: 0, ugmHa: 1.35, activo: false, diasOcupacion: 2 }
    ];
}

function poblarSelectorPotreros(datos) {
    const select = document.getElementById('filtro-historial-potrero');
    if (!select) return;
    
    select.innerHTML = '<option value="">Todos los Potreros</option>';
    
    datos.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id || item.potrero;
        option.textContent = `${item.potrero} (${item.area} ha)`;
        select.appendChild(option);
    });
}

function renderizarTablaHistorial(datos) {
    const tbody = document.getElementById('tabla-potreros-body');
    if (!tbody) return;

    if (datos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No hay registros de pastoreo disponibles.</td></tr>`;
        return;
    }

    tbody.innerHTML = datos.map(item => `
        <tr>
            <td><strong>${item.potrero}</strong></td>
            <td>${item.area} ha</td>
            <td><span style="color: ${item.estado === 'Ocupado' ? 'var(--primary-color)' : 'var(--accent-color)'}; font-weight: 600;">${item.estado}</span></td>
            <td>${item.descanso} días</td>
            <td>${item.ugmHa ? item.ugmHa.toFixed(2) : '0.00'}</td>
        </tr>
    `).join('');
}

function actualizarMetricasGlobales(datos) {
    const activo = datos.find(i => i.estado === 'Ocupado' || i.activo) || datos[0];
    
    document.getElementById('metric-potrero').textContent = activo ? activo.potrero : '--';
    document.getElementById('metric-dias-ocupacion').textContent = (activo && activo.diasOcupacion) ? `${activo.diasOcupacion} d` : '0 d';
    document.getElementById('metric-dias-descanso').textContent = activo ? `${activo.descanso || 0} d` : '0 d';
    document.getElementById('metric-presion').textContent = activo && activo.ugmHa ? activo.ugmHa.toFixed(2) : '0.00';
}

function generarSugerenciasPastoreo(datos) {
    const lista = document.getElementById('lista-potreros-sugeridos');
    if (!lista) return;

    const sugeridos = [...datos].sort((a, b) => b.descanso - a.descanso).slice(0, 2);

    lista.innerHTML = sugeridos.map(item => `
        <li class="suggested-item">
            <span><strong>${item.potrero}</strong> (${item.area} ha) - ${item.descanso} días de descanso</span>
            <i class="fa-solid fa-circle-check" style="color: var(--accent-color);"></i>
        </li>
    `).join('');
}

function ejecutarAsistenteInteligente(datos) {
    const contenedorAI = document.getElementById('ai-sugerencias-content');
    if (!contenedorAI) return;

    const ocupados = datos.filter(i => i.estado === 'Ocupado');
    const promedioUGM = datos.reduce((acc, curr) => acc + (curr.ugmHa || 0), 0) / (datos.length || 1);

    contenedorAI.innerHTML = `
        <p style="margin: 0;"><strong>Rotación en Los Módulos:</strong> Hay ${ocupados.length} potreros activos actualmente.</p>
        <p style="margin: 0;"><strong>Carga Promedio:</strong> ${promedioUGM.toFixed(2)} UGM/ha. Rango óptimo para pastizales tropicales en época estacional.</p>
    `;
}

function filtrarTablaPorPotrero(idSeleccionado) {
    if (!idSeleccionado) {
        renderizarTablaHistorial(cachePastoreo);
        actualizarMetricasGlobales(cachePastoreo);
        return;
    }

    const filtrado = cachePastoreo.filter(i => (i.id === idSeleccionado || i.potrero === idSeleccionado));
    renderizarTablaHistorial(filtrado);
    if (filtrado.length > 0) {
        actualizarMetricasGlobales(filtrado);
    }
}

function actualizarSemoforoUI(exito, mensaje) {
    const light = document.getElementById('light');
    const text = document.getElementById('statusText');
    if (light && text) {
        if (exito) {
            light.className = "semaphore online";
            text.textContent = mensaje || "Sincronizado";
        } else {
            light.className = "semaphore offline";
            text.textContent = mensaje || "Sin conexión";
        }
    }
    mostrarToast(mensaje);
}

function mostrarToast(mensaje) {
    const toast = document.getElementById('toast');
    const msgSpan = document.getElementById('toast-message');
    if (!toast || !msgSpan) return;

    msgSpan.textContent = mensaje;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
