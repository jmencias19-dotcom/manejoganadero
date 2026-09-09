document.addEventListener("DOMContentLoaded", () => {
    // Cargar datos del historial de pastoreo al iniciar
    let pastoreo = JSON.parse(localStorage.getItem("historialPastoreo")) || [];

    const renderPastoreo = () => {
        const pastoreoList = document.getElementById("pastoreo-list");
        if (!pastoreoList) return;
        pastoreoList.innerHTML = "";

        if (pastoreo.length === 0) {
            pastoreoList.innerHTML = `<p class="tarea-meta" style="padding: 10px; text-align: center;">No hay registros de pastoreo.</p>`;
            return;
        }

        pastoreo.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'tarea-item resumen';
            li.innerHTML = `
                <div class="tarea-checkbox group">
                    <span class="tarea-text">Lote: ${item.lote || ''} - Potrero: ${item.potrero || ''}</span>
                </div>
                <button class="btn tarea-btn-borrar" data-index="${index}">Eliminar</button>
            `;
            pastoreoList.appendChild(li);
        });
    };

    renderPastoreo();
});
