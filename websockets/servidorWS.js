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

// Iniciar la partida !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
/*socket.on("iniciarPartida", async ({ idPartida }) => {
      if (salas[idPartida]) {
        // Obtener jugadores de la sala
        //const jugadores = obtenerJugadoresSala(idPartida); !!!

        // Asignar roles, pasando maxRolesEspeciales como parámetro
        //const rolesAsignados = asignarRoles(jugadores, salas[idPartida].maxRolesEspeciales); !!!
        
        //const partida = {...};

        // Guardar en Redis y en memoria
        //await redisClient.set(`partida_${idPartida}`, JSON.stringify(partida));
        
        io.to(idPartida).emit("partidaIniciada", partida);
      }
    });*/

// Acción del jugador
/*socket.on("accionJugador", async ({ idPartida, accion }) => {
      let partida = JSON.parse(await redisClient.get(`partida_${idPartida}`));
      if (partida) {
        partida.estado = accion.estado; // !!!
        //await redisClient.set(`partida_${idPartida}`, JSON.stringify(partida));
        io.to(idPartida).emit("actualizarEstado", partida); // !!!
      }
    });*/

// Terminar la partida
/*socket.on("terminarPartida", async ({ idPartida, resultado, resultadosJugadores }) => {
      let partida = JSON.parse(await redisClient.get(`partida_${idPartida}`));
      if (partida) {
        // Guardar resultados en PostgreSQL
        await finalizarPartida(idPartida, 'terminada', resultado); // !!!

        // Actualizar la tabla Juega para cada jugador
        //'resultadosJugadores' será un array de objetos del tipo:
        // [{ idUsuario: 1, resultado: 'ganada' }, { idUsuario: 2, resultado: 'perdida' }, ...]
        const JuegaDAO = require("../dao/JuegaDao");
        for (const jugador of resultadosJugadores) {
          await JuegaDAO.actualizarResultado(jugador.idUsuario, idPartida, jugador.resultado);
        }

        // Eliminar de Redis para liberar memoria
        await redisClient.del(`partida_${idPartida}`);
        io.to(idPartida).emit("partidaTerminada", resultado);
      }
    });*/
