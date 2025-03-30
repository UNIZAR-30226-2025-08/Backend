const { crearPartida, finalizarPartida } = require("../dao/partidaDao");
const { salas } = require("./salasws");
const Partida = require("./Partida"); // Importar la clase Partida
const redisClient = require("../config/redis"); // Importar el cliente de Redis

let partidas = {}; // Almacenamiento en memoria de las partidas

// Función para cargar partidas desde Redis al iniciar
async function cargarPartidasDesdeRedis() {
  try {
    const partidasRedis = await redisClient.get("partidas");
    if (partidasRedis) {
      partidas = JSON.parse(partidasRedis);
      console.log("Partidas cargadas desde Redis");
    }
  } catch (error) {
    console.error("Error al cargar partidas desde Redis:", error);
  }
}

// Función para guardar las partidas en Redis
async function guardarPartidasEnRedis() {
  try {
    await redisClient.set("partidas", JSON.stringify(partidas));
  } catch (error) {
    console.error("Error al guardar partidas en Redis:", error);
  }
}

// Función para eliminar una partida de Redis
async function eliminarPartidaDeRedis(idPartida) {
  try {
    const partidasRedis = await redisClient.get("partidas");
    if (partidasRedis) {
      const partidasActuales = JSON.parse(partidasRedis);
      delete partidasActuales[idPartida];
      await redisClient.set("partidas", JSON.stringify(partidasActuales));
      console.log(`Partida ${idPartida} eliminada de Redis`);
    }
  } catch (error) {
    console.error("Error al eliminar partida de Redis:", error);
  }
}

/**
 * @file partidaWS.js
 * @description Websockets para la gestion de partidas.
 * @module API_WB_Partidas
 */

