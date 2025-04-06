const { obtenerAmigos } = require("../dao/amistadDao"); // Función para obtener amigos de un usuario
let usuariosConectados = {}; // Almacena usuarios en línea { idUsuario: socketId }

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
      const amigos = await obtenerAmigos(idUsuario); // Supongamos que tienes una función para obtener amigos
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
        const sala = salas[idSala];
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
  socket.on("disconnect", () => {
    console.log(`Usuario desconectado: ${socket.id}`);

    // Buscar en todas las salas si existe un usuario con ese socketId
    for (const idSala in salas) {
      const sala = salas[idSala];
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
