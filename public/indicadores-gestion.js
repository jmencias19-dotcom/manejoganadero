document.addEventListener('DOMContentLoaded', () => {
    console.log('Módulo de Indicadores de Gestión cargado correctamente.');

    // 1. Cargar datos existentes de LocalStorage o iniciar vacío
    let potreros = JSON.parse(localStorage.getItem('potreros_datos')) || [];

    // 2. Capturar elementos del HTML
    const form = document.getElementById('form-mod1');
    const contenedorPotreros = document.querySelector('.potreros-container');

    // 3. Función para renderizar (dibujar) los potreros en pantalla
    function renderizarPotreros() {
        if (!contenedorPotreros) return;
        
        // Si no hay datos, mostrar un aviso en lugar de dejar la pantalla en blanco
        if (potreros.length === 0) {
            contenedorPotreros.innerHTML = `
                <div style="text-align:center; padding:20px; color:var(--text-muted);">
                    <p> No hay potreros registrados actualmente.</p>
                    <p style="font-size:0.85rem;">Utiliza el formulario para registrar el primero.</p>
                </div>`;
            return;
        }

        // Si hay datos, dibujar las tarjetas estilizadas
        contenedorPotreros.innerHTML = potreros.map((potrero, index) => `
            <div class="potreros-ugm-card">
                <div class="potreros-ugm-header">
                    <span class="potreros-ugm-title">${potrero.nombre || 'Potrero sin nombre'}</span>
                    <span class="kpi-title" style="color:var(--success);">Activo</span>
                </div>
                <div style="font-size: 0.9rem; color: var(--text-muted);">
                    <p><strong>Superficie:</strong> ${potrero.superficie || 0} Ha</p>
                    <p><strong>Observaciones:</strong> ${potrero.observaciones || 'Ninguna'}</p>
                </div>
                <button onclick="eliminarPotrero(${index})" style="background:none; border:none; color:var(--danger); font-size:0.8rem; cursor:pointer; margin-top:10px; font-weight:bold;">
                    ❌ Eliminar Potrero
                </button>
            </div>
        `).join('');
    }

    // 4. Función para guardar un nuevo potrero desde el formulario
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            // Capturar datos de los inputs comunes del formulario
            const nombreInput = form.querySelector('input[type="text"]') || form.querySelector('.form-control');
            const superficieInput = form.querySelector('input[type="number"]');
            
            if (!nombreInput || !nombreInput.value.trim()) {
                alert('Por favor, ingresa al menos el nombre del potrero.');
                return;
            }

            const nuevoPotrero = {
                nombre: nombreInput.value,
                superficie: superficieInput ? superficieInput.value : 0,
                observaciones: 'Registro automático',
                fecha: new Date().toLocaleDateString()
            };

            // Guardar en el arreglo, actualizar almacenamiento local y refrescar pantalla
            potreros.push(nuevoPotrero);
            localStorage.setItem('potreros_datos', JSON.stringify(potreros));
            form.reset();
            renderizarPotreros();
            alert('¡Potrero guardado exitosamente!');
        });
    }

    // Función global para eliminar potreros
    window.eliminarPotrero = function(index) {
        if (confirm('¿Estás seguro de eliminar este potrero?')) {
            potreros.splice(index, 1);
            localStorage.setItem('potreros_datos', JSON.stringify(potreros));
            renderizarPotreros();
        }
    };

    // 5. Ejecutar la carga inicial al abrir la pantalla
    renderizarPotreros();
});
