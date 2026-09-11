document.addEventListener('DOMContentLoaded', () => {
    const formBusqueda = document.getElementById('form-busqueda-animal');
    const panelResultado = document.getElementById('panel-resultado-animal');
    const datosAnimal = document.getElementById('datos-animal');

    if (formBusqueda) {
        formBusqueda.addEventListener('submit', (e) => {
            e.preventDefault();
            const chip = document.getElementById('buscar-chip').value;
            buscarAnimal(chip);
        });
    }

    function buscarAnimal(chip) {
        // En un caso real, esto consultaría a la base de datos (db.js) o API
        // Simularemos la recepción de datos con un ejemplo
        const animalEncontrado = simularConsultaBaseDeDatos(chip);

        if (animalEncontrado) {
            mostrarDatos(animalEncontrado);
        } else {
            alert('Animal no encontrado.');
            panelResultado.style.display = 'none';
        }
    }

    // Función simulada para demostración
    function simularConsultaBaseDeDatos(chip) {
        // Aquí se reemplazaría por la búsqueda real en el inventario o base de datos
        return {
            numeroCuero: "21090",
            chip: chip,
            etareo: "Vaca 2 Partos",
            kg: "450",
            condicion: "Preñada",
            historialPartos: "L6073, L6076"
        };
    }

    function mostrarDatos(animal) {
        datosAnimal.innerHTML = `
            <p><strong>Número de Cuero:</strong> ${animal.numeroCuero}</p>
            <p><strong>Chip/Arete:</strong> ${animal.chip}</p>
            <p><strong>Etareo:</strong> ${animal.etareo}</p>
            <p><strong>Kg:</strong> ${animal.kg}</p>
            <p><strong>Condición Reproductiva:</strong> ${animal.condicion}</p>
            <p><strong>Historial de Partos:</strong> ${animal.historialPartos}</p>
        `;
        panelResultado.style.display = 'block';
    }
});
