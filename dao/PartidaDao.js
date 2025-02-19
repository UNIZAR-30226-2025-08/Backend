const pool = require("../db");

class PartidaDAO {
  /**
   * Crea una nueva partida.
   * @param {string} nombre - Nombre de la partida.
   * @param {string} tipo - Tipo de partida ('publica' o 'privada').
   * @param {string} [contrasena] - Contraseña si es privada.
   * @returns {Promise<Object>} Datos de la partida creada.
   */
  static async crearPartida(nombre, tipo, contrasena = null) {
    const query = `
      INSERT INTO Partida (nombre, tipo, contrasena)
      VALUES ($1, $2, $3) RETURNING *`;
    const { rows } = await pool.query(query, [nombre, tipo, contrasena]);
    return rows[0];
  }

  /**
   * Cambia el estado de una partida.
   * @param {number} idPartida - ID de la partida.
   * @param {string} estado - Nuevo estado ('en_curso', 'terminada', 'cancelada').
   * @returns {Promise<Object>} Partida actualizada.
   */
  static async actualizarEstado(idPartida, estado) {
    const query = `
      UPDATE Partida SET estado = $1 WHERE idPartida = $2 RETURNING *`;
    const { rows } = await pool.query(query, [estado, idPartida]);
    return rows[0];
  }

  /**
   * Obtiene una partida por ID.
   * @param {number} idPartida - ID de la partida.
   * @returns {Promise<Object|null>} Datos de la partida o null si no existe.
   */
  static async obtenerPartida(idPartida) {
    const { rows } = await pool.query("SELECT * FROM Partida WHERE idPartida = $1", [idPartida]);
    return rows[0] || null;
  }
}

module.exports = PartidaDAO;