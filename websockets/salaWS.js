const {
  generarCodigoInvitacion,
  validarCodigoInvitacion,
} = require("../utils/invitaciones");
const crypto = require("crypto");
const redisClient = require("../config/redis");

const getSalas = () => salas;

let salas = {}; // Almacenamiento en memoria de las salas
let expulsados = {}; // Registro de jugadores expulsados

/**
 * @file salaWS.js
 * @description Websockets para la gestion de salas.
 * @module API_WB_Salas
 */

// Función para cargar salas desde Redis al iniciar
async function cargarSalasDesdeRedis() {
  try {
    const salasRedis = await redisClient.get("salas");
    if (salasRedis) {
      salas = JSON.parse(salasRedis);
      console.log("Salas cargadas desde Redis");
    }
  } catch (error) {
    console.error("Error al cargar salas desde Redis:", error);
  }
}

// Función para guardar las salas en Redis
async function guardarSalasEnRedis() {
  try {
    await redisClient.set("salas", JSON.stringify(salas));
  } catch (error) {
    console.error("Error al guardar salas en Redis:", error);
  }
}

// Función para eliminar una sala de Redis
async function eliminarSalaDeRedis(idSala) {
  try {
    const salasRedis = await redisClient.get("salas");
    if (salasRedis) {
      const salasActuales = JSON.parse(salasRedis);
      delete salasActuales[idSala];
      await redisClient.set("salas", JSON.stringify(salasActuales));
      console.log(`Sala ${idSala} eliminada de Redis`);
    }
  } catch (error) {
    console.error("Error al eliminar sala de Redis:", error);
  }
}

// Función para eliminar una sala de memoria
async function eliminarSalaDeMemoria(idSala) {
  try {
    if (salas[idSala]) {
      delete salas[idSala];
      console.log(`Sala ${idSala} eliminada de memoria`);
    }
  } catch (error) {
    console.error("Error al eliminar sala de memoria:", error);
  }
}

/**
 * Sale de todas las salas en las que está un jugador excepto la sala especificada.
 * @param {string} idJugador - ID del jugador.
 * @param {string} idSalaExcluida - ID de la sala en la que desea permanecer (no salir de esta).
 * @param {Object} io - Instancia de Socket.IO para emitir eventos.
 *
 * @emits actualizarSala
 * @param {Object} sala - Estado actualizado de la sala.
 *
 * @emits jugadorSalido
 * @param {Object} jugador - Datos del jugador que salió.
 * @param {string} jugador.nombre - Nombre del jugador.
 * @param {string} jugador.id - ID del jugador.
 *
 * @returns {Promise<void>}
 */
async function salirDeOtrasSalas(idJugador, idSalaExcluida, io) {
  for (const idSala in salas) {
    if (idSala !== idSalaExcluida) {
      const sala = salas[idSala];
      const jugador = sala.jugadores.find((j) => j.id === idJugador);

      if (jugador) {
        // Eliminar al jugador de la sala
        sala.jugadores = sala.jugadores.filter((j) => j.id !== idJugador);

        // Si la sala queda vacía, eliminarla
        if (sala.jugadores.length === 0) {
          delete salas[idSala];
          await eliminarSalaDeRedis(idSala);
        } else if (sala.lider === jugador.id) {
          // Asignar un nuevo líder si el actual sale
          sala.lider = sala.jugadores[0].id;
        }

        await guardarSalasEnRedis();

        // Notificar a los jugadores restantes
        io.to(idSala).emit("actualizarSala", sala);
        io.to(idSala).emit("jugadorSalido", {
          nombre: jugador.nombre,
          id: jugador.id,
        });
      }
    }
  }
}

