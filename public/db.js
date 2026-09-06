import Dexie from 'https://unpkg.com/dexie@latest/dist/dexie.mjs';

// 1. Instanciación e inicialización del esquema
export const db = new Dexie('HatoLagunaBravaDB');

// Definición de tablas e índices para la producción ganadera
db.version(1).stores({
  animales: 'id, numero_arete, lote, sexo, categoria, peso_actual',
  pesajes: 'id, animal_id, fecha, peso_kg',
  registros_campo: 'id, fecha, tipo, estado'
});

// 2. Función exportada para inicializar y conectar la BD de forma segura
export async function inicializarBaseDatos() {
  try {
    await db.open();
    console.log("Instancia de IndexedDB/Dexie abierta y configurada correctamente.");
    return true;
  } catch (error) {
    console.error("Error crítico al inicializar la base de datos Dexie:", error);
    // Retornamos false o re-lanzamos según requiera el flujo
    return false;
  }
}
