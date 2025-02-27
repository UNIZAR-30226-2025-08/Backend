const pool = require("../config/db");

class JuegaDAO {
  /**
   * Asigna un usuario a una partida con su rol, evitando duplicados.
   * @param {number} idUsuario - ID del usuario.
   * @param {number} idPartida - ID de la partida.
   * @param {string} rolJugado - Rol del usuario en la partida.
   * @returns {Promise<Object>} Registro de la relación.
   */
  static async asignarUsuarioAPartida(idUsuario, idPartida, rolJugado) {
    const rolesValidos = ["lobo", "aldeano", "vidente", "bruja", "cazador"];

    if (!rolesValidos.includes(rolJugado)) {
      throw new Error(`Rol inválido. Debe ser uno de: ${rolesValidos.join(", ")}`);
    }

    try {
      // Insertar usuario en la partida
      const insertQuery = `INSERT INTO "Juega" ("idUsuario", "idPartida2", "rolJugado") VALUES ($1, $2, $3) RETURNING *`;
      const { rows } = await client.query(insertQuery, [idUsuario, idPartida, rolJugado]);

      return rows[0];
    } catch (error) {
      if (error.code === "23505") { // Código de error para clave duplicada en PostgreSQL
        throw new Error("El usuario ya está registrado en esta partida.");
      }

      console.error("Error al asignar usuario a la partida:", error);
      throw new Error("No se pudo asignar el usuario a la partida.");
    }
  }

  /**
   * Obtiene todas las partidas en las que ha participado un usuario con detalles.
   * @param {number} idUsuario - ID del usuario.
   * @returns {Promise<Array>} Lista de partidas con detalles, ordenadas por fecha descendente.
   */
  static async obtenerPartidasDeUsuario(idUsuario) {
    try {
      const query = `
        SELECT "p.idPartida", p.nombre, p.fecha, p.tipo, p.estado, p.ganadores, 
               "j.rolJugado", j.resultado
        FROM "Juega" j
        JOIN "Partida" p ON "j.idPartida" = "p.idPartida"
        WHERE "j.idUsuario" = $1
        ORDER BY p.fecha DESC`;

      const { rows } = await pool.query(query, [idUsuario]);
      return rows;
    } catch (error) {
      console.error("Error al obtener partidas del usuario:", error);
      throw new Error("No se pudieron obtener las partidas del usuario.");
    }
  }

  /**
   * Actualiza el resultado de un usuario en una partida tras finalizarla.
   * @param {number} idUsuario - ID del usuario.
   * @param {number} idPartida - ID de la partida.
   * @param {string} resultado - El resultado de la partida ('ganada' o 'perdida').
   * @returns {Promise<Object>} Registro de la relación actualizada.
   */
  static async actualizarResultado(idUsuario, idPartida, resultado) {
    const resultadosValidos = ["ganada", "perdida"];

    if (!resultadosValidos.includes(resultado)) {
      throw new Error(`Resultado inválido. Debe ser uno de: ${resultadosValidos.join(", ")}`);
    }

    try {
      // Actualizar el resultado en la tabla "Juega"
      const updateQuery = `UPDATE "Juega" 
                           SET "resultado" = $1 
                           WHERE "idUsuario" = $2 AND "idPartida" = $3 
                           RETURNING *`;
      const { rows } = await pool.query(updateQuery, [resultado, idUsuario, idPartida]);

      if (rows.length === 0) {
        throw new Error("No se encontró la relación 'Juega' entre el usuario y la partida.");
      }

      return rows[0];
    } catch (error) {
      console.error("Error al actualizar el resultado de la partida:", error);
      throw new Error("No se pudo actualizar el resultado de la partida.");
    }
  }
}

module.exports = JuegaDAO;
