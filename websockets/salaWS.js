const { generarCodigoInvitacion, validarCodigoInvitacion } = require("../utils/invitaciones");

let salas = {
    // Ejemplo de como serían las salas en memoria:
    // "sala123": {
    //   id: "sala123",
    //   jugadores: [
    //     { id: "user1", socketId: "socket123", desconectado: false },
    //     { id: "user2", socketId: "socket456", desconectado: false }
    //   ]
    // }
};// Estructura temporal en memoria


// Maneja la conexión a las salas
const manejarConexionSalas = (socket, io) => {
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
        if (sala.tipo === "privada" && sala.contrasena !== contrasena && !validarCodigoInvitacion(sala, codigoInvitacion)) {
            console.log("No se pudo unir a la sala: no dispones de una contraseña o código de invitación válidos.");
            return socket.emit("error", "Acceso denegado");
        }

        // Verificar si la sala tiene espacio para más jugadores
        if (sala.jugadores.length >= sala.maxJugadores) {
            console.log("Sala llena.");
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

        // Emitir evento de actualización de la sala
        io.to(idSala).emit("actualizarSala", sala);

        // Emitir evento de expulsión
        io.to(idSala).emit("expulsadoDeSala", { idExpulsado, idSala });
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
        // Emitir evento de actualización de la sala
        io.to(idSala).emit("actualizarSala", sala);

        // Emitir evento de que el jugador ha salido
        io.to(idSala).emit("jugadorSalio", { idUsuario, idSala });
    });
};


// Maneja la desconexión de salas
const manejarDesconexionSalas = (socket, io) => { // !!! FALTA TESTEAR
  for (const idSala in salas) {
    const sala = salas[idSala];
    const jugador = sala.jugadores.find(j => j.socketId === socket.id);
    if (jugador) {
      sala.jugadores = sala.jugadores.filter(j => j.socketId !== socket.id);
      io.to(idSala).emit("actualizarSala", sala);
      console.log(`Jugador ${jugador.id} desconectado de la sala ${idSala}`);
      break;
    }
  }
};

module.exports = { manejarConexionSalas, manejarDesconexionSalas, salas };
