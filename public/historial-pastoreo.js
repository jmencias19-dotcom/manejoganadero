/**
 * Módulo de Historial y KPIs de Potreros - Hato Laguna Brava
 * Adaptado para consumir los datos locales de IndexedDB nativo.
 */

import { obtenerDatosLocales } from './syncManager.js';

document.addEventListener('DOMContentLoaded', async () => {
    await cargarHistorialPotreros();
});

async function cargarHistorialPotreros() {
    const tbody = document.getElementById('tabla-potreros-body');
    
    try {
        // Obtenemos los registros directamente de IndexedDB nativo
        const registros = await obtenerDatosLocales();

        if (!registros || registros.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">
                        No hay registros de rotación de potreros almacenados localmente.
                    </td>
                </tr>`;
            return;
        }

        // Ordenar por fecha de entrada de forma descendente (más reciente primero)
        registros.sort((a, b) => new Date(b.fecha_entrada || 0) - new Date(a.fecha_entrada || 0));

        tbody.innerHTML = '';

        registros.forEach(reg => {
            // 1. Días de Ocupación
            const diasOcupacion = calcularDiasOcupacion(reg.fecha_entrada, reg.fecha_salida);
            
            // 2. Días de Descanso
            const diasDescanso = reg.dias_descanso || calcularDiasDescanso(reg.fecha_entrada, reg.fecha_salida_anterior);

            // 3. Presión de Pastoreo (UA / ha)
            const area = reg.area_hectareas > 0 ? reg.area_hectareas : 1;
            const presionPastoreo = (reg.carga_ua / area).toFixed(2);

            // 4. Semáforo Visual Operativo
            const semaforo = evaluarSemafaroPotrero(reg, diasOcupacion, diasDescanso);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <strong>${reg.nombre_potrero || 'Potrero N/D'}</strong><br>
                    <small style="color: var(--text-muted);">${reg.area_hectareas || 0} ha</small>
                </td>
                <td>
                    ${reg.lote_asignado || 'Sin Lote'} <br>
                    <small style="color: var(--text-muted);">${reg.carga_ua || 0} UA (${presionPastoreo} UA/ha)</small>
                </td>
                <td>
                    <div style="font-size: 0.85rem;">
                        <i class="fa-solid fa-arrow-right-to-bracket" style="color: var(--primary-color);"></i> ${reg.fecha_entrada || 'N/D'}<br>
                        <i class="fa-solid fa-arrow-right-from-bracket" style="color: var(--accent-color);"></i> ${reg.fecha_salida || 'En Ocupación'}
                    </div>
                    <small style="display: block; margin-top: 4px;">
                        <strong>Ocupación:</strong> ${diasOcupacion}d | <strong>Descanso:</strong> ${diasDescanso}d
                    </small>
                </td>
                <td>
                    <span style="background-color: ${semaforo.color}; color: #fff; padding: 5px 10px; border-radius: 6px; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 6px; font-weight: 600;">
                        <i class="${semaforo.icono}"></i> ${semaforo.texto}
                    </span>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error("Error al cargar historial de potreros desde IndexedDB:", error);
        mostrarToast("Error al cargar los datos locales de potreros", "error");
    }
}

function calcularDiasOcupacion(entrada, salida) {
    if (!entrada) return 0;
    const fEntrada = new Date(entrada);
    const fSalida = salida ? new Date(salida) : new Date();
    const diff = fSalida - fEntrada;
    const dias = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return dias >= 0 ? dias : 0;
}

function calcularDiasDescanso(entradaActual, salidaAnterior) {
    if (!entradaActual || !salidaAnterior) return 0;
    const fActual = new Date(entradaActual);
    const fAnterior = new Date(salidaAnterior);
    const diff = fActual - fAnterior;
    const dias = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return dias >= 0 ? dias : 0;
}

/**
 * Lógica del Semáforo de Pasturas Tropicales:
 * - Sobrepastoreado (Rojo): > 7 días de ocupación continua en el potrero.
 * - Ocupado (Naranja): Lote activo dentro del rango seguro.
 * - Listo / Descanso Óptimo (Verde): >= 30 días de recuperación.
 */
function evaluarSemafaroPotrero(reg, diasOcupacion, diasDescanso) {
    if (reg.estado === 'Ocupado' || !reg.fecha_salida) {
        if (diasOcupacion > 7) {
            return { texto: 'Sobrepastoreado', color: '#d90429', icono: 'fa-solid fa-triangle-exclamation' };
        }
        return { texto: 'Ocupado', color: '#fb8500', icono: 'fa-solid fa-cow' };
    } else {
        if (diasDescanso >= 30) {
            return { texto: 'Listo (Verde)', color: '#2b9348', icono: 'fa-solid fa-check-circle' };
        } else {
            return { texto: 'En Descanso', color: '#e9c46a', icono: 'fa-solid fa-seedling' };
        }
    }
}

function mostrarToast(mensaje, tipo = 'success') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    if (!toast || !toastMsg) return;

    toastMsg.textContent = mensaje;
    toast.style.borderLeftColor = tipo === 'error' ? '#d90429' : 'var(--accent-color)';
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}
