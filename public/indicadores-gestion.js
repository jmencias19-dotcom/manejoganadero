document.addEventListener('DOMContentLoaded', () => {
    cargarIndicadores();

    function cargarIndicadores() {
        // En una aplicación real, aquí consultarías la base de datos o API.
        // Simularemos los datos consolidados del hato y las operaciones.
        const datosGestion = simularDatosGestion();

        document.getElementById('valor-preyectorias').textContent = datosGestion.preyectorias;
        document.getElementById('valor-vacas-vacias').textContent = datosGestion.vacasVacias;
        document.getElementById('valor-consumo-combustible').textContent = `${datosGestion.consumoCombustible} L`;
        document.getElementById('valor-eficiencia-maternal').textContent = datosGestion.eficienciaMaternal;
    }

    function simularDatosGestion() {
        // Datos calculados de los diferentes módulos del sistema (inventario, combustible, pastoreo)
        return {
            preyectorias: "85%",        // Tasa de preñez actual
            vacasVacias: "12",          // Número de vacas vacías detectadas
            consumoCombustible: "4500", // Litros totales de combustible consumidos este mes
            eficienciaMaternal: "94%"   // Índice de eficiencia materna
        };
    }
});
