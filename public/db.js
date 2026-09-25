import Dexie from 'https://unpkg.com/dexie@latest/dist/dexie.mjs';

// 1. Instanciación e inicialización del esquema
export const db = new Dexie('HatoLagunaBravaDB');

// Definición de tablas e índices base (Versión 1)
db.version(1).stores({
  animales: 'id, numero_arete, lote, sexo, categoria, peso_actual',
  pesajes: 'id, animal_id, fecha, peso_kg',
  registros_campo: 'id, fecha, tipo, estado'
});

// Versión 2: Añadimos las tablas de Potreros e Historial de Pastoreo
db.version(2).stores({
  potreros: 'id, potrero_id, nombre, area_ha, estado_actual, lote_actual',
  historial_pastoreo: 'id, rotacion_id, potrero_id, lote_id, fecha_ingreso, fecha_salida, estado'
});

// 2. Función exportada para inicializar y conectar la BD de forma segura
export async function inicializarBaseDatos() {
  try {
    await db.open();
    console.log("Instancia de IndexedDB/Dexie abierta y configurada correctamente con Módulo de Potreros.");
    return true;
  } catch (error) {
    console.error("Error crítico al inicializar la base de datos Dexie:", error);
    return false;
  }
}
