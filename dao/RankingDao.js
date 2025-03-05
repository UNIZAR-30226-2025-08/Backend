const pool = require("../config/db");
const bcrypt = require("bcrypt");

class RankingDAO {
  /**
 * Obtiene el ranking global de jugadores con más victorias en partidas públicas.
 * @returns {Promise<Array>} Lista de jugadores con sus victorias.
 */
static async obtenerRankingGlobal() {
  try {
    const query = `
      SELECT u."idUsuario", u.nombre, COUNT(j.resultado) AS victorias
      FROM "Usuario" u
      JOIN "Juega" j ON u."idUsuario" = j."idUsuario"
      JOIN "Partida" p ON j."idPartida" = p."idPartida"
      WHERE p.tipo = 'publica' AND j.resultado = 'ganada'
      GROUP BY u."idUsuario", u.nombre
      ORDER BY victorias DESC
    `;
    const { rows } = await pool.query(query);
    return rows;
  } catch (error) {
    console.error("Error al obtener el ranking global:", error);
    throw new Error("No se pudo obtener el ranking global.");
  }
}


}




module.exports = RankingDAO;