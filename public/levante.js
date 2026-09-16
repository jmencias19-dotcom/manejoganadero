document.addEventListener('DOMContentLoaded', () => {
    console.log('Módulo de Control de Levante cargado para Hato Laguna Brava.');
    
    // Inicialización de la lógica específica de la sección
    initLevante();
});

function initLevante() {
    cargarDatosLevante();
    configurarEventosLevante();
    calcularDiasRestantesLevante();
}

function cargarDatosLevante() {
    console.log('Cargando información del ganado en levante (Mestizos Brahman)...');
    
    // Parámetros iniciales base para simulación o carga desde base de datos local
    const datosLevante = {
        lote: 'Lote Levante y Ceba - Módulos',
        pesoEntrada: 296.5, // kg
        pesoActual: 438.5,  // kg
        fechaPesaje: '2026-09-02',
        fechaProximoPesaje: '2026-11-15'
    };

    // Calcular la Ganancia Proyectada y Acumulada inicial
    const gpaInicial = datosLevante.pesoActual - datosLevante.pesoEntrada;
    console.log(`GPA Inicial calculada: ${gpaInicial.toFixed(1)} kg.`);
}

function configurarEventosLevante() {
    // Escucha cambios en la fecha del próximo pesaje para actualizar la alerta de días
    const inputProx = document.getElementById('input-prox-pesaje');
    if (inputProx) {
        inputProx.addEventListener('change', calcularDiasRestantesLevante);
    }
}

function calcularDiasRestantesLevante() {
    const inputProx = document.getElementById('input-prox-pesaje');
    if (!inputProx) return;

    const fechaProx = new Date(inputProx.value);
    const hoy = new Date();
    const diferenciaTiempo = fechaProx - hoy;
    const diasRestantes = Math.ceil(diferenciaTiempo / (1000 * 60 * 60 * 24));
    
    const contenedorDias = document.getElementById('val-dias-proximo');
    if (!contenedorDias) return;

    if (diasRestantes >= 0) {
        contenedorDias.innerText = `${diasRestantes} días restantes para el próximo pesaje oficial`;
        contenedorDias.style.color = diasRestantes <= 15 ? 'var(--warn-color)' : 'var(--secondary-color)';
    } else {
        contenedorDias.innerText = `⚠️ La fecha programada de pesaje está vencida por ${Math.abs(diasRestantes)} días.`;
        contenedorDias.style.color = '#d32f2f';
    }
}

// Lógica para el recálculo dinámico en manga (simulación de pesaje)
function simularNuevoPesajeManga(nuevoPesoManga) {
    const pesoAnterior = 438.5; // kg base
    const pesoEntrada = 296.5;  // kg base
    
    if (isNaN(nuevoPesoManga) || nuevoPesoManga <= 0) {
        console.warn("Valor de peso en manga inválido.");
        return;
    }

    const gananciaAcumulada = nuevoPesoManga - pesoEntrada;
    const diferenciaMarginal = nuevoPesoManga - pesoAnterior;

    console.log(`Nuevo pesaje registrado: ${nuevoPesoManga} kg.`);
    console.log(`Ganancia Acumulada (GPA): ${gananciaAcumulada.toFixed(1)} kg.`);
    console.log(`Variación respecto al pesaje anterior: ${diferenciaMarginal >= 0 ? '+' : ''}${diferenciaMarginal.toFixed(1)} kg.`);

    return {
        pesoActual: nuevoPesoManga,
        gpa: gananciaAcumulada,
        variacion: diferenciaMarginal
    };
}
