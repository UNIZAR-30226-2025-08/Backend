require("dotenv").config(); // Carga las variables de entorno
const { Pool } = require("pg"); // Importa la librería pg para conexiones a PostgreSQL
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

// Configuración del pool de conexiones con Neon (PostgreSQL)
console.log("Conectando a la BD con:", process.env.DATABASE_URL);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // URL de conexión de Neon

  ssl: {
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

const carpetaCSV = "./csv/"; // Carpeta donde están los archivos CSV

// Orden específico de los archivos CSV
const ordenCSV = [
  "Usuario.csv",
  "Amistad.csv",
  "Partida.csv",
  "Juega.csv",
  "Sugerencias.csv",
  "SolicitudAmistad.csv",
  "Administrador.csv",
];

async function importarCSV(filePath, tableName) {
  const client = await pool.connect();
  const columnas = [];
  const filas = [];

  return new Promise((resolve, reject) => {
    // Se crea una stream de lectura para el archivo CSV y se procesa con csv-parser
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("headers", (headers) => {
        columnas.push(...headers); // Guarda los nombres de las columnas
      })
      .on("data", (row) => {
        filas.push(row);
      })
      .on("end", async () => {
        try {
          for (const row of filas) {
            // Mapea los valores, reemplazando cadenas vacías con NULL
            const valores = columnas.map((col) =>
              row[col] === "" ? null : row[col]
            );

            // Construye la consulta de inserción con placeholders ($1, $2, ...)
            const query = `INSERT INTO "${tableName}" (${columnas
              .map((col) => `"${col}"`)
              .join(", ")}) VALUES (${columnas
              .map((_, i) => `$${i + 1}`)
              .join(", ")})`;

            // Ejecuta la consulta para insertar la fila en la base de datos
            await client.query(query, valores);
          }
          console.log(` ${tableName} importado correctamente.`);
          resolve(); // Indica que la importación del archivo terminó con éxito
        } catch (err) {
          console.error(`Error insertando en ${tableName}:`, err.message);
          reject(err); // Rechaza la Promise si ocurre un error
        } finally {
          client.release(); // Libera la conexión con la base de datos
        }
      })
      .on("error", (err) => {
        console.error(`Error en archivo ${filePath}:`, err.message);
        client.release();
        reject(err);
      });
  });
}

async function importarTodosLosCSV() {
  // Recorre la lista ordenada de archivos CSV
  for (const file of ordenCSV) {
    const filePath = path.join(carpetaCSV, file);

    // Verifica si el archivo existe antes de importarlo
    if (fs.existsSync(filePath)) {
      const tableName = path.basename(file, ".csv"); // Usa el nombre del archivo como nombre de la tabla
      await importarCSV(filePath, tableName); // Espera la importación de cada archivo antes de continuar con el siguiente
    } else {
      console.warn(`Archivo ${file} no encontrado, se omitirá.`);
    }
  }
  console.log("Todos los CSV fueron importados en el orden definido.");
}

//importarTodosLosCSV();

//testConnection(); // Llama a la función para probar la conexión

module.exports = pool; // Exporta el pool para usarlo en otros módulos
