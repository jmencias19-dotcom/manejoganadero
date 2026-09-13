// cuestionario_biblioteca.js - Módulo de almacenamiento para los datos del cuestionario del hato

class CuestionarioBiblioteca {
    constructor() {
        this.respuestasCuestionario = [];
    }

    // Método para registrar o actualizar las respuestas del cuestionario general del hato
    guardarRespuesta(seccion, pregunta, respuesta) {
        const item = {
            id: Date.now(),
            seccion, // Ej: "Estructura del Rebaño", "Nutrición", "Reproducción"
            pregunta,
            respuesta,
            fechaRegistro: new Date().toISOString()
        };
        this.respuestasCuestionario.push(item);
        console.log(`Dato guardado en [${seccion}]: ${pregunta}`);
        return item;
    }

    // Método para consultar todas las respuestas almacenadas
    obtenerTodasLasRespuestas() {
        return this.respuestasCuestionario;
    }
}

// Instancia global para gestionar el cuestionario en la biblioteca
const cuestionarioHato = new CuestionarioBiblioteca();
