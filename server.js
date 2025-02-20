require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createServer } = require("http"); // Servidor HTTP necesario para WebSockets
const { Server } = require("socket.io");

const Partida = require("./Partida"); // Importar la clase Partida

const UsuarioDAO = require("./dao/UsuarioDao");
const PartidaDAO = require("./dao/PartidaDao");
const SolicitudAmistadDAO = require("./dao/SolicitudAmistadDao");
const AmistadDAO = require("./dao/AmistadDao");
const JuegaDAO = require("./dao/JuegaDao");
//const redisClient = require("./redisClient");

const app = express();
//const PORT = process.env.PORT || 5000;
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const partidasActivas = {}; // Almacén en memoria para partidas activas

app.use(cors()); // Permitir solicitudes desde el frontend
app.use(express.json()); // Permitir recibir JSON en las peticiones


/// !!!! TEST !!!!
// Ruta de prueba
app.get("/api/saludo", (req, res) => {
  res.json({ mensaje: "¡Hola desde el backendo!" });
});



/**
 * @module API Usuarios
 * @description Endpoints para la gestión de usuarios.
 */


/**
 * Crea un nuevo usuario.
 * @route POST /api/usuario/crear
 * @param {string} req.body.nombre - Nombre del usuario.
 * @param {string} req.body.email - Correo electrónico del usuario.
 * @param {string} req.body.contrasena - Contraseña del usuario.
 * @param {string} [req.body.avatar] - URL del avatar del usuario (opcional).
 * @returns {Object} Usuario creado o mensaje de error.
 */
app.post("/api/usuario/crear", async (req, res) => {
  const { nombre, email, contrasena, avatar } = req.body;
  try {
    const usuario = await UsuarioDAO.crearUsuario(nombre, email, contrasena, avatar);
    res.json({ mensaje: "Usuario creado", usuario });
  } catch (error) {
    res.status(500).json({ error: "Error al crear usuario" });
  }
});


/**
 * Inicia sesión validando credenciales.
 * @route POST /api/usuario/login
 * @param {string} req.body.email - Correo electrónico del usuario.
 * @param {string} req.body.contrasena - Contraseña del usuario.
 * @returns {Object} Datos del usuario autenticado o error.
 */
app.post("/api/usuario/login", async (req, res) => {
  console.log(req.body);
  const { email, contrasena } = req.body;
  try {
    const usuario = await UsuarioDAO.validarCredenciales(email, contrasena);
    if (!usuario) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }
    res.json({ mensaje: "Inicio de sesión exitoso", usuario });
  } catch (error) {
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

/**
 * @module API Partidas
 * @description Endpoints REST para la gestión de partidas.
 */

/**
 * Crea una nueva partida.
 * @route POST /api/partida/crear
 * @param {string} req.body.nombre - Nombre de la partida.
 * @param {string} req.body.tipo - Tipo de la partida ('publica' o 'privada').
 * @param {string} [req.body.contrasena] - Contraseña de la partida (si es privada).
 * @returns {Object} Partida creada o mensaje de error.
 */
app.post("/api/partida/crear", async (req, res) => {
  const { nombre, tipo, contrasena } = req.body;
  try {
    const partida = await PartidaDAO.crearPartida(nombre, tipo, contrasena);
    res.json({ mensaje: "Partida creada", partida });
  } catch (error) {
    res.status(500).json({ error: "Error al crear la partida" });
  }
});


/**
 * Obtiene el estado de una partida.
 * @route GET /api/partida/:id
 * @param {number} req.params.id - ID de la partida.
 * @returns {Object} Datos de la partida o mensaje de error.
 */
app.get("/api/partida/:id", async (req, res) => {
  try {
    const partida = await PartidaDAO.obtenerPartida(req.params.id);
    if (!partida) {
      return res.status(404).json({ error: "Partida no encontrada" });
    }
    res.json(partida);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener la partida" });
  }
});



//-------------------------------------------------------------------------------------------

/**
 * @module WebSockets Partidas
 * @description Gestión de partidas en tiempo real con Socket.io.
 */
io.on("connection", (socket) => {
  console.log(`Jugador conectado: ${socket.id}`);

  /**
   * Permite a un jugador unirse a una partida en curso.
   * @event joinGame
   * @param {Object} data - Datos de la conexión.
   * @param {number} data.gameId - ID de la partida.
   * @param {number} data.userId - ID del usuario.
   */
  socket.on("joinGame", async ({ idPartida, idJugador }) => {
    if (!partidasActivas[idPartida]) {
      const partidaData = await redisClient.get(`partida:${idPartida}`);
      if (partidaData) {
        partidasActivas[idPartida] = JSON.parse(partidaData);
      } else {
        socket.emit("error", "Partida no encontrada.");
        return;
      }
    }

    socket.join(`partida_${idPartida}`);
    socket.emit("partidaState", partidasActivas[idPartida]);
  });

  
  /**
   * Inicia una partida desde una sala existente.
   * @event iniciar_partida
   * @param {Object} data - Datos de la partida.
   * @param {number} data.idSala - ID de la sala.
   * @param {number} data.idLider - ID del líder de la sala.
   */
  socket.on("iniciar_partida", async ({ idSala, idLider }) => {
    const partida = await PartidaDAO.iniciarPartida(idSala, idLider);
    if (partida.error) {
      socket.emit("error", partida.error);
      return;
    }

    partidasActivas[partida.idPartida] = partida;
    await redisClient.set(`partida:${partida.idPartida}`, JSON.stringify(partida));
    io.to(`partida_${partida.idPartida}`).emit("partida_iniciada", partida);
  });

  /**
   * Cambia el turno en la partida.
   * @event cambiar_turno
   * @param {Object} data - Información de la partida.
   * @param {number} data.gameId - ID de la partida.
   */
  socket.on("cambiar_turno", async ({ idPartida }) => {
    const partida = partidasActivas[idPartida];
    if (!partida) return;

    const result = partida.applyEliminations(); // revisar !!!
    if (result) {
      io.to(`partida_${idPartida}`).emit("partida_finalizada", result);
      delete partidasActivas[idPartida];
      await redisClient.del(`partida:${idPartida}`);
    } else {
      partida.nextTurn();
      io.to(`partida_${idPartida}`).emit("turno_cambiado", partida.turn);
      await redisClient.set(`partida:${idPartida}`, JSON.stringify(partida));
    }
  });

  /**
   * Envía un mensaje en el chat de la partida.
   * @event enviar_mensaje
   * @param {Object} data - Datos del mensaje.
   * @param {number} data.gameId - ID de la partida.
   * @param {number} data.userId - ID del usuario.
   * @param {string} data.mensaje - Mensaje enviado.
   */
  socket.on("enviar_mensaje", ({ idPartida, idJugador, mensaje }) => {
    const partida = partidasActivas[idPartida];
    if (!partida) return;

    partida.chat.push({ idJugador, mensaje, timestamp: Date.now() });
    io.to(`partida_${idPartida}`).emit("chat_actualizado", partida.chat);
  });

  /**
   * Maneja la desconexión de un usuario.
   * @event disconnect
   */
  socket.on("disconnect", () => {
    console.log(`Usuario desconectado: ${socket.id}`);
  });
});




//----------------------------------------------------------------------------------

/**
 * @module API Amistades
 * @description Endpoints para gestión de amistades.
 */

/**
 * Agrega un amigo a la lista de amistades.
 * @route POST /api/amistad/agregar
 * @param {number} req.body.idUsuario1 - ID del usuario que agrega.
 * @param {number} req.body.idUsuario2 - ID del usuario agregado.
 * @returns {Object} Relación de amistad o mensaje de error.
 */
app.post("/api/amistad/agregar", async (req, res) => {
  const { idUsuario1, idUsuario2 } = req.body;
  try {
    const amistad = await AmistadDAO.agregarAmigo(idUsuario1, idUsuario2);
    res.json({ mensaje: "Amistad creada", amistad });
  } catch (error) {
    res.status(500).json({ error: "Error al agregar amigo" });
  }
});

/**
 * @module API Solicitudes de Amistad
 * @description Endpoints para gestionar solicitudes de amistad.
 */

/**
 * Envía una solicitud de amistad.
 * @route POST /api/solicitud/enviar
 * @param {number} req.body.idEmisor - ID del usuario que envía la solicitud.
 * @param {number} req.body.idReceptor - ID del usuario que recibe la solicitud.
 * @returns {Object} Solicitud enviada o error.
 */
app.post("/api/solicitud/enviar", async (req, res) => {
  const { idEmisor, idReceptor } = req.body;
  try {
    const solicitud = await SolicitudAmistadDAO.enviarSolicitud(idEmisor, idReceptor);
    res.json({ mensaje: "Solicitud enviada", solicitud });
  } catch (error) {
    res.status(500).json({ error: "Error al enviar solicitud" });
  }
});

/**
 * Cambia el estado de una solicitud de amistad.
 * @route POST /api/solicitud/responder
 * @param {number} req.body.idEmisor - ID del usuario que envió la solicitud.
 * @param {number} req.body.idReceptor - ID del usuario que recibió la solicitud.
 * @param {string} req.body.estado - Estado nuevo ('aceptada' o 'rechazada').
 * @returns {Object} Mensaje de éxito o error.
 */
app.post("/api/solicitud/responder", async (req, res) => {
  const { idEmisor, idReceptor, estado } = req.body;
  try {
    await SolicitudAmistadDAO.actualizarEstadoSolicitud(idEmisor, idReceptor, estado);
    res.json({ mensaje: "Solicitud actualizada" });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar solicitud" });
  }
});


//----------------------------------------------------------------------------------

/**
 * Inicia el servidor Express y WebSocket.
 * @function
 */
app.listen(process.env.PORT || 5000, () => {
  console.log(`Servidor corriendo en http://localhost:${process.env.PORT || 5000}`);
});

