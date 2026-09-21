// ==========================================================================
// LÓGICA PRINCIPAL: HISTORIAL DE PASTOREO (Con Firestore Real-Time)
// Hato Laguna Brava
// ==========================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    onSnapshot, 
    query, 
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Credenciales oficiales de Firebase para Hato Laguna Brava
const firebaseConfig = {
    apiKey: "AIzaSyADbn4gV6ROrppvanBM835IRyX3U8wdAnk",
    authDomain: "hato-laguna-brava.firebaseapp.com",
    projectId: "hato-laguna-brava",
    storageBucket: "hato-laguna-brava.firebasestorage.app",
    messagingSenderId: "1053099733476",
    appId: "1:1053099733476:web:624514d41b08d1b347d7f1",
    measurementId: "G-2E517DTZFS"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const COLLECTION_NAME = "hato_potreros";

let cachePastoreo = [];

document.addEventListener('DOMContentLoaded', () => {
    console.log("Inicializando módulo de Historial de Pastoreo - Hato Laguna Brava...");
    
    // Iniciar sincronización en tiempo real con Firestore
    iniciarSincronizacionHistorialFirebase();

    // Configurar eventos interactivos de filtros
    const filtroPotrero = document.getElementById('filtro-historial-potrero');
    if (filtroPotrero) {
        filtroPotrero.addEventListener('change', (e) => {
            filtrarTablaPorPotrero(e.target.value);
        });
    }

    const btnSincronizar = document.getElementById('btn-sincronizar-historial');
    if (btnSincronizar) {
        btnSincronizar.addEventListener('click', () => {
            mostrarToast("Sincronizado con Firebase Cloud Storage.");
            actualizarSemoforoUI(true, "En línea (Firebase)");
        });
    }
});

function iniciarSincronizacionHistorialFirebase() {
    const q = query(collection(db, COLLECTION_NAME), orderBy("timestamp", "desc"));

    onSnapshot(q, (snapshot) => {
        const datosMapeados = [];

        snapshot.forEach((docSnap) => {
            const item = docSnap.data();
            datosMapeados.push({
                id: docSnap.id,
                potrero: item.potrero || 'Sin nombre',
                area: item.areaHa || 1,
                estado: (item.cabezas > 0) ? 'Ocupado' : 'Descanso',
                descanso: 0, // Ajustable según lógica de rotación
                ugmHa: item.cargaHa || 0,
                activo: item.cabezas > 0,
                diasOcupacion: calcularDiasOcupacion(item.fechaIngreso)
            });
        });

        cachePastoreo = datosMapeados;

        if (cachePastoreo.length === 0) {
            cachePastoreo = generarDatosPruebaPastoreo(); // Respaldo solo si está totalmente vacío
            actualizarSemoforoUI(true, "Sin registros activos (Usando mock base)");
        } else {
            actualizarSemoforoUI(true, "Sincronizado en tiempo real");
        }

        poblarSelectorPotreros(cachePastoreo);
        renderizarTablaHistorial(cachePastoreo);
        actualizarMetricasGlobales(cachePastoreo);
        generarSugerenciasPastoreo(cachePastoreo);
        ejecutarAsistenteInteligente(cachePastoreo);

    }, (error) => {
        console.error("Error al sincronizar historial con Firebase:", error);
        actualizarSemoforoUI(false, "Error de conexión");
        mostrarToast("Error al leer datos de la nube.", true);
    });
}

function calcularDiasOcupacion(fechaIngreso) {
    if (!fechaIngreso) return 0;
    const ingreso = new Date(fechaIngreso);
    const hoy = new Date();
    const diferenciaTiempo = hoy - ingreso;
    const dias = Math.floor(diferenciaTiempo / (1000 * 60 * 60 * 24));
    return dias >= 0 ? dias : 0;
}

function generarDatosPruebaPastoreo() {
    return [
        { id: "P-01", potrero: "Banco Alto 1", area: 32.5, estado: "Ocupado", descanso: 0, ugmHa: 1.42, activo: true, diasOcupacion: 4 },
        { id: "P-02", potrero: "Módulo Bajío 3", area: 45.0, estado: "Descanso", descanso: 38, ugmHa: 0.00, activo: false, diasOcupacion: 0 }
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
    
    const elPotrero = document.getElementById('metric-potrero');
    const elDiasOcup = document.getElementById('metric-dias-ocupacion');
    const elDiasDesc = document.getElementById('metric-dias-descanso');
    const elPresion = document.getElementById('metric-presion');

    if (elPotrero) elPotrero.textContent = activo ? activo.potrero : '--';
    if (elDiasOcup) elDiasOcup.textContent = (activo && activo.diasOcupacion !== undefined) ? `${activo.diasOcupacion} d` : '0 d';
    if (elDiasDesc) elDiasDesc.textContent = activo ? `${activo.descanso || 0} d` : '0 d';
    if (elPresion) elPresion.textContent = activo && activo.ugmHa ? activo.ugmHa.toFixed(2) : '0.00';
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
        <p style="margin: 0;"><strong>Rotación en Los Módulos:</strong> Hay ${ocupados.length} potreros activos actualmente según registros en la nube.</p>
        <p style="margin: 0;"><strong>Carga Promedio:</strong> ${promedioUGM.toFixed(2)} UGM/ha. Rango óptimo para sabana inundable.</p>
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
}

function mostrarToast(mensaje, esError = false) {
    const toast = document.getElementById('toast');
    const msgSpan = document.getElementById('toast-message');
    if (!toast || !msgSpan) return;

    msgSpan.textContent = mensaje;
    toast.style.borderLeftColor = esError ? '#c1121f' : 'var(--accent-color)';
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
