const { Server } = require("socket.io");
const redis = require("redis");
const { crearPartida, finalizarPartida } = require("../dao/PartidaDao");
//const { obtenerJugadoresSala, asignarRoles } = require("./gameLogic"); // !!!

const io = new Server({ cors: { origin: "*" } });
const redisClient = redis.createClient();

const salas = {}; // Estructura temporal en memoria

// Creación, unión, inicio, actualización y finalización de partidas
const partidaWS = (socket) => {
//io.on("connection",
    console.log(`Usuario conectado: ${socket.id}`);

    // Crear sala
    socket.on("crearSala", async ({ nombreSala, tipo, contrasena, maxJugadores, maxRolesEspeciales }) => {
        const idPartida = await crearPartida(nombreSala, tipo, contrasena);
        
        // Guardar sala en memoria
        salas[idPartida] = {
            id: idPartida,
            nombre: nombreSala,
            tipo,
            contrasena,
            maxJugadores,
            maxRolesEspeciales,
            jugadores: [],
        };
        
        socket.join(idPartida);
        io.to(idPartida).emit("salaCreada", salas[idPartida]);
    });

    // Unirse a la sala
    socket.on("unirseSala", ({ idPartida, usuario, contrasena }) => {
        if (salas[idPartida]) {
            // Si la sala tiene una contraseña, verificamos si la contraseña es correcta
            if (salas[idPartida].contrasena && salas[idPartida].contrasena !== contrasena) {
                socket.emit("error", "Contraseña incorrecta");
                return;
            }
    
            // Verificar si la sala tiene espacio para más jugadores
            if (salas[idPartida].jugadores.length < salas[idPartida].maxJugadores) {
                salas[idPartida].jugadores.push(usuario);
                socket.join(idPartida);
                io.to(idPartida).emit("actualizarSala", salas[idPartida]);
    
                // Si el número de jugadores alcanza el máximo, iniciar la partida
                if (salas[idPartida].jugadores.length === salas[idPartida].maxJugadores) {
                    io.to(idPartida).emit("iniciarPartida");
                }
            } else {
                socket.emit("error", "Sala llena");
            }
        } else {
            socket.emit("error", "Sala inexistente");
        }
    });

    // Iniciar la partida
    socket.on("iniciarPartida", async ({ idPartida }) => {
        if (salas[idPartida]) {
            // Obtener jugadores de la sala
            //const jugadores = obtenerJugadoresSala(idPartida); !!!

            // Asignar roles, pasando maxRolesEspeciales como parámetro
            //const rolesAsignados = asignarRoles(jugadores, salas[idPartida].maxRolesEspeciales); !!!
            
            const partida = { id: idPartida, jugadores: rolesAsignados, estado: "en_curso" };

            // Guardar en Redis y en memoria
            await redisClient.set(`partida_${idPartida}`, JSON.stringify(partida));
            
            io.to(idPartida).emit("partidaIniciada", partida);
        }
    });

    // Acción del jugador
    socket.on("accionJugador", async ({ idPartida, accion }) => {
        let partida = JSON.parse(await redisClient.get(`partida_${idPartida}`));
        if (partida) {
            partida.estado = accion.estado; // !!!
            await redisClient.set(`partida_${idPartida}`, JSON.stringify(partida));
            io.to(idPartida).emit("actualizarEstado", partida); // !!!
        }
    });

    // Terminar la partida
    socket.on("terminarPartida", async ({ idPartida, resultado }) => {
        let partida = JSON.parse(await redisClient.get(`partida_${idPartida}`));
        if (partida) {
            // Guardar resultados en PostgreSQL
            await finalizarPartida(idPartida, 'terminada', resultado); // !!!

            /* ACTUALIZAR RESULTADOS DE LA TABLA JUEGA PARA CADA JUGADOR !!!!!!!!!! */

            // Eliminar de Redis para liberar memoria
            await redisClient.del(`partida_${idPartida}`);
            io.to(idPartida).emit("partidaTerminada", resultado);
        }
    });

    /**
     * Maneja la desconexión de un usuario.
     * @event disconnect
     */
    socket.on("disconnect", () => {
        console.log(`Usuario desconectado: ${socket.id}`); // !!! Manejar desconexiones de usuarios
    });
};

module.exports = partidaWS;
