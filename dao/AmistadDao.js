const pool = require("../db");

class AmistadDAO {
  /**
   * Agrega una relación de amistad entre dos usuarios.
   * Se almacena siempre en la forma (idUsuarioMenor, idUsuarioMayor).
   * @param {number} idUsuario1 - ID del usuario 1.
   * @param {number} idUsuario2 - ID del usuario 2.
   * @param {object} client - Cliente opcional para transacción.
   * @returns {Promise<Object>} Amistad creada.
   */
  static async agregarAmigo(idUsuario1, idUsuario2, client = null) {
    const connection = client || (await pool.connect());

    try {
      if (idUsuario1 === idUsuario2) {
        throw new Error("No puedes agregarte como amigo a ti mismo.");
      }

      // Asegurar que siempre idUsuarioMenor < idUsuarioMayor
      const [idUsuarioMenor, idUsuarioMayor] = idUsuario1 < idUsuario2 
        ? [idUsuario1, idUsuario2] 
        : [idUsuario2, idUsuario1];

      // Verificar si ya son amigos
      const checkQuery = `SELECT * FROM "Amistad" WHERE "idUsuario1" = $1 AND "idUsuario2" = $2`;
      const { rows: existingFriends } = await connection.query(checkQuery, [idUsuarioMenor, idUsuarioMayor]);

      if (existingFriends.length > 0) {
        throw new Error("Estos usuarios ya son amigos.");
      }

      // Insertar la amistad
      const insertQuery = `INSERT INTO "Amistad" ("idUsuario1", "idUsuario2") VALUES ($1, $2) RETURNING *`;
      const { rows } = await connection.query(insertQuery, [idUsuarioMenor, idUsuarioMayor]);

      return rows[0];
    } catch (error) {
      console.error("Error al agregar amigo:", error);
      throw new Error("No se pudo agregar la amistad.");
    } finally {
      if (!client) {
        connection.release();
      }
    }
  }

  /**
   * Elimina una amistad entre dos usuarios.
   * @param {number} idUsuario1 - ID del usuario 1.
   * @param {number} idUsuario2 - ID del usuario 2.
   * @returns {Promise<void>}
   */
  static async eliminarAmigo(idUsuario1, idUsuario2) {
    try {
      const [idUsuarioMenor, idUsuarioMayor] = idUsuario1 < idUsuario2 
      ? [idUsuario1, idUsuario2] 
      : [idUsuario2, idUsuario1];

      const query = `DELETE FROM "Amistad" WHERE "idUsuario1" = $1 AND "idUsuario2" = $2`;
      const { rowCount } = await pool.query(query, [idUsuarioMenor, idUsuarioMayor]);

      if (rowCount === 0) {
        throw new Error("No existe una amistad entre estos usuarios.");
      }
    } catch (error) {
      console.error("Error al eliminar amigo:", error);
      throw new Error("No se pudo eliminar la amistad.");
    }
  }
}

module.exports = AmistadDAO;
