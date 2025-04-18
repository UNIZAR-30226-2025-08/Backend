const { obtenerAmigos } = require("../dao/amistadDao"); // Función para obtener amigos de un usuario
let usuariosConectados = {}; // Almacena usuarios en línea { idUsuario: socketId }
const { getSalas, salas, guardarSalasEnRedis } = require("./salaWS");

/* Tiempo de reconexión 20 seg */
const reconexionTimeout = 20000; // Tiempo en milisegundos para esperar reconexión (ej. 20 segundos)

/**
 * @file usuarioWS.js
 * @description Websockets para la gestion de usuarios.
 * @module API_WB_Usuarios
 */

// Maneja la reconexión de un usuario
const manejarReconexionUsuarios = (socket, usuariosConectados, io) => {
  // Evento para manejar reconexiones: desde el cliente nos tienen enviar su id de usuario
  // y la sala a la que pertenecía
  /**
   * Un usuario se reconecta al sistema y, opcionalmente, a una sala.
   * @event reconectar
   *
   * @param {Object} datos - Datos del usuario que intenta reconectarse.
   * @param {number} datos.idUsuario - ID del usuario que se reconecta.
   * @param {string} [datos.idSala] - ID de la sala a la que el usuario intenta reconectarse.
   *
   * @emits estadoAmigo
   * @param {Object} amigo - Estado del amigo notificado.
   * @param {number} amigo.idUsuario - ID del usuario que se ha reconectado.
   * @param {boolean} amigo.en_linea - Estado de conexión del usuario (true si está en línea).
   *
   * @emits actualizarSala
   * @param {Object} sala - Estado actualizado de la sala si el usuario se reconecta exitosamente.
   */
  socket.on("reconectar", async ({ idUsuario, idSala }) => {
    // Verificar si el usuario ya está registrado en la lista de conectados
    if (usuariosConectados[idUsuario]) {
      // Si el usuario se reconecta, actualizamos su socketId
      usuariosConectados[idUsuario] = socket.id;

      // Emitir a los amigos del usuario que ahora está en línea
      const amigos = await obtenerAmigos(idUsuario);
      amigos.forEach((idAmigo) => {
        if (usuariosConectados[idAmigo]) {
          io.to(usuariosConectados[idAmigo]).emit("estadoAmigo", {
            idUsuario,
            en_linea: true,
          });
        }
      });

      console.log(`Usuario ${idUsuario} se reconectó`);
      if (idSala) {
        const sala = getSalas()[idSala];
        if (sala) {
          const usuario = sala.jugadores.find((j) => j.id === idUsuario);
          // Si el usuario existe y está marcado como desconectado
          if (usuario && usuario.desconectado) {
            // Actualiza el socketId y marca al usuario como reconectado (se vuelve a conectar)
            usuario.socketId = socket.id;
            usuario.desconectado = false;
            socket.join(idSala);
            io.to(idSala).emit("actualizarSala", sala);
            console.log(
              `Usuario ${idUsuario} se reconectó a la sala ${idSala}`
            );
            await guardarSalasEnRedis();
          }
        } else {
          console.log(
            `Reconexión fallida: usuario ${idUsuario} no encontrado en la sala ${idSala}`
          );
        }
      }
    } else {
      console.log(`Reconexión fallida: usuario ${idUsuario} no encontrado`);
    }
  });
};

// Maneja la conexión de usuarios
const manejarConexionUsuarios = (socket, io) => {
  /**
   * Registrar usuario en línea y notificar a sus amigos.
   * @event registrarUsuario
   *
   * @param {Object} datos - Datos del usuario a registrar.
   * @param {number} datos.idUsuario - ID del usuario que se conecta.
   *
   * @emits estadoAmigo
   * @param {Object} amigo - Estado del amigo notificado.
   * @param {number} amigo.idUsuario - ID del usuario que se ha conectado.
   * @param {boolean} amigo.en_linea - Estado de conexión del usuario (true si está en línea).
   */
  socket.on("registrarUsuario", async ({ idUsuario }) => {
    usuariosConectados[idUsuario] = socket.id;

    // Obtener amigos del usuario
    const amigos = await obtenerAmigos(idUsuario);

    // Notificar a los amigos del usuario sobre su conexión
    amigos.forEach((idAmigo) => {
      if (usuariosConectados[idAmigo]) {
        io.to(usuariosConectados[idAmigo]).emit("estadoAmigo", {
          idUsuario,
          en_linea: true,
        });
      }
    });
  });

  /**
   * Escucha cuando un usuario se desconecta manualmente (desde el frontend)
   * @event desconectarUsuario
   */
  socket.on("desconectarUsuario", async ({ idUsuario }) => {
    // Primero eliminamos del objeto de conectados
    delete usuariosConectados[idUsuario];

    // Ahora notificamos a todos los amigos que este usuario se ha desconectado
    const amigos = await obtenerAmigos(idUsuario);
    amigos.forEach((idAmigo) => {
      if (usuariosConectados[idAmigo]) {
        io.to(usuariosConectados[idAmigo]).emit("estadoAmigo", {
          idUsuario,
          en_linea: false,
        });
      }
    });

    console.log(`Usuario ${idUsuario} se desconectó voluntariamente`);
  });

  /**
   * Un usuario solicita el estado de sus amigos.
   * @event solicitarEstadoAmigos
   *
   * @param {Object} datos - Datos del usuario que solicita el estado de sus amigos.
   * @param {number} datos.idUsuario - ID del usuario que realiza la solicitud.
   *
   * @emits estadoAmigos
   * @param {Object[]} amigos - Lista de los estados de los amigos.
   * @param {number} amigos.idUsuario - ID de cada amigo.
   * @param {boolean} amigos.en_linea - Estado de conexión de cada amigo (true si está en línea).
   */
  socket.on("solicitarEstadoAmigos", async ({ idUsuario }) => {
    const amigos = await obtenerAmigos(idUsuario);
    const estadoAmigos = amigos.map((idAmigo) => ({
      idUsuario: idAmigo,
      en_linea: !!usuariosConectados[idAmigo],
    }));

    console.log(`Estado de amigos para el usuario ${idUsuario}:`, estadoAmigos);

    socket.emit("estadoAmigos", estadoAmigos);
  });
};

