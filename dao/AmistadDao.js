const pool = require("../db");

class AmistadDAO {
  /**
   * Crea una relación de amistad entre dos usuarios.
   * @param {number} idUsuario1 - ID del usuario 1.
   * @param {number} idUsuario2 - ID del usuario 2.
   * @returns {Promise<Object>} Amistad creada.
   */
  static async agregarAmigo(idUsuario1, idUsuario2) {
    const query = `
      INSERT INTO Amistad (idUsuario1, idUsuario2)
      VALUES ($1, $2) RETURNING *`;
    const { rows } = await pool.query(query, [idUsuario1, idUsuario2]);
    return rows[0];
  }

  /**
   * Elimina una amistad entre dos usuarios.
   * @param {number} idUsuario1 - ID del usuario 1.
   * @param {number} idUsuario2 - ID del usuario 2.
   */
  static async eliminarAmigo(idUsuario1, idUsuario2) {
    await pool.query("DELETE FROM Amistad WHERE idUsuario1 = $1 AND idUsuario2 = $2", [idUsuario1, idUsuario2]);
  }
}

module.exports = AmistadDAO;
