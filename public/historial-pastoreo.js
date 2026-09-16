// Importar módulos oficiales del SDK de Firebase v9+
import { initializeApp } from "https://gstatic.com";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    serverTimestamp 
} from "https://gstatic.com";

// 1. Configuración e Inicialización de Firebase (Hato Laguna Brava)
const firebaseConfig = {
  apiKey: "AIzaSyADbn4gV6ROrppvanBM835IRyX3U8wdAnk", 
  authDomain: "://firebaseapp.com",
  projectId: "hato-laguna-brava",
  storageBucket: "hato-laguna-brava.firebasestorage.app",
  messagingSenderId: "1053099733476",
  appId: "1:1053099733476:web:624514d41b08d1b347d7f1",
  measurementId: "G-2E517DTZFS"
};

// Inicialización única de servicios en la nube
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Referencias a los elementos del DOM (Formulario)
const paddockForm = document.getElementById('paddockForm');
const fIngreso = document.getElementById('f-ingreso');
const fSalida = document.getElementById('f-salida');
const cabezas = document.getElementById('cabezas');
const pesoPromedio = document.getElementById('peso');

// Elementos de Control del Entorno (Semáforo, Sonido y Contenedor de Tarjetas)
const alertSound = document.getElementById('alert-sound');
const semaforo = document.getElementById('sync-semaphore') || document.getElementById('sync-semaphore-main');
const syncText = document.getElementById('sync-text') || document.getElementById('sync-text-main');
const diasOcupacionDisplay = document.getElementById('dias-ocupacion-val');
const uaDisplay = document.getElementById('ua-val');
const timelineWrapper = document.getElementById('timeline-wrapper');

// 2. Funciones Fisiológicas y Físicas del Hato (Audio y Semáforo)
function emitirAlertaSonora() {
    if (alertSound) {
        alertSound.currentTime = 0;
        alertSound.play().catch(err => console.log("Audio retenido por políticas del navegador hasta interacción del operario.", err));
    }
}

function ejecutarSincronizacionVisual(estado) {
    if (!semaforo || !syncText) return;
    
    if (estado === 'sincronizado') {
        semaforo.style.backgroundColor = '#2e7d32'; // Verde Sabana
        syncText.textContent = 'Sincronizado';
    } else if (estado === 'procesando') {
        semaforo.style.backgroundColor = '#f57c00'; // Naranja Satelital
        syncText.textContent = 'Transmitiendo...';
    } else {
        semaforo.style.backgroundColor = '#d32f2f'; // Rojo Alerta
        syncText.textContent = 'Fallo de Red';
    }
}

// 3. Métricas Técnicas y Zootécnicas en Tiempo Real
function calcularMetricas() {
    let diasOcupacion = 0;
    if (fIngreso && fIngreso.value && fSalida && fSalida.value) {
        // Corrección de huso horario aplicando tiempo estricto local
        const fechaInicio = new Date(fIngreso.value + 'T00:00:00');
        const fechaFin = new Date(fSalida.value + 'T00:00:00');
        const diferenciaMs = fechaFin - fechaInicio;
        
        if (diferenciaMs >= 0) {
            diasOcupacion = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));
        }
    }

    let unidadesAnimales = 0;
    const numCabezas = cabezas ? (parseFloat(cabezas.value) || 0) : 0;
    const peso = pesoPromedio ? (parseFloat(pesoPromedio.value) || 0) : 0;

    if (numCabezas > 0 && peso > 0) {
        unidadesAnimales = parseFloat(((numCabezas * peso) / 450).toFixed(2));
    }

    if (diasOcupacionDisplay) diasOcupacionDisplay.textContent = diasOcupacion;
    if (uaDisplay) uaDisplay.textContent = unidadesAnimales;

    return { diasOcupacion, unidadesAnimales };
}

// Escuchadores de eventos para cálculos automáticos en pantalla
[fIngreso, fSalida, cabezas, pesoPromedio].forEach(element => {
    if (element) {
        element.addEventListener('input', calcularMetricas);
    }
});

