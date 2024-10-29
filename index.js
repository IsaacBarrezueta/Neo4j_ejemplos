// index.js
const express = require('express');
const neo4j = require('neo4j-driver');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const driver = neo4j.driver(
    'neo4j://localhost:7687',
    neo4j.auth.basic('neo4j', 'Cibr#E233')
);

const session = driver.session();

// Ruta para registrar usuario
app.post('/register', async (req, res) => {
    const { username, password, email } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await session.run(
            'CREATE (u:User {username: $username, password: $password, email: $email, createdAt: datetime()}) RETURN u.createdAt',
            { username, password: hashedPassword, email }
        );
        const createdAt = result.records[0].get('u.createdAt');
        res.status(200).send(`Usuario registrado con éxito. Fecha de creación: ${createdAt.toString()}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al registrar usuario');
    }
});
// Ruta para crear una publicación
app.post('/createPost', async (req, res) => {
    const { username, content } = req.body;
    try {
        await session.run(
            `MATCH (u:User {username: $username})
             CREATE (p:Post {content: $content, createdAt: datetime()})
             CREATE (u)-[:POSTED]->(p)`,
            { username, content }
        );
        res.status(200).send('Publicación creada con éxito');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al crear publicación');
    }
});

// Ruta para seguir a un usuario
app.post('/followUser', async (req, res) => {
    const { follower, following } = req.body;
    try {
        await session.run(
            `MATCH (a:User {username: $follower})
             MATCH (b:User {username: $following})
             MERGE (a)-[:FOLLOWS]->(b)`,
            { follower, following }
        );
        res.status(200).send('Ahora sigues a este usuario');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al seguir usuario');
    }
});

// Ruta para obtener el feed de un usuario
app.get('/feed/:username', async (req, res) => {
    const { username } = req.params;
    try {
        const result = await session.run(
            `MATCH (u:User {username: $username})-[:FOLLOWS]->(f:User)-[:POSTED]->(p:Post)
             RETURN f.username AS author, p.content AS content, p.createdAt AS date
             ORDER BY p.createdAt DESC LIMIT 50`,
            { username }
        );
        const posts = result.records.map(record => ({
            author: record.get('author'),
            content: record.get('content'),
            date: record.get('date')
        }));
        res.status(200).json(posts);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener feed');
    }
});

// Ruta para obtener sugerencias de usuarios
app.get('/suggestions/:username', async (req, res) => {
    const { username } = req.params;
    try {
        const result = await session.run(
            `MATCH (u:User {username: $username})-[:FOLLOWS]->(f:User)-[:FOLLOWS]->(fof:User)
             WHERE NOT (u)-[:FOLLOWS]->(fof) AND u <> fof
             RETURN DISTINCT fof.username AS username
             LIMIT 5`,
            { username }
        );
        const suggestions = result.records.map(record => record.get('username'));
        res.status(200).json(suggestions);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener sugerencias');
    }
});


// Ruta para obtener todos los usuarios y sus relaciones
app.get('/getAllUsers', async (req, res) => {
    try {
        const result = await session.run(
            `MATCH (u:User)
             OPTIONAL MATCH (u)-[:FOLLOWS]->(following:User)
             RETURN u.username AS username, 
                    u.email AS email, 
                    u.createdAt AS createdAt,
                    collect(following.username) AS following`
        );
        
        const users = result.records.map(record => ({
            username: record.get('username'),
            email: record.get('email'),
            createdAt: record.get('createdAt'),
            following: record.get('following')
        }));
        
        res.status(200).json(users);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener usuarios');
    }
});

// Ruta para obtener todas las publicaciones
app.get('/getAllPosts', async (req, res) => {
    try {
        const result = await session.run(
            `MATCH (u:User)-[:POSTED]->(p:Post)
             RETURN u.username AS username,
                    p.content AS content,
                    p.createdAt AS createdAt
             ORDER BY p.createdAt DESC`
        );
        
        const posts = result.records.map(record => ({
            username: record.get('username'),
            content: record.get('content'),
            createdAt: record.get('createdAt')
        }));
        
        res.status(200).json(posts);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener publicaciones');
    }
});

// Ruta para obtener estadísticas generales
app.get('/getStats', async (req, res) => {
    try {
        const result = await session.run(
            `MATCH (u:User)
             OPTIONAL MATCH (p:Post)
             OPTIONAL MATCH ()-[f:FOLLOWS]->()
             RETURN count(DISTINCT u) AS userCount,
                    count(DISTINCT p) AS postCount,
                    count(DISTINCT f) AS followCount`
        );
        
        const stats = {
            userCount: result.records[0].get('userCount').low,
            postCount: result.records[0].get('postCount').low,
            followCount: result.records[0].get('followCount').low
        };
        
        res.status(200).json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener estadísticas');
    }
});

// Ruta para borrar un usuario específico y todas sus relaciones
app.delete('/deleteUser/:username', async (req, res) => {
    const { username } = req.params;
    try {
        await session.run(
            `MATCH (u:User {username: $username})
             OPTIONAL MATCH (u)-[:POSTED]->(p:Post)
             OPTIONAL MATCH (u)-[r]-()
             DELETE p, r, u`,
            { username }
        );
        res.status(200).send('Usuario y sus datos relacionados eliminados con éxito');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al eliminar usuario');
    }
});

// Ruta para borrar una publicación específica
app.delete('/deletePost/:username/:timestamp', async (req, res) => {
    const { username, timestamp } = req.params;
    try {
        await session.run(
            `MATCH (u:User {username: $username})-[:POSTED]->(p:Post)
             WHERE p.createdAt = datetime($timestamp)
             DETACH DELETE p`,
            { username, timestamp }
        );
        res.status(200).send('Publicación eliminada con éxito');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al eliminar publicación');
    }
});

// Ruta para borrar todos los usuarios
app.delete('/deleteAllUsers', async (req, res) => {
    try {
        await session.run(
            `MATCH (u:User)
             OPTIONAL MATCH (u)-[:POSTED]->(p:Post)
             DETACH DELETE u, p`
        );
        res.status(200).send('Todos los usuarios y sus datos relacionados eliminados con éxito');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al eliminar todos los usuarios');
    }
});

// Ruta para borrar todas las publicaciones
app.delete('/deleteAllPosts', async (req, res) => {
    try {
        await session.run(
            `MATCH (p:Post)
             DETACH DELETE p`
        );
        res.status(200).send('Todas las publicaciones eliminadas con éxito');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al eliminar todas las publicaciones');
    }
});

// Ruta para borrar toda la base de datos
app.delete('/deleteEverything', async (req, res) => {
    try {
        await session.run('MATCH (n) DETACH DELETE n');
        res.status(200).send('Base de datos limpiada con éxito');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al limpiar la base de datos');
    }
});
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

