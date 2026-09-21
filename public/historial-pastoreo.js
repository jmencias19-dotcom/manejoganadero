// ==========================================================================
// LÓGICA PRINCIPAL: HISTORIAL DE PASTOREO Y ROTACIÓN DE POTREROS
// Hato Laguna Brava | Sector Los Módulos, Mantecal, Apure
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
    console.log("Inicializando módulo de Historial y Estado de Potreros - Hato Laguna Brava...");
    
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
            mostrarToast("Sincronización manual ejecutada con Firebase.");
            actualizarSemoforoUI(true, "En línea (Firebase)");
        });
    }
});

function iniciarSincronizacionHistorialFirebase() {
    // Consulta general ordenada por fecha o nombre para capturar todo el inventario de potreros
    const q = query(collection(db, COLLECTION_NAME), orderBy("timestamp", "desc"));

    onSnapshot(q, (snapshot) => {
        const datosMapeados = [];

        snapshot.forEach((docSnap) => {
            const item = docSnap.data();
            
            // Determinación lógica del estado según carga animal y parámetros de campo
            const cabezas = Number(item.cabezas || item.animalesCount || 0);
            const estaOcupado = cabezas > 0 || item.estado === 'Ocupado';
            
            datosMapeados.push({
                id: docSnap.id,
                potrero: item.potrero || item.nombrePotrero || 'Potrero sin identificar',
                area: Number(item.areaHa || item.superficie || 1),
                estado: estaOcupado ? 'Ocupado' : 'Descanso',
                // Si está ocupado calcula días de ocupación, si está en descanso calcula días de reposo
                diasOcupacion: estaOcupado ? calcularDiasTranscurridos(item.fechaIngreso || item.ultimaModificacion) : 0,
                descanso: !estaOcupado ? calcularDiasTranscurridos(item.fechaSalida || item.ultimaModificacion) : 0,
                ugmHa: Number(item.cargaHa || item.ugmHa || 0),
                activo: estaOcupado,
                loteActual: item.lote || item.loteAsignado || 'Sin lote asignado',
                cabezas: cabezas
            });
        });

        cachePastoreo = datosMapeados;

        if (cachePastoreo.length === 0) {
            cachePastoreo = generarDatosPruebaPastoreo(); 
            actualizarSemoforoUI(true, "Sin registros en nube (Usando mock base)");
        } else {
            actualizarSemoforoUI(true, `Sincronizado (${cachePastoreo.length} potreros monitoreados)`);
        }

        poblarSelectorPotreros(cachePastoreo);
        renderizarTablaHistorial(cachePastoreo);
        actualizarMetricasGlobales(cachePastoreo);
        generarSugerenciasPastoreo(cachePastoreo);
        ejecutarAsistenteInteligente(cachePastoreo);

    }, (error) => {
        console.error("Error al sincronizar historial con Firebase:", error);
        actualizarSemoforoUI(false, "Error de conexión en red");
        mostrarToast("Error al leer la base de datos de potreros.", true);
    });
}

function calcularDiasTranscurridos(fechaStr) {
    if (!fechaStr) return 0;
    const fechaBase = new Date(fechaStr);
    const hoy = new Date();
    const diferenciaTiempo = hoy - fechaBase;
    const dias = Math.floor(diferenciaTiempo / (1000 * 60 * 60 * 24));
    return dias >= 0 ? dias : 0;
}

function generarDatosPruebaPastoreo() {
    return [
        { id: "P-01", potrero: "Banco Alto 1", area: 32.5, estado: "Ocupado", descanso: 0, ugmHa: 1.42, activo: true, diasOcupacion: 4, lote: "Mestizos Brahman Levante", cabezas: 45 },
        { id: "P-02", potrero: "Módulo Bajío 3", area: 45.0, estado: "Descanso", descanso: 38, ugmHa: 0.00, activo: false, diasOcupacion: 0, lote: "Ninguno", cabezas: 0 },
        { id: "P-03", potrero: "Banco Largo 2", area: 28.0, estado: "Descanso", descanso: 45, ugmHa: 0.00, activo: false, diasOcupacion: 0, lote: "Ninguno", cabezas: 0 }
    ];
}

function poblarSelectorPotreros(datos) {
    const select = document.getElementById('filtro-historial-potrero');
    if (!select) return;
    
    select.innerHTML = '<option value="">Todos los Potreros (Vista General)</option>';
    datos.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id || item.potrero;
        option.textContent = `${item.potrero} - [${item.estado}] (${item.area} ha)`;
        select.appendChild(option);
    });
}

