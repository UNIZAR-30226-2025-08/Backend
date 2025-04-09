const { getSalas, salas, guardarSalasEnRedis } = require("./salaWS");
const Partida = require("../partida"); // Importar la clase Partida
const redisClient = require("../config/redis"); // Importar el cliente de Redis
const PartidaDAO = require("../dao/partidaDao"); // Importar el DAO de Partida
const JuegaDAO = require("../dao/juegaDao"); // Importar el DAO de juega

let partidas = {}; // Almacenamiento en memoria de las partidas

/**
 * Convierte de forma segura un objeto a una cadena JSON, omitiendo funciones y referencias circulares.
 *
 * @description Esta función es una herramienta auxiliar para evitar que el backend implosione por dependencias circulares,
 *            especialmente al guardar temporizadores (timers) y otros objetos que puedan causar referencias circulares.
 *
 * @param {any} obj - El objeto que se desea convertir a cadena JSON.
 * @returns {string} La representación en formato JSON del objeto, sin funciones ni referencias circulares.
 */
function safeStringify(obj) {
  const vistos = new WeakSet();
  return JSON.stringify(obj, (clave, valor) => {
    // Omitir funciones
    if (typeof valor === "function") {
      return undefined;
    }
    // Omitir objetos que sean temporizadores o tengan referencias circulares
    if (typeof valor === "object" && valor !== null) {
      // Si es un temporizador (timer) u objeto similar, se verifica el nombre del constructor
      if (valor.constructor && valor.constructor.name === "Timeout") {
        return undefined;
      }
      // Omitir si ya se ha visto este objeto
      if (vistos.has(valor)) {
        return undefined;
      }
      vistos.add(valor);
    }
    return valor;
  });
}

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

