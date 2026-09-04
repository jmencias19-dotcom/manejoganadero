// Cargar el token desde las variables de entorno definidas en el flujo de trabajo
const botToken = process.env.BOT_TOKEN;

async function ejecutarBot() {
    console.log("=== Iniciando Bot de Búsqueda ===");

    if (!botToken) {
        console.error(" Error: No se encontró el token BOT_TOKEN en las variables de entorno.");
        process.exit(1);
    }

    console.log(" Secreto cargado correctamente desde GitHub Actions.");
    console.log(" Ejecutando tarea de búsqueda...");

    // Simulación de tarea de búsqueda
    try {
        console.log(" Procesando datos...");
        
        // Aquí puedes agregar la lógica real de tu bot de búsqueda
        
        console.log(" Tarea finalizada con éxito.");
    } catch (error) {
        console.error(" Hubo un error durante la ejecución:", error);
        process.exit(1);
    }
}

ejecutarBot();
