//public/app.js
async function addUser() {
    const username = document.getElementById('username').value;
    if (!username) return alert('Por favor, ingresa un nombre.');

    const response = await fetch('/addUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: username })
    });

    if (response.ok) {
        alert('Usuario agregado con éxito');
        document.getElementById('username').value = '';
        fetchUsers();
    } else {
        alert('Error al agregar usuario');
    }
}

async function fetchUsers() {
    const response = await fetch('/getUsers');
    const users = await response.json();

    const userList = document.getElementById('userList');
    userList.innerHTML = '';

    users.forEach(user => {
        const li = document.createElement('li');
        li.textContent = user;
        userList.appendChild(li);
    });
}
