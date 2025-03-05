const { Server } = require("socket.io");
const redis = require("redis");
const { crearPartida, finalizarPartida } = require("../dao/PartidaDao");
const { generarCodigoInvitacion, validarCodigoInvitacion } = require("../utils/invitaciones");
const { obtenerAmigos } = require("../dao/AmistadDao"); // Función para obtener amigos de un usuario
//const { obtenerJugadoresSala, asignarRoles } = require("./gameLogic"); // !!!

//const io = new Server({ cors: { origin: "*" } });

//const redisClient = redis.createClient();

const salas = {
  // Ejemplo de como serían las salas en memoria:
  // "sala123": {
  //   id: "sala123",
  //   jugadores: [
  //     { id: "user1", socketId: "socket123", desconectado: false },
  //     { id: "user2", socketId: "socket456", desconectado: false }
  //   ]
  // }
};// Estructura temporal en memoria

const usuariosConectados = {}; // Almacena usuarios en línea { idUsuario: socketId }

/* Tiempo de reconexión 20 seg */
const reconexionTimeout = 20000; // Tiempo en milisegundos para esperar reconexión (ej. 20 segundos)

const partidaWS = (server) => {
  if (!server) {
    console.error("Error: el servidor HTTP no está definido.");
    return;
  }

  // Crear un nuevo servidor Socket.IO usando el servidor HTTP
  const io = new Server(server, { cors: { origin: "*" } });
  console.log("Servidor WebSocket inicializado");

  io.on("connection", (socket) => {
    console.log(`Usuario conectado: ${socket.id}`);
  
    // Registrar usuario en línea y notificar a sus amigos
    /*socket.on("registrarUsuario", async ({ idUsuario }) => {
      usuariosConectados[idUsuario] = socket.id;

      // Obtener amigos del usuario
      const amigos = await obtenerAmigos(idUsuario);

      // Notificar a los amigos del usuario sobre su conexión
      amigos.forEach((idAmigo) => {
        if (usuariosConectados[idAmigo]) {
          io.to(usuariosConectados[idAmigo]).emit("estadoAmigo", { idUsuario, en_linea: true });
        }
      });
    });

    // Un usuario solicita el estado de sus amigos
    socket.on("solicitarEstadoAmigos", async ({ idUsuario }) => {
      const amigos = await obtenerAmigos(idUsuario);
      const estadoAmigos = amigos.map(idAmigo => ({
        idUsuario: idAmigo,
        en_linea: !!usuariosConectados[idAmigo]
      }));

      socket.emit("estadoAmigos", estadoAmigos);
    });*/

    // Evento para manejar reconexiones: desde el cliente nos tienen enviar su id de usuario y la sala a la que pertenecía
    socket.on("reconectar", ({ idUsuario, idSala }) => {
      const sala = salas[idSala];
      if (sala) {
        const usuario = sala.jugadores.find(j => j.id === idUsuario);
        // Si el usuario existe y está marcado como desconectado
        if (usuario && usuario.desconectado) {
          // Actualiza el socketId y marca al usuario como reconectado (se vuelve a conectar)
          usuario.socketId = socket.id;
          usuario.desconectado = false;
          socket.join(idSala);
          io.to(idSala).emit("actualizarSala", sala);
          console.log(`Usuario ${idUsuario} se reconectó a la sala ${idSala}`);
        } else {
          console.log(`Reconexión fallida: usuario ${idUsuario} no encontrado en la sala ${idSala}`);
        }
      }
    });
  
    /**
     * Maneja la desconexión de un usuario.
     * @event disconnect
     */
    socket.on("disconnect", () => {
      console.log(`Usuario desconectado: ${socket.id}`);
  
      // Buscar en todas las salas si existe un usuario con ese socketId
      for (const idSala in salas) {
        const sala = salas[idSala];
        const usuario = sala.jugadores.find(j => j.socketId === socket.id);
        if (usuario) {
          // Marcar al usuario como desconectado
          usuario.desconectado = true;
  
          // Establecemos un tiempo de espera (10seg) para confirmar la desconexión definitiva
          setTimeout(() => {
            // Si el usuario sigue marcado como desconectado, eliminarlo de la sala
            if (usuario.desconectado) {
              sala.jugadores = sala.jugadores.filter(j => j.socketId !== socket.id);

              // Si la sala queda vacía, eliminamos la sala
              if (sala.jugadores.length === 0) {
                delete salas[idSala];
                console.log(`Sala ${idSala} eliminada por falta de jugadores`);
              } else if (sala.lider === usuario.id) {
                // Si el líder de la sala se desconecta, asignar un nuevo líder
                sala.lider = sala.jugadores[0].id;
                console.log(`Lider ${usuario.id} eliminado de la sala ${idSala}. Nuevo líder asignado: ${sala.lider}`);
              }
              io.to(idSala).emit("actualizarSala", sala);
              console.log(`Usuario ${usuario.id} eliminado de la sala ${idSala} por desconexión.`);
            }
          }, reconexionTimeout);

          break; // Se encontró la sala, salimos del bucle
        }
      }
    });

    // Crear sala
    socket.on("crearSala", async ({ nombreSala, tipo, contrasena, maxJugadores, maxRolesEspeciales, usuario }) => {
      //const idPartida = await crearPartida(nombreSala, tipo, contrasena); // !!! igual no deberíamos de crear la partida en la BBDD hasta que todos jugadores se hayan unido en la sala 
      const idSala = `sala_${crypto.randomUUID()}`; // Generar un ID único para la sala
      const codigoInvitacion = tipo === "privada" ? generarCodigoInvitacion() : null;
      
      // Guardar sala en memoria
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
      io.to(idSala).emit("salaCreada", salas[idSala]);
    });

    // Unirse a la sala
    socket.on("unirseSala", ({ idSala, usuario, contrasena, codigoInvitacion }) => {
      const sala = salas[idSala];
      if (!sala) return socket.emit("error", "Sala inexistente");

      // Si la sala es privada, verificamos si la contraseña es correcta o si el código de invitación es válido
      if (sala.tipo === "privada" && sala.contrasena && sala.contrasena !== contrasena && !validarCodigoInvitacion(sala, codigoInvitacion)) {
        return socket.emit("error", "Acceso denegado");
      }

      // Verificar si la sala tiene espacio para más jugadores
      if (sala.jugadores.length >= sala.maxJugadores) {
        return socket.emit("error", "Sala llena");
      }

      // Agregar jugador a la sala
      sala.jugadores.push({ ...usuario, socketId: socket.id });
      socket.join(idSala);
      io.to(idSala).emit("actualizarSala", sala);
    });

    // Marca el estado de un jugador como listo o no listo dentro de la sala
    socket.on("marcarEstado", ({ idSala, idUsuario, estado }) => {
      const sala = salas[idSala];
      if (!sala) return; // Sala no encontrada
      const jugador = sala.jugadores.find(j => j.id === idUsuario);
      if (jugador) { // Marcar al jugador como listo o no listo
        jugador.listo = estado;
        io.to(idSala).emit("actualizarSala", sala);
      }
    });

    // Expulsar a un jugador de la sala si el líder lo solicita
    socket.on("expulsarJugador", ({ idSala, idLider, idExpulsado }) => {
      const sala = salas[idSala];
      if (!sala || sala.lider !== idLider) return; // Sala no encontrada o el usuario que solicita la expulsión no es el líder
      sala.jugadores = sala.jugadores.filter(j => j.id !== idExpulsado);
      io.to(idSala).emit("actualizarSala", sala);
    });

    // Salir de la sala
    socket.on("salirSala", ({ idSala, idUsuario }) => {
      const sala = salas[idSala];
      if (!sala) return; // Sala no encontrada
      sala.jugadores = sala.jugadores.filter(j => j.id !== idUsuario);
      if (sala.jugadores.length === 0) {
        delete salas[idSala]; // Eliminar la sala si no hay jugadores
        console.log(`Sala ${idSala} eliminada por falta de jugadores`);
      } else if (sala.lider === idUsuario) {
        sala.lider = sala.jugadores[0].id; // Asignar un nuevo líder si el actual sale
      }
      io.to(idSala).emit("actualizarSala", sala);
    });

    // Iniciar la partida
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
  });
  return io;
};

module.exports = partidaWS;
