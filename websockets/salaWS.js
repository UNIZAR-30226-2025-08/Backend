const { generarCodigoInvitacion, validarCodigoInvitacion } = require("../utils/invitaciones");
const crypto = require("crypto");

let salas = {};  // Almacenamiento en memoria de las salas
let expulsados = {}; // Registro de jugadores expulsados

const manejarConexionSalas = (socket, io) => {  
    // Crear sala
    socket.on("crearSala", async ({ nombreSala, tipo, contrasena, maxJugadores, maxRolesEspeciales, usuario }) => {
        const idSala = `sala_${crypto.randomUUID()}`;
        const codigoInvitacion = tipo === "privada" ? generarCodigoInvitacion() : null;
    
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
    });
    
    socket.on("unirseSala", ({ idSala, usuario }) => {
        const sala = salas[idSala];
        if (!sala) {
            socket.emit("error", "Sala inexistente");
            return;
        }
    
        // Verificar si el jugador está expulsado
        if (expulsados[idSala] && expulsados[idSala].includes(usuario.id)) {
            socket.emit("error", "Estás expulsado de esta sala y no puedes unirte nuevamente.");
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
        io.to(idSala).emit("jugadorUnido", { nombre: usuario.nombre, id: usuario.id });
    
        // Retrasar la actualización de la sala para disimular la reconexión
        setTimeout(() => {
            io.to(idSala).emit("actualizarSala", sala);
        }, 1000); // 1 segundo de retraso
    });
    

    // Obtener la información de una sala
    socket.on("obtenerSala", (idSala, callback) => {
        const sala = salas[idSala];
        if (!sala) return callback(null);
        
        // Devolver la sala con su estado actualizado
        callback({
            ...sala,
            jugadores: sala.jugadores.map(j => ({
                id: j.id,
                listo: j.listo ?? false,
                socketId: j.socketId
            }))
        });
    });

    // Marcar estado de un jugador dentro de la sala
    socket.on("marcarEstado", ({ idSala, idUsuario, estado }) => {
        const sala = salas[idSala];
        if (!sala) {
            socket.emit("error", "La sala no existe.");
            return;
        }

        const jugador = sala.jugadores.find(j => j.id === idUsuario);
        if (!jugador) {
            socket.emit("error", "El jugador no está en la sala.");
            return;
        }

        // Cambiar el estado del jugador
        jugador.listo = estado;

        socket.emit("estadoCambiado", { idUsuario, estado }); // Confirmar al usuario
        io.to(idSala).emit("actualizarSala", sala); // Actualizar a todos
    });

    // Obtener lista de salas disponibles
    socket.on("obtenerSalas", () => {
        socket.emit("listaSalas", Object.values(salas));
    });

    // Expulsar a un jugador
    socket.on("expulsarJugador", ({ idSala, idLider, idExpulsado }) => {
        const sala = salas[idSala];
        if (!sala || sala.lider !== idLider) return;

        // Registrar al expulsado
        if (!expulsados[idSala]) {
            expulsados[idSala] = [];
        }
        expulsados[idSala].push(idExpulsado);

        // Eliminar al jugador de la sala
        sala.jugadores = sala.jugadores.filter(j => j.id !== idExpulsado);

        // Notificar a todos los jugadores de la sala
        io.to(idSala).emit("actualizarSala", sala);

        // Notificar al usuario que ha sido expulsado
        io.to(idSala).emit("expulsadoDeSala", { idExpulsado });

        // Redirigir al usuario expulsado
        io.to(idSala).emit("redirigirExpulsado", { idExpulsado });
    });

    // Salir de la sala
    socket.on("salirSala", ({ idSala, idUsuario }) => {
        const sala = salas[idSala];
        if (!sala) return;
    
        // Buscar al jugador que está saliendo
        const jugador = sala.jugadores.find(j => j.id === idUsuario);
        if (!jugador) return; // Si no se encuentra el jugador, salir
    
        // Eliminar al jugador de la sala
        sala.jugadores = sala.jugadores.filter(j => j.id !== idUsuario);
    
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
        io.to(idSala).emit("jugadorSalido", { nombre: jugador.nombre, id: idUsuario });
    });
};

// Manejar desconexión de jugadores
const manejarDesconexionSalas = (socket, io) => {
    for (const idSala in salas) {
        const sala = salas[idSala];
        const jugador = sala.jugadores.find(j => j.socketId === socket.id);
        if (jugador) {
            // Eliminar al jugador de la sala
            sala.jugadores = sala.jugadores.filter(j => j.socketId !== socket.id);
            io.to(idSala).emit("actualizarSala", sala);
            console.log(`Jugador ${jugador.id} desconectado de la sala ${idSala}`);

            // Notificar a todos los jugadores de la sala que un jugador ha salido
            io.to(idSala).emit("jugadorSalido", { nombre: jugador.nombre, id: jugador.id });
            break;
        }
    }
};

module.exports = { manejarConexionSalas, manejarDesconexionSalas, salas };