document.addEventListener('DOMContentLoaded', () => {
    const tareaForm = document.getElementById('tarea-form');
    const tareaLabor = document.getElementById('tarea-labor');
    const taskList = document.getElementById('task-list');

    // Cargar tareas desde localStorage al iniciar
    let tareas = JSON.parse(localStorage.getItem('tareasLabores')) || [];

    function renderTasks() {
        if (!taskList) return;
        taskList.innerHTML = '';
        
        if (tareas.length === 0) {
            taskList.innerHTML = '<p class="tarea-meta" style="padding: 10px; text-align: center;">No hay tareas registradas actualmente.</p>';
            return;
        }

        tareas.forEach((tarea, index) => {
            const li = document.createElement('li');
            li.className = 'tarea-item-resumen';
            li.innerHTML = `
                <div class="tarea-checkbox-group">
                    <input type="checkbox" class="tarea-checkbox" ${tarea.completada ? 'checked' : ''} data-index="${index}">
                    <span class="tarea-texto ${tarea.completada ? 'tarea-completada' : ''}">${tarea.texto}</span>
                </div>
                <button class="btn-tarea btn-borrar" data-index="${index}">Eliminar</button>
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
});
