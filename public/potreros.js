/* ==========================================================================
    Módulo: Control y Gestión de Potreros (Con Firestore Real-Time)
    Hato Laguna Brava
    ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    doc, 
    updateDoc, 
    deleteDoc, 
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

// Inicializar Firebase y Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const COLLECTION_NAME = "hato_potreros"; // Colección específica para potreros

document.addEventListener('DOMContentLoaded', () => {
    const potreroForm = document.getElementById('potreroForm'); // ID ajustado para el formulario de potreros
    const potrerosContainer = document.getElementById('potreros-container'); // Contenedor en el HTML
    
    // Contadores de KPIs o resúmenes (opcionales según tu diseño)
    const kpiTotalPotreros = document.getElementById('kpi-total-potreros');
    const kpiDescanso = document.getElementById('kpi-descanso');
    const kpiOcupados = document.getElementById('kpi-ocupados');

    // Escuchar cambios en tiempo real desde Firestore
    function iniciarSincronizacionPotreros() {
        if (!potrerosContainer) return;

        const q = query(collection(db, COLLECTION_NAME), orderBy("nombre", "asc"));
        
        onSnapshot(q, (snapshot) => {
            potrerosContainer.innerHTML = '';
            
            if (snapshot.empty) {
                potrerosContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 20px;">No hay potreros registrados actualmente.</p>';
                actualizarKPIsPotreros(0, 0, 0);
                return;
            }

            let totalPotreros = 0;
            let cuentaDescanso = 0;
            let cuentaOcupados = 0;

            snapshot.forEach((docSnap) => {
                const potrero = docSnap.data();
                const id = docSnap.id;

                totalPotreros++;
                if (potrero.estado === 'descanso') cuentaDescanso++;
                else if (potrero.estado === 'ocupado') cuentaOcupados++;

                const div = document.createElement('div');
                div.className = 'potrero-card-item';
                div.innerHTML = `
                    <div class="potrero-card-row">
                        <span class="potrero-card-title"><i class="fa-solid fa-map-pin"></i> <b>${potrero.nombre || 'Sin nombre'}</b></span>
                        <span class="potrero-card-meta"><b>Área:</b> ${potrero.area || '0'} ha | <b>Pasto:</b> ${potrero.pasto || 'N/D'}</span>
                    </div>
                    <div class="potrero-card-body">
                        <div><b>Lote Actual:</b> ${potrero.loteActual || 'Ninguno (Vacío)'}</div>
                        <div><b>Aforo / Biomasa:</b> ${potrero.aforo || 'N/D'} kg/MS/ha</div>
                        ${potrero.observaciones ? `<div class="potrero-card-obs"><i class="fa-solid fa-note-sticky"></i> ${potrero.observaciones}</div>` : ''}
                    </div>
                    
                    <div class="potrero-card-actions">
                        <select class="status-select ${getPotreroStatusClass(potrero.estado)}" data-id="${id}">
                            <option value="descanso" ${potrero.estado === 'descanso' ? 'selected' : ''}>🟢 En Descanso</option>
                            <option value="ocupado" ${potrero.estado === 'ocupado' ? 'selected' : ''}>🔴 Ocupado</option>
                            <option value="mantenimiento" ${potrero.estado === 'mantenimiento' ? 'selected' : ''}>🟡 En Mantenimiento</option>
                        </select>
                        <button class="btn-delete" data-id="${id}" title="Eliminar potrero"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                `;
                potrerosContainer.appendChild(div);
            });

            actualizarKPIsPotreros(totalPotreros, cuentaDescanso, cuentaOcupados);
            vincularEventosPotreros();
        }, (error) => {
            console.error("Error al sincronizar potreros con Firestore: ", error);
            potrerosContainer.innerHTML = '<p style="text-align: center; color: var(--danger); padding: 20px;">Error de sincronización con la base de datos de potreros.</p>';
        });
    }

    function getPotreroStatusClass(estado) {
        if (estado === 'descanso') return 'status-descanso';
        if (estado === 'ocupado') return 'status-ocupado';
        if (estado === 'mantenimiento') return 'status-mantenimiento';
        return 'status-descanso';
    }

    function actualizarKPIsPotreros(total, descanso, ocupados) {
        if (kpiTotalPotreros) kpiTotalPotreros.textContent = total;
        if (kpiDescanso) kpiDescanso.textContent = descanso;
        if (kpiOcupados) kpiOcupados.textContent = ocupados;
    }

    function vincularEventosPotreros() {
        // Actualizar estado del potrero en Firestore
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const id = e.target.dataset.id;
                const nuevoEstado = e.target.value;
                try {
                    const potreroRef = doc(db, COLLECTION_NAME, id);
                    await updateDoc(potreroRef, { estado: nuevoEstado });
                } catch (error) {
                    console.error("Error al actualizar estado del potrero:", error);
                }
            });
        });

        // Eliminar potrero de Firestore
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                if (confirm("¿Está seguro de eliminar este potrero del registro?")) {
                    try {
                        await deleteDoc(doc(db, COLLECTION_NAME, id));
                    } catch (error) {
                        console.error("Error al eliminar el potrero:", error);
                    }
                }
            });
        });
    }

    // Evento de Envío del Formulario de Potreros
    if (potreroForm) {
        potreroForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nuevoPotrero = {
                nombre: document.getElementById('nombre-potrero').value.trim(),
                area: document.getElementById('area-potrero').value.trim(),
                pasto: document.getElementById('tipo-pasto').value.trim(),
                loteActual: document.getElementById('lote-actual').value.trim(),
                aforo: document.getElementById('aforo-potrero').value.trim(),
                observaciones: document.getElementById('observaciones-potrero').value.trim(),
                estado: 'descanso',
                timestamp: Date.now()
            };

            if (nuevoPotrero.nombre !== '') {
                try {
                    await addDoc(collection(db, COLLECTION_NAME), nuevoPotrero);
                    potreroForm.reset();
                } catch (error) {
                    console.error("Error al guardar el potrero:", error);
                    alert("No se pudo registrar el potrero. Verifique su conexión.");
                }
            }
        });
    }

    // Arrancar la sincronización en tiempo real para potreros
    iniciarSincronizacionPotreros();
});
