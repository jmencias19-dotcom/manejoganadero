// Importar módulos SDK de Firebase v9+ 
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. Configuración e Inicialización de Firebase
// Import the functions you need from the SDKs you need
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyADbn4gV6ROrppvanBM835IRyX3U8wdAnk",
  authDomain: "hato-laguna-brava.firebaseapp.com",
  projectId: "hato-laguna-brava",
  storageBucket: "hato-laguna-brava.firebasestorage.app",
  messagingSenderId: "1053099733476",
  appId: "1:1053099733476:web:624514d41b08d1b347d7f1",
  measurementId: "G-2E517DTZFS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

    const paddockForm = document.getElementById('paddockForm');
    const fIngreso = document.getElementById('f-ingreso');
    const fSalida = document.getElementById('f-salida');
    const cabezas = document.getElementById('cabezas');
    const pesoPromedio = document.getElementById('peso');
    
    // Contenedores opcionales para desplegar resultados automáticos en interfaz
    const diasOcupacionDisplay = document.getElementById('dias-ocupacion-val');
    const uaDisplay = document.getElementById('ua-val');

    // 2. Lógica de Cálculos Automáticos
    function calcularMetricas() {
        // Cálculo de Días de Ocupación
        let diasOcupacion = 0;
        if (fIngreso.value && fSalida.value) {
            const fechaInicio = new Date(fIngreso.value);
            const fechaFin = new Date(fSalida.value);
            const diferenciaMs = fechaFin - fechaInicio;
            
            if (diferenciaMs >= 0) {
                diasOcupacion = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));
            }
        }

        // Cálculo de Unidades Animales (UA) - Base estándar de 450 kg
        let unidadesAnimales = 0;
        const numCabezas = parseFloat(cabezas.value) || 0;
        const peso = parseFloat(pesoPromedio.value) || 0;

        if (numCabezas > 0 && peso > 0) {
            unidadesAnimales = parseFloat(((numCabezas * peso) / 450).toFixed(2));
        }

        // Actualizar UI si existen los elementos
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

            const { diasOcupacion, unidadesAnimales } = calcularMetricas();

            const registroPastoreo = {
                potrero_id: document.getElementById('potrero').value,
                lote_ganado: document.getElementById('lote').value,
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
                alert(`Registro de pastoreo guardado exitosamente con ID: ${docRef.id}`);
                paddockForm.reset();
                calcularMetricas();
            } catch (error) {
                console.error("Error al guardar en Firestore: ", error);
                alert("Ocurrió un error al guardar el registro.");
            }
        });
 
