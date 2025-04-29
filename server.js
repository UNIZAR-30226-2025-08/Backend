require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createServer } = require("http"); // Servidor HTTP necesario para WebSockets

const app = express();
const server = createServer(app);

// Middlewares
app.use(cors()); // Permitir solicitudes desde el frontend
app.use(express.json()); // Permitir recibir JSON en las peticiones

// Importar rutas
const usuarioRoutes = require("./routes/usuarioRoutes");
const partidaRoutes = require("./routes/partidaRoutes");
const solicitudAmistadRoutes = require("./routes/solicitudAmistadRoutes");
const amistadRoutes = require("./routes/amistadRoutes");
const juegaRoutes = require("./routes/juegaRoutes");
const sugerenciasRoutes = require("./routes/sugerenciasRoutes");
const rankingRoutes = require("./routes/rankingRoutes");
const administradorRoutes = require("./routes/administradorRoutes");
const estadisticasRoutes = require("./routes/estadisticasRoutes");

// Usar rutas
app.use("/api/usuario", usuarioRoutes);
app.use("/api/partida", partidaRoutes);
app.use("/api/solicitud", solicitudAmistadRoutes);
app.use("/api/amistad", amistadRoutes);
app.use("/api/juega", juegaRoutes);
app.use("/api/sugerencias", sugerenciasRoutes);
app.use("/api/ranking", rankingRoutes);
app.use("/api/admin", administradorRoutes);
app.use("/api/estadisticas", estadisticasRoutes);

// WebSockets
const servidorWS = require("./websockets/servidorWS");

// Inicializar WebSockets
const io = servidorWS(server);

/**
 * Inicia el servidor Express y WebSocket.
 * @function
 */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`WebSockets escuchando en ws://localhost:${PORT}`);
});


module.exports = { app, server };
