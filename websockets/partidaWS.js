const { getSalas, salas, guardarSalasEnRedis } = require("./salaWS");
const Partida = require("../partida"); // Importar la clase Partida
const redisClient = require("../config/redis"); // Importar el cliente de Redis
const PartidaDAO = require("../dao/partidaDao"); // Importar el DAO de Partida
const JuegaDAO = require("../dao/juegaDao"); // Importar el DAO de juega

let partidas = {}; // Almacenamiento en memoria de las partidas
const desconexionTimers = new Map();

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
    if (!partidasRedis) return;

    const parsed = JSON.parse(partidasRedis);
    partidas = Object.fromEntries(
      Object.entries(parsed).map(([id, data]) => {
        // Creamos una instancia limpia
        const p = new Partida(data.idPartida, data.jugadores, data.idSala);
        // Le aplicamos el resto de propiedades
        Object.assign(p, data);
        return [id, p];
      })
    );
    console.log("Partidas rehidratadas en memoria");
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

/**
 * Busca si un usuario está en alguna partida y devuelve el ID de la partida si lo encuentra.
 *
 * @param {string|number} idUsuario - El ID del usuario a buscar.
 * @returns {string|null} - El ID de la partida si el usuario está en una partida, o null si no está en ninguna.
 */
function buscarPartidaDeUsuario(idUsuario) {
  const idUsuarioStr = String(idUsuario);

  for (const [idPartida, partida] of Object.entries(partidas)) {
    if (!partida?.jugadores) continue;

    for (const jugador of partida.jugadores) {
      const jugadorIdStr = String(jugador.id);
      console.log(
        `Comparando jugador.id (${jugadorIdStr}, tipo ${typeof jugadorIdStr}) con idUsuario (${idUsuarioStr}, tipo ${typeof idUsuarioStr})`
      );
      if (jugadorIdStr == idUsuarioStr) {
        return idPartida; // Retorna el id de la partida donde encontró al usuario
      }
    }
  }

  return null; // No se encontró ninguna partida con ese usuario
}

