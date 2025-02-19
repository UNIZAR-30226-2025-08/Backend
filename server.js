require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors()); // Permitir solicitudes desde el frontend
app.use(express.json()); // Permitir recibir JSON en las peticiones

// Ruta de prueba
app.get("/api/saludo", (req, res) => {
  res.json({ mensaje: "¡Hola desde el backendo!" });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