const manejarAmigos = (socket, io) => {
  /**
   * Escucha el evento "solicitudAmistad" para gestionar el envío de solicitudes de amistad en tiempo real.
   *
   * @event solicitudAmistad
   *
   * @param {Object} datos - Datos de la solicitud de amistad.
   * @param {number} datos.idEmisor - ID del usuario que envía la solicitud.
   * @param {number} datos.idReceptor - ID del usuario que debe recibir la solicitud.
   *
   * @emits nuevaSolicitud - Emite este evento al usuario receptor si está en línea.
   * @param {Object} payload - Contiene el ID del usuario emisor.
   * @param {number} payload.idEmisor - ID del usuario que envía la solicitud.
   */
  socket.on("solicitudAmistad", ({ idEmisor, idReceptor }) => {
    if (usuariosConectados[idReceptor]) {
      io.to(usuariosConectados[idReceptor]).emit("nuevaSolicitud", {
        idEmisor,
      });
      console.log(
        `Solicitud de amistad enviada desde ${idEmisor} a ${idReceptor}`
      );
    } else {
      console.log(`Usuario receptor ${idReceptor} no está conectado.`);
    }
  });

  /**
   * Maneja la notificación de que una solicitud de amistad ha sido aceptada.
   * @event solicitudAceptada
   *
   * @param {Object} datos - Datos de la solicitud aceptada.
   * @param {number} datos.idUsuario - ID del usuario que envió la solicitud de amistad que fue aceptada.
   *
   * @emits solicitudAceptada - Notifica al usuario que su solicitud fue aceptada.
   * @param {Object} payload - Contiene el ID del usuario que envió la solicitud de amistad que fue aceptada.
   * @param {number} payload.idUsuario - ID del usuario que envió la solicitud de amistad que fue aceptada.
   */
  socket.on("solicitudAceptada", ({ idUsuario }) => {
    if (usuariosConectados[idUsuario]) {
      io.to(usuariosConectados[idUsuario]).emit("solicitudAceptada", {
        idUsuario,
      });
      console.log(
        `Solicitud de amistad aceptada. Enviando notificación al usuario que envió la solicitud: ${idUsuario}`
      );
    } else {
      console.log(
        `Usuario ${idUsuario} no está conectado para recibir la notificación.`
      );
    }
  });

  /**
   * Maneja la notificación de que un amigo ha sido eliminado.
   * @event amigoEliminado
   *
   * @param {Object} datos - Datos de la eliminación de amigo.
   * @param {number} datos.idUsuario - ID del usuario que fue eliminado como amigo.
   *
   * @emits amigoEliminado - Notifica al usuario que fue eliminado como amigo.
   * @param {Object} payload - Contiene el ID del usuario que fue eliminado como amigo.
   * @param {number} payload.idUsuario - ID del usuario que fue eliminado como amigo.
   */
  socket.on("amigoEliminado", ({ idUsuario }) => {
    if (usuariosConectados[idUsuario]) {
      io.to(usuariosConectados[idUsuario]).emit("amigoEliminado", {
        idUsuario,
      });
      console.log(
        `Notificación de eliminación de amigo enviada al usuario: ${idUsuario}`
      );
    } else {
      console.log(
        `Usuario ${idUsuario} no está conectado para recibir la notificación de eliminación.`
      );
    }
  });

  /**
   * Invita a un amigo a una sala.
   * @event invitarASala
   *
   * @param {Object} datos - Datos de la invitación.
   * @param {number} datos.idAmigo - ID del usuario que debe recibir la invitación.
   * @param {number} datos.idSala - ID de la sala que se invita al usuario.
   * @param {number} datos.idInvitador - ID del usuario que invita al amigo.
   *
   * @emits error
   * @param {string} error.mensaje - Mensaje de error.
   *
   * @emits invitacionSala
   * @param {Object} invitacion - Datos de la invitación enviada.
   * @param {number} invitacion.idSala - ID de la sala invitada.
   * @param {number} invitacion.idInvitador - ID del usuario que invitó al amigo.
   * @param {string} invitacion.codigoInvitacion - Código de invitación de la sala.
   *
   * @emits invitacionRechazada
   * @param {Object} invitacion - Datos de la invitación que no se pudo enviar.
   * @param {number} invitacion.idAmigo - ID del usuario que no está en línea.
   */
  socket.on("invitarASala", ({ idAmigo, idSala, idInvitador }) => {
    const socketAmigo = usuariosConectados[idAmigo];
    const sala = getSalas()[idSala];
    console.log(sala);

    if (!sala) {
      io.to(usuariosConectados[idInvitador]).emit("error", "La sala no existe");
      console.log(
        `Error: La sala ${idSala} no existe. No se puede enviar la invitación.`
      );
      return;
    }

    if (socketAmigo) {
      io.to(socketAmigo).emit("invitacionSala", {
        idSala,
        idInvitador, // para que el frontend sepa quién lo invitó
        codigoInvitacion: sala.codigoInvitacion, // Enviamos el código de invitación de la sala
      });
      console.log(
        `Invitación enviada de ${idInvitador} a ${idAmigo} para sala ${idSala}`
      );
    } else {
      // Si el usuario no está en línea, no se puede enviar la invitación
      // Avisar al invitador de ello
      io.to(usuariosConectados[idInvitador]).emit("invitacionRechazada", {
        idAmigo,
      });
      console.log(
        `Usuario ${idAmigo} no está en línea. No se pudo enviar la invitación.`
      );
    }
  });
};