// Función para guardar las partidas en Redis usando safeStringify
async function guardarPartidasEnRedis() {
  try {
    await redisClient.set("partidas", safeStringify(partidas));
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
  socket.onAny((event, ...args) => {
    console.log(`[Backend] Received event: ${event}`, args);
  });
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
      const sala = getSalas()[idSala];

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
      const nuevaPartida = new Partida(
        partida.idPartida,
        sala.jugadores,
        idSala
      ); // Crear un objeto Partida con los jugadores

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

      await manejarFasesPartida(nuevaPartida, idSala, io);
    } catch (error) {
      console.error("Error en iniciarPartida:", error);
      socket.emit("error", "Error interno del servidor");
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
    idSala = partida.idSala;
    if (!partida) return;

    if (partida.turno === "dia") {
      partida.vota(idJugador, idObjetivo);
    } else {
      partida.votaNoche(idJugador, idObjetivo);
    }
    io.to(idSala).emit("votoRegistrado", { estado: partida });

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
    const partida = obtenerPartida(socket, idPartida);
    if (!partida) return;

    idSala = partida.idSala;

    console.log(
      `[Backend] Recibido votarAlguacil de idJugador: ${idJugador} para idObjetivo: ${idObjetivo}`
    );

    if (partida.votacionAlguacilActiva === true) {
      partida.votaAlguacil(idJugador, idObjetivo);
      console.log(
        `[Backend] votosAlguacil actuales: ${JSON.stringify(
          partida.votosAlguacil
        )}`
      );

      const estadoSanitizado = {
        turno: partida.turno,
        votacionAlguacilActiva: partida.votacionAlguacilActiva,
        votosAlguacil: partida.votosAlguacil,
        jugadores: partida.jugadores.map((j) => ({
          id: j.id,
          nombre: j.nombre,
          avatar: j.avatar,
          rol: j.rol,
          estaVivo: j.estaVivo,
          esAlguacil: j.esAlguacil,
        })),
      };
      io.to(idSala).emit("votoAlguacilRegistrado", {
        estado: estadoSanitizado,
      });
      // Guardar cambios en Redis después de registrar un voto para elegir alguacil
      await guardarPartidasEnRedis();
    } else {
      console.log(
        "[Backend] votacionAlguacilActiva es false, no se registra el voto."
      );
    }
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
  socket.on(
    "enviarMensaje",
    async ({ idPartida, idJugador, nombreJugador, mensaje }) => {
      const partida = obtenerPartida(socket, idPartida);
      if (!partida) return;

      idSala = partida.idSala;

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
        console.log(`Mensaje enviado al resto ${mensaje}`);
        console.log(`Mensaje enviado al resto ${nombreJugador}`);
        // Enviar mensaje público
        partida.agregarMensajeChatDia(idJugador, mensaje);
        io.to(idSala).emit("mensajeChat", {
          mensaje: mensaje,
          nombre: nombreJugador,
        });
        // Guardar cambios en Redis después de enviar un mensaje público en el chat
        await guardarPartidasEnRedis();
      }
    }
  );

  /**
   * Revela el rol de un jugador en la partida.
   * @event videnteRevela
   *
   * @param {Object} datos - Datos del mensaje.
   * @param {string} datos.idPartida - ID de la partida en curso.
   * @param {number} datos.idJugador - ID del jugador (supuesto vidente) que quiere revelar el rol de otro jugador.
   * @param {number} datos.idObjetivo - ID del jugador objetivo elegido por el supuesto vidente.
   *
   * @emits error - Si la partida no se encuentra.
   * @param {string} mensaje - Mensaje con el resultado de la revelación.
   * @param {string} rol - Rol del jugador objetivo.
   */
  socket.on(
    "videnteRevela",
    async ({ idPartida, idJugador, idObjetivo }, callback) => {
      try {
        const partida = obtenerPartida(socket, idPartida);
        if (!partida) {
          return callback({ mensaje: "Partida no encontrada", rol: null });
        }

        idSala = partida.idSala;

        const resultado = partida.videnteRevela(idJugador, idObjetivo);
        callback({ mensaje: resultado.mensaje, rol: resultado.rol });

        // Guardar cambios en Redis después de revelar el rol
        await guardarPartidasEnRedis();
      } catch (error) {
        console.error("Error en videnteRevela:", error);
        callback({ mensaje: "Error al revelar el rol", rol: null });
      }
    }
  );

  /*  NECESITAMOS ESTA FUNCIÓN???? !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  socket.on("obtenerJugadoresEnColaEliminacion", ({ idPartida }, callback) => {
    const partida = obtenerPartida(socket, partidas, idPartida);
    if (!partida) return;

    const jugadoresEnCola = partida.obtenerJugadoresEnColaEliminacion();
    callback({ jugadoresEnCola });
  });
  */

  /**
   * Permite a la bruja ver la victima elegida por los lobos.
   *
   * @event verVictimaElegidaLobos
   *
   * @param {Object} datos - Datos de la acción.
   * @param {string} datos.idPartida - ID de la partida en curso.
   * @param {number} datos.idJugador - ID del jugador bruja.
   *
   * @emits error - Si la partida no se encuentra.
   *
   * @emits verVictimaElegidaLobos - Si la victima elegida por los lobos se ve correctamente.
   * @param {Object} resultado - Resultado de la acción.
   * @param {string} resultado.mensaje - Mensaje con el nombre de la victima elegida por los lobos.
   * @param {string} resultado.victima - ID de la victima elegida por los lobos.
   */
  socket.on("verVictimaElegidaLobos", ({ idPartida, idJugador }, callback) => {
    const partida = obtenerPartida(socket, idPartida);
    if (!partida) return;

    idSala = partida.idSala;

    const resultado = partida.verVictimaElegidaLobos(idJugador);
    callback(resultado);
  });

  /**
   * Permite a la bruja usar una de sus pociones.
   * Puede curar a un jugador o eliminar a otro que esté en la cola de eliminaciones.
   *
   * @event usaPocionBruja
   *
   * @param {Object} datos - Datos de la acción.
   * @param {string} datos.idPartida - ID de la partida en curso.
   * @param {number} datos.idJugador - ID del jugador que usa la poción.
   * @param {string} datos.tipo - Tipo de poción ('curar' o 'eliminar').
   * @param {number} datos.idObjetivo - ID del jugador objetivo de la poción.
   *
   * @emits error - Si la partida no se encuentra.
   * @emits usaPocionBruja - Si la poción se usa correctamente.
   * @param {Object} partida - Estado actualizado de la partida.
   * @param {string} partida.mensaje - Mensaje con el resultado de la acción.
   * @param {string} partida.tipo - Tipo de poción ('curar' o 'eliminar').
   * @param {number} partida.idObjetivo - ID del jugador objetivo de la poción.
   */
  socket.on(
    "usaPocionBruja",
    ({ idPartida, idJugador, tipo, idObjetivo }, callback) => {
      const partida = obtenerPartida(socket, idPartida);
      if (!partida) return;

      idSala = partida.idSala;

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

      idSala = partida.idSala;

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

      idSala = partida.idSala;

      const resultado = partida.elegirSucesor(idJugador, idObjetivo);
      callback({ mensaje: resultado });

      // Guardar cambios en Redis después de elegir sucesor
      guardarPartidasEnRedis();
    }
  );

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

    idSala = partida.idSala;

    const jugador = partida.jugadores.find((j) => j.socketId === socket.id);
    if (jugador) {
      // Eliminar al jugador de la partida
      partida.jugadores = partida.jugadores.filter(
        (j) => j.socketId !== socket.id
      );
      io.to(idSala).emit("actualizarPartida", partida);
      console.log(`Jugador ${jugador.id} desconectado de la partida ${idSala}`);

      // Notificar a todos los jugadores de la partida que un jugador ha salido
      io.to(idSala).emit("jugadorSalido", {
        nombre: jugador.nombre,
        id: jugador.id,
      });
      break;
    }
  }
};

