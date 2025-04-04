const { salas, guardarSalasEnRedis } = require("./salaWS");
const Partida = require("../partida"); // Importar la clase Partida
const redisClient = require("../config/redis"); // Importar el cliente de Redis
const PartidaDAO = require("../dao/partidaDao"); // Importar el DAO de Partida
const JuegaDAO = require("../dao/juegaDao"); // Importar el DAO de juega

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
   * @param {string} datos.idLider - ID del lider que intenta iniciar la partida.
   *
   * @emits error - Si la sala no se encuentra o el supuesto lider no tiene permisos.
   * @param {string} mensaje - Mensaje de error
   *
   * @emits rolAsignado
   * @param {Object} datos - Información del rol asignado a un jugador.
   * @param {string} datos.rol - Rol asignado al jugador.
   * @param {string} datos.idSala - ID de la sala en la que se asignó el rol.
   *
   * @emits enPartida
   * @param {Object} datos - Notificación de inicio de partida.
   * @param {string} datos.mensaje - Mensaje indicando el inicio de la partida.
   *
   * @param {Object} datos.sala - Estado de la sala sin revelar los roles de los jugadores.
   * @param {Object[]} datos.sala.jugadores - Lista de jugadores en la sala.
   * @param {string} datos.sala.jugadores.id - ID del jugador.
   * @param {string} datos.sala.jugadores.nombre - Nombre del jugador.
   * @param {boolean} datos.sala.jugadores.listo - Indica si el jugador estaba listo antes de iniciar la partida.
   */
  socket.on("iniciarPartida", async ({ idSala, idLider }) => {
    try {
      const sala = salas[idSala];

      if (!sala) {
        console.log(salas);
        socket.emit("error", "No existe la sala");
        console.log("Error: idSala no existe en salas");
        return;
      }

      if (sala.lider !== idLider) {
        socket.emit(
          "error",
          "No tienes permisos para iniciar la partida. Debes de ser lider."
        );
        return;
      }

      if (!sala.maxRoles) {
        console.error("Error: sala.maxRoles no están definidos", sala);
        return;
      }

      // Distribuir los roles aleatoriamente
      const rolesDisponibles = [];
      Object.entries(sala.maxRoles).forEach(([rol, cantidad]) => {
        for (let i = 0; i < cantidad; i++) {
          rolesDisponibles.push(rol);
        }
      });

      // Mezclar los roles aleatoriamente
      const rolesAleatorios = rolesDisponibles.sort(() => Math.random() - 0.5);
      if (sala.jugadores.length > rolesAleatorios.length) {
        socket.emit("error", "Número de roles insuficiente");
        return;
      }

      // Asignar los roles a los jugadores
      sala.jugadores.forEach((jugador, index) => {
        jugador.rol = rolesAleatorios[index];
      });

      // Notificar a cada jugador su rol individualmente
      sala.jugadores.forEach((jugador) => {
        if (!jugador.socketId) {
          console.log(`Error: jugador ${jugador.nombre} no tiene socketId`);
          return;
        } else {
          io.to(jugador.socketId).emit("rolAsignado", {
            rol: jugador.rol,
            idSala: sala.id,
          });
        }
      });

      sala.enPartida = true;
      await guardarSalasEnRedis();

      // Crear la partida usando el DAO de Partida
      const partida = await PartidaDAO.crearPartida(sala.tipo); // Crear la partida en la base de datos PostgreSQL

      // Inicializar el objeto partida
      const nuevaPartida = new Partida(partida.idPartida, sala.jugadores); // Crear un objeto Partida con los jugadores

      // Guardar la nueva partida en memoria
      partidas[partida.idPartida] = nuevaPartida;

      // Asignar usuarios a la partida en la base de datos
      await Promise.all(
        sala.jugadores.map((jugador) => {
          switch (jugador.rol) {
            case "Hombre lobo":
              JuegaDAO.asignarUsuarioAPartida(
                jugador.id,
                partida.idPartida,
                "lobo"
              );
              break;
            case "Aldeano":
              JuegaDAO.asignarUsuarioAPartida(
                jugador.id,
                partida.idPartida,
                "aldeano"
              );
              break;
            case "Vidente":
              JuegaDAO.asignarUsuarioAPartida(
                jugador.id,
                partida.idPartida,
                "vidente"
              );
              break;
            case "Bruja":
              JuegaDAO.asignarUsuarioAPartida(
                jugador.id,
                partida.idPartida,
                "bruja"
              );
              break;
            case "Cazador":
              JuegaDAO.asignarUsuarioAPartida(
                jugador.id,
                partida.idPartida,
                "cazador"
              );
              break;
          }
        })
      );

      await guardarPartidasEnRedis();

      console.log(
        "Jugadores que se envían al frontend:",
        nuevaPartida.jugadores
      );
      // Notificar a todos que la partida ha comenzado
      io.to(idSala).emit("enPartida", {
        mensaje: "¡La partida ha comenzado!",
        partidaID: partida.idPartida,
        sala: {
          ...sala,
          jugadores: nuevaPartida.jugadores.map((j) => ({
            id: j.id,
            nombre: j.nombre,
            avatar: j.avatar,
            rol: j.rol,
            estaVivo: j.estaVivo,
          })), // No enviamos los roles de otros jugadores
        },
      });
    } catch (error) {
      console.error("Error en iniciarPartida:", error);
      socket.emit("error", "Error interno del servidor");
    }
  });

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
        mensaje
      );
      preparacionMensajes.forEach(
        ({ socketId, nombre, mensaje, timestamp }) => {
          socket
            .to(socketId)
            .emit("mensajePrivado", { nombre, mensaje, timestamp });
        }
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
      const partida = obtenerPartida(socket, idPartida);
      if (!partida) return;

      const resultado = partida.usaPocionBruja(idJugador, tipo, idObjetivo);
      callback(resultado);

      // Guardar cambios en Redis después de usar la poción de bruja
      guardarPartidasEnRedis();
    }
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
    }
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
    }
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

  socket.on("obtenerEstadoPartida", ({ idPartida }) => {
    // Obtenemos la partida en memoria
    const partida = partidas[idPartida];
    if (!partida) {
      socket.emit("estadoPartida", {
        error: "No se encontró la partida con ese ID",
        jugadores: [],
      });
      return;
    }

    // Si existe, enviamos el array de jugadores
    socket.emit("estadoPartida", {
      mensaje: "Estado actual de la partida",
      jugadores: partida.jugadores,
    });
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

// Cargar partidas al iniciar el servidor
cargarPartidasDesdeRedis();

module.exports = { manejarConexionPartidas, manejarDesconexionPartidas };
