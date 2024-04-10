// Importamos las librerías necesarias para crear y manejar nuestra aplicación web.
import express from 'express';
import bodyParser from 'body-parser';
import { scrypt, randomBytes, randomUUID } from 'node:crypto';

// Inicializamos la aplicación de Express.
const app = express();

// Usamos bodyParser para poder leer JSON desde el cuerpo de las peticiones HTTP.
app.use(bodyParser.json());

// Lista de usuarios predefinidos para la aplicación.
const users = [{
	username: 'admin',
	name: 'Gustavo Alfredo Marín Sáez',
	password: '1b6ce880ac388eb7fcb6bcaf95e20083:341dfbbe86013c940c8e898b437aa82fe575876f2946a2ad744a0c51501c7dfe6d7e5a31c58d2adc7a7dc4b87927594275ca235276accc9f628697a4c00b4e01' // certamen123
}];

// Lista para almacenar los items o tareas.
const todos = [];

// Middleware para servir archivos estáticos desde la carpeta 'public'.
app.use(express.static('public'));


///////////////////////////////////////////////// HELLO WORLD! /////////////////////////////////////////////

// Respondemos con un "Hello World!" 
app.get('/api', (req, res) => {
	res.contentType('text/plain');
	res.status(200).send('Hello World!');
});


////////////////////////////////////////////////// LOGIN ////////////////////////////////////////////////// 

// Ruta para manejar el inicio de sesión.
app.post('/api/login', async (req, res)  => {
	res.contentType('application/json');

	const UsuarioNuevo = req.body.username;
	const PasswordNuevo = req.body.password;

	// Validamos que se hayan enviado los campos necesarios.
if (UsuarioNuevo == undefined || UsuarioNuevo == "")
	return res.status(400).send("Ingrese usuario válido");
if (PasswordNuevo == undefined || PasswordNuevo == "") 
	return res.status(400).send("Ingrese contraseña válida");


	// Buscamos al usuario en la lista de usuarios.
	const indiceUsuario = users.findIndex((user) => user.username == UsuarioNuevo);

	if (indiceUsuario == -1) {
		// Si no encontramos al usuario, respondemos con un error.
		res.status(401).send("Usuario o contraseña Incorrectos")
	} else {
		// Si encontramos al usuario, validamos la contraseña.
		try {
			const isValidCredentials = validarContraseña(PasswordNuevo, users[indiceUsuario].password);
			if (!isValidCredentials)
			{
				// Si la contraseña no es válida, respondemos con un error.
				res.status(401).send("Usuario o contraseña Incorrectos")
			}
			else
			{
				// Si la contraseña es válida, respondemos con los datos del usuario y un token.
				const resp = { 
					username: users[indiceUsuario].username, 
					name: users[indiceUsuario].name,
					token: generarBearerToken(users[indiceUsuario].username)
				}

				res.status(200).send(resp);
			}
		}
		catch (err)
		{
			console.log(err)
		}
	}
});


/////////////////////////////////////////// LISTAR ITEM /////////////////////////////////////////////////////

// Ruta para listar todos los items o tareas.
app.get("/api/todos", validarMiddleware, (req, res)  =>  {
	res.contentType('application/json');
	let lista = [];

	todos.forEach(element => {
		lista.push({
			id: element.id,
			title: element.title,
			completed: element.completed
		})
	});

	res.status(200).send(lista);
});


////////////////////////////////////////////////// OBTENER ITEM /////////////////////////////////////////////

// Ruta para obtener un item específico por su ID.
app.get("/api/todos/:id", validarMiddleware, (req, res) => {
	res.contentType('application/json');

	const id = req.params.id;

	const todoIndex = todos.findIndex((t) => t.id == id);

	if (todoIndex == -1) {
		res.status(404).send("Item no existe");
	} else {
		const respuesta = {
			id: todos[todoIndex].id,
			title: todos[todoIndex].title,
			completed: todos[todoIndex].completed
		}
		res.status(200).send(respuesta);
	}
});


///////////////////////////////////////////////// CREACION DE ITEM ///////////////////////////////////////////

// Ruta para crear un nuevo item o tarea.
app.post("/api/todos", validarMiddleware, (req, res) => {
	res.contentType('application/json');
	
	try {
		const title = req.body.title;

		const todo = {
			id: randomUUID().toString(),
			title: title,
			completed: false
		}

		todos.push(todo);
	
		res.status(201).send(todo);
	} catch (err) {
		res.status(400);
	} 
});


/////////////////////////////////////////////// ACTUALIZACION ITEM ///////////////////////////////////////

