import express from 'express';
import { scrypt, randomBytes, randomUUID } from 'node:crypto';

const app = express();
app.use(express.json()); // Usar el middleware incluido en Express para parsear JSON

// Usuarios y tareas (todos) predefinidos
const users = [
    {
        username: 'admin',
        name: 'Gustavo Alfredo Marín Sáez',
        password: '1b6ce880ac388eb7fcb6bcaf95e20083:341dfbbe86013c940c8e898b437aa82fe575876f2946a2ad744a0c51501c7dfe6d7e5a31c58d2adc7a7dc4b87927594275ca235276accc9f628697a4c00b4e01'
    }
];
export const todos = [];

app.use(express.static('public'));

// Middleware para autenticación
function Middleware(req, res, next) {
    const token = req.headers['x-authorization'];
    if (!token) {
        return res.status(401).json({ error: 'Falta token de autorización.' });
    }

    const user = users.find(u => u.token === token);
    if (!user) {
        return res.status(401).json({ error: 'Token inválido.' });
    }

    next();
}

// Ruta de saludo
app.get('/api', (req, res) => {
    res.type('text/plain');
    res.send('Hello World!');
});

// Ruta de login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Ingrese usuario y contraseña.' });
    }

    const user = users.find(u => u.username === username);
    if (!user) {
        return res.status(401).json({ error: 'Usuario y/o contraseña incorrectos.' });
    }

    const [salt, storedHash] = user.password.split(':');
    const match = await verificarContraseña(password, salt, storedHash);
    if (!match) {
        return res.status(401).json({ error: 'Usuario y/o contraseña incorrectos.' });
    }

    user.token = randomBytes(48).toString('hex');
    res.json({ username: user.username, name: user.name, token: user.token });
});

// Función para verificar la contraseña
async function verificarContraseña(password, salt, hash) {
    return new Promise((resolve, reject) => {
        scrypt(password, salt, 64, (err, derivedKey) => {
            if (err) reject(err);
            resolve(hash === derivedKey.toString('hex'));
        });
    });
}

// Listar todos los "todos"
app.get('/api/todos', Middleware, (req, res) => {
    res.json(todos);
});

// Obtener un "todo" específico
app.get('/api/todos/:id', Middleware, (req, res) => {
    const todo = todos.find(t => t.id === req.params.id);
    if (!todo) {
        return res.status(404).json({ error: 'Item no encontrado.' });
    }
    res.json(todo);
});

// Crear un nuevo "todo"
app.post('/api/todos', Middleware, (req, res) => {
    const { title } = req.body;
    if (!title) {
        return res.status(400).json({ error: 'Falta título del item.' });
    }

    const newTodo = {
        id: randomUUID(),
        title,
        completed: false
    };
    todos.push(newTodo);
    res.status(201).json(newTodo);
});

// Actualizar un "todo"
app.put('/api/todos/:id', Middleware, (req, res) => {
    const todo = todos.find(t => t.id === req.params.id);
    if (!todo) {
        return res.status(404).json({ error: 'Item no encontrado.' });
    }

    const { title, completed } = req.body;
    if (title) todo.title = title;
    if (typeof completed === 'boolean') todo.completed = completed;
    res.json(todo);
});

// Eliminar un "todo"
app.delete('/api/todos/:id', Middleware, (req, res) => {
    const index = todos.findIndex(t => t.id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ error: 'Item no encontrado.' });
    }
    todos.splice(index, 1);
    res.status(204).send();
});

export default app;

app.listen(3000, () => console.log('Servidor ejecutándose en el puerto 3000.'));
