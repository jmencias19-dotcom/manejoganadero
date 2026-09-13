// biblioteca-hato.js - Módulo de gestión y control de la Biblioteca del Hato

class BibliotecaHato {
    constructor() {
        this.documentos = [];
        this.pastos = [];
        this.rebaño = [];
        this.reproduccion = [];
        this.nutricion = [];
    }

    // Método para agregar documentos o manuales (como el Manual Merck o PDFs de enfermedades)
    agregarDocumento(titulo, categoria, archivo) {
        const nuevoDoc = {
            id: Date.now(),
            titulo,
            categoria,
            archivo,
            fechaRegistro: new Date().toISOString()
        };
        this.documentos.push(nuevoDoc);
        console.log(`Documento registrado con éxito: ${titulo}`);
        return nuevoDoc;
    }

    // Método para registrar fichas visuales de pastos (especies, consumo, pisoteo)
    agregarPasto(especie, consumo, pisoteo, foto) {
        const nuevoPasto = {
            id: Date.now(),
            especie,
            consumo,
            pisoteo,
            foto,
            fechaRegistro: new Date().toISOString()
        };
        this.pastos.push(nuevoPasto);
        console.log(`Ficha de pasto agregada: ${especie}`);
        return nuevoPasto;
    }

    // Método para registrar la estructuración del rebaño (bovinos/búfalos)
    actualizarEstructuraRebaño(categoriaEdad, cantidad, tipo) {
        const registro = {
            id: Date.now(),
            tipo, // Bovino o Búfalo
            categoriaEdad,
            cantidad,
            fechaActualizacion: new Date().toISOString()
        };
        this.rebaño.push(registro);
        return registro;
    }

    // Método para registrar datos de monta natural y preñeces
    registrarReproduccion(tipoServicio, resultado, fecha) {
        const registroRepro = {
            id: Date.now(),
            tipoServicio: tipoServicio || "Monta Natural",
            resultado,
            fecha: fecha || new Date().toISOString()
        };
        this.reproduccion.push(registroRepro);
        return registroRepro;
    }

    // Método para registrar nutrición y suplementación (minerales, alimentos)
    registrarNutricion(tipoInsumo, descripcion, fecha) {
        const registroNutri = {
            id: Date.now(),
            tipoInsumo, // Ej: Minerales, Alimento
            descripcion,
            fecha: fecha || new Date().toISOString()
        };
        this.nutricion.push(registroNutri);
        return registroNutri;
    }

    // Panel de control general para consultar el estado de la biblioteca
    obtenerResumenBiblioteca() {
        return {
            totalDocumentos: this.documentos.length,
            totalPastos: this.pastos.length,
            totalRebaño: this.rebaño.reduce((acc, curr) => acc + curr.cantidad, 0),
            totalReproduccion: this.reproduccion.length,
            totalNutricion: this.nutricion.length
        };
    }
}

// Instancia global del sistema de la biblioteca
const miBibliotecaHato = new BibliotecaHato();
