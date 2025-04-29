const { Server } = require("socket.io");

const {
  manejarAmigos,
  manejarReconexionUsuarios,
  manejarConexionUsuarios,
  manejarDesconexionUsuarios,
  usuariosConectados,
} = require("./usuarioWS");

const {
  manejarConexionSalas,
  manejarDesconexionSalas,
  salas,
} = require("./salaWS");

const {
  manejarConexionPartidas,
  manejarDesconexionPartidas,
} = require("./partidaWS");

const ServidorWS = (server) => {
  if (!server) {
    console.error("Error: el servidor HTTP no está definido.");
    return;
  }

  // Crear un nuevo servidor Socket.IO usando el servidor HTTP
  const io = new Server(server, { cors: { origin: "*" } });
  console.log("Servidor WebSocket inicializado");

  io.on("connection", (socket) => {
    console.log(`Usuario conectado: ${socket.id}`);

    // Delegar la lógica de usuarios, salas y partidas a sus respectivos módulos
    manejarReconexionUsuarios(socket, usuariosConectados, io);
    manejarConexionUsuarios(socket, io);
    manejarConexionSalas(socket, io);
    manejarConexionPartidas(socket, io);
    manejarAmigos(socket, io);

    // Evento de desconexión
    socket.on("disconnect", () => {
      console.log(`Usuario desconectado: ${socket.id}`);

      // Delegar la lógica de desconexión a los módulos
      manejarDesconexionUsuarios(socket, salas, io);
      manejarDesconexionSalas(socket, io);
      manejarDesconexionPartidas(socket, io);
    });
  });
  return io;
};

module.exports = ServidorWS;