// Función auxiliar para obtener la partida
function obtenerPartida(socket, idPartida) {
  const partida = partidas[idPartida];
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
  /*socket.on("iniciarPartida", ({ idSala }) => {
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
    socket.emit("partidaIniciada", partidas[idPartida]); // Confirmar al creador
    io.to(idSala).emit("partidaIniciada", {
      idPartida,
      estado: partidas[idPartida],
    });
  });*/

  /**
   * Cambia el turno de la partida y aplica las eliminaciones pendientes.
   * @event gestionarTurno
   *
   * @param {Object} datos - Datos de la partida.
   * @param {string} datos.idPartida - ID de la partida en curso.
   *
   * @emits error - Si la partida no se encuentra.
   * @emits turnoCambiado - Si el turno se cambia correctamente.
   * @emits partidaFinalizada - Si la partida ha terminado.
   * @param {Object} estado - Estado actualizado de la partida.
   * @param {string} mensaje - Mensaje de confirmación del cambio de turno o resultado de la partida.
   */
  socket.on("gestionarTurno", async ({ idPartida }) => {
    const partida = obtenerPartida(socket, idPartida);
    if (!partida) return;

    const resultado = partida.gestionarTurno(); // Cambiar turno y aplicar eliminaciones
    if (resultado === "El turno ha cambiado.") {
      // La partida sigue en curso, notificar el cambio de turno
      io.to(idPartida).emit("turnoCambiado", {
        estado: partida,
        mensaje: resultado,
      });
      // Guardar cambios en Redis después de gestionar el turno
      await guardarPartidasEnRedis();
    } else {
      // La partida ha terminado, notificar el resultado
      io.to(idPartida).emit("partidaFinalizada", {
        mensaje: resultado.mensaje,
        ganador: resultado.ganador,
      });
      await eliminarPartidaDeRedis(idPartida); // Eliminar de Redis
      delete partidas[idPartida]; // Eliminar de la memoria
    }
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
  socket.on("votar", async ({ idPartida, idJugador, idObjetivo }) => {
    const partida = obtenerPartida(socket, idPartida);
    if (!partida) return;

    if (partida.turno === "dia") {
      partida.vota(idJugador, idObjetivo);
    } else {
      partida.votaNoche(idJugador, idObjetivo);
    }
    io.to(idPartida).emit("votoRegistrado", { estado: partida });

    // Guardar cambios en Redis después de registrar un voto
    await guardarPartidasEnRedis();
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
  socket.on("votarAlguacil", async ({ idPartida, idJugador, idObjetivo }) => {
    const partida = obtenerPartida(socket, partidas, idPartida);
    if (!partida) return;

    partida.votaAlguacil(idJugador, idObjetivo);
    io.to(idPartida).emit("votoAlguacilRegistrado", { estado: partida });

    // Guardar cambios en Redis después de registrar un voto para elegir alguacil
    await guardarPartidasEnRedis();
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
  socket.on("elegirAlguacil", async ({ idPartida }) => {
    const partida = obtenerPartida(socket, idPartida);
    if (!partida) return;

    const mensaje = partida.elegirAlguacil();
    io.to(idPartida).emit("alguacilElegido", { estado: partida, mensaje });

    // Guardar cambios en Redis después de elegir alguacil
    await guardarPartidasEnRedis();
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
   * @emits mensajePrivado - Si el mensaje es privado entre hombres lobos.
   * @param {Object} partida - Chat actualizado de la partida.
   * @param {string} partida.chat - Chat de la partida
   */
  socket.on("enviarMensaje", async ({ idPartida, idJugador, mensaje }) => {
    const partida = obtenerPartida(socket, idPartida);
    if (!partida) return;

    if (partida.turno === "noche") {
      // Enviar mensaje privado entre hombres lobos
      const preparacionMensajes = partida.prepararMensajesChatNoche(
        idJugador,
        mensaje,
      );
      preparacionMensajes.forEach(
        ({ socketId, nombre, mensaje, timestamp }) => {
          socket
            .to(socketId)
            .emit("mensajePrivado", { nombre, mensaje, timestamp });
        },
      );
    } else {
      // Enviar mensaje público
      partida.agregarMensajeChatDia(idJugador, mensaje);
      io.to(idPartida).emit("mensajeChat", { chat: partida.chat });
      // Guardar cambios en Redis después de enviar un mensaje público en el chat
      await guardarPartidasEnRedis();
    }
  });

  /**
   * Revela el rol de un jugador en la partida.
   * @event videnteRevela
   *
   * @param {Object} datos - Datos del mensaje.
   * @param {string} datos.idPartida - ID de la partida en curso.
   * @param {number} datos.idJugador - ID del jugador que quiere revelar el rol.
   * @param {number} datos.idObjetivo - ID del jugador objetivo del vidente.
   *
   * @emits error - Si la partida no se encuentra.
   * @param {string} mensaje - Mensaje con el resultado de la revelación.
   */
  socket.on(
    "videnteRevela",
    async ({ idPartida, idJugador, idObjetivo }, callback) => {
      const partida = obtenerPartida(socket, idPartida);
      if (!partida) return;

      const resultado = partida.videnteRevela(idJugador, idObjetivo);
      callback({ mensaje: resultado });

      // Guardar cambios en Redis después de revelar el rol
      await guardarPartidasEnRedis();
    },
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
      const partida = obtenerPartida(socket, idPartida);
      if (!partida) return;

      const resultado = partida.usaPocionBruja(idJugador, tipo, idObjetivo);
      callback(resultado);

      // Guardar cambios en Redis después de usar la poción de bruja
      guardarPartidasEnRedis();
    },
  );

  socket.on(
    "cazadorDispara",
    ({ idPartida, idJugador, idObjetivo }, callback) => {
      const partida = obtenerPartida(socket, idPartida);
      if (!partida) return;

      const resultado = partida.cazadorDispara(idJugador, idObjetivo);
      callback({ mensaje: resultado });

      // Guardar cambios en Redis después de usar la poción de bruja
      guardarPartidasEnRedis();
    },
  );

  socket.on(
    "elegirSucesor",
    ({ idPartida, idJugador, idObjetivo }, callback) => {
      const partida = obtenerPartida(socket, idPartida);
      if (!partida) return;

      const resultado = partida.elegirSucesor(idJugador, idObjetivo);
      callback({ mensaje: resultado });

      // Guardar cambios en Redis después de elegir sucesor
      guardarPartidasEnRedis();
    },
  );

  socket.on("resolverVotosDia", ({ idPartida }, callback) => {
    const partida = obtenerPartida(socket, idPartida);
    if (!partida) return;

    const resultado = partida.resolverVotosDia();
    callback({ mensaje: resultado });

    // Guardar cambios en Redis después de resolver los votos del día
    guardarPartidasEnRedis();
  });

  socket.on("resolverVotosNoche", ({ idPartida }, callback) => {
    const partida = obtenerPartida(socket, idPartida);
    if (!partida) return;

    const resultado = partida.resolverVotosNoche();
    callback({ mensaje: resultado });

    // Guardar cambios en Redis después de resolver los votos de la noche
    guardarPartidasEnRedis();
  });

  socket.on("aplicarEliminaciones", ({ idPartida }, callback) => {
    const partida = obtenerPartida(socket, idPartida);
    if (!partida) return;

    const resultado = partida.aplicarEliminaciones();
    callback({ mensaje: resultado });
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
        (j) => j.socketId !== socket.id,
      );
      io.to(idPartida).emit("actualizarPartida", partida);
      console.log(
        `Jugador ${jugador.id} desconectado de la partida ${idPartida}`,
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

// Cargar partidas al iniciar el servidor
cargarPartidasDesdeRedis();

module.exports = { manejarConexionPartidas, manejarDesconexionPartidas };
