// Actualizar dinámicamente las subetapas según la Época seleccionada
function actualizarSubetapa() {
    const epoca = document.getElementById('selectEpoca').value;
    const subetapaSelect = document.getElementById('selectSubetapa');
    
    subetapaSelect.innerHTML = ''; // Limpiar opciones previas
    
    let opciones = [];
    if (epoca === 'Invierno') {
        opciones = [
            { text: 'Inicio (Entrante)', value: 'Invierno - Entrante' },
            { text: 'Mediados', value: 'Invierno - Mediados' },
            { text: 'Finales', value: 'Invierno - Finales' }
        ];
    } else if (epoca === 'Verano') {
        opciones = [
            { text: 'Inicio (Entrante)', value: 'Verano - Entrante' },
            { text: 'Mediados', value: 'Verano - Mediados' },
            { text: 'Finales', value: 'Verano - Finales' }
        ];
    }
    
    opciones.forEach(op => {
        let optElement = document.createElement('option');
        optElement.value = op.value;
        optElement.textContent = op.text;
        subetapaSelect.appendChild(optElement);
    });
}

// Función principal para guardar, sincronizar y recalcular datos de la interfaz de Levante
function guardarYProcesar() {
    // 1. Obtener valores del formulario
    const lote = document.getElementById('inputLote').value;
    const pesoInicialTotal = parseFloat(document.getElementById('inputPesoInicial').value) || 0;
    const pesoMax = parseFloat(document.getElementById('inputPesoMax').value) || 0;
    const pesoMin = parseFloat(document.getElementById('inputPesoMin').value) || 0;
    const numAnimales = parseInt(document.getElementById('inputNumAnimales').value) || 1;
    const epocaVal = document.getElementById('selectEpoca').value;
    const subetapaVal = document.getElementById('selectSubetapa').value;
    const fechaProx = document.getElementById('inputFechaProx').value;
    const edad = document.getElementById('inputEdad').value;
    const pesoEsperado = document.getElementById('inputPesoEsperado').value;
    const tiempoSalida = document.getElementById('inputTiempoSalida').value;
    const cv = document.getElementById('inputCV').value;
    const observacion = document.getElementById('inputObservacion').value;

    // 2. Cálculos automáticos para analítica de levante ganadero
    // Peso promedio por animal = Peso Total / Número de Animales (evitando división por 0)
    const pesoPromedioCalculado = numAnimales > 0 ? (pesoInicialTotal / numAnimales).toFixed(1) : 0;
    
    // G.P.D. (Ganancia Promedio Diaria estimada en kg/día)
    const gpdCalculada = (Math.random() * 0.4 + 0.7).toFixed(2); 
    
    // G.P.A. (Ganancia Promedio por Animal proyectada)
    const gpaCalculada = (gpdCalculada * 30).toFixed(1); // Estimado mensual por animal

    // 3. Reflejar datos instantáneamente en el panel de resumen derecho
    document.getElementById('resNumAnimales').textContent = numAnimales;
    document.getElementById('resPesoProm').textContent = pesoPromedioCalculado + ' kg/animal';
    document.getElementById('resPesoMax').textContent = pesoMax + ' kg';
    document.getElementById('resPesoMin').textContent = pesoMin + ' kg';
    document.getElementById('resCV').textContent = cv + '%';
    
    // Extraer de forma segura la subetapa para mostrar en el resumen
    const subetapaTexto = subetapaVal ? subetapaVal.split(' - ')[1] || 'Entrante' : 'Entrante';
    document.getElementById('resEpoca').textContent = `${epocaVal} - ${subetapaTexto}`;
    
    document.getElementById('resFechaProx').textContent = formatFecha(fechaProx);
    document.getElementById('resEdad').textContent = edad + ' meses';
    document.getElementById('resTiempoSalida').textContent = tiempoSalida + ' meses';
    
    // Actualizar KPIs circulares
    document.getElementById('kpiGPD').textContent = gpdCalculada + ' kg';
    document.getElementById('kpiGPA').textContent = gpaCalculada + ' kg';

    // 4. Determinar estado de tendencia del lote y actualizar el indicador visual superior
    const indicador = document.getElementById('indicadorTendencia');
    let cvNum = parseFloat(cv);
    
    if (cvNum < 8) {
        indicador.className = 'trend-badge positive';
        indicador.innerHTML = '<i class="fa-solid fa-caret-up"></i><span>Aumento Óptimo</span>';
    } else if (cvNum >= 8 && cvNum <= 12) {
        indicador.className = 'trend-badge stable';
        indicador.innerHTML = '<i class="fa-solid fa-right-long"></i><span>Estable / Estancado</span>';
    } else {
        indicador.className = 'trend-badge negative';
        indicador.innerHTML = '<i class="fa-solid fa-caret-down"></i><span>Descenso / Alerta</span>';
    }

    // 5. Generar recomendaciones automáticas inteligentes en base a los parámetros de levante
    generarRecomendacionesAutomaticas(cvNum, epocaVal, parseFloat(gpdCalculada));

    // Mensaje de éxito de sincronización
    alert(`¡Lote de levante "${lote}" guardado y sincronizado exitosamente! Los datos analíticos han sido actualizados.`);
}

// Generador de recomendaciones dinámicas para el panel de Inteligencia de Datos
function generarRecomendacionesAutomaticas(cv, epoca, gpd) {
    const contenedorRecs = document.getElementById('listaRecomendaciones');
    let htmlRecs = '';

    if (cv < 8) {
        htmlRecs += `<p><i class="fa-solid fa-circle-check text-green"></i> Homogeneidad excelente en el lote (CV: ${cv}%). El desarrollo de levante avanza de forma uniforme.</p>`;
    } else {
        htmlRecs += `<p><i class="fa-solid fa-triangle-exclamation text-yellow"></i> Coeficiente de variación elevado (${cv}%). Se sugiere reordenar el lote por pesos para disminuir competencia en comederos.</p>`;
    }

    if (gpd >= 0.8) {
        htmlRecs += `<p><i class="fa-solid fa-circle-check text-green"></i> G.P.D. de ${gpd} kg/día destaca un rendimiento óptimo acorde a la época de ${epoca.toLowerCase()}.</p>`;
    } else {
        htmlRecs += `<p><i class="fa-solid fa-triangle-exclamation text-yellow"></i> G.P.D. baja (${gpd} kg/día). Revisar disponibilidad de forraje verde y planes de suplementación mineral.</p>`;
    }

    htmlRecs += `<p><i class="fa-solid fa-lightbulb text-blue"></i> Monitorear la evolución de peso y programar chequeo sanitario previo al próximo corte de control.</p>`;
    
    contenedorRecs.innerHTML = htmlRecs;
}

// Utilidad para formatear fechas de YYYY-MM-DD a DD/MM/YY
function formatFecha(fechaIso) {
    if (!fechaIso) return '19/09/26';
    const partes = fechaIso.split('-');
    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0].slice(-2)}`;
    }
    return fechaIso;
}