// Ruta para actualizar un item o tarea específico por su ID.
app.put("/api/todos/:id", validarMiddleware, (req, res) => {
	res.contentType('application/json');

	const id = req.params.id;
	const title = req.body.title;
	const completed = req.body.completed;
	
	try {

		const todoIndex = todos.findIndex((todo) => todo.id == id);

		let todoExist = todos[todoIndex];

		const todo = {
			id: id,
			title: title ? title : todoExist.title,
			completed: completed ? completed : todoExist.completed
		}
	
		todos[todoIndex] = todo;

		res.status(200).send(todo);
	} catch (err) {
		res.status(400);
	} 
});


/////////////////////////////////////////////// BORRAR ITEM //////////////////////////////////////////////

// Ruta para eliminar un item o tarea específico por su ID.
// Define una ruta DELETE para "/api/todos/:id", donde ":id" es el TODO a eliminar.
app.delete("/api/todos/:id", validarMiddleware, (req, res) => {

    // Extrae "id" de la solicitud para identificar el TODO a eliminar.
    const id = req.params.id;

    // Encuentra el índice del TODO a eliminar en "todos".
    const todoIndex = todos.findIndex((todo) => todo.id == id);

    if (todoIndex !== -1) { // Si el TODO existe

        // Elimina el TODO específico.
        todos.splice(todoIndex, 1);

        // Envía respuesta HTTP 204 (eliminado con éxito, sin contenido).
        res.status(204).send();
    } else {
        // Si el TODO no se encuentra, envía respuesta HTTP 404 (no encontrado).
        res.status(404).send("Todo not found.");
    }
});




/////////////////////////////////////////////////// REQUISITOS ////////////////////////////////////////////

 //Función para validar la contraseña del usuario contra el hash almacenado.
async function validarContraseña(contraseña, hashAlmacenado) {
	// Descompone el hash almacenado en el 'salt' y el hash propiamente dicho, separados por ':'
	const [salt, hash] = hashAlmacenado.split(':');
	// Genera un nuevo hash a partir de la contraseña proporcionada y el salt, usando la función 'generarHash'
	const hashRecreado = await generarHash(contraseña, Buffer.from(salt, 'hex'));
	// Compara el hash recreado con el hash almacenado para validar la contraseña
	return hashRecreado === hash;
}

// Función para generar el hash de una contraseña dada un salt.
async function generarHash(contraseña, salt) {
	// Retorna una promesa que intentará generar un hash a partir de la contraseña y el salt proporcionados
	return new Promise((resolve, reject) => {
		// Utiliza 'scrypt' para generar un hash seguro de la contraseña
		scrypt(contraseña, salt, 64, (err, derivedKey) => {
			if (err) reject(err); // En caso de error, rechaza la promesa
			resolve(derivedKey.toString('hex')); // Si tiene éxito, resuelve la promesa con el hash generado
		});
	});
}

// Función para generar un token de autenticación (bearer token).
function generarBearerToken(username) {
   // Generar una cadena aleatoria para el token
   const token = randomBytes(32).toString('hex');

   // Combinar los datos custom y el token en un objeto
   const tokenData = {
	   username: username
   };

   // Convertir los bytes en una cadena hexadecimal (esta línea parece ser redundante, ya que 'token' ya es una cadena hexadecimal)
   const tokenHex = token.toString('hex');

   // Concatenar la cadena JSON con la cadena hexadecimal (aquí se debería concatenar 'tokenHex', pero en realidad no se está usando)
   const tokenCompleto = JSON.stringify(tokenData);

   // Devuelve el token completo
   return tokenCompleto;
}

//////////////////////////////////////////////// SERVICIOS ////////////////////////////////////////////////

// Middleware para validar la autenticación del usuario.
function validarMiddleware(req, res, next) {
   // Extrae el encabezado de autorización de la solicitud
   const authHeader = req.headers['x-authorization'];
   let user = "";
   // Verifica si el encabezado de autorización existe y no está vacío
   if (authHeader && authHeader.trim() !== '') {
	   try {
		   // Intentamos convertir el header de autorización de un string JSON a un objeto.
		   const jsonObject = JSON.parse(authHeader);
		   user = jsonObject.username;
	   } catch (error) {
		   // Si ocurre un error al analizar el JSON, se registra y se envía una respuesta 401 (No autorizado)
		   console.error('Error al analizar el encabezado de autorización JSON:', error.message);
		   return res.status(401).send();
	   }
   } else {
	   // Si el encabezado de autorización está vacío o no está definido, se registra y se envía una respuesta 401
	   console.log('El encabezado de autorización está vacío o no está definido.');
	   return res.status(401).send();
   }

   // Buscamos al usuario en la lista de usuarios para verificar si existe.
   const userIndex = users.findIndex((u) => u.username == user)

   // Si el usuario no se encuentra, se registra un error y se envía una respuesta 401
   if (userIndex == -1) {
	   console.log("error validacion");
	   return res.status(401).send();
   } else {
	   // Si el usuario se valida correctamente, se registra y se llama a 'next()' para continuar con el siguiente middleware
	   console.log("validado");
	   next();
   }
}

// Exportamos la aplicación para usarla en otro lugar.
export default app;
