import { obtenerDatosLocales, sincronizarConServidor } from './syncManager.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Iniciando módulo de Historial de Potreros con IndexedDB...");
    
    // 1. Cargar registros locales y poblar la interfaz
    await inicializarHistorialPotreros();

    // 2. Configurar eventos de los botones
    const btnBuscar = document.getElementById('btn-sincronizar-historial');
    if (btnBuscar) {
        btnBuscar.addEventListener('click', filtrarHistorial);
    }
});

async function inicializarHistorialPotreros() {
    try {
        // Obtenemos los datos directamente desde IndexedDB usando syncManager
        const datosPotreros = await obtenerDatosLocales();
        
        poblarSelectorPotreros(datosPotreros);
        renderizarTablaHistorial(datosPotreros);
        actualizarMetricasGlobales(datosPotreros);
        generarSugerenciasPastoreo(datosPotreros);
        ejecutarAsistenteInteligente(datosPotreros);

    } catch (error) {
        console.error("Error al sincronizar los registros de potreros:", error);
        mostrarToast("Error al leer los registros locales.", "error");
    }
}

// ... (las funciones de renderizado, tablas, métricas y filtros que ya tienes estructuradas)
