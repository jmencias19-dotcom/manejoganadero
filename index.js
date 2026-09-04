// Cargar variable de entorno
const botToken = process.env.BOT_TOKEN;

async function ejecutarBot() {
    console.log("==========================================");
    console.log("   INICIANDO PRUEBA DE DIAGNÓSTICO BOT   ");
    console.log("==========================================");

    // Verificar si la variable está llegando al entorno
    if (!botToken || botToken.trim() === "") {
        console.error("❌ ERROR: La variable BOT_TOKEN (secret.JJM1) NO está llegando al proceso.");
        console.error("👉 Revisa en GitHub: Settings > Secrets and variables > Actions > Repository secrets.");
        console.error("👉 Asegúrate de que el secreto se llame exactamente 'JJM1' (en mayúsculas).");
        process.exit(1);
    }

    console.log("✅ ÉXITO: El secreto JJM1 se ha detectado correctamente en process.env.BOT_TOKEN.");
    console.log(`ℹ️  Longitud del token detectado: ${botToken.length} caracteres.`);

    try {
        console.log("🚀 Ejecutando lógica del bot...");
        
        // Coloca aquí tus funciones o lógica principal
        
        console.log("🎉 Proceso completado sin errores.");
    } catch (error) {
        console.error("❌ Error en tiempo de ejecución del script:", error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

ejecutarBot();
