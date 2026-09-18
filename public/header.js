document.addEventListener("DOMContentLoaded", function() {
    const tituloModulo = document.title ? document.title.split("-")[0].trim() : "Módulo del Sistema";

    const headerHTML = `
        <header class="main-header">
            <div class="header-container">
                <div class="header-left">
                    <a href="/index.html" class="btn-home" title="Panel Principal">
                        <i class="fas fa-home"></i> Panel
                    </a>
                    <div class="flag-container">
                        <img src="/img/venezuela.png" alt="Venezuela" class="flag-icon">
                    </div>
                </div>
                
                <div class="header-title-wrapper">
                    <h1>HATO LAGUNA BRAVA</h1>
                    <p>${tituloModulo}</p>
                </div>
                
                <div class="header-right">
                    <div class="flag-container">
                        <img src="/img/italia.png" alt="Italia" class="flag-icon">
                    </div>
                    <button id="btn-sync" class="btn-sync" title="Sincronizar datos">
                        <i class="fas fa-sync-alt"></i> <span id="sync-status-text">Sincronizar</span>
                    </button>
                </div>
            </div>
        </header>
    `;

    const headerContainer = document.getElementById("app-header");
    if (headerContainer) {
        headerContainer.innerHTML = headerHTML;
    }
});
