const express = require('express');
const neo4j = require('neo4j-driver');

const app = express();
app.use(express.json());
app.use(express.static('public')); // Servir archivos estáticos desde la carpeta "public"

const driver = neo4j.driver(
    'neo4j://localhost:7687', 
    neo4j.auth.basic('neo4j', 'Cibr#E233') // Cambia 'tu_contraseña' por la contraseña de Neo4j
);

const session = driver.session();

// Ruta para agregar un usuario
app.post('/addUser', async (req, res) => {
    const { name } = req.body;
    try {
        await session.run('CREATE (u:User {name: $name})', { name });
        res.status(200).send('Usuario creado con éxito');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al crear el usuario');
    }
});

// Ruta para obtener todos los usuarios
app.get('/getUsers', async (req, res) => {
    try {
        const result = await session.run('MATCH (u:User) RETURN u.name AS name');
        const users = result.records.map(record => record.get('name'));
        res.status(200).json(users);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener usuarios');
    }
});
app.use(express.static('public'));

// Iniciar servidor en el puerto 3000
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
