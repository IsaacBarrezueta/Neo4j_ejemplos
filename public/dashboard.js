// Función para actualizar las estadísticas
async function updateStats() {
    try {
        const response = await fetch('/getStats');
        const stats = await response.json();
        
        document.getElementById('totalUsers').textContent = stats.userCount;
        document.getElementById('totalPosts').textContent = stats.postCount;
        document.getElementById('totalConnections').textContent = stats.followCount;
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
    }
}

// Función para agregar una operación al log
function logOperation(operation, status, details) {
    const logDiv = document.getElementById('operationsLog');
    const timestamp = new Date().toLocaleTimeString();
    
    const operationDiv = document.createElement('div');
    operationDiv.className = `p-2 border-l-4 ${
        status === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
    }`;
    
    operationDiv.innerHTML = `
        <p class="text-sm text-gray-600">[${timestamp}]</p>
        <p class="font-medium">${operation}</p>
        <p class="text-sm">${details}</p>
    `;
    
    logDiv.insertBefore(operationDiv, logDiv.firstChild);
}

// Función para actualizar la lista de usuarios y sus relaciones
async function updateUsersList() {
    try {
        const response = await fetch('/getAllUsers');
        const users = await response.json();
        
        const usersListDiv = document.getElementById('usersList');
        usersListDiv.innerHTML = '';
        
        users.forEach(user => {
            const userDiv = document.createElement('div');
            userDiv.className = 'p-4 border rounded-lg';
            userDiv.innerHTML = `
                <p class="font-bold">${user.username}</p>
                <p class="text-sm text-gray-600">Email: ${user.email}</p>
                <p class="text-sm text-gray-600">Creado: ${new Date(user.createdAt).toLocaleString()}</p>
                <p class="text-sm mt-2">Siguiendo: ${user.following.join(', ') || 'Ninguno'}</p>
            `;
            usersListDiv.appendChild(userDiv);
        });
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
    }
}

// Funciones de control de datos
async function deleteAllPosts() {
    if (!confirm('¿Estás seguro de que quieres borrar todas las publicaciones?')) return;
    
    try {
        const response = await fetch('/deleteAllPosts', { method: 'DELETE' });
        if (response.ok) {
            logOperation('Borrar Posts', 'success', 'Todas las publicaciones han sido eliminadas');
            updateStats();
        } else {
            throw new Error('Error al borrar publicaciones');
        }
    } catch (error) {
        logOperation('Borrar Posts', 'error', error.message);
    }
}

async function deleteAllUsers() {
    if (!confirm('¿Estás seguro de que quieres borrar todos los usuarios?')) return;
    
    try {
        const response = await fetch('/deleteAllUsers', { method: 'DELETE' });
        if (response.ok) {
            logOperation('Borrar Usuarios', 'success', 'Todos los usuarios han sido eliminados');
            updateStats();
            updateUsersList();
        } else {
            throw new Error('Error al borrar usuarios');
        }
    } catch (error) {
        logOperation('Borrar Usuarios', 'error', error.message);
    }
}

async function deleteEverything() {
    if (!confirm('¿Estás seguro de que quieres resetear completamente la base de datos?')) return;
    
    try {
        const response = await fetch('/deleteEverything', { method: 'DELETE' });
        if (response.ok) {
            logOperation('Reset Completo', 'success', 'La base de datos ha sido reseteada');
            updateStats();
            updateUsersList();
        } else {
            throw new Error('Error al resetear la base de datos');
        }
    } catch (error) {
        logOperation('Reset Completo', 'error', error.message);
    }
}

// Observadores para las operaciones principales
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    const url = args[0];
    const method = args[1]?.method || 'GET';
    
    // Solo logear operaciones específicas
    if (method === 'POST' && (url === '/register' || url === '/createPost' || url === '/followUser')) {
        const operation = url.substring(1);
        const status = response.ok ? 'success' : 'error';
        const details = response.ok ? 'Operación completada con éxito' : 'Error en la operación';
        
        logOperation(operation, status, details);
        updateStats();
        updateUsersList();
    }
    
    return response;
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    updateStats();
    updateUsersList();
    // Registrar la primera operación en el log
    logOperation('Inicialización', 'success', 'Dashboard cargado correctamente');
});

// Actualizar estadísticas cada 30 segundos
setInterval(updateStats, 30000);