const pool = require("../db");

class SolicitudAmistadDAO {
  /**
   * Envía una solicitud de amistad.
   * @param {number} idEmisor - ID del usuario que envía la solicitud.
   * @param {number} idReceptor - ID del usuario que la recibe.
   * @returns {Promise<Object>} Solicitud creada.
   */
  static async enviarSolicitud(idEmisor, idReceptor) {
    try {
      if (idEmisor === idReceptor) {
        throw new Error("No puedes enviarte una solicitud de amistad a ti mismo.");
      }

      // Verificar si ya existe la solicitud
      const checkQuery = `SELECT * FROM SolicitudAmistad WHERE idUsuarioEmisor = $1 AND idUsuarioReceptor = $2`;
      const { rows: existingRequests } = await pool.query(checkQuery, [idEmisor, idReceptor]);

      if (existingRequests.length > 0) {
        throw new Error("Ya existe una solicitud de amistad pendiente.");
      }

      const query = `
        INSERT INTO SolicitudAmistad (idUsuarioEmisor, idUsuarioReceptor)
        VALUES ($1, $2) RETURNING *`;
      const { rows } = await pool.query(query, [idEmisor, idReceptor]);
      return rows[0];
    } catch (error) {
      console.error("Error al enviar solicitud de amistad:", error);
      throw new Error("No se pudo enviar la solicitud de amistad.");
    }
  }

  /**
   * Acepta una solicitud de amistad y la convierte en una relación de amistad.
   * @param {number} idEmisor - ID del usuario emisor.
   * @param {number} idReceptor - ID del usuario receptor.
   * @returns {Promise<void>}
   */
  static async aceptarSolicitud(idEmisor, idReceptor) {
    const client = await pool.connect(); // Para manejar transacciones

    try {
      await client.query("BEGIN");

      // Verificar si la solicitud existe
      const checkQuery = `SELECT * FROM SolicitudAmistad WHERE idUsuarioEmisor = $1 AND idUsuarioReceptor = $2`;
      const { rows } = await client.query(checkQuery, [idEmisor, idReceptor]);

      if (rows.length === 0) {
        throw new Error("La solicitud de amistad no existe.");
      }

      // Insertar la nueva amistad
      await client.query(`
        INSERT INTO Amistad (idUsuario1, idUsuario2) 
        VALUES ($1, $2)`, [idEmisor, idReceptor]);

      // Eliminar la solicitud de amistad
      await client.query(`
        DELETE FROM SolicitudAmistad WHERE idUsuarioEmisor = $1 AND idUsuarioReceptor = $2`, [idEmisor, idReceptor]);

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error al aceptar la solicitud de amistad:", error);
      throw new Error("No se pudo aceptar la solicitud de amistad.");
    } finally {
      client.release();
    }
  }

  /**
   * Rechaza una solicitud de amistad eliminándola de la base de datos.
   * @param {number} idEmisor - ID del usuario emisor.
   * @param {number} idReceptor - ID del usuario receptor.
   * @returns {Promise<void>}
   */
  static async rechazarSolicitud(idEmisor, idReceptor) {
    try {
      const query = `DELETE FROM SolicitudAmistad WHERE idUsuarioEmisor = $1 AND idUsuarioReceptor = $2`;
      const { rowCount } = await pool.query(query, [idEmisor, idReceptor]);

      if (rowCount === 0) {
        throw new Error("No existe una solicitud de amistad para rechazar.");
      }
    } catch (error) {
      console.error("Error al rechazar la solicitud de amistad:", error);
      throw new Error("No se pudo rechazar la solicitud de amistad.");
    }
  }
}

module.exports = SolicitudAmistadDAO;
