/**
 * Módulo de Historial y KPIs de Potreros - Hato Laguna Brava
 * Maneja el cálculo de días de ocupación, descanso, presión de pastoreo y semaforización.
 */

import { db } from './db.js'; // Asumiendo tu instancia de Dexie o gestor local

document.addEventListener('DOMContentLoaded', async () => {
    await cargarHistorialPotreros();
});

async function cargarHistorialPotreros() {
    const tbody = document.getElementById('tabla-potreros-body');
    
    try {
        // Consulta a la base de datos local o almacenamiento unificado de potreros
        // Ajusta la tabla/colección según tu esquema actual (ej: db.movimientosPotreros o db.potreros)
        const registros = await db.historialPotreros.orderBy('fecha_entrada').reverse().toArray();

        if (!registros || registros.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">
                        No hay registros de rotación de potreros almacenados localmente.
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = '';

        registros.forEach(reg => {
            // 1. Cálculo de Días de Ocupación
            const diasOcupacion = calcularDiasOcupacion(reg.fecha_entrada, reg.fecha_salida);
            
            // 2. Cálculo de Presión de Pastoreo (UA / Hectáreas)
            const presionPastoreo = reg.area_hectareas > 0 ? (reg.carga_ua / reg.area_hectareas).toFixed(2) : 0;

            // 3. Determinación de Estado y Color de Alerta Visual (Semáforo)
            const estadoVisual = evaluarEstadoPotrero(reg);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <strong>${reg.nombre_potrero}</strong><br>
                    <small style="color: var(--text-muted);">${reg.area_hectareas || 0} ha</small>
                </td>
                <td>
                    ${reg.lote_asignado || 'Sin Lote'} <br>
                    <small style="color: var(--text-muted);">${reg.carga_ua || 0} UA (${presionPastoreo} UA/ha)</small>
                </td>
                <td>
                    <i class="fa-solid fa-arrow-right-to-bracket" style="color: var(--primary-color);"></i> ${reg.fecha_entrada || 'N/D'} <br>
                    <i class="fa-solid fa-arrow-right-from-bracket" style="color: var(--accent-color);"></i> ${reg.fecha_salida || 'En Ocupación'}
                    <br><small><strong>Ocupación:</strong> ${diasOcupacion} días</small>
                </td>
                <td>
                    <span class="badge-estado" style="background-color: ${estadoVisual.color}; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 5px;">
                        <i class="${estadoVisual.icono}"></i> ${estadoVisual.texto}
                    </span>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error("Error al cargar el historial de potreros:", error);
        mostrarToast("Error al sincronizar los datos de potreros", "error");
    }
}

/**
 * Fórmula: Días de Ocupación = fecha_salida - fecha_entrada
 */
function calcularDiasOcupacion(entrada, salida) {
    if (!entrada) return 0;
    const fEntrada = new Date(entrada);
    const fSalida = salida ? new Date(salida) : new Date(); // Si está abierto, toma la fecha actual
    const diferenciaMs = fSalida - fEntrada;
    const dias = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));
    return dias >= 0 ? dias : 0;
}

/**
 * Lógica de Alertas Visuales (Semáforo):
 * - Verde: Listo para pastoreo (Descanso óptimo cumplido, forraje recuperado).
 * - Amarillo: En descanso / crecimiento activo.
 * - Rojo: Sobrepastoreado o tiempo de ocupación excedido.
 */
function evaluarEstadoPotrero(reg) {
    if (reg.estado === 'Ocupado') {
        const dias = calcularDiasOcupacion(reg.fecha_entrada, reg.fecha_salida);
        // Umbral crítico de ocupación en trópico (ej: > 7 días sobrepasa la Rostrización/Rebrote)
        if (dias > 7) {
            return { texto: 'Ocupado (Excedido)', color: '#d90429', icono: 'fa-solid fa-triangle-exclamation' };
        }
        return { texto: 'Ocupado', color: '#fb8500', icono: 'fa-solid fa-cow' };
    } else {
        // En Descanso: Evaluamos días de recuperación (ej: ideal > 30-45 días según pasto tropical)
        const diasDescanso = reg.dias_descanso || 0;
        if (diasDescanso >= 30) {
            return { texto: 'Listo para Pastoreo', color: '#2b9348', icono: 'fa-solid fa-check-circle' };
        } else {
            return { texto: 'En Descanso / Crecimiento', color: '#e9c46a', icono: 'fa-solid fa-seedling' };
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
