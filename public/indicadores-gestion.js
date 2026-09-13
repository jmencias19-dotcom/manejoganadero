document.addEventListener('DOMContentLoaded', () => {
    // Inicialización del módulo de Indicadores de Gestión
    console.log('Módulo de Indicadores de Gestión cargado correctamente.');

    // Puedes agregar aquí la lógica para cargar datos dinámicos,
    // manejar eventos de botones o inicializar gráficos si los usas.
    const actionButton = document.querySelector('.card-action');
    if (actionButton) {
        actionButton.addEventListener('click', (e) => {
            // Ejemplo de comportamiento al hacer clic en el botón
            window.location.href = 'indicadores-gestion.html';
        });
    }
});
