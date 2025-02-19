const pool = require("../db");

class SolicitudAmistadDAO {
  /**
   * Envía una solicitud de amistad.
   * @param {number} idEmisor - ID del usuario que envía la solicitud.
   * @param {number} idReceptor - ID del usuario que la recibe.
   * @returns {Promise<Object>} Solicitud creada.
   */
  static async enviarSolicitud(idEmisor, idReceptor) {
    const query = `
      INSERT INTO SolicitudAmistad (idUsuarioEmisor, idUsuarioReceptor)
      VALUES ($1, $2) RETURNING *`;
    const { rows } = await pool.query(query, [idEmisor, idReceptor]);
    return rows[0];
  }

  /**
   * Cambia el estado de una solicitud de amistad.
   * @param {number} idEmisor - ID del usuario emisor.
   * @param {number} idReceptor - ID del usuario receptor.
   * @param {string} estado - Nuevo estado ('aceptada' o 'rechazada').
   */
  static async actualizarEstadoSolicitud(idEmisor, idReceptor, estado) {
    await pool.query("UPDATE SolicitudAmistad SET estado = $1 WHERE idUsuarioEmisor = $2 AND idUsuarioReceptor = $3", [estado, idEmisor, idReceptor]);
  }
}

module.exports = SolicitudAmistadDAO;
