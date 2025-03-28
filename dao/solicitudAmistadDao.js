const pool = require("../config/db");
const AmistadDAO = require("./amistadDao");

class SolicitudAmistadDAO {
  /**
   * Envía una solicitud de amistad.
   * Si existe una solicitud en sentido contrario, se crea la amistad automáticamente.
   * @param {number} idEmisor - ID del usuario que envía la solicitud.
   * @param {number} idReceptor - ID del usuario que la recibe.
   * @returns {Promise<Object|null>} Devuelve la solicitud creada o null si se creó una amistad directamente.
   */
  static async enviarSolicitud(idEmisor, idReceptor) {
    const client = await pool.connect(); // cliente para la transacción

    try {
      if (idEmisor === idReceptor) {
        throw new Error(
          "No puedes enviarte una solicitud de amistad a ti mismo."
        );
      }

      await client.query("BEGIN");

      // Verificar si ya existe una solicitud en este sentido
      const checkQuery = `SELECT * FROM "SolicitudAmistad" WHERE "idUsuarioEmisor" = $1 AND "idUsuarioReceptor" = $2`;
      const { rows: existingRequests } = await client.query(checkQuery, [
        idEmisor,
        idReceptor,
      ]);

      if (existingRequests.length > 0) {
        throw new Error("Ya existe una solicitud de amistad pendiente.");
      }

      // Verificar si hay una solicitud en sentido contrario
      const checkReverseQuery = `SELECT * FROM "SolicitudAmistad" WHERE "idUsuarioEmisor" = $1 AND "idUsuarioReceptor" = $2`;
      const { rows: reverseRequests } = await client.query(checkReverseQuery, [
        idReceptor,
        idEmisor,
      ]);

      if (reverseRequests.length > 0) {
        // Si hay una solicitud mutua, se crea la amistad y se eliminan ambas solicitudes
        await AmistadDAO.agregarAmigo(idEmisor, idReceptor, client);
        await client.query(
          `DELETE FROM "SolicitudAmistad" 
          WHERE ("idUsuarioEmisor" = $1 AND "idUsuarioReceptor" = $2) OR ("idUsuarioEmisor" = $2 AND "idUsuarioReceptor" = $1)`,
          [idEmisor, idReceptor]
        );

        await client.query("COMMIT");
        return null; // No se devuelve una solicitud porque se creó una amistad directamente
      }

      // Insertar nueva solicitud de amistad
      const insertQuery = `INSERT INTO "SolicitudAmistad" ("idUsuarioEmisor", "idUsuarioReceptor") VALUES ($1, $2) RETURNING *`;
      const { rows } = await client.query(insertQuery, [idEmisor, idReceptor]);

      await client.query("COMMIT");
      return rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error al enviar solicitud de amistad:", error);
      throw new Error("No se pudo enviar la solicitud de amistad.");
    } finally {
      client.release();
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
      const checkQuery = `SELECT * FROM "SolicitudAmistad" WHERE "idUsuarioEmisor" = $1 AND "idUsuarioReceptor" = $2`;
      const { rows } = await client.query(checkQuery, [idEmisor, idReceptor]);

      if (rows.length === 0) {
        throw new Error("La solicitud de amistad no existe.");
      }

      // Insertar la nueva amistad usando el DAO de Amistad
      await AmistadDAO.agregarAmigo(idEmisor, idReceptor, client);

      // Eliminar la solicitud de amistad
      await client.query(
        `
        DELETE FROM "SolicitudAmistad" WHERE "idUsuarioEmisor" = $1 AND "idUsuarioReceptor" = $2`,
        [idEmisor, idReceptor]
      );

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
   * @param {number} idEmisor - ID del usuario que envió la solicitud.
   * @param {number} idReceptor - ID del usuario que recibió la solicitud.
   * @returns {Promise<void>}
   */
  static async rechazarSolicitud(idEmisor, idReceptor) {
    try {
      const query = `DELETE FROM "SolicitudAmistad" WHERE "idUsuarioEmisor" = $1 AND "idUsuarioReceptor" = $2`;
      const { rowCount } = await pool.query(query, [idEmisor, idReceptor]);

      if (rowCount === 0) {
        throw new Error("No existe una solicitud de amistad para rechazar.");
      }
    } catch (error) {
      console.error("Error al rechazar la solicitud de amistad:", error);
      throw new Error("No se pudo rechazar la solicitud de amistad.");
    }
  }

  /**
   * Lista las solicitudes de amistad recibidas por un usuario.
   * @param {number} idUsuario - ID del usuario receptor.
   * @returns {Promise<Array>} Array de solicitudes de amistad con datos del emisor.
   */
  static async listarSolicitudes(idUsuario) {
    try {
      const query = `
          SELECT s.*, u.nombre AS "nombreEmisor", u.avatar AS "avatarEmisor"
          FROM "SolicitudAmistad" s
          JOIN "Usuario" u ON s."idUsuarioEmisor" = u."idUsuario"
          WHERE s."idUsuarioReceptor" = $1
          ORDER BY s."fechaSolicitud" DESC
        `;
      const { rows } = await pool.query(query, [idUsuario]);
      return rows;
    } catch (error) {
      console.error("Error al listar solicitudes de amistad:", error);
      throw new Error("No se pudieron listar las solicitudes de amistad.");
    }
  }
}

module.exports = SolicitudAmistadDAO;