const manejarConexionSalas = (socket, io) => {
  /**
   * Crea una nueva sala de juego.
   * @event crearSala
   *
   * @param {Object} datos - Datos de la sala a crear.
   * @param {string} datos.nombreSala - Nombre de la sala.
   * @param {string} datos.tipo - Tipo de la sala ("publica" o "privada").
   * @param {string} [datos.contrasena] - Contraseña de la sala (solo si es privada).
   * @param {number} datos.maxJugadores - Número máximo de jugadores permitidos.
   * @param {number} datos.maxRoles - Número máximo de jugadores para cada rol.
   * @param {Object} datos.usuario - Datos del usuario que crea la sala.
   * @param {number} datos.usuario.id - ID del usuario creador.
   *
   *
   * @emits salaCreada
   * @param {Object} res - Objeto de respuesta HTTP.
   * @param {Object} res.sala - Datos de la sala creada.
   * @param {string} res.sala.id - ID único de la sala.
   * @param {string} res.sala.nombre - Nombre de la sala.
   * @param {string} res.sala.tipo - Tipo de la sala.
   * @param {string|null} res.sala.codigoInvitacion - Código de invitación si la sala es privada.
   * @param {Object[]} res.sala.jugadores - Lista de jugadores en la sala.
   * @param {number} res.sala.lider - ID del usuario que creó la sala.
   *
   * @emits listaSalas
   * @param {Object[]} salas - Lista actualizada de todas las salas disponibles.
   */
  socket.on(
    "crearSala",
    async ({
      nombreSala,
      tipo,
      contrasena,
      maxJugadores,
      maxRoles,
      usuario,
    }) => {
      // Salir de todas las salas anteriores
      await salirDeOtrasSalas(usuario.id, null, io);

      const idSala = `sala_${crypto.randomUUID()}`; // Generar un ID único para la sala
      const codigoInvitacion = generarCodigoInvitacion(); // Generar un código de invitación aleatorio

      // Guardar sala en memoria
      salas[idSala] = {
        id: idSala,
        nombre: nombreSala,
        tipo,
        contrasena,
        maxJugadores,
        maxRoles,
        jugadores: [
          { ...usuario, avatar: usuario.avatar, socketId: socket.id },
        ],
        lider: usuario.id,
        codigoInvitacion,
        enPartida: false,
      };

      await guardarSalasEnRedis(); // Guardar en Redis después de crear sala

      console.log(`Sala creada: ${idSala} (${nombreSala})`);
      socket.join(idSala);

      socket.emit("salaCreada", salas[idSala]); // Confirmar al creador

      // Emitir la lista de salas actualizada a todos los clientes conectados
      io.emit("listaSalas", Object.values(salas));
    }
  );

  /**
   * Unirse a una sala existente.
   * @event unirseSala
   *
   * @param {Object} datos - Datos para unirse a la sala.
   * @param {string} datos.idSala - ID de la sala a la que se quiere unir.
   * @param {Object} datos.usuario - Datos del usuario que se une.
   * @param {number} datos.usuario.id - ID del usuario.
   * @param {string} datos.usuario.nombre - Nombre del usuario.
   * @param {string} datos.contrasena - Contraseña de la sala (si la sala es privada).
   * @param {string} datos.codigoInvitacion - Código de invitación de la sala.
   *
   * @emits error
   * @param {string} mensaje - Mensaje de error si la sala no existe, está llena o el usuario ha sido expulsado.
   *
   * @emits salaActualizada
   * @param {Object} res.sala - Estado actualizado de la sala después de unirse.
   *
   * @emits jugadorUnido
   * @param {Object} jugador - Datos del jugador que se ha unido.
   * @param {string} jugador.nombre - Nombre del jugador.
   * @param {number} jugador.id - ID del jugador.
   *
   * @emits actualizarSala
   * @param {Object} res.sala - Estado actualizado de la sala tras la unión del nuevo jugador.
   */
  socket.on(
    "unirseSala",
    async ({ idSala, usuario, contrasena, codigoInvitacion }) => {
      const sala = salas[idSala];
      if (!sala) {
        socket.emit("error", "La sala no existe");
        return;
      }

      // Verificar si el jugador está expulsado
      if (expulsados[idSala] && expulsados[idSala].includes(usuario.id)) {
        socket.emit(
          "error",
          "Estás expulsado de esta sala y no puedes unirte nuevamente."
        );
        return;
      }

      // Salir de todas las salas anteriores
      await salirDeOtrasSalas(usuario.id, idSala, io);

      // Permitir el acceso directo a salas públicas
      const accesoLibre = sala.tipo === "publica";

      // Permitir acceso a cualquier sala (pública o privada) si se tiene un código de invitación válido
      const accesoPorCodigo = validarCodigoInvitacion(sala, codigoInvitacion);

      // Permitir acceso a salas privadas con la contraseña correcta
      const accesoPorContrasena =
        sala.tipo === "privada" && sala.contrasena === contrasena;

      if (!accesoLibre && !accesoPorCodigo && !accesoPorContrasena) {
        console.log(
          "Acceso denegado: No cumples con los requisitos para unirte a la sala."
        );
        return socket.emit("error", "Acceso denegado");
      }

      // Verificar si la sala tiene espacio para más jugadores
      if (sala.jugadores.length >= sala.maxJugadores) {
        socket.emit("error", "Sala llena");
        return;
      }

      // Evitar duplicados
      const yaEsta = sala.jugadores.some((j) => j.id === usuario.id);
      if (yaEsta) {
        socket.emit("error", "Ya estás en esta sala");
        return;
      }

      // Agregar el jugador a la sala
      sala.jugadores.push({
        ...usuario,
        avatar: usuario.avatar,
        socketId: socket.id,
      });
      socket.join(idSala);

      await guardarSalasEnRedis(); // Guardar cambios en Redis

      // Notificar al usuario que se unió
      socket.emit("salaActualizada", sala);

      // Notificar a todos los jugadores de la sala que un nuevo jugador se ha unido
      io.to(idSala).emit("jugadorUnido", {
        nombre: usuario.nombre,
        id: usuario.id,
        avatar: usuario.avatar,
      });

      // Retrasar la actualización de la sala para disimular la reconexión
      setTimeout(() => {
        // Actualizar sala para todos los clientes del navegador de salas
        io.emit("actualizarSalaGlobal", sala);
        // Mantener también la actualización para los clientes dentro de la sala
        io.to(idSala).emit("actualizarSala", sala);
      }, 1000); // 1 segundo de retraso
    }
  );

  /**
   * Obtener la información de una sala.
   * @event obtenerSala
   *
   * @param {string} idSala - ID de la sala a consultar.
   * @param {Function} callback - Función de callback para devolver la información de la sala.
   *
   * @callback callback
   * @param {Object|null} sala - Datos de la sala si existe, o null si no se encuentra.
   */
  socket.on("obtenerSala", (idSala, callback) => {
    const sala = salas[idSala];
    if (!sala) return callback(null);

    // Devolver la sala con su estado actualizado
    callback({
      ...sala,
      jugadores: sala.jugadores.map((j) => ({
        id: j.id,
        listo: j.listo ?? "No listo",
        socketId: j.socketId,
      })),
    });
  });

  /**
   * Marcar el estado de un jugador como listo o no listo dentro de la sala.
   * @event marcarEstado
   *
   * @param {Object} datos - Datos para actualizar el estado del jugador.
   * @param {string} datos.idSala - ID de la sala.
   * @param {number} datos.idUsuario - ID del usuario.
   * @param {boolean} datos.estado - Nuevo estado del jugador (listo o no listo).
   *
   * @emits error
   * @param {string} mensaje - Mensaje de error si la sala no existe o el jugador no está en la sala.
   *
   * @emits estadoCambiado
   * @param {Object} res - Confirmación del cambio de estado.
   * @param {number} res.idUsuario - ID del usuario cuyo estado cambió.
   * @param {boolean} res.estado - Estado actualizado del usuario.
   *
   * @emits actualizarSala
   * @param {Object} sala - Estado actualizado de la sala.
   */
  socket.on("marcarEstado", async ({ idSala, idUsuario, estado }) => {
    const sala = salas[idSala];
    if (!sala) {
      // Sala no encontrada
      socket.emit("error", "La sala no existe.");
      return;
    }

    const jugador = sala.jugadores.find((j) => j.id === idUsuario);
    if (!jugador) {
      socket.emit("error", "El jugador no está en la sala.");
      return;
    }

    // Cambiar el estado del jugador
    jugador.listo = estado;

    await guardarSalasEnRedis(); // Guardar cambios en Redis

    socket.emit("estadoCambiado", { idUsuario, estado }); // Confirmar al usuario
    io.to(idSala).emit("actualizarSala", sala); // Actualizar a todos
  });

  /**
   * Obtener la lista de salas disponibles.
   * @event obtenerSalas
   *
   * @emits listaSalas
   * @param {Object[]} salas - Lista de salas disponibles.
   */
  socket.on("obtenerSalas", () => {
    console.log("Salas actuales:", JSON.stringify(salas, null, 2)); // Log para mostrar la información de las salas
    socket.emit("listaSalas", Object.values(salas));
  });

  /**
   * Unirse rápidamente a una sala pública.
   * @event unirseRapido
   *
   * @param {Object} datos - Datos del usuario que se quiere unir.
   * @param {Object} datos.usuario - Datos del usuario.
   * @param {number} datos.usuario.id - ID del usuario.
   * @param {string} datos.usuario.nombre - Nombre del usuario.
   *
   * @emits error - Si no hay salas públicas disponibles.
   * @param {string} mensaje - Mensaje de error.
   *
   * @emits salaActualizada - Si se une exitosamente a una sala.
   * @param {Object} sala - Datos de la sala a la que se unió.
   */
  socket.on("unirseRapido", async ({ usuario }) => {
    // Filtrar salas públicas que no estén llenas
    const salasPublicas = Object.values(salas).filter(
      (sala) =>
        sala.tipo === "publica" && sala.jugadores.length < sala.maxJugadores
    );

    if (salasPublicas.length === 0) {
      socket.emit("error", "No hay salas públicas disponibles");
      return;
    }

    // Ordenar salas por proximidad a completarse (más jugadores primero)
    salasPublicas.sort((a, b) => {
      const ratioA = a.jugadores.length / a.maxJugadores;
      const ratioB = b.jugadores.length / b.maxJugadores;
      return ratioB - ratioA;
    });

    // Tomar la sala más cercana a completarse
    const salaElegida = salasPublicas[0];

    // Verificar si el jugador ya está en la sala
    const yaEsta = salaElegida.jugadores.some((j) => j.id === usuario.id);
    if (yaEsta) {
      socket.emit("error", "Ya estás en esta sala");
      return;
    }

    // Agregar el jugador a la sala
    salaElegida.jugadores.push({
      ...usuario,
      avatar: usuario.avatar,
      socketId: socket.id,
    });
    socket.join(salaElegida.id);

    await guardarSalasEnRedis(); // Guardar cambios en Redis

    // Notificar al usuario que se unió
    socket.emit("salaActualizada", salaElegida);

    // Notificar a todos los jugadores de la sala que un nuevo jugador se ha unido
    io.to(salaElegida.id).emit("jugadorUnido", {
      nombre: usuario.nombre,
      id: usuario.id,
      avatar: usuario.avatar,
    });

    // Retrasar la actualización de la sala para disimular la reconexión
    setTimeout(() => {
      io.to(salaElegida.id).emit("actualizarSala", salaElegida);
    }, 1000);
  });

  /**
   * Expulsar a un jugador de la sala.
   * @event expulsarJugador
   *
   * @param {Object} datos - Datos de la expulsión.
   * @param {string} datos.idSala - ID de la sala.
   * @param {number} datos.idLider - ID del líder de la sala.
   * @param {number} datos.idExpulsado - ID del usuario a expulsar.
   *
   * @emits actualizarSala
   * @param {Object} sala - Estado actualizado de la sala después de la expulsión.
   *
   * @emits expulsadoDeSala
   * @param {number} idExpulsado - ID del usuario expulsado.
   *
   * @emits redirigirExpulsado
   * @param {number} idExpulsado - ID del usuario expulsado.
   */
  socket.on("expulsarJugador", async ({ idSala, idLider, idExpulsado }) => {
    const sala = salas[idSala];
    if (!sala || sala.lider !== idLider) return; // Sala no encontrada o el usuario que solicita la expulsión no es el líder

    // Registrar al expulsado
    if (!expulsados[idSala]) {
      expulsados[idSala] = [];
    }
    expulsados[idSala].push(idExpulsado); // Agregar a la lista de expulsados

    // Eliminar al jugador de la sala
    sala.jugadores = sala.jugadores.filter((j) => j.id !== idExpulsado);

    await guardarSalasEnRedis(); // Guardar cambios en Redis

    // Notificar a todos los jugadores de la sala
    io.to(idSala).emit("actualizarSala", sala);

    // Notificar al usuario que ha sido expulsado
    io.to(idSala).emit("expulsadoDeSala", { idExpulsado });
  });

  /**
   * Salir de una sala.
   * @event salirSala
   *
   * @param {Object} datos - Datos de la salida.
   * @param {string} datos.idSala - ID de la sala.
   * @param {number} datos.idUsuario - ID del usuario que sale.
   *
   * @emits listaSalas
   * @param {Object[]} salas - Lista actualizada de salas después de la salida.
   *
   * @emits actualizarSala
   * @param {Object} sala - Estado actualizado de la sala después de la salida.
   *
   * @emits salaAbandonada
   * @param {Object} res - Confirmación de la salida.
   * @param {string} res.mensaje - Mensaje de confirmación de salida.
   *
   * @emits jugadorSalido
   * @param {Object} jugador - Datos del jugador que salió.
   * @param {string} jugador.nombre - Nombre del jugador.
   * @param {number} jugador.id - ID del jugador.
   */
  socket.on("salirSala", async ({ idSala, idUsuario }) => {
    const sala = salas[idSala];
    if (!sala) return; // Sala no encontrada

    // Buscar al jugador que está saliendo
    const jugador = sala.jugadores.find((j) => j.id === idUsuario);
    if (!jugador) return; // Jugador no encontrado

    // Eliminar al jugador de la sala
    sala.jugadores = sala.jugadores.filter((j) => j.id !== idUsuario);

    // Si la sala queda vacía, eliminarla
    if (sala.jugadores.length === 0) {
      delete salas[idSala];
      await eliminarSalaDeRedis(idSala); // Eliminar de Redis
      console.log(`Sala ${idSala} eliminada por falta de jugadores`);
    } else if (sala.lider === idUsuario) {
      // Asignar un nuevo líder si el actual sale
      sala.lider = sala.jugadores[0].id;
      await guardarSalasEnRedis();
    } else {
      await guardarSalasEnRedis();
    }

    // Notificar a todos los clientes la lista de salas actualizada
    io.emit("listaSalas", Object.values(salas));

    // Notificar a los jugadores restantes
    io.to(idSala).emit("actualizarSala", sala);

    // Notificar al cliente que salió
    socket.leave(idSala);
    socket.emit("salaAbandonada", { mensaje: "Has salido de la sala" });

    // Notificar a todos los jugadores de la sala que un jugador ha salido
    io.to(idSala).emit("jugadorSalido", {
      nombre: jugador.nombre,
      id: idUsuario,
    });
  });
};

