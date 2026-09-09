document.addEventListener('DOMContentLoaded', () => {
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskList = document.getElementById('task-list');

    // Cargar tareas desde localStorage al iniciar
    let tareas = JSON.parse(localStorage.getItem('tareasLabores')) || [];

    function renderTasks() {
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

        // Eventos para marcar como completada
        document.querySelectorAll('.tarea-checkbox').forEach(box => {
            box.addEventListener('change', (e) => {
                const index = e.target.dataset.index;
                tareas[index].completada = e.target.checked;
                saveAndRender();
            });
        });

        // Eventos para eliminar tarea
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

    if (taskForm) {
        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const texto = taskInput.value.trim();
            if (texto !== '') {
                tareas.push({ texto, completada: false });
                taskInput.value = '';
                saveAndRender();
            }
        });
    }

    renderTasks();
});

fetch('planificacion.html').then(response => response.text()) .then(data => document.querySelector('.task-management').innerHTML = data);