// Maneja la desconexión de usuarios
const manejarDesconexionUsuarios = (socket, salas, io) => {
  /**
   * Maneja la desconexión de un usuario.
   * @event disconnect
   *
   * @emits actualizarSala
   * @param {Object} sala - Estado actualizado de la sala si un jugador se desconecta.
   *
   * @emits estadoAmigo
   * @param {Object} amigo - Estado del amigo desconectado.
   * @param {number} amigo.idUsuario - ID del usuario que se ha desconectado.
   * @param {boolean} amigo.en_linea - Estado de conexión (false cuando se desconecta).
   */
  socket.on("disconnect", async () => {
    console.log(`Usuario desconectado: ${socket.id}`);

    // Buscar en todas las salas si existe un usuario con ese socketId
    for (const idSala in salas) {
      const sala = getSalas()[idSala];
      const usuario = sala.jugadores.find((j) => j.socketId === socket.id);
      if (usuario) {
        // Marcar al usuario como desconectado
        usuario.desconectado = true;

        // Establecemos un tiempo de espera (10seg) para confirmar la desconexión definitiva
        setTimeout(() => {
          // Si el usuario sigue marcado como desconectado, eliminarlo de la sala
          if (usuario.desconectado) {
            sala.jugadores = sala.jugadores.filter(
              (j) => j.socketId !== socket.id
            );

            // Si la sala queda vacía, eliminamos la sala
            if (sala.jugadores.length === 0) {
              delete salas[idSala];
              guardarSalasEnRedis();
              console.log(`Sala ${idSala} eliminada por falta de jugadores`);
            } else if (sala.lider === usuario.id) {
              // Si el líder de la sala se desconecta, asignar un nuevo líder
              sala.lider = sala.jugadores[0].id;
              console.log(
                `Lider ${usuario.id} eliminado de la sala ${idSala}. Nuevo líder asignado: ${sala.lider}`
              );
            }
            io.to(idSala).emit("actualizarSala", sala);
            console.log(
              `Usuario ${usuario.id} eliminado de la sala ${idSala} por desconexión.`
            );
          }
        }, reconexionTimeout);

        break; // Se encontró la sala, salimos del bucle
      }
    }

    // Quitar al usuario de usuariosConectados y notificar a sus amigos
    for (const idUsuario in usuariosConectados) {
      if (usuariosConectados[idUsuario] === socket.id) {
        delete usuariosConectados[idUsuario];

        // Notificar a los amigos de su desconexión
        io.emit("estadoAmigo", { idUsuario, en_linea: false });
        console.log(`Usuario ${idUsuario} desconectado`);
        break;
      }
    }
  });
};

module.exports = {
  manejarAmigos,
  manejarReconexionUsuarios,
  manejarConexionUsuarios,
  manejarDesconexionUsuarios,
  usuariosConectados,
};
