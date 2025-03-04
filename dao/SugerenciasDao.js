const pool =require("../config/db");

class SugerenciasDAO{
  
    /**
   * Almacena una nueva sugerencia 
   * Tanto el contenido como el usuario que la envía
   * @param {number} idUsuario - ID del usuario que envía la sugerencia.
   * @param {string} contenido - Contenido de la sugerencia.
   * @returns {Promise<Object>} La sugerencia almacenada.
   */
    static async enviarSugerencia(idUsuario, contenido) {
        try {
          const query = `
            INSERT INTO "Sugerencias" ("idUsuario", contenido)
            VALUES ($1, $2)
            RETURNING "idSugerencia", "idUsuario", contenido, "fechaSugerencia"
          `;
          const { rows } = await pool.query(query, [idUsuario, contenido]);
          return rows[0];
        } catch (error) {
          console.error("Error al enviar sugerencia:", error);
          throw new Error("No se pudo enviar la sugerencia.");
        }
    }

    /**
    * Obtiene todas las sugerencias que ha enviado un usuario.
    * La he añadido porque podría ser útil para mostrar a un usuario su historial de sugerencias
    * @param {number} idUsuario - ID del usuario.
    * @returns {Promise<Array>} Lista de sugerencias del usuario.
    */
    static async obtenerSugerenciasPorUsuario(idUsuario) {
        try {
        const query = `
            SELECT "idSugerencia", "idUsuario", contenido, "fechaSugerencia"
            FROM "Sugerencias"
            WHERE "idUsuario" = $1
            ORDER BY "fechaSugerencia" DESC
        `;
        const { rows } = await pool.query(query, [idUsuario]);
        return rows;
        } catch (error) {
        console.error("Error al obtener sugerencias del usuario:", error);
        throw new Error("No se pudieron obtener las sugerencias del usuario.");
        }
    }

    /**
   * Obtiene todas las sugerencias almacenadas.
   * La he añadido porque puede ser útil si tenemos un rol de administrador que quiera ver todas las sugerencias
   * @returns {Promise<Array>} Lista de sugerencias.
   */
  static async obtenerSugerencias() {
    try {
      const query = `
        SELECT "idSugerencia", "idUsuario", contenido, "fechaSugerencia"
        FROM "Sugerencias"
        ORDER BY "fechaSugerencia" DESC
      `;
      const { rows } = await pool.query(query);
      return rows;
    } catch (error) {
      console.error("Error al obtener sugerencias:", error);
      throw new Error("No se pudieron obtener las sugerencias.");
    }
  }
}

module.exports = SugerenciasDAO;