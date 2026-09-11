<main class="main-container">
    <div class="card">
        <h2>Registro de Tratamiento Sanitario</h2>
        <form id="form-sanitario">
            <div class="form-group">
                <label for="arete-animal">Número de Arete</label>
                <input type="text" id="arete-animal" required>
            </div>

            <div class="form-group">
                <label for="tipo-tratamiento">Tipo de Tratamiento</label>
                <select id="tipo-tratamiento" required>
                    <option value="">Seleccione...</option>
                    <option value="Vacunacion">Vacunación</option>
                    <option value="Desparasitacion">Desparasitación</option>
                    <option value="Vitamina">Vitaminas</option>
                    <option value="Curacion">Curación</option>
                </select>
            </div>

            <div class="form-group">
                <label for="producto-nombre">Nombre del Producto</label>
                <input type="text" id="producto-nombre" required>
            </div>

            <div class="form-group">
                <label for="fecha-aplicacion">Fecha de Aplicación</label>
                <input type="date" id="fecha-aplicacion" required>
            </div>

            <button type="submit" class="btn-primary">Guardar Registro</button>
        </form>
    </div>

    <div class="navigation-actions">
        <a href="./index.html" class="btn-secondary">Volver al Inicio</a>
    </div>
</main>
