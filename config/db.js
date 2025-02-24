require('dotenv').config(); // Carga las variables de entorno
const { Pool } = require("pg"); // Importa la librería pg para conexiones a PostgreSQL

// Configuración del pool de conexiones con Neon (PostgreSQL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // URL de conexión de Neon 

  connectionTimeoutMillisssl: {
    rejectUnauthorized: false, // Especificación necesaria para Neon en producción
  },
});

// Función para probar la conexión con la base de datos
const testConnection = async () => {
  try {
    const res = await pool.query("SELECT NOW()"); // Realiza una consulta simple
    console.log("Conexión exitosa a la base de datos:", res.rows[0]);
  } catch (err) {
    console.error("Error al conectar a la base de datos:", err);
  }
};

testConnection(); // Llama a la función para probar la conexión

module.exports = pool; // Exporta el pool para usarlo en otros módulos
