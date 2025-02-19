const { Pool } = require("pg");

// Configuración de la conexión con Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // URL de conexión de Neon
  ssl: {
    rejectUnauthorized: false, // Necesario para conectar a Neon en producción
  },
});

module.exports = pool;