// Cargar partidas al iniciar el servidor
cargarPartidasDesdeRedis();

const manejarFasesPartida = async (partida, idSala, io) => {
  // Definición de funciones auxiliares

  // Función auxiliar para verificar el fin de la partida
  const verificarFinPartida = (resultado) => {
    // La partida ha terminado, notificar el resultado
    if (resultado.ganador) {
      io.to(idSala).emit("partidaFinalizada", {
        mensaje: resultado.mensaje,
        ganador: resultado.ganador,
      });
      eliminarPartidaDeRedis(partida.idPartida); // Eliminar de Redis
      partidas[partida.idPartida] = null; // Liberar la referencia en el almacenamiento en memoria
      //delete partida; // Eliminar de la memoria !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      return true;
    }
    return false;
  };

  // Fase de votación del alguacil
  const manejarVotacionAlguacil = async () => {
    // Fase 2: Iniciar votaciones para elegir alguacil
    io.to(idSala).emit("iniciarVotacionAlguacil", {
      mensaje: "Inician las votaciones para elegir al alguacil.",
    });
    partida.iniciarVotacionAlguacil();

    // Esperar a que termine la votación (por tiempo o por votos completos)
    const checkVotacionAlguacil = setInterval(async () => {
      if (
        partida.verificarVotos("alguacil") ||
        !partida.votacionAlguacilActiva
      ) {
        clearInterval(checkVotacionAlguacil);
        const resultadoAlguacil = partida.elegirAlguacil();

        if (resultadoAlguacil.mensaje.includes("Empate")) {
          // Notificar del primer empate y reiniciar la votación
          io.to(idSala).emit("empateVotacionAlguacil", {
            mensaje: resultadoAlguacil.mensaje,
          });
          partida.iniciarVotacionAlguacil(); // Reiniciar votación

          // Segunda votación
          const checkSegundaVotacionAlguacil = setInterval(async () => {
            if (
              partida.verificarVotos("alguacil") ||
              !partida.votacionAlguacilActiva
            ) {
              clearInterval(checkSegundaVotacionAlguacil);
              const resultadoAlguacil2 = partida.elegirAlguacil();
              if (resultadoAlguacil2.mensaje.includes("Segundo")) {
                // Notificar del segundo empate. No se elige a ningún jugador como alguacil.
                io.to(idSala).emit("segundoEmpateVotacionAlguacil", {
                  mensaje: resultadoAlguacil2.mensaje,
                });
              } else {
                // Notificar quien es el alguacil elegido
                io.to(idSala).emit("alguacilElegido", {
                  mensaje: resultadoAlguacil2.mensaje,
                  alguacil: resultadoAlguacil2.alguacil,
                });
              }
              await iniciarCicloPartida();
            }
          }, 1000);
        } else {
          // Notificar quien es el alguacil elegido
          io.to(idSala).emit("alguacilElegido", {
            mensaje: resultadoAlguacil.mensaje,
            alguacil: resultadoAlguacil.alguacil,
          });
          await iniciarCicloPartida();
        }
      }
    }, 1000); // Verificar cada segundo
  };

  // Ciclo principal de la partida. Alterna los turnos de noche y día hasta que haya un ganador
  const iniciarCicloPartida = async () => {
    // Fase 3: Noche
    io.to(idSala).emit("nocheComienza", { mensaje: "La noche ha comenzado." });

    // Sub-fase 1: Habilidad de la vidente
    io.to(idSala).emit("habilidadVidente", {
      mensaje: "La vidente tiene 15 segundos para usar su habilidad.",
    });
    partida.iniciarHabilidadVidente();

    const checkVidente = setInterval(() => {
      const todosVidentesUsaron = partida.jugadores
        .filter((j) => j.rol === "Vidente" && j.estaVivo)
        .every((j) => j.haVisto);

      if (todosVidentesUsaron || !partida.temporizadorHabilidad) {
        clearInterval(checkVidente);
        manejarFaseHombresLobos();
      }
    }, 1000);

    // Sub-fase 2: Hombres lobos
    const manejarFaseHombresLobos = () => {
      io.to(idSala).emit("turnoHombresLobos", {
        mensaje:
          "Los hombres lobos tienen 30 segundos para elegir una víctima.",
      });
      partida.iniciarVotacionLobos();

      const checkVotosLobos = setInterval(async () => {
        if (partida.verificarVotos("noche") || !partida.votacionLobosActiva) {
          clearInterval(checkVotosLobos);

          // Indicar a los hombres lobos el resultado de la votación nocturna
          const resultadoVotosNoche = partida.resolverVotosNoche();
          await guardarPartidasEnRedis();
          const preparacionResultado = partida.prepararResultadoVotacionNoche(
            resultadoVotosNoche.mensaje
          );
          preparacionResultado.forEach(({ socketId, mensaje }) => {
            io.to(socketId).emit("resultadoVotosNoche", { mensaje });
          });

          // Comunicar a las brujas la víctima elegida por los hombres lobos (si existe)
          if (resultadoVotosNoche.victima) {
            const preparacionMensajeBruja = partida.prepararMensajeBruja(
              resultadoVotosNoche.mensaje
            );
            preparacionMensajeBruja.forEach(
              ({ socketId, mensaje, victima }) => {
                io.to(socketId).emit("mensajeBruja", { mensaje, victima });
              }
            );
          }
          manejarFaseBruja();
        }
      }, 1000);
    };

    // Sub-fase 3: Habilidad de la bruja
    const manejarFaseBruja = () => {
      io.to(idSala).emit("habilidadBruja", {
        mensaje: "La bruja tiene 30 segundos para usar su poción.",
      });
      partida.iniciarHabilidadBruja();

      const checkBruja = setInterval(async () => {
        const todasBrujasUsaron = partida.jugadores
          .filter((j) => j.rol === "Bruja" && j.estaVivo)
          .every((j) => j.pocionCuraUsada && j.pocionMuerteUsada);

        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! DE MOMENTO SOLO PASAMOS DE FASE SI
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! LAS BRUJAS HAN USADOS LAS DOS POCIONES O EL TIEMPO LIMITE HA EXPIRADO
        if (todasBrujasUsaron || !partida.temporizadorHabilidad) {
          clearInterval(checkBruja);
          const resultadoTurno2 = partida.gestionarTurno();

          const finPartida2 = verificarFinPartida(resultadoTurno2);
          await guardarPartidasEnRedis();
          if (partida.estado === "en_curso" && !finPartida2) {
            await manejarFaseDia(); // Pasar a la fase de día
          }
        }
      }, 1000);
    };

    // Fase 4: Día
    const manejarFaseDia = () => {
      io.to(idSala).emit("diaComienza", {
        mensaje:
          "Es de día, los jugadores tienen 1 minuto para decidir quién será eliminado.",
      });
      partida.iniciarVotacion();

      const checkVotosDia = setInterval(async () => {
        if (partida.verificarVotos("dia") || !partida.votacionActiva) {
          clearInterval(checkVotosDia);
          // Resolver votos del día
          const resultadoVotosDia = partida.resolverVotosDia();
          await guardarPartidasEnRedis(); // Guardar cambios en Redis después de resolver los votos del día
          if (resultadoVotosDia.mensaje.includes("Empate")) {
            // Notificar del primer empate y reiniciar la votación
            io.to(idSala).emit("empateVotacionDia", {
              mensaje: resultadoVotosDia.mensaje,
            });
            partida.iniciarVotacion(); // Reiniciar votación

            // Segunda votación
            const checkSegundaVotacion = setInterval(async () => {
              if (partida.verificarVotos("dia") || !partida.votacionActiva) {
                clearInterval(checkSegundaVotacion);
                const resultadoVotosDia2 = partida.resolverVotosDia();
                await guardarPartidasEnRedis(); // Guardar cambios en Redis después de resolver los votos del día

                if (resultadoVotosDia2.mensaje.includes("Segundo")) {
                  // Notificar del segundo empate. No se elige a ningún jugador para ser eliminado.
                  io.to(idSala).emit("segundoEmpateVotacionDia", {
                    mensaje: resultadoVotosDia2.mensaje,
                  });
                } else {
                  // Notificar quien es el jugador a eliminar
                  io.to(idSala).emit("resultadoVotosDia", {
                    mensaje: resultadoVotosDia2.mensaje,
                    jugadorAEliminar: resultadoVotosDia2.jugadorAEliminar,
                  });
                }

                const resultadoTurno = partida.gestionarTurno();
                // Al llamar a gestionarTurno, la variable de los jugadores videntes 'haVisto'
                // se pone a false si se ha cambiado de turno a noche
                const finPartida = verificarFinPartida(resultadoTurno);
                await guardarPartidasEnRedis();
                if (partida.estado === "en_curso" && !finPartida) {
                  // Volver a la fase de noche
                  await iniciarCicloPartida();
                }
              }
            }, 1000);
          } else {
            // Notificar quien es el jugador a eliminar
            io.to(idSala).emit("resultadoVotosDia", {
              mensaje: resultadoVotosDia.mensaje,
              jugadorAEliminar: resultadoVotosDia.jugadorAEliminar,
            });

            const resultadoTurno2 = partida.gestionarTurno();
            // Al llamar a gestionarTurno, la variable de los jugadores videntes 'haVisto'
            // se pone a false si se ha cambiado de turno a noche
            const finPartida2 = verificarFinPartida(resultadoTurno2);
            await guardarPartidasEnRedis();
            if (partida.estado === "en_curso" && !finPartida2) {
              // Volver a la fase de noche
              await iniciarCicloPartida();
            }
          }
        }
      }, 1000);
    };
  };

  // Fase 1: Esperar 30 segundos antes de iniciar las votaciones de alguacil
  io.to(idSala).emit("esperaInicial", {
    mensaje: "La partida comenzará en 30 segundos",
  });
  await new Promise((resolve) => setTimeout(resolve, 30000)); // 30 segundos de espera inicial

  // Comenzar la secuencia de la partida
  await manejarVotacionAlguacil();
};

module.exports = { manejarConexionPartidas, manejarDesconexionPartidas };
