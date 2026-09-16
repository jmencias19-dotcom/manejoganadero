// Importar módulos SDK de Firebase v9+ 
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. Configuración e Inicialización de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyADbn4gV6ROrppvanBM835IRyX3U8wdAnk", 
  authDomain: "hato-laguna-brava.firebaseapp.com",
  projectId: "hato-laguna-brava",
  storageBucket: "hato-laguna-brava.firebasestorage.app",
  messagingSenderId: "1053099733476",
  appId: "1:1053099733476:web:624514d41b08d1b347d7f1",
  measurementId: "G-2E517DTZFS"
};

// Inicializar Firebase de forma única
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // SE CORRIGIÓ: Declaración única de la variable 'db'

// Referencias a los elementos del DOM (Formulario)
const paddockForm = document.getElementById('paddockForm');
const fIngreso = document.getElementById('f-ingreso');
const fSalida = document.getElementById('f-salida');
const cabezas = document.getElementById('cabezas');
const pesoPromedio = document.getElementById('peso');

// Elementos de Feedback para el Operario (Semáforo, Sonido e Interfaz)
const alertSound = document.getElementById('alert-sound');
const semaforo = document.getElementById('sync-semaphore') || document.getElementById('sync-semaphore-main');
const syncText = document.getElementById('sync-text') || document.getElementById('sync-text-main');
const diasOcupacionDisplay = document.getElementById('dias-ocupacion-val');
const uaDisplay = document.getElementById('ua-val');

// Funciones de control de Entorno del Hato
function emitirAlertaSonora() {
    if (alertSound) {
        alertSound.currentTime = 0;
        alertSound.play().catch(err => console.log("Audio en espera de interacción.", err));
    }
}

function ejecutarSincronizacionVisual(estado) {
    if (!semaforo || !syncText) return;
    if (estado === 'sincronizado') {
        semaforo.style.backgroundColor = '#2e7d32'; // Verde Sabana
        syncText.textContent = 'Sincronizado';
    } else if (estado === 'procesando') {
        semaforo.style.backgroundColor = '#f57c00'; // Naranja Satelital
        syncText.textContent = 'Guardando en la nube...';
    } else {
        semaforo.style.backgroundColor = '#d32f2f'; // Rojo Alerta
        syncText.textContent = 'Error de Red';
    }
}

// 2. Lógica de Cálculos Automáticos con ajuste de huso horario local
function calcularMetricas() {
    let diasOcupacion = 0;
    if (fIngreso && fIngreso.value && fSalida && fSalida.value) {
        // Se añade 'T00:00:00' para evitar saltos de día por huso horario del navegador
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

// Event listeners para cálculo en tiempo real
[fIngreso, fSalida, cabezas, pesoPromedio].forEach(element => {
    if (element) {
        element.addEventListener('input', calcularMetricas);
    }
});

// 3. Envío de Datos a Firestore
if (paddockForm) {
    paddockForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Alertas acústicas y cambio de estado en semáforo instantáneo
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
            const docRef = await addDoc(collection(db, "historial_potreros"), registroPastoreo);
            ejecutarSincronizacionVisual('sincronizado');
            alert(`Registro de pastoreo guardado exitosamente con ID: ${docRef.id}`);
            paddockForm.reset();
            calcularMetricas();
        } catch (error) {
            console.error("Error al guardar en Firestore: ", error);
            ejecutarSincronizacionVisual('error');
            alert("Ocurrió un error al guardar el registro. Verifica la conexión satelital.");
        }
    });
}

// Inicializar el semáforo al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    ejecutarSincronizacionVisual('sincronizado');
});
