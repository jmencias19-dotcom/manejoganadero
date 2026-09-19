// ==========================================
// MÓDULO DE SINCRONIZACIÓN OFFLINE (IndexedDB) - OFICIAL HATO LAGUNA BRAVA
// ==========================================

const DB_NAME = "HatoLagunaBravaDB";
const DB_VERSION = 1;
const STORE_NAME = "registros_pendientes";

// Inicializar la base de datos local
function abrirBaseDatos() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = event => reject("Error al abrir IndexedDB: " + event.target.error);
        request.onsuccess = event => resolve(event.target.result);
        
        request.onupgradeneeded = event => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
            }
        };
    });
}

// Guardar un registro localmente cuando no hay internet
async function guardarLocalmente(datosRegistro) {
    try {
        const db = await abrirBaseDatos();
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        
        const payload = {
            ...datosRegistro,
            timestamp: new Date().toISOString(),
            sincronizado: false
        };

        store.add(payload);

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => {
                actualizarUIEstadoSync(false, "Datos guardados offline");
                resolve(true);
            };
            transaction.onerror = () => reject(transaction.error);
        });
    } catch (error) {
        console.error("Error al guardar en almacenamiento local:", error);
        return false;
    }
}

// Sincronizar datos pendientes con el servidor
async function sincronizarConServidor() {
    if (!navigator.onLine) {
        actualizarUIEstadoSync(false, "Sin conexión");
        return;
    }

    try {
        const db = await abrirBaseDatos();
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onerror = event => {
            console.error("Error al leer registros de IndexedDB:", event.target.error);
            actualizarUIEstadoSync(false, "Error de lectura local");
        };

        request.onsuccess = async function() {
            const pendientes = request.result;
            if (!pendientes || pendientes.length === 0) {
                actualizarUIEstadoSync(true, "Sincronizado");
                return;
            }

            actualizarUIEstadoSync(false, "Sincronizando...");

            try {
                // Envía el arreglo completo al backend serverless en Vercel
                const response = await fetch('/api/sincronizar', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(pendientes)
                });

                const resultado = await response.json();

                if (response.ok && resultado.exito) {
                    // Si el servidor confirma la inserción en Supabase, limpiamos el almacén local
                    const clearTransaction = db.transaction(STORE_NAME, "readwrite");
                    const clearStore = clearTransaction.objectStore(STORE_NAME);
                    clearStore.clear();

                    clearTransaction.oncomplete = () => {
                        actualizarUIEstadoSync(true, "Sincronizado");
                        console.log(`Sincronización masiva exitosa: ${resultado.totalProcesados} registros procesados.`);
                    };
                } else {
                    actualizarUIEstadoSync(false, "Error en servidor");
                    console.error("El servidor rechazó la sincronización:", resultado.error);
                }
            } catch (err) {
                console.error("Fallo de red durante la sincronización:", err);
                actualizarUIEstadoSync(false, "Pendiente de red");
            }
        };
    } catch (error) {
        console.error("Error al acceder a IndexedDB para sincronizar:", error);
        actualizarUIEstadoSync(false, "Error de base de datos");
    }
}

// Actualizar el indicador visual en el encabezado
function actualizarUIEstadoSync(esSincronizado, mensaje) {
    const btnSync = document.getElementById("btn-sync");
    const textoSync = document.getElementById("sync-status-text");
    
    if (!btnSync || !textoSync) return;

    if (esSincronizado) {
        btnSync.classList.remove("sync-pending", "sync-error");
        btnSync.classList.add("sync-ok");
        textoSync.textContent = "Sincronizado";
    } else {
        btnSync.classList.remove("sync-ok");
        btnSync.classList.add("sync-pending");
        textoSync.textContent = mensaje;
    }
}

// Escuchas automáticas de red y eventos del botón
window.addEventListener('online', () => {
    console.log("Conexión restablecida. Iniciando sincronización automática...");
    sincronizarConServidor();
});

window.addEventListener('offline', () => {
    actualizarUIEstadoSync(false, "Modo Offline");
});

document.addEventListener("DOMContentLoaded", () => {
    if (navigator.onLine) {
        sincronizarConServidor();
    } else {
        actualizarUIEstadoSync(false, "Modo Offline");
    }

    const btnSync = document.getElementById("btn-sync");
    if (btnSync) {
        btnSync.addEventListener("click", () => {
            sincronizarConServidor();
        });
    }
});
