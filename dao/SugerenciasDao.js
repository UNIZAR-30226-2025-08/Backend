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
   * Marca si una sugerencia ha sido revisada.
   * Función de el rol de administrador
   * @param {number} idSugerencia - ID de la sugerencia.
   * @param {boolean} revisada - Estado de revisión.
   * @returns {Promise<Object>} La sugerencia actualizada con el nuevo estado.
   */
    static async marcarRevisada(idSugerencia, revisada) {
      try {
        const query = `
          UPDATE "Sugerencias"
          SET revisada = $1
          WHERE "idSugerencia" = $2
          RETURNING "idSugerencia", revisada
        `;
        const { rows } = await pool.query(query, [revisada, idSugerencia]);
        return rows[0];
      } catch (error) {
        console.error("Error al marcar sugerencia como revisada:", error);
        throw new Error("Error actualizando el estado de la sugerencia.");
      }
    }
    /**
     * Obtiene las sugerencias que no han sido revisadas.
     * Útil si el administrador solo quiere mirar las no revisadas
     * @returns {Promise<Array>} Lista de sugerencias no revisadas.
     */
    static async obtenerSugerenciasNoRevisadas() {
      try {
        const query = `
          SELECT "idSugerencia", "idUsuario", contenido, "fechaSugerencia", revisada
          FROM "Sugerencias"
          WHERE revisada = false
          ORDER BY "fechaSugerencia" DESC
        `;
        const { rows } = await pool.query(query);
        return rows;
      } catch (error) {
        console.error("Error al obtener sugerencias no revisadas:", error);
        throw new Error("No se pudieron obtener las sugerencias no revisadas.");
      }
    }
}

module.exports = SugerenciasDAO;