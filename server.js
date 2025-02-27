require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createServer } = require("http"); // Servidor HTTP necesario para WebSockets
const { Server } = require("socket.io");

const Partida = require("./Partida"); // Importar la clase Partida !!!

//const redisClient = require("./redisClient"); !!!

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const partidasActivas = {}; // Almacén en memoria para partidas activas

// Middlewares
app.use(cors()); // Permitir solicitudes desde el frontend
app.use(express.json()); // Permitir recibir JSON en las peticiones

// Importar rutas
const usuarioRoutes = require("./routes/UsuarioRoutes");
const partidaRoutes = require("./routes/PartidaRoutes");
const solicitudAmistadRoutes = require("./routes/SolicitudAmistadRoutes");
const amistadRoutes = require("./routes/AmistadRoutes");
const juegaRoutes = require("./routes/JuegaRoutes");

// Usar rutas
app.use("/api/usuario", usuarioRoutes);
app.use("/api/partida", partidaRoutes);
app.use("/api/solicitud", solicitudAmistadRoutes);
app.use("/api/amistad", amistadRoutes);
app.use("/api/juega", juegaRoutes);

// WebSockets
require("./websockets/partidaWS")(io);

/**
 * Inicia el servidor Express y WebSocket.
 * @function
 */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});


// // SOCKETS
// //----------------------------------------------------------------------------------
// /**
//  * @module WebSockets Partidas
//  * @description Gestión de partidas en tiempo real con Socket.io.
//  */
// io.on("connection", (socket) => {
//   console.log(`Jugador conectado: ${socket.id}`);

//   /**
//    * Permite a un jugador unirse a una partida en curso.
//    * @event joinGame
//    * @param {Object} data - Datos de la conexión.
//    * @param {number} data.gameId - ID de la partida.
//    * @param {number} data.userId - ID del usuario.
//    */
//   socket.on("joinGame", async ({ idPartida, idJugador }) => {
//     if (!partidasActivas[idPartida]) {
//       const partidaData = await redisClient.get(`partida:${idPartida}`);
//       if (partidaData) {
//         partidasActivas[idPartida] = JSON.parse(partidaData);
//       } else {
//         socket.emit("error", "Partida no encontrada.");
//         return;
//       }
//     }

//     socket.join(`partida_${idPartida}`);
//     socket.emit("partidaState", partidasActivas[idPartida]);
//   });

  
//   /**
//    * Inicia una partida desde una sala existente.
//    * @event iniciar_partida
//    * @param {Object} data - Datos de la partida.
//    * @param {number} data.idSala - ID de la sala.
//    * @param {number} data.idLider - ID del líder de la sala.
//    */
//   socket.on("iniciar_partida", async ({ idSala, idLider }) => {
//     const partida = await PartidaDAO.iniciarPartida(idSala, idLider); // no existe !!!
//     if (partida.error) {
//       socket.emit("error", partida.error);
//       return;
//     }

//     partidasActivas[partida.idPartida] = partida;
//     await redisClient.set(`partida:${partida.idPartida}`, JSON.stringify(partida));
//     io.to(`partida_${partida.idPartida}`).emit("partida_iniciada", partida);
//   });

//   /**
//    * Cambia el turno en la partida.
//    * @event cambiar_turno
//    * @param {Object} data - Información de la partida.
//    * @param {number} data.gameId - ID de la partida.
//    */
//   socket.on("cambiar_turno", async ({ idPartida }) => {
//     const partida = partidasActivas[idPartida];
//     if (!partida) return;

//     const result = partida.applyEliminations(); // revisar !!! se haría con gestionarTurno
//     if (result) {
//       io.to(`partida_${idPartida}`).emit("partida_finalizada", result);
//       delete partidasActivas[idPartida];
//       await redisClient.del(`partida:${idPartida}`);
//     } else {
//       partida.nextTurn();
//       io.to(`partida_${idPartida}`).emit("turno_cambiado", partida.turn);
//       await redisClient.set(`partida:${idPartida}`, JSON.stringify(partida));
//     }
//   });

//   /**
//    * Envía un mensaje en el chat de la partida.
//    * @event enviar_mensaje
//    * @param {Object} data - Datos del mensaje.
//    * @param {number} data.gameId - ID de la partida.
//    * @param {number} data.userId - ID del usuario.
//    * @param {string} data.mensaje - Mensaje enviado.
//    */
//   socket.on("enviar_mensaje", ({ idPartida, idJugador, mensaje }) => {
//     const partida = partidasActivas[idPartida];
//     if (!partida) return;

//     partida.chat.push({ idJugador, mensaje, timestamp: Date.now() });
//     io.to(`partida_${idPartida}`).emit("chat_actualizado", partida.chat);
//   });
// });
