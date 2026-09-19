// ==========================================
// MÓDULO DE SINCRONIZACIÓN OFFLINE (IndexedDB)
// ==========================================

const DB_NAME = "HatoLagunaBravaDB";
const DB_VERSION = 1;
const STORE_NAME = "registros_pendientes";

export function abrirBaseDatos() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = event => reject(event.target.error);
        request.onsuccess = event => resolve(event.target.result);
        
        request.onupgradeneeded = event => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" }); // Usamos ID explícito como keyPath
            }
        };
    });
}

export async function guardarLocalmente(datosRegistro) {
    try {
        const db = await abrirBaseDatos();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            
            const payload = {
                ...datosRegistro,
                timestamp: new Date().toISOString(),
                sincronizado: false
            };

            const request = store.put(payload); // put inserta o actualiza por ID

            request.onsuccess = () => resolve(true);
            request.onerror = (event) => reject(event.target.error);
        });
    } catch (error) {
        console.error("Error crítico en almacenamiento local:", error);
        return false;
    }
}

export async function sincronizarConServidor(onEstadoChange) {
    if (!navigator.onLine) {
        if (onEstadoChange) onEstadoChange(false, "Sin conexión");
        return;
    }

    try {
        const db = await abrirBaseDatos();
        
        // 1. Leer pendientes
        const pendientes = await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        if (!pendientes || pendientes.length === 0) {
            if (onEstadoChange) onEstadoChange(true, "Sincronizado");
            return;
        }

        if (onEstadoChange) onEstadoChange(false, "Sincronizando...");

        // 2. Enviar al backend en Vercel
        const response = await fetch('/api/sincronizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pendientes)
        });

        const resultado = await response.json();

        if (response.ok && resultado.exito) {
            // 3. Limpiar almacenamiento local si el servidor confirmó
            const clearTx = db.transaction(STORE_NAME, "readwrite");
            const clearStore = clearTx.objectStore(STORE_NAME);
            clearStore.clear();

            clearTx.oncomplete = () => {
                if (onEstadoChange) onEstadoChange(true, "Sincronizado");
            };
        } else {
            if (onEstadoChange) onEstadoChange(false, "Error en servidor");
        }
    } catch (err) {
        console.error("Fallo de red durante la sincronización:", err);
        if (onEstadoChange) onEstadoChange(false, "Pendiente de red");
    }
}
