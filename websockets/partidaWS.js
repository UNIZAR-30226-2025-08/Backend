const { Server } = require("socket.io");
const redis = require("redis");
const { crearPartida, finalizarPartida } = require("../dao/PartidaDao");
//const { generarCodigoInvitacion, validarCodigoInvitacion } = require("../utils/invitaciones"); // !!!!
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

/* Tiempo de reconexión 10 seg */
const reconexionTimeout = 10000; // Tiempo en milisegundos para esperar reconexión (ej. 10 segundos)

// Creación, unión, inicio, actualización y finalización de partidas
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
              io.to(idSala).emit("actualizarSala", sala);
              console.log(`Usuario ${usuario.id} eliminado de la sala ${idSala} por reconexión fallida.`);
              
              // Si la sala queda vacía, eliminamos la sala
              if (sala.jugadores.length === 0) {
                delete salas[idSala];
              }
            }
          }, reconexionTimeout);
  
          break; // Se encontró la sala, salimos del bucle
        }
      }
    });

    // Crear sala
    socket.on("crearSala", async ({ nombreSala, tipo, contrasena, maxJugadores, maxRolesEspeciales }) => {
      //const idPartida = await crearPartida(nombreSala, tipo, contrasena); // !!! igual no deberíamos de crear la partida en la BBDD hasta que todos jugadores se hayan unido en la sala 
      const idSala = `sala_${Date.now()}`; // !!!!
      if(tipo === "privada") {
        const codigoInvitacion = generarCodigoInvitacion();
      }

      // Guardar sala en memoria
      salas[idPartida] = {
          id: idSala,
          nombre: nombreSala,
          tipo,
          contrasena,
          maxJugadores,
          maxRolesEspeciales,
          jugadores: [],
          codigoInvitacion,
      };

      socket.join(idPartida);
      io.to(idPartida).emit("salaCreada", salas[idPartida]);
    });

    // Unirse a la sala
    socket.on("unirseSala", ({ idPartida, usuario, contrasena, codigoInvitacion }) => {
      const sala = salas[idPartida];
      if (!sala) return socket.emit("error", "Sala inexistente");

      // Si la sala es privada, verificamos si la contraseña es correcta o si el código de invitación es válido
      if (sala.tipo === "privada" && sala.contrasena && sala.contrasena !== contrasena && !validarCodigoInvitacion(sala, codigoInvitacion)) {
        socket.emit("error", "Acceso denegado");
        return;
      }

      // Verificar si la sala tiene espacio para más jugadores
      if (sala.jugadores.length >= sala.maxJugadores) {
        return socket.emit("error", "Sala llena");
      }

      // Agregar jugador a la sala
      sala.jugadores.push(usuario);
      socket.join(idPartida);
      io.to(idPartida).emit("actualizarSala", sala);

      // Si el número de jugadores alcanza el máximo, iniciar la partida
      if (sala.jugadores.length === sala.maxJugadores) {
        io.to(idPartida).emit("iniciarPartida");
      }
    });

    // Iniciar la partida
    socket.on("iniciarPartida", async ({ idPartida }) => {
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
    });

    // Acción del jugador
    socket.on("accionJugador", async ({ idPartida, accion }) => {
      /*let partida = JSON.parse(await redisClient.get(`partida_${idPartida}`));
      if (partida) {
        partida.estado = accion.estado; // !!!
        //await redisClient.set(`partida_${idPartida}`, JSON.stringify(partida));
        io.to(idPartida).emit("actualizarEstado", partida); // !!!
      }*/
    });

    // Terminar la partida
    socket.on("terminarPartida", async ({ idPartida, resultado, resultadosJugadores }) => {
      /*let partida = JSON.parse(await redisClient.get(`partida_${idPartida}`));
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
      }*/
    });
  });
  return io;
};

module.exports = partidaWS;
