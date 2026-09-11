document.addEventListener('DOMContentLoaded', () => {
    const formCombustible = document.getElementById('form-combustible');
    const tablaCombustibleBody = document.getElementById('tabla-combustible-body');

    // Cargar registros almacenados al iniciar
    cargarRegistros();

    if (formCombustible) {
        formCombustible.addEventListener('submit', (e) => {
            e.preventDefault();

            const nuevoRegistro = {
                fecha: document.getElementById('fecha-combustible').value,
                maquinaria: document.getElementById('tipo-maquinaria').value,
                litros: document.getElementById('cantidad-litros').value,
                horometrov: document.getElementById('horometro-odometro').value
            };

            guardarRegistro(nuevoRegistro);
            formCombustible.reset();
            alert('Registro de combustible guardado exitosamente.');
            
            // Redirigir al historial si existe la vista
            window.location.href = 'combustible.html';
        });
    }

    function guardarRegistro(registro) {
        let registros = JSON.parse(localStorage.getItem('registrosCombustible')) || [];
        registros.push(registro);
        localStorage.setItem('registrosCombustible', JSON.stringify(registros));
    }

    function cargarRegistros() {
        if (!tablaCombustibleBody) return;
        
        let registros = JSON.parse(localStorage.getItem('registrosCombustible')) || [];
        tablaCombustibleBody.innerHTML = '';

        if (registros.length === 0) {
            tablaCombustibleBody.innerHTML = `<tr><td colspan="4" style="text-align: center;">No hay registros de combustible cargados.</td></tr>`;
            return;
        }

        registros.forEach((reg) => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${reg.fecha}</td>
                <td>${reg.maquinaria}</td>
                <td>${reg.litros} L</td>
                <td>${reg.horometrov}</td>
            `;
            tablaCombustibleBody.appendChild(fila);
        });
    }
});