// Manejar desconexión de jugadores
const manejarDesconexionSalas = async (socket, io) => {
  for (const idSala in salas) {
    const sala = salas[idSala];
    const jugador = sala.jugadores.find((j) => j.socketId === socket.id);
    if (jugador) {
      // Eliminar al jugador de la sala
      sala.jugadores = sala.jugadores.filter((j) => j.socketId !== socket.id);

      // Si la sala queda vacía, eliminarla
      if (sala.jugadores.length === 0) {
        setTimeout(async () => {
          // Verificar nuevamente si la sala sigue vacía antes de eliminarla
          if (sala.jugadores.length === 0) {
            delete salas[idSala];
            await eliminarSalaDeRedis(idSala); // Eliminar de Redis
            console.log(
              `Sala ${idSala} eliminada por desconexión del último jugador tras 5 segundos`
            );
          }
        }, 10000); // Esperar 10 segundos antes de eliminar la sala
      } else {
        await guardarSalasEnRedis(); // Guardar cambios si la sala sigue existiendo
      }

      io.to(idSala).emit("actualizarSala", sala);
      console.log(`Jugador ${jugador.id} desconectado de la sala ${idSala}`);

      // Notificar a todos los jugadores de la sala que un jugador ha salido
      io.to(idSala).emit("jugadorSalido", {
        nombre: jugador.nombre,
        id: jugador.id,
      });
      break;
    }
  }
};

// Cargar salas al iniciar el servidor
cargarSalasDesdeRedis();

module.exports = {
  manejarConexionSalas,
  manejarDesconexionSalas,
  guardarSalasEnRedis,
  salas,
  getSalas,
  eliminarSalaDeRedis,
  eliminarSalaDeMemoria,
};
