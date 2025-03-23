const { crearPartida, finalizarPartida } = require("../dao/partidaDao");
const { salas } = require("./salasws");
const Partida = require("./Partida"); // Importar la clase Partida !!!
//const { obtenerJugadoresPartida, asignarRoles } = require("./gameLogic"); // !!!

let partidas = {}; // Almacenamiento en memoria de las partidas

/**
 * @file partidaWS.js
 * @description Websockets para la gestion de partidas.
 * @module API_WB_Partidas
 */

// Función auxiliar para obtener la partida
function obtenerPartida(socket, partidas, idPartida) {
  const partida = partidas.get(idPartida);
  if (!partida) {
    socket.emit("error", `No se encontró la partida con ID ${idPartida}`);
    return null;
  }
  return partida;
}

//!!!!!!!!!!!!!!!!!!!!!!!!!!!
// VERSION INCOMPLETA DE COMENTARIOS Y WS
//!!!!!!!!!!!!!!!!!!!!!!!!!!!

// manejarConexionPartidas
const manejarConexionPartidas = (socket, io) => {
  /**
   * Inicia una partida en la sala especificada.
   * @event iniciarPartida
   *
   * @param {Object} datos - Datos de la partida a iniciar.
   * @param {string} datos.idSala - ID de la sala donde se iniciará la partida.
   *
   * @emits error - Si la partida no se encuentra o no hay suficientes jugadores.
   * @emits partidaIniciada - Si la partida se inicia correctamente.
   * @param {string} idPartida - ID único de la partida.
   * @param {Object} estado - Estado inicial de la partida.
   */
  socket.on("iniciarPartida", ({ idSala }) => {
    const partida = obtenerPartida(socket, partidas, idPartida);
    if (!partida) return;

    if (sala.jugadores.length < 4) {
      // Suponiendo un mínimo de 4 jugadores para iniciar
      socket.emit(
        "error",
        "No hay suficientes jugadores para iniciar la partida"
      );
      return;
    }

    const idPartida = `partida_${idSala}`;
    partidas[idPartida] = new Partida(idPartida, sala.jugadores);
    io.to(idSala).emit("partidaIniciada", {
      idPartida,
      estado: partidas[idPartida],
    });
  });

  /**
   * Cambia el turno de la partida.
   * @event cambiarTurno
   *
   * @param {Object} datos - Datos de la partida.
   * @param {string} datos.idPartida - ID de la partida en curso.
   *
   * @emits error - Si la partida no se encuentra.
   * @emits turnoCambiado - Si el turno se cambia correctamente.
   * @param {Object} estado - Estado actualizado de la partida.
   * @param {string} mensaje - Mensaje de confirmación del cambio de turno.
   */
  socket.on("cambiarTurno", ({ idPartida }) => {
    const partida = obtenerPartida(socket, partidas, idPartida);
    if (!partida) return;

    const resultado = partida.gestionarTurno();
    io.to(idPartida).emit("turnoCambiado", {
      estado: partida,
      mensaje: resultado,
    });
  });

  /**
   * Registra un voto en la partida.
   * @event votar
   *
   * @param {Object} datos - Datos del voto.
   * @param {string} datos.idPartida - ID de la partida en curso.
   * @param {number} datos.idJugador - ID del jugador que vota.
   * @param {number} datos.idObjetivo - ID del jugador objetivo del voto.
   *
   * @emits error - Si la partida no se encuentra.
   * @emits votoRegistrado - Si el voto se registra correctamente.
   * @param {Object} partida - Estado actualizado de la partida.
   */
  socket.on("votar", ({ idPartida, idJugador, idObjetivo }) => {
    const partida = obtenerPartida(socket, partidas, idPartida);
    if (!partida) return;

    if (partida.turno === "dia") {
      partida.vota(idJugador, idObjetivo);
    } else {
      partida.votaNoche(idJugador, idObjetivo);
    }
    io.to(idPartida).emit("votoRegistrado", { estado: partida });
  });

  /**
   * Registra un voto para elegir alguacil.
   * @event votarAlguacil
   *
   * @param {Object} datos - Datos del voto.
   * @param {string} datos.idPartida - ID de la partida en curso.
   * @param {number} datos.idJugador - ID del jugador que vota.
   * @param {number} datos.idObjetivo - ID del jugador objetivo del voto.
   *
   * @emits error - Si la partida no se encuentra.
   * @emits votoAlguacilRegistrado - Si el voto se registra correctamente.
   * @param {Object} partida - Estado actualizado de la partida.
   */
  socket.on("votarAlguacil", ({ idPartida, idJugador, idObjetivo }) => {
    const partida = obtenerPartida(socket, partidas, idPartida);
    if (!partida) return;

    partida.votaAlguacil(idJugador, idObjetivo);
    io.to(idPartida).emit("votoAlguacilRegistrado", { estado: partida });
  });

  /// !!!! ESTO DESDE DONDE SE LLAMARÍA????? !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  /**
   * Elige al alguacil de la partida.
   * @event elegirAlguacil
   *
   * @param {Object} datos - Datos de la partida.
   * @param {string} datos.idPartida - ID de la partida en curso.
   *
   * @emits error - Si la partida no se encuentra.
   * @emits alguacilElegido - Si el alguacil es elegido correctamente.
   * @param {string} mensaje - Mensaje con el resultado de la elección.
   */
  socket.on("elegirAlguacil", ({ idPartida }) => {
    const partida = obtenerPartida(socket, partidas, idPartida);
    if (!partida) return;

    const mensaje = partida.elegirAlguacil();
    io.to(idPartida).emit("alguacilElegido", { estado: partida, mensaje });
  });

  /**
   * Envía un mensaje en el chat de la partida.
   * @event enviarMensaje
   *
   * @param {Object} datos - Datos del mensaje.
   * @param {string} datos.idPartida - ID de la partida en curso.
   * @param {number} datos.idJugador - ID del jugador que envía el mensaje.
   * @param {string} datos.mensaje - Contenido del mensaje.
   *
   * @emits error - Si la partida no se encuentra.
   * @emits mensajeChat - Si el mensaje se envía correctamente.
   * @param {Object} partida - Chat actualizado de la partida.
   * @param {string} partida.chat - Chat de la partida
   */
  socket.on("enviarMensaje", ({ idPartida, idJugador, mensaje }) => {
    const partida = obtenerPartida(socket, partidas, idPartida);
    if (!partida) return;

    partida.agregarMensajeChat(idJugador, mensaje);
    io.to(idPartida).emit("mensajeChat", { chat: partida.chat });
  });

  socket.on(
    "videnteRevela",
    ({ idPartida, idJugador, idObjetivo }, callback) => {
      const partida = obtenerPartida(socket, partidas, idPartida);
      if (!partida) return;

      const resultado = partida.videnteRevela(idJugador, idObjetivo);
      callback({ mensaje: resultado });
    }
  );

  /*  NECESITAMOS ESTA FUNCIÓN????
  socket.on("obtenerJugadoresEnColaEliminacion", ({ idPartida }, callback) => {
    const partida = obtenerPartida(socket, partidas, idPartida);
    if (!partida) return;

    const jugadoresEnCola = partida.obtenerJugadoresEnColaEliminacion();
    callback({ jugadoresEnCola });
  });
  */

  socket.on(
    "usaPocionBruja",
    ({ idPartida, idJugador, tipo, idObjetivo }, callback) => {
      const partida = obtenerPartida(socket, partidas, idPartida);
      if (!partida) return;

      const resultado = partida.usaPocionBruja(idJugador, tipo, idObjetivo);
      callback(resultado);
    }
  );

  socket.on(
    "cazadorDispara",
    ({ idPartida, idJugador, idObjetivo }, callback) => {
      const partida = obtenerPartida(socket, partidas, idPartida);
      if (!partida) return;

      const resultado = partida.cazadorDispara(idJugador, idObjetivo);
      callback({ mensaje: resultado });
    }
  );

  socket.on(
    "elegirSucesor",
    ({ idPartida, idJugador, idObjetivo }, callback) => {
      const partida = obtenerPartida(socket, partidas, idPartida);
      if (!partida) return;

      const resultado = partida.elegirSucesor(idJugador, idObjetivo);
      callback({ mensaje: resultado });
    }
  );

  socket.on("resolverVotosDia", ({ idPartida }, callback) => {
    const partida = obtenerPartida(socket, partidas, idPartida);
    if (!partida) return;

    const resultado = partida.resolverVotosDia();
    callback({ mensaje: resultado });
  });

  socket.on("resolverVotosNoche", ({ idPartida }, callback) => {
    const partida = obtenerPartida(socket, partidas, idPartida);
    if (!partida) return;

    const resultado = partida.resolverVotosNoche();
    callback({ mensaje: resultado });
  });

  socket.on("aplicarEliminaciones", ({ idPartida }, callback) => {
    const partida = obtenerPartida(socket, partidas, idPartida);
    if (!partida) return;

    const resultado = partida.aplicarEliminaciones();
    callback({ mensaje: resultado });
  });

  socket.on("disconnect", () => {
    console.log("Un usuario se ha desconectado");
  });

  socket.on("finalizarPartida", ({ idPartida }) => {
    delete partidas[idPartida];
    io.to(idPartida).emit("partidaFinalizada", { idPartida });
  });
};

// Manejar desconexión de jugadores
const manejarDesconexionPartidas = (socket, io) => {
  for (const idPartida in partidas) {
    const partida = partidas[idPartida];
    const jugador = partida.jugadores.find((j) => j.socketId === socket.id);
    if (jugador) {
      // Eliminar al jugador de la partida
      partida.jugadores = partida.jugadores.filter(
        (j) => j.socketId !== socket.id
      );
      io.to(idPartida).emit("actualizarPartida", partida);
      console.log(
        `Jugador ${jugador.id} desconectado de la partida ${idPartida}`
      );

      // Notificar a todos los jugadores de la partida que un jugador ha salido
      io.to(idPartida).emit("jugadorSalido", {
        nombre: jugador.nombre,
        id: jugador.id,
      });
      break;
    }
  }
};

module.exports = { manejarConexionPartidas, manejarDesconexionPartidas };
