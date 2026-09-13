 window.deleteTask = async (id) => {
            if (confirm('¿Deseas eliminar este registro de la base de datos central?')) {
                setSyncStatus(true);
                try {
                    await deleteDoc(doc(db, "tareas", id));
                    showNotification('Tarea eliminada de la nube', 'danger');
                } catch (err) {
                    console.error("Error al eliminar en Firestore:", err);
                    showNotification('Error al eliminar', 'danger');
                } finally {
                    setSyncStatus(false);
                }
            }
        };
    </script>