// 4. Conexión de Envío (Formulario -> Firestore)
if (paddockForm) {
    paddockForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        emitirAlertaSonora();
        ejecutarSincronizacionVisual('procesando');

        const { diasOcupacion, unidadesAnimales } = calcularMetricas();

        const registroPastoreo = {
            potrero_id: document.getElementById('potrero')?.value || 'Sin especificar',
            lote_ganado: document.getElementById('lote')?.value || 'Sin especificar',
            fecha_ingreso: fIngreso.value,
            fecha_salida: fSalida.value,
            dias_ocupacion: diasOcupacion,
            cabezas: parseInt(cabezas.value) || 0,
            peso_promedio_kg: parseFloat(pesoPromedio.value) || 0,
            carga_animal_ua: unidadesAnimales,
            altura_pasto_ingreso_cm: parseFloat(document.getElementById('alt-ingreso')?.value) || null,
            altura_pasto_salida_cm: parseFloat(document.getElementById('alt-salida')?.value) || null,
            especie_forrajera: document.getElementById('especie')?.value || '',
            observaciones: document.getElementById('observaciones-paddock')?.value || '',
            timestamp: serverTimestamp()
        };

        try {
            await addDoc(collection(db, "historial_potreros"), registroPastoreo);
            ejecutarSincronizacionVisual('sincronizado');
            paddockForm.reset();
            calcularMetricas();
        } catch (error) {
            console.error("Error al guardar en Firestore: ", error);
            ejecutarSincronizacionVisual('error');
            alert("Error crítico de transmisión. Verifique la antena satelital.");
        }
    });
}

// 5. Escuchador en Tiempo Real (Firestore -> Línea de Tiempo del Hato)
function inicializarEscuchadorHistorial() {
    if (!timelineWrapper) return;

    ejecutarSincronizacionVisual('procesando');
    
    // Consulta ordenada por marcas de tiempo en la nube descendente (Más nuevos arriba)
    const q = query(collection(db, "historial_potreros"), orderBy("timestamp", "desc"));

    onSnapshot(q, (snapshot) => {
        timelineWrapper.innerHTML = '';

        if (snapshot.empty) {
            timelineWrapper.innerHTML = `<p style="color:var(--text-muted); font-style:italic; text-align:center; padding:20px;">No existen rotaciones asentadas en la bitácora virtual.</p>`;
            ejecutarSincronizacionVisual('sincronizado');
            return;
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            
            // Generación modular del bloque de eventos del timeline
            const eventCard = document.createElement('article');
            eventCard.className = 'timeline-event';
            eventCard.style.marginBottom = '16px';

            eventCard.innerHTML = `
                <div class="timeline-indicator"></div>
                <div class="timeline-details" style="width: 100%;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <span class="timeline-date" style="font-weight:700; color:var(--primary-color);">📅 In: ${data.fecha_ingreso || 'N/A'} — Out: ${data.fecha_salida || 'N/A'}</span>
                        <span class="badge-status badge-ocupado" style="font-size:0.7rem; font-weight:bold; background-color:var(--secondary-color); color:white; padding:2px 8px; border-radius:4px;">${data.dias_ocupacion || 0} Días</span>
                    </div>
                    <h3 style="margin: 4px 0; color:var(--primary-color); font-size:1.1rem;">📍 Potrero: ${data.potrero_id}</h3>
                    <div class="pastoreo-grid" style="margin-top:8px;">
                        <div class="historial-pastoreo-item">
                            <span class="historial-pastoreo-label">Lote Ganadero</span>
                            <span class="historial-pastoreo-value">${data.lote_ganado} (${data.cabezas || 0} Cab.)</span>
                        </div>
                        <div class="historial-pastoreo-item">
                            <span class="historial-pastoreo-label">Presión Biológica</span>
                            <span class="historial-pastoreo-value" style="color:var(--primary-color); font-weight:bold;">${data.carga_animal_ua || '0.00'} UA</span>
                        </div>
                    </div>
                    ${data.observaciones ? `
                        <div class="historial-pastoreo-obs" style="margin-top:8px;">
                            <strong>Notas de Campo:</strong> ${data.observaciones}
                        </div>
                    ` : ''}
                </div>
            `;
            timelineWrapper.appendChild(eventCard);
        });

        ejecutarSincronizacionVisual('sincronizado');
    }, (error) => {
        console.error("Error en tiempo real de Firestore: ", error);
        ejecutarSincronizacionVisual('error');
    });
}

// Inicializar la carga técnica al arrancar la ventana del navegador
document.addEventListener('DOMContentLoaded', () => {
    calcularMetricas();
    inicializarEscuchadorHistorial();
});