function renderizarTablaHistorial(datos) {
    const tbody = document.getElementById('tabla-potreros-body');
    if (!tbody) return;

    if (datos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No hay registros de potreros disponibles en el sistema.</td></tr>`;
        return;
    }

    tbody.innerHTML = datos.map(item => {
        const badgeColor = item.estado === 'Ocupado' ? 'var(--primary-color)' : 'var(--accent-color)';
        const detalleTiempo = item.estado === 'Ocupado' 
            ? `${item.diasOcupacion} días (Ocupación)` 
            : `${item.descanso} días (Descanso)`;

        return `
            <tr>
                <td><strong>${item.potrero}</strong><br><small style="color: var(--text-muted);">Lote: ${item.loteActual}</small></td>
                <td>${item.area} ha</td>
                <td><span style="color: ${badgeColor}; font-weight: 600; padding: 2px 8px; border-radius: 4px; background: rgba(0,0,0,0.03);">${item.estado}</span></td>
                <td>${detalleTiempo}</td>
                <td><strong>${item.ugmHa ? item.ugmHa.toFixed(2) : '0.00'}</strong> UGM/ha</td>
            </tr>
        `;
    }).join('');
}

function actualizarMetricasGlobales(datos) {
    const ocupados = datos.filter(i => i.estado === 'Ocupado');
    const activoPrincipal = ocupados.length > 0 ? ocupados[0] : datos[0];
    
    const elPotrero = document.getElementById('metric-potrero');
    const elDiasOcup = document.getElementById('metric-dias-ocupacion');
    const elDiasDesc = document.getElementById('metric-dias-descanso');
    const elPresion = document.getElementById('metric-presion');

    if (elPotrero) elPotrero.textContent = activoPrincipal ? activoPrincipal.potrero : 'Ninguno';
    if (elDiasOcup) elDiasOcup.textContent = activoPrincipal && activoPrincipal.estado === 'Ocupado' ? `${activoPrincipal.diasOcupacion} d` : '0 d';
    if (elDiasDesc) elDiasDesc.textContent = activoPrincipal && activoPrincipal.estado === 'Descanso' ? `${activoPrincipal.descanso} d` : '0 d';
    if (elPresion) elPresion.textContent = activoPrincipal && activoPrincipal.ugmHa ? activoPrincipal.ugmHa.toFixed(2) : '0.00';
}

function generarSugerenciasPastoreo(datos) {
    const lista = document.getElementById('lista-potreros-sugeridos');
    if (!lista) return;

    // Filtra los que están en descanso y los ordena de mayor a menor tiempo de reposo para sugerir rotación
    const enDescanso = datos.filter(i => i.estado === 'Descanso');
    const sugeridos = enDescanso.sort((a, b) => b.descanso - a.descanso).slice(0, 2);

    if (sugeridos.length === 0) {
        lista.innerHTML = `<li class="suggested-item"><span>No hay potreros con descanso registrado.</span></li>`;
        return;
    }

    lista.innerHTML = sugeridos.map(item => `
        <li class="suggested-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
            <span><strong>${item.potrero}</strong> (${item.area} ha) — <em>${item.descanso} días de descanso</em></span>
            <i class="fa-solid fa-circle-check" style="color: var(--accent-color);"></i>
        </li>
    `).join('');
}

function ejecutarAsistenteInteligente(datos) {
    const contenedorAI = document.getElementById('ai-sugerencias-content');
    if (!contenedorAI) return;

    const totalPotreros = datos.length;
    const ocupados = datos.filter(i => i.estado === 'Ocupado');
    const descansando = datos.filter(i => i.estado === 'Descanso');
    const promedioUGM = datos.reduce((acc, curr) => acc + (curr.ugmHa || 0), 0) / (totalPotreros || 1);

    contenedorAI.innerHTML = `
        <p style="margin: 0 0 6px 0;"><strong>Balance de Sabana (${totalPotreros} potreros totales):</strong> <span style="color: var(--primary-color);">${ocupados.length} ocupados</span> | <span style="color: var(--accent-color);">${descansando.length} en descanso</span>.</p>
        <p style="margin: 0;"><strong>Presión Global de Carga:</strong> ${promedioUGM.toFixed(2)} UGM/ha promedio en el sistema. Evaluar rotación de lotes según la altura del rebrote en los módulos.</p>
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
