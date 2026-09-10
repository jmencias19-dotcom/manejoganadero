// Módulo de Inventario y Control Sanitario - Hato Laguna Brava

document.addEventListener('DOMContentLoaded', () => {
    console.log("Módulo de Sanidad inicializado correctamente.");
    inicializarFormularioSanitario();
});

function inicializarFormularioSanitario() {
    const formSanitario = document.getElementById('form-sanitario');
    if (formSanitario) {
        formSanitario.addEventListener('submit', (e) => {
            e.preventDefault();
            registrarEventoSanitario();
        });
    }
}

function registrarEventoSanitario() {
    constarete = document.getElementById('arete-animal').value;
    const tipoTratamiento = document.getElementById('tipo-tratamiento').value;
    const producto = document.getElementById('producto-nombre').value;
    const fecha = document.getElementById('fecha-aplicacion').value;

    if (!arete || !tipoTratamiento || !producto || !fecha) {
        alert("Por favor, completa todos los campos obligatorios del registro sanitario.");
        return;
    }

    const registro = {
        arete,
        tipoTratamiento,
        producto,
        fecha,
        timestamp: new Date().toISOString()
    };

    guardarEnLocalStorage(registro);
    alert("¡Registro sanitario guardado con éxito!");
    document.getElementById('form-sanitario').reset();
}

function guardarEnLocalStorage(nuevoRegistro) {
    let registros = JSON.parse(localStorage.getItem('inventario_sanitario')) || [];
    registros.push(nuevoRegistro);
    localStorage.setItem('inventario_sanitario', JSON.stringify(registros));
}
