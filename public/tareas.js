document.addEventListener('DOMContentLoaded', () => {
    // Si cargas planificacion.html dinámicamente, es mejor inicializar 
    // los elementos o escuchar el evento dentro del contenedor una vez inyectado.
    
    fetch('planificacion.html')
        .then(response => response.text())
        .then(data => {
            document.querySelector('.task-management').innerHTML = data;
            
            // Inicializamos la lógica de tareas AQUÍ adentro para asegurar 
            // que el formulario y la lista ya existan en el DOM.
            initTaskApp();
        })
        .catch(error => console.error('Error cargando la planificación:', error));
});

function initTaskApp() {
    const tareaForm = document.getElementById('tarea-form');
    const tareaLabor = document.getElementById('tarea-labor');
    const taskList = document.getElementById('task-list');

    let tareas = JSON.parse(localStorage.getItem('tareasLabores')) || [];

    function renderTasks() {
        if (!taskList) return;
        taskList.innerHTML = '';
        tareas.forEach((tarea, index) => {
            const li = document.createElement('li');
            li.className = `tarea-item ${tarea.completada ? 'tarea-completada' : ''}`;
            li.innerHTML = `
                <div class="tarea-checkbox-group">
                    <input type="checkbox" class="tarea-checkbox" ${tarea.completada ? 'checked' : ''} data-index="${index}">
                    <span class="tarea-texto">${tarea.texto}</span>
                </div>
                <button class="btn-borrar" data-index="${index}">Eliminar</button>
            `;
            taskList.appendChild(li);
        });

        document.querySelectorAll('.tarea-checkbox').forEach(box => {
            box.addEventListener('change', (e) => {
                const index = e.target.dataset.index;
                tareas[index].completada = e.target.checked;
                saveAndRender();
            });
        });

        document.querySelectorAll('.btn-borrar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.target.dataset.index;
                tareas.splice(index, 1);
                saveAndRender();
            });
        });
    }

    function saveAndRender() {
        localStorage.setItem('tareasLabores', JSON.stringify(tareas));
        renderTasks();
    }

    if (tareaForm && tareaLabor) {
        tareaForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const texto = tareaLabor.value.trim();
            if (texto !== '') {
                tareas.push({ texto, completada: false });
                tareaLabor.value = '';
                saveAndRender();
            }
        });
    }

    renderTasks();
}
