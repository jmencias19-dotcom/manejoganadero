document.addEventListener("DOMContentLoaded", function() {
    const tituloModulo = document.title ? document.title.split("-")[0].trim() : "Módulo del Sistema";

    const headerHTML = `
        <header class="main-header">
            <div class="header-container">
                <div class="flag-container">
                    <img src="/img/venezuela.png" alt="Venezuela" class="flag-icon">
                </div>
                <div class="header-title-wrapper">
                    <h1>HATO LAGUNA BRAVA</h1>
                    <p>${tituloModulo}</p>
                </div>
                <div class="flag-container">
                    <img src="/img/italia.png" alt="Italia" class="flag-icon">
                </div>
            </div>
        </header>
    `;

    const headerContainer = document.getElementById("app-header");
    if (headerContainer) {
        headerContainer.innerHTML = headerHTML;
    }
});