// manejarConexionPartidas
const manejarConexionPartidas = (socket, io) => {
  /**
   * Evento para buscar la partida de un usuario
   * @event buscarPartidaUsuario
   *
   * @param {Object} datos - Datos del usuario a buscar.
   * @param {number|string} datos.idUsuario - ID del usuario a buscar.
   *
   * @emits partidaEncontrada
   * @param {Object} datos - Información de la partida encontrada.
   * @param {string} datos.idPartida - ID de la partida donde está el usuario.
   * @param {string} datos.idSala - ID de la sala asociada a la partida.
   * @param {string} datos.rol - Rol del usuario dentro de la partida.
   * @param {string} datos.idUsuario - ID del usuario solicitante.
   * @param {string} datos.nombreUsuario - Nombre del usuario solicitante.
   * @param {Array<Object>} datos.jugadores - Lista de jugadores en la partida (con su id, nombre y avatar).
   * @param {string} datos.jugadores[].id - ID del jugador.
   * @param {string} datos.jugadores[].nombre - Nombre del jugador.
   * @param {string} datos.jugadores[].avatar - Avatar del jugador.
   *
   * @emits partidaNoEncontrada - Si el usuario no se encuentra en ninguna partida.
   *
   */
  socket.on("buscarPartidaUsuario", ({ idUsuario }) => {
    const idPartida = buscarPartidaDeUsuario(idUsuario);

    if (idPartida) {
      const partida = partidas[idPartida];

      const jugador = partida.jugadores.find(
        (j) => String(j.id) == String(idUsuario)
      );
      if (!jugador) {
        socket.emit("partidaNoEncontrada", {});
        return;
      }

      const jugadoresReducidos = partida.jugadores.map((j) => ({
        id: j.id,
        nombre: j.nombre,
        avatar: j.avatar,
      }));

      socket.emit("partidaEncontrada", {
        idPartida,
        idSala: partida.idSala,
        rol: jugador.rol,
        idUsuario: jugador.id,
        nombreUsuario: jugador.nombre,
        jugadores: jugadoresReducidos,
      });
    } else {
      socket.emit("partidaNoEncontrada", {});
    }
  });

  /**
   * Permite a un cliente reconectado pedir el estado completo de la partida
   * @event reconectarPartida
   *
   * @param {Object} datos - Datos de la partida que el jugador desea volver a unirse.
   * @param {string} datos.idPartida - ID de la partida a unirse.
   * @param {string} datos.idUsuario - ID del usuario que desea volver a unirse a la partida.
   *
   * @emits error - Si la partida no se encuentra.
   */
  socket.on("reconectarPartida", ({ idPartida, idUsuario }) => {
    const partida = partidas[idPartida];
    if (!partida) return socket.emit("error", "Partida no encontrada");

    socket.join(partida.idSala);

    // Buscamos al jugador en la partida por su id de usuario
    const jugador = partida.jugadores.find((j) => j.id == idUsuario);
    if (jugador && jugador.desconectado) {
      // Cancelamos la eliminación pendiente, si existe
      if (desconexionTimers.has(jugador.id)) {
        clearTimeout(desconexionTimers.get(jugador.id));
        desconexionTimers.delete(jugador.id);
      }

      // Desmarcamos al jugador como desconectado y actualizamos el socketId del jugador
      jugador.desconectado = false;
      jugador.socketId = socket.id;
      guardarPartidasEnRedis();
    }

    // Reconstruimos la lista de jugadores que el frontend necesita
    const listaJugadores = partida.jugadores.map((j) => ({
      id: j.id,
      nombre: j.nombre,
      avatar: j.avatar,
      estaVivo: j.estaVivo,
      rol: j.id == idUsuario ? j.rol : undefined, // Mostrar rol solo al jugador que se reconecta
    }));

    // Contadores de jugadores totales y vivos por bandos (aldeanos y lobos)
    const totalAldeanos = partida.jugadores.filter(
      (j) => j.rol !== "Hombre lobo"
    ).length;

    const aldeanosVivos = partida.jugadores.filter(
      (j) => j.rol !== "Hombre lobo" && j.estaVivo
    ).length;

    const totalLobos = partida.jugadores.filter(
      (j) => j.rol === "Hombre lobo"
    ).length;

    const lobosVivos = partida.jugadores.filter(
      (j) => j.rol === "Hombre lobo" && j.estaVivo
    ).length;

    // Obtenemos la fase actual del objeto de la partida
    const faseActual = partida.faseActual;

    // Tiempo restante aproximado
    const tiempoTranscurrido = Date.now() - partida.faseInicio;
    const tiempoRestante = Math.max(
      0,
      Math.ceil((partida.faseDuracion - tiempoTranscurrido) / 1000)
    );

    // Enviamos el estado de la partida al jugador que se ha vuelto a unir a la partida
    socket.emit("estadoPartida", {
      partidaID: idPartida,
      salaID: partida.idSala,
      numJornada: partida.numJornada,
      faseActual: faseActual,
      turno: partida.turno === "dia" ? "DÍA" : "NOCHE",
      tiempoRestante: tiempoRestante,
      listaJugadores: listaJugadores,
      totalAldeanos: totalAldeanos,
      aldeanosVivos: aldeanosVivos,
      totalLobos: totalLobos,
      lobosVivos: lobosVivos,
      tiempoRestante: Math.max(
        0,
        Math.ceil(
          (partida.faseDuracion - (Date.now() - partida.faseInicio)) / 1000
        )
      ),
    });
  });

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

    if (!partida) return;
    idSala = partida.idSala;
    if (partida.turno === "dia") {
      partida.vota(idJugador, idObjetivo);
    } else {
      console.log(
        "`[Backend] Recibido votacion Lobos de idJugador: ${idJugador} para idObjetivo: ${idObjetivo}`);"
      );
      partida.votaNoche(idJugador, idObjetivo);
    }

    // Guardar cambios en Redis después de registrar un voto
    await guardarPartidasEnRedis();
  });

  /**
   * Registra un voto para elegir alguacil.
   * @event votarAlguacil
   *
   * @param {Object} datos - Datos del voto.
   * @param {string} datos.idPartida - ID de la partida en curso.
   * @param {string} datos.idJugador - ID del jugador que vota.
   * @param {string} datos.idObjetivo - ID del jugador objetivo del voto.
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
   * @param {Object} datos - Datos del objeto mensaje que se envía al frontend.
   * @param {string} datos.mensaje - Contenido del mensaje.
   * @param {string} datos.nombre - Nombre del jugador que envía el mensaje.
   * @param {number} datos.timestamp - Timestamp del mensaje.
   */
  socket.on("enviarMensaje", async ({ idPartida, idJugador, mensaje }) => {
    const partida = obtenerPartida(socket, idPartida);
    if (!partida) return;

    if (!partida.jugadorVivo(idJugador)) return;

    if (partida.turno === "noche") {
      // Enviar mensaje privado entre hombres lobos
      const preparacionMensajes = partida.prepararMensajesChatNoche(
        idJugador,
        mensaje
      );
      console.log("preparacionMensajes", preparacionMensajes);
      preparacionMensajes.forEach(
        ({ socketId, nombre, mensaje, timestamp }) => {
          console.log(io.sockets.sockets.has(socketId));
          io.to(socketId).emit("mensajePrivado", {
            mensaje: mensaje,
            nombre: nombre,
            timestamp: timestamp,
          });
        }
      );
    } else {
      idSala = partida.idSala;
      const nombreJugador = partida.obtenerNombreJugador(idJugador);
      console.log(`Mensaje enviado al resto ${mensaje}`);
      console.log(`Mensaje enviado al resto ${nombreJugador}`);

      // Enviar mensaje público
      partida.agregarMensajeChatDia(idJugador, mensaje);
      io.to(idSala).emit("mensajeChat", {
        mensaje: mensaje,
        nombre: nombreJugador,
        timestamp: Date.now(),
      });

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
   * @param {number} datos.idJugador - ID del jugador (supuesto vidente) que quiere revelar el rol de otro jugador.
   * @param {number} datos.idObjetivo - ID del jugador objetivo elegido por el supuesto vidente.
   *
   * @emits error - Si la partida no se encuentra.
   * @emits visionJugador - Si la revelación se realiza correctamente.
   * @param {Object} datos - Objeto con el resultado de la revelación.
   * @param {string} datos.rol - Rol del jugador objetivo.
   * @param {string} datos.mensaje - Mensaje informativo con el resultado de la revelación.
   */
  socket.on("videnteRevela", async ({ idPartida, idJugador, idObjetivo }) => {
    try {
      const partida = obtenerPartida(socket, idPartida);
      if (!partida) {
        return;
      }

      const resultado = partida.videnteRevela(idJugador, idObjetivo);
      socket.emit("visionJugador", {
        mensaje: resultado.mensaje,
        rol: resultado.rol,
      });

      // Guardar cambios en Redis después de revelar el rol
      await guardarPartidasEnRedis();
    } catch (error) {
      console.error("Error en videnteRevela:", error);
      socket.emit("error", "Error al revelar el rol");
    }
  });

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
   * @emits visionElegidaLobos - Si la victima elegida por los lobos se ve correctamente.
   * @param {Object} resultado - Resultado de la acción.
   * @param {string} resultado.victima - ID de la victima elegida por los lobos.
   * @param {string} resultado.mensaje - Mensaje con el resultado de la acción.
   */
  socket.on("verVictimaElegidaLobos", ({ idPartida, idJugador }) => {
    try {
      const partida = obtenerPartida(socket, idPartida);
      if (!partida) return;

      const resultado = partida.verVictimaElegidaLobos(idJugador);

      socket.emit("visionElegidaLobos", {
        victima: resultado.victima,
        mensaje: resultado.mensaje,
      });
    } catch (error) {
      console.error("Error en verVictimaElegidaLobos:", error);
      socket.emit(
        "error",
        "Error al tratar de ver la víctima elegida por los lobos"
      );
    }
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
   * @emits error - Si se produce un error al usar la poción.
   * @emits usaPocionBruja - Si la poción se usa correctamente.
   * @param {Object} resultado - Resultado de la acción.
   * @param {Object.error} resultado.error - Mensaje de error si no puede usar la poción la supuesta bruja.
   * @param {Object.mensaje} resultado.mensaje - Mensaje con el resultado de la acción si se usa correctamente.
   */
  socket.on("usaPocionBruja", ({ idPartida, idJugador, tipo, idObjetivo }) => {
    try {
      const partida = obtenerPartida(socket, idPartida);
      if (!partida) return;

      const resultado = partida.usaPocionBruja(idJugador, tipo, idObjetivo);
      if (resultado.error) {
        socket.emit("error", resultado.error);
        return;
      } else if (resultado.mensaje) {
        socket.emit("usaPocionBruja", {
          mensaje: resultado.mensaje,
        });

        // Guardar cambios en Redis después de usar correctamente la poción de bruja
        guardarPartidasEnRedis();
      }
    } catch (error) {
      console.error("Error en usaPocionBruja:", error);
      socket.emit("error", "Error al usar poción");
    }
  });

  /**
   * Permite a la bruja saltar el resto de su turno sin usar sus dos pociones.
   * @event pasarTurnoBruja
   *
   * @param {Object} datos - Datos de la acción.
   * @param {string} datos.idPartida - ID de la partida en curso.
   * @param {string} datos.idJugador - ID del jugador bruja.
   *
   * @emits error - Si la partida no se encuentra o el jugador no es bruja o no está vivo.
   * @emits pasarTurnoBruja - Si la bruja salta su turno correctamente.
   * @param {Object} resultado - Resultado de la acción.
   * @param {Object.error} resultado.error - Mensaje de error si no puede usar la habilidad el cazador.
   * @param {Object.mensaje} resultado.mensaje - Mensaje con el resultado de la acción si se usa correctamente.
   */
  socket.on("pasarTurnoBruja", async ({ idPartida, idJugador }) => {
    try {
      const partida = obtenerPartida(socket, idPartida);
      if (!partida) return;

      const resultado = partida.pasarTurnoBruja(idJugador);
      if (resultado.error) {
        socket.emit("error", resultado.error);
        return;
      } else if (resultado.mensaje) {
        socket.emit("pasarTurnoBruja", {
          mensaje: resultado.mensaje,
        });

        // Guardar cambios en Redis después de saltar el turno
        guardarPartidasEnRedis();
      }
    } catch (error) {
      console.error("Error en pasarTurnoBruja:", error);
      socket.emit("error", "Error al pasar el turno de la bruja");
    }
  });

  /**
   * Permite al cazador disparar a un jugador.
   *
   * @event cazadorDispara
   *
   * @param {Object} datos - Datos de la acción.
   * @param {string} datos.idPartida - ID de la partida en curso.
   * @param {number} datos.idJugador - ID del jugador cazador.
   * @param {number} datos.idObjetivo - ID del jugador objetivo del cazador.
   *
   * @emits error - Si se produce un error al disparar.
   * @emits cazadorDispara - Si el cazador dispara correctamente.
   * @param {Object} resultado - Resultado de la acción.
   * @param {Object.error} resultado.error - Mensaje de error si no puede usar la habilidad el cazador.
   * @param {Object.mensaje} resultado.mensaje - Mensaje con el resultado de la acción si se usa correctamente.
   */
  socket.on("cazadorDispara", ({ idPartida, idJugador, idObjetivo }) => {
    try {
      const partida = obtenerPartida(socket, idPartida);
      if (!partida) return;

      const resultado = partida.cazadorDispara(idJugador, idObjetivo);
      if (resultado.error) {
        socket.emit("error", resultado.error);
        return;
      } else if (resultado.mensaje) {
        socket.emit("cazadorDispara", {
          mensaje: resultado.mensaje,
        });

        // Guardar cambios en Redis después de usar la poción de bruja
        guardarPartidasEnRedis();
      }
    } catch (error) {
      console.error("Error en cazadorDispara:", error);
      socket.emit("error", "Error al disparar");
    }
  });

  /**
   * Permite al alguacil elegir a su sucesor antes de morir.
   *
   * @event elegirSucesor
   *
   * @param {Object} datos - Datos de la acción.
   * @param {string} datos.idPartida - ID de la partida en curso.
   * @param {number} datos.idJugador - ID del jugador que elige al sucesor.
   * @param {number} datos.idObjetivo - ID del jugador que será el nuevo alguacil.
   *
   * @emits error - Si se produce un error al elegir al sucesor.
   * @param {String} mensaje - Mensaje de error si no puede elegir al sucesor.
   *
   * @emits elegirSucesor - Si el jugador elige al sucesor correctamente.
   * @param {Object} resultado - Resultado de la acción.
   * @param {Object.mensaje} resultado.mensaje - Mensaje informativo con el resultado de la acción exitosa.
   * @param {Object.alguacil} resultado.alguacil - ID del jugador que se convierte en el nuevo alguacil.
   */
  socket.on("elegirSucesor", ({ idPartida, idJugador, idObjetivo }) => {
    try {
      console.log(" [Backend] Elegir sucesor: ", idJugador, idObjetivo);
      const partida = obtenerPartida(socket, idPartida);
      if (!partida) return;

      const resultado = partida.elegirSucesor(idJugador, idObjetivo);
      if (resultado.alguacil === null) {
        socket.emit("error", resultado.mensaje);
        return;
      } else if (resultado.alguacil) {
        idSala = partida.idSala;

        io.to(idSala).emit("alguacilElegido", {
          mensaje: resultado.mensaje,
          alguacil: resultado.alguacil,
        });

        // Guardar cambios en Redis después de elegir sucesor
        guardarPartidasEnRedis();
      }
    } catch (error) {
      console.error("Error en elegirSucesor:", error);
      socket.emit("error", "Error al elegir sucesor");
    }
  });

  /**
   * Obtiene el estado actual de los jugadores de una partida.
   *
   * @event obtenerEstadoJugadores
   *
   * @param {Object} datos - Datos de la acción.
   * @param {string} datos.idPartida - ID de la partida en curso.
   *
   * @emits error - Si la partida no se encuentra.
   * @param {String} mensaje - Mensaje de error si no se encuentra la partida.
   *
   * @emits estadoJugadores - Si el estado se obtiene correctamente.
   * @param {Object} datos - Datos del estado de los jugadores de la partida.
   * @param {string} datos.mensaje - Mensaje informativo.
   * @param {Object[]} datos.jugadores - Array de jugadores de la partida.
   */
  socket.on("obtenerEstadoJugadores", ({ idPartida }) => {
    try {
      // Obtenemos la partida en memoria
      const partida = partidas[idPartida];
      if (!partida) {
        socket.emit("error", "No se encontró la partida con ese ID");
        return;
      }

      // Si existe, enviamos el array de jugadores
      socket.emit("estadoJugadores", {
        mensaje: "Estado actual de los jugadores de la partida",
        jugadores: partida.jugadores,
      });
    } catch (error) {
      console.error("Error en obtenerEstadoJugadores:", error);
      socket.emit("error", "Error al obtener el estado de los jugadores");
    }
  });

  /**
   * Actualiza el socketId de un jugador en la partida.
   *
   * @event actualizarSocketId
   *
   * @param {Object} datos - Datos de la acción.
   * @param {string} datos.idPartida - ID de la partida en curso.
   * @param {string} datos.idJugador - ID del jugador a actualizar.
   * @param {string} datos.socketId - SocketId del jugador a actualizar.
   *
   * @emits error - Si la partida no se encuentra.
   * @param {String} mensaje - Mensaje de error si no se encuentra la partida.
   *
   */
  socket.on("actualizarSocketId", ({ idPartida, idJugador, socketId }) => {
    const partida = obtenerPartida(socket, idPartida);
    if (!partida) return;

    // Si no lleva el prototipo, se lo ponemos
    if (!(partida instanceof Partida)) {
      Object.setPrototypeOf(partida, Partida.prototype);
    }

    partida.actualizarSocketId(idJugador, socketId);
    guardarPartidasEnRedis();
  });
};

// Manejar desconexión de jugadores
const manejarDesconexionPartidas = (socket, io) => {
  for (const idPartida in partidas) {
    const partida = partidas[idPartida];

    // Si la partida es nula o no existe, saltamos esta iteración.
    if (!partida) continue;

    const idSala = partida.idSala;

    // Buscamos al jugador que se desconecta
    const jugador = partida.jugadores.find((j) => j.socketId === socket.id);
    if (!jugador) continue; // Si no existe, saltamos esta iteración.

    // Marcamos al jugador como "pendiente de desconexión"
    jugador.desconectado = true;

    // Programamos la eliminación definitiva a los 10 segundos
    const timer = setTimeout(() => {
      // Si para entonces sigue desconectado, lo eliminamos de la partida
      if (jugador.desconectado) {
        // Eliminamos al jugador de la partida
        partida.jugadores = partida.jugadores.filter(
          (j) => j.socketId !== jugador.socketId
        );

        // Enviamos sólo el estado serializable de la partida
        const estadoPartida = {
          idPartida: partida.idPartida,
          turno: partida.turno,
          estado: partida.estado,
          currentDay: partida.numJornada,
          jugadores: partida.jugadores.map((j) => ({
            id: j.socketId,
            nombre: j.nombre,
            avatar: j.avatar,
            estaVivo: j.estaVivo,
          })),
        };

        io.to(idSala).emit("actualizarPartida", estadoPartida);

        // Notificar a todos los jugadores de la partida pertenecientes a la misma sala
        // que un jugador ha salido
        io.to(idSala).emit("jugadorSalido", {
          nombre: jugador.nombre,
          id: jugador.socketId,
        });
        console.log(
          `Jugador ${jugador.socketId} eliminado tras 40s de desconexión de la partida ${idSala}`
        );
      }
      desconexionTimers.delete(jugador.socketId);
    }, 5000);

    // Guardamos el timer para poder cancelarlo si se reconecta
    desconexionTimers.set(jugador.socketId, timer);
    break;
  }
};

const manejarFasesPartida = async (partida, idSala, io) => {
  // Definición de funciones auxiliares

  // Función auxiliar para verificar el fin de la partida
  const finalizarPartidaSiCorresponde = (resultado) => {
    // La partida ha terminado, notificar el resultado
    if (resultado.ganador) {
      io.to(idSala).emit("partidaFinalizada", {
        mensaje: resultado.mensaje,
        ganador: resultado.ganador,
      });
      eliminarPartidaDeRedis(partida.idPartida); // Eliminar de Redis
      partidas[partida.idPartida] = null; // Liberar la referencia en el almacenamiento en memoria
      //delete partidas[partida.idPartida]; // Eliminar de la memoria

      PartidaDAO.finalizarPartida(
        partida.idPartida,
        "terminada",
        resultado.ganador
      );
      console.log(`Fin de partida`);
      console.log(`Fin de partida. Ganador: ${resultado.ganador}`);
      return true;
    }
    return false;
  };

  // Fase de votación del alguacil
  const manejarVotacionAlguacil = async () => {
    // Fase 2: Iniciar votaciones para elegir alguacil
    io.to(idSala).emit("iniciarVotacionAlguacil", {
      mensaje: "Inician las votaciones para elegir al alguacil.",
      tiempo: 30,
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
              partida.gestionarTurno();
              await iniciarCicloPartida();
            }
          }, 1000);
        } else {
          // Notificar quien es el alguacil elegido
          io.to(idSala).emit("alguacilElegido", {
            mensaje: resultadoAlguacil.mensaje,
            alguacil: resultadoAlguacil.alguacil,
          });
          partida.gestionarTurno();
          await iniciarCicloPartida();
        }
      }
    }, 1000); // Verificar cada segundo
  };

  // Ciclo principal de la partida. Alterna los turnos de noche y día hasta que haya un ganador
  const iniciarCicloPartida = async () => {
    console.log("Partida iniciada");
    // Fase 3: Noche
    io.to(idSala).emit("nocheComienza", { mensaje: "La noche ha comenzado." });

    const vidente = partida.hayRolVivo("Vidente");

    if (vidente) {
      // Sub-fase 1: Habilidad de la vidente
      io.to(idSala).emit("habilidadVidente", {
        mensaje: "La vidente tiene 25 segundos para usar su habilidad.",
        tiempo: 25,
      });
    }
    partida.iniciarHabilidadVidente();

    const checkVidente = setInterval(() => {
      if (partida.todosVidentesHanVisto() || !partida.temporizadorHabilidad) {
        clearInterval(checkVidente);
        partida.limpiarTemporizadorHabilidad();
        manejarFaseHombresLobos();
      }
    }, 1000);

    // Sub-fase 2: Hombres lobos
    const manejarFaseHombresLobos = () => {
      console.log("Fase Lobos iniciada");
      io.to(idSala).emit("turnoHombresLobos", {
        mensaje:
          "Los hombres lobos tienen 30 segundos para elegir una víctima.",
        tiempo: 30,
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
            io.to(socketId).emit("resultadoVotosNoche", {
              mensaje,
              partida: partida.colaEliminaciones,
            });
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
      const bruja = partida.hayRolVivo("Bruja");
      if (bruja) {
        console.log("Fase Bruja iniciada");
        io.to(idSala).emit("habilidadBruja", {
          mensaje: "La bruja tiene 30 segundos para usar su poción.",
          tiempo: 30,
        });
      }
      partida.iniciarHabilidadBruja();

      const checkBruja = setInterval(async () => {
        /* Se pasa de fase si las brujas han usado sus dos pociones, el tiempo ha expirado
         *  o se ha cambiado de turno a día
         */
        console.log("Evaluo fin de bruja ");
        if (
          partida.todasBrujasUsaronHabilidad() ||
          !partida.temporizadorHabilidad
        ) {
          clearInterval(checkBruja);
          partida.limpiarTemporizadorHabilidad();
          console.log(
            "partida.todasBrujasUsaronHabilidad() al pasar turno: ",
            partida.todasBrujasUsaronHabilidad()
          );
          console.log(
            "partida.temporizadorHabilidad al pasar turno: ",
            partida.temporizadorHabilidad
          );

          console.log("Verifico si se necesitan subfases ");
          // Llamar a la función verificarSubfasesOpcionales antes de pasar al turno de día
          await verificarSubfasesOpcionales();

          console.log("Gestiono turno ");
          const resultadoTurno2 = partida.gestionarTurno();

          const finPartida2 = finalizarPartidaSiCorresponde(resultadoTurno2);
          await guardarPartidasEnRedis();

          console.log("Verifico fin de partida ");
          if (partida.estado === "en_curso" && !finPartida2) {
            console.log("Paso a siguiente fase desde bruja (Dia) ");
            await manejarFaseDia(); // Pasar a la fase de día
          }
        }
      }, 1000);
    };

    // Sub-fase opcional 4: Habilidad del cazador
    const manejarFaseCazador = async () => {
      return new Promise(async (resolve) => {
        console.log("Sub-fase del Cazador iniciada");

        const cazadoresMuertos = partida.obtenerCazadoresEnColaEliminacion();
        console.log("Cazadores muertos: ", cazadoresMuertos);

        if (cazadoresMuertos.length === 0) {
          resolve(); // No hay cazadores muertos, no se hace nada
          return;
        }

        // Filtrar solo los cazadores que no han usado su habilidad y ordenarlos por ID
        const cazadoresSinUsarHabilidad = cazadoresMuertos
          .filter((idCazador) => {
            const cazador = partida.jugadores.find((j) => j.id == idCazador);
            return cazador && !cazador.haDisparado;
          })
          .sort((a, b) => a - b); // Ordenar por ID

        if (cazadoresSinUsarHabilidad.length === 0) {
          resolve(); // Todos los cazadores ya usaron su habilidad
          return;
        }

        // Función para manejar la habilidad de un cazador específico
        const manejarHabilidadCazador = async (idCazador) => {
          return new Promise((resolveCazador) => {
            // Obtener los jugadores vivos que no están en la cola de eliminación
            const jugadoresDisponibles =
              partida.obtenerJugadoresVivosNoEnCola();

            // Notificar a todos los jugadores que comienza la fase de la habilidad del cazador
            io.to(idSala).emit("habilidadCazador", {
              mensaje: "El cazador tiene 30 segundos para usar su habilidad.",
              tiempo: 30,
              cazadorActual: idCazador,
              jugadoresDisponibles: jugadoresDisponibles,
            });

            partida.iniciarHabilidadCazador();

            const checkCazador = setInterval(async () => {
              const cazador = partida.jugadores.find((j) => j.id == idCazador);
              if (
                !partida.temporizadorHabilidad ||
                (cazador && cazador.haDisparado)
              ) {
                clearInterval(checkCazador);
                partida.limpiarTemporizadorHabilidad();
                console.log(`Fin de la habilidad del cazador ${idCazador}`);
                resolveCazador();
              }
            }, 1000);
          });
        };

        // Manejar secuencialmente cada cazador
        for (const idCazador of cazadoresSinUsarHabilidad) {
          await manejarHabilidadCazador(idCazador);
        }

        console.log("Fin de la sub-fase del Cazador");
        resolve();
      });
    };

    // Sub-fase opcional 5: Sucesion del alguacil
    const manejarFaseAlguacil = async () => {
      return new Promise((resolve) => {
        console.log("Sub-fase de la sucesión del Alguacil iniciada");

        const alguacilMuerto = partida.obtenerAlguacilMuerto();

        if (!alguacilMuerto) {
          console.log("▶️ No hay alguacil muerto, saliendo de la sub-fase");
          resolve(); // No hay alguacil muerto, no se hace nada
        }

        console.log(
          "partida.alguacilUsoHabilidad() antes de nada: ",
          partida.alguacilUsoHabilidad()
        );

        // Obtener los jugadores vivos que no están en la cola de eliminación
        const jugadoresDisponibles = partida.obtenerJugadoresVivosNoEnCola();

        // Notificar a todos los jugadores que comienza la fase de la sucesión del alguacil
        io.to(idSala).emit("habilidadAlguacil", {
          mensaje: `${alguacilMuerto.nombre} era el Alguacil. Puede elegir a quién le pasa la voz.`,
          tiempo: 20,
          idAlguacil: alguacilMuerto.id,
          jugadoresDisponibles: jugadoresDisponibles,
        });

        partida.iniciarHabilidadAlguacil();

        const checkAlguacil = setInterval(() => {
          if (
            !partida.temporizadorHabilidad ||
            partida.alguacilUsoHabilidad()
          ) {
            console.log(
              "partida.alguacilUsoHabilidad()  al pasar turno: ",
              partida.alguacilUsoHabilidad()
            );
            clearInterval(checkAlguacil);
            partida.limpiarTemporizadorHabilidad();
            console.log("Fin de la sub-fase del Alguacil");
            resolve();
          }
        }, 1000);
      });
    };

    // Verificar y activar si es necesario las subfases opcionales de la sucesión del alguacil y la habilidad del cazador
    const verificarSubfasesOpcionales = async () => {
      const jugadoresVivos = partida.jugadores.filter((j) => j.estaVivo).length;
      const jugadoresEnCola = partida.colaEliminaciones.length;
      const jugadoresRestantes = jugadoresVivos - jugadoresEnCola;

      // Solo proceder si quedarán más de un jugador vivo
      if (jugadoresRestantes <= 1) {
        return;
      }

      // Caso 1: Alguacil muerto por hombres lobo o bruja (jugadoresRestantes > 1)
      if (partida.alguacilHaMuerto()) {
        console.log("Caso 1: Alguacil muerto por hombres lobo o bruja");
        await manejarFaseAlguacil();
      }

      // Caso 2: Cazador muerto por hombres lobo o bruja (jugadoresRestantes > 1)
      if (partida.cazadorHaMuerto()) {
        console.log("Caso 2: Cazador muerto por hombres lobo o bruja");
        await manejarFaseCazador();
      }

      // Verificar si después de las fases anteriores hay nuevos cambios
      const nuevosJugadoresVivos = partida.jugadores.filter(
        (j) => j.estaVivo
      ).length;
      const nuevosJugadoresEnCola = partida.colaEliminaciones.length;
      const nuevosJugadoresRestantes =
        nuevosJugadoresVivos - nuevosJugadoresEnCola;

      // Si después de las fases anteriores quedan más de un jugador, continuar el ciclo
      if (nuevosJugadoresRestantes > 1) {
        // Caso 3: Si el primer cazador mató al nuevo alguacil
        if (partida.alguacilHaMuerto()) {
          console.log("Caso 3: Si el primer cazador mató al nuevo alguacil");
          await manejarFaseAlguacil();
        }

        // Caso 4: Si el primer cazador mató al otro cazador
        if (partida.cazadorHaMuerto() && partida.cazadorDisparoACazador) {
          console.log("Caso 4: Si el primer cazador mató al otro cazador");
          await manejarFaseCazador();
        }

        // Verificar si después de las fases anteriores hay nuevos cambios
        const nuevosJugadoresVivos2 = partida.jugadores.filter(
          (j) => j.estaVivo
        ).length;
        const nuevosJugadoresEnCola2 = partida.colaEliminaciones.length;
        const nuevosJugadoresRestantes2 =
          nuevosJugadoresVivos2 - nuevosJugadoresEnCola2;

        if (nuevosJugadoresRestantes2 > 1) {
          // Caso 5: Si el segundo cazador mató al nuevo alguacil
          if (partida.alguacilHaMuerto()) {
            console.log("Caso 5: Si el segundo cazador mató al nuevo alguacil");
            await manejarFaseAlguacil();
            hayCambios = true;
          }
        }
      }
    };

    // Fase 4: Día
    const manejarFaseDia = async () => {
      io.to(idSala).emit("diaComienza", {
        mensaje:
          "Es de día, los jugadores tienen 1 minuto para decidir quién será eliminado.",
        tiempo: 60,
        victimas: partida.ultimasVictimas,
      });
      partida.iniciarVotacion();

      const checkVotosDia = setInterval(async () => {
        if (partida.verificarVotos("dia") || !partida.votacionActiva) {
          console.log(
            "partida.votacionActiva  al pasar turno: ",
            partida.votacionActiva
          );
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
                    rolJugadorAEliminar: resultadoVotosDia2.rolJugadorAEliminar,
                  });
                }

                // Llamar a la función verificarSubfasesOpcionales antes de pasar al turno de noche
                await verificarSubfasesOpcionales();

                const resultadoTurno = partida.gestionarTurno();
                // Al llamar a gestionarTurno, la variable de los jugadores videntes 'haVisto'
                // se pone a false si se ha cambiado de turno a noche
                const finPartida =
                  finalizarPartidaSiCorresponde(resultadoTurno);
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
              rolJugadorAEliminar: resultadoVotosDia.rolJugadorAEliminar,
            });

            // Llamar a la función verificarSubfasesOpcionales antes de pasar al turno de noche
            await verificarSubfasesOpcionales();

            const resultadoTurno2 = partida.gestionarTurno();
            // Al llamar a gestionarTurno, la variable de los jugadores videntes 'haVisto'
            // se pone a false si se ha cambiado de turno a noche
            const finPartida2 = finalizarPartidaSiCorresponde(resultadoTurno2);
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
    tiempo: 30,
  });
  await new Promise((resolve) => setTimeout(resolve, 30000)); // 30 segundos de espera inicial

  // Comenzar la secuencia de la partida
  await manejarVotacionAlguacil();
};

// Cargar partidas al iniciar el servidor
cargarPartidasDesdeRedis();
module.exports = { manejarConexionPartidas, manejarDesconexionPartidas };
