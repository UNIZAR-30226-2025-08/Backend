require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const https = require("https"); // Usamos https

const app = express();

// Cargar los certificados SSL de Let's Encrypt
const options = {
  key: fs.readFileSync("/etc/letsencrypt/live/albertofsg.ddns.net/privkey.pem"),
  cert: fs.readFileSync(
    "/etc/letsencrypt/live/albertofsg.ddns.net/fullchain.pem"
  ),
};

// Crear un servidor HTTPS
const server = https.createServer(options, app);

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
const PORT = process.env.PORT || 443;

server.listen(PORT, () => {
  console.log(`Servidor corriendo en https://localhost:${PORT}`);
  console.log(`WebSockets escuchando en wss://localhost:${PORT}`);
});

module.exports = { app, server };
