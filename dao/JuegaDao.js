const pool = require("../db");

class JuegaDAO {
  /**
   * Asigna un usuario a una partida con su rol.
   * @param {number} idUsuario - ID del usuario.
   * @param {number} idPartida - ID de la partida.
   * @param {string} rolJugado - Rol del usuario en la partida.
   * @returns {Promise<Object>} Registro de la relación.
   */
  static async asignarUsuarioAPartida(idUsuario, idPartida, rolJugado) {
    const query = `
      INSERT INTO Juega (idUsuario, idPartida, rol_jugado)
      VALUES ($1, $2, $3) RETURNING *`;
    const { rows } = await pool.query(query, [idUsuario, idPartida, rolJugado]);
    return rows[0];
  }

  /**
   * Obtiene todas las partidas en las que ha participado un usuario.
   * @param {number} idUsuario - ID del usuario.
   * @returns {Promise<Array>} Lista de partidas.
   */
  static async obtenerPartidasDeUsuario(idUsuario) {
    const { rows } = await pool.query("SELECT * FROM Juega WHERE idUsuario = $1", [idUsuario]);
    return rows;
  }
}

module.exports = JuegaDAO;
