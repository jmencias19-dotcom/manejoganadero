document.addEventListener("DOMContentLoaded", function() {
    // Extrae el título limpio de la página actual para el subtítulo del cintillo
    const tituloModulo = document.title ? document.title.split("-")[0].trim() : "Módulo del Sistema";

    const headerHTML = `
        <header class="main-header">
            <div class="header-container">
                
                <!-- LADO IZQUIERDO: Botón de Regreso y Bandera -->
                <div style="display: flex; align-items: center; gap: 10px;">
                    <a href="./index.html" class="btn-back" style="text-decoration: none;" title="Volver al Panel Principal">
                        <i class="fas fa-home"></i> <span class="btn-back-text">Panel</span>
                    </a>
                    <div class="flag-container" style="display: flex; align-items: center;">
                        <img src="./img/venezuela.png" alt="Venezuela" style="width: 24px; height: auto; object-fit: contain;">
                    </div>
                </div>
                
                <!-- CENTRO: Títulos Oficiales del Hato -->
                <div class="header-title-wrapper" style="flex-grow: 1; text-align: center;">
                    <h1 style="margin: 0; font-size: 1.2rem; letter-spacing: 0.5px;">HATO LAGUNA BRAVA</h1>
                    <p style="margin: 2px 0 0 0; font-size: 0.8rem; opacity: 0.85; font-weight: 500;">${tituloModulo}</p>
                </div>
                
                <!-- LADO DERECHO: Bandera Italiana y Semáforo de Sincronización -->
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="flag-container" style="display: flex; align-items: center;">
                        <img src="./img/italia.png" alt="Italia" style="width: 24px; height: auto; object-fit: contain;">
                    </div>
                    
                    <!-- Semáforo Maestro integrado operativamente -->
                    <div class="sync-status-wrapper" id="btn-sync" style="cursor: pointer;" title="Estado de Sincronización">
                        <div id="light" class="semaphore online"></div>
                        <span id="statusText" class="sync-text" style="margin-left: 5px;">Sincronizado</span>
                    </div>
                </div>

            </div>
        </header>
    `;

    const headerContainer = document.getElementById("app-header");
    if (headerContainer) {
        headerContainer.innerHTML = headerHTML;
    }
});
