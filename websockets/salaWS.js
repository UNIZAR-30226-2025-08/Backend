const {
  generarCodigoInvitacion,
  validarCodigoInvitacion,
} = require("../utils/invitaciones");
const crypto = require("crypto");

let salas = {}; // Almacenamiento en memoria de las salas
let expulsados = {}; // Registro de jugadores expulsados

/**
 * @file salaWS.js
 * @description Websockets para la gestion de salas.
 * @module API_WB_Salas
 */

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
   * @param {number} datos.maxRolesEspeciales - Número máximo de roles especiales.
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
      maxRolesEspeciales,
      usuario,
    }) => {
      const idSala = `sala_${crypto.randomUUID()}`;
      const codigoInvitacion =
        tipo === "privada" ? generarCodigoInvitacion() : null;

      salas[idSala] = {
        id: idSala,
        nombre: nombreSala,
        tipo,
        contrasena,
        maxJugadores,
        maxRolesEspeciales,
        jugadores: [{ ...usuario, socketId: socket.id }],
        lider: usuario.id,
        codigoInvitacion,
      };

      console.log(`Sala creada: ${idSala} (${nombreSala})`);
      socket.join(idSala);

      socket.emit("salaCreada", salas[idSala]); // Confirmar al creador

      // Emitir la lista de salas actualizada a todos los clientes conectados
      io.emit("listaSalas", Object.values(salas)); // Emitir a todos los clientes la lista de salas
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
  socket.on("unirseSala", ({ idSala, usuario }) => {
    const sala = salas[idSala];
    if (!sala) {
      socket.emit("error", "Sala inexistente");
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

    // Verificar si la sala está llena
    if (sala.jugadores.length >= sala.maxJugadores) {
      socket.emit("error", "Sala llena");
      return;
    }

    // Agregar el jugador a la sala
    sala.jugadores.push({ ...usuario, socketId: socket.id });
    socket.join(idSala);

    // Notificar al usuario que se unió
    socket.emit("salaActualizada", sala);

    // Notificar a todos los jugadores de la sala que un nuevo jugador se ha unido
    io.to(idSala).emit("jugadorUnido", {
      nombre: usuario.nombre,
      id: usuario.id,
    });

    // Retrasar la actualización de la sala para disimular la reconexión
    setTimeout(() => {
      io.to(idSala).emit("actualizarSala", sala);
    }, 1000); // 1 segundo de retraso
  });

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
        listo: j.listo ?? false,
        socketId: j.socketId,
      })),
    });
  });

  /**
   * Marcar el estado de un jugador dentro de la sala.
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
  socket.on("marcarEstado", ({ idSala, idUsuario, estado }) => {
    const sala = salas[idSala];
    if (!sala) {
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
    socket.emit("listaSalas", Object.values(salas));
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
  socket.on("expulsarJugador", ({ idSala, idLider, idExpulsado }) => {
    const sala = salas[idSala];
    if (!sala || sala.lider !== idLider) return;

    // Registrar al expulsado
    if (!expulsados[idSala]) {
      expulsados[idSala] = [];
    }
    expulsados[idSala].push(idExpulsado);

    // Eliminar al jugador de la sala
    sala.jugadores = sala.jugadores.filter((j) => j.id !== idExpulsado);

    // Notificar a todos los jugadores de la sala
    io.to(idSala).emit("actualizarSala", sala);

    // Notificar al usuario que ha sido expulsado
    io.to(idSala).emit("expulsadoDeSala", { idExpulsado });

    // Redirigir al usuario expulsado
    io.to(idSala).emit("redirigirExpulsado", { idExpulsado });
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
  socket.on("salirSala", ({ idSala, idUsuario }) => {
    const sala = salas[idSala];
    if (!sala) return;

    // Buscar al jugador que está saliendo
    const jugador = sala.jugadores.find((j) => j.id === idUsuario);
    if (!jugador) return; // Si no se encuentra el jugador, salir

    // Eliminar al jugador de la sala
    sala.jugadores = sala.jugadores.filter((j) => j.id !== idUsuario);

    // Si la sala queda vacía, eliminarla
    if (sala.jugadores.length === 0) {
      delete salas[idSala];
      console.log(`Sala ${idSala} eliminada por falta de jugadores`);
    } else if (sala.lider === idUsuario) {
      // Asignar un nuevo líder si el líder se va
      sala.lider = sala.jugadores[0].id;
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
const manejarDesconexionSalas = (socket, io) => {
  for (const idSala in salas) {
    const sala = salas[idSala];
    const jugador = sala.jugadores.find((j) => j.socketId === socket.id);
    if (jugador) {
      // Eliminar al jugador de la sala
      sala.jugadores = sala.jugadores.filter((j) => j.socketId !== socket.id);
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

module.exports = { manejarConexionSalas, manejarDesconexionSalas, salas };
