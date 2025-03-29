const pool = require("../config/db");

class PartidaDAO {
  /**
   * Crea una nueva partida.
   * @param {string} tipo - Tipo de partida ('publica' o 'privada').
   * @returns {Promise<Object>} Datos de la partida creada.
   */
  static async crearPartida(tipo) {
    try {
      // Validación de tipo de partida
      if (!["publica", "privada"].includes(tipo)) {
        throw new Error(
          "Tipo de partida inválido. Debe ser 'publica' o 'privada'."
        );
      }

      const query = `
        INSERT INTO "Partida" (tipo)
        VALUES ($1) 
        RETURNING "idPartida", tipo, fecha, estado, ganadores`;
      const { rows } = await pool.query(query, [tipo]);

      return rows[0];
    } catch (error) {
      console.error("Error al crear la partida:", error);
      throw new Error("No se pudo crear la partida.");
    }
  }

  /**
   * Finaliza una partida.
   * @param {number} idPartida - ID de la partida.
   * @param {string} estado - Nuevo estado ('terminada').
   * @param {string} ganadores - Bando ganador (lobos o aldeanos).
   * @returns {Promise<Object>} Partida finalizada o mensaje de error.
   */
  static async finalizarPartida(idPartida, estado, ganadores) {
    try {
      // Verificamos si se proporcionaron los datos necesarios
      if (!idPartida || estado !== "terminada" || !ganadores) {
        throw new Error(
          "Debe proporcionar el identificador de la partida, " +
            "el estado de la partida debe ser 'terminada' y " +
            "debe proporcionar el bando ganador"
        );
      }

      const query = `
        UPDATE "Partida" SET estado = $1, ganadores = $2 WHERE "idPartida" = $3 
        RETURNING "idPartida", tipo, fecha, estado, ganadores`;
      const { rows } = await pool.query(query, [estado, ganadores, idPartida]);

      if (rows.length === 0) {
        throw new Error("Partida no encontrada.");
      }

      return rows[0];
    } catch (error) {
      console.error("Error al finalizar la partida:", error);
      throw new Error("No se pudo finalizar la partida.");
    }
  }

  /**
   * Obtiene una partida por ID.
   * @param {number} idPartida - ID de la partida.
   * @returns {Promise<Object|null>} Datos de la partida o null si no existe.
   */
  static async obtenerPartida(idPartida) {
    try {
      const query = `
          SELECT "idPartida", tipo, fecha, estado, ganadores 
          FROM "Partida" WHERE "idPartida" = $1`;
      const { rows } = await pool.query(query, [idPartida]);
      return rows[0] || null;
    } catch (error) {
      console.error("Error al obtener la partida:", error);
      throw new Error("No se pudo obtener la partida.");
    }
  }
}

module.exports = PartidaDAO;
