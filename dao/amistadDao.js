const pool = require("../config/db");

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

  /**
   * Obtiene la lista de amigos de un usuario.
   * @param {number} idUsuario - ID del usuario.
   * @returns {Promise<number[]>} Lista de IDs de amigos.
   */
  static async obtenerAmigos(idUsuario) {
    try {
      const query = `
        SELECT CASE 
          WHEN "idUsuario1" = $1 THEN "idUsuario2"
          ELSE "idUsuario1"
        END AS amigo
        FROM "Amistad"
        WHERE "idUsuario1" = $1 OR "idUsuario2" = $1`;

      const { rows } = await pool.query(query, [idUsuario]);
      
      return rows.map(row => row.amigo); // Devolver solo los IDs de amigos
    } catch (error) {
      console.error("Error al obtener amigos:", error);
      throw new Error("No se pudo obtener la lista de amigos.");
    }
  }
  /**
   * Obtiene la lista de amigos de un usuario con sus datos básicos y estadísticas.
   * Se consultan los datos de la tabla "Usuario" y se complementa con las estadísticas
   * obtenidas a partir de las tablas "Juega" y "Partida".
   * @param {number} idUsuario - ID del usuario.
   * @returns {Promise<Array>} Lista de objetos, cada uno con la información del amigo y sus estadísticas.
   */
  static async obtenerAmigosConEstadisticas(idUsuario) {
    try {
      const query = `
        SELECT u."idUsuario", u.nombre, u.correo, u.avatar, u."fechaCreacion"
        FROM "Usuario" u
        JOIN "Amistad" a 
          ON ((a."idUsuario1" = $1 AND u."idUsuario" = a."idUsuario2")
           OR (a."idUsuario2" = $1 AND u."idUsuario" = a."idUsuario1"))
      `;
      const { rows } = await pool.query(query, [idUsuario]);

      // Para cada amigo, obtenemos sus estadísticas mediante el DAO de Estadísticas
      const EstadisticasDAO = require("./estadisticasDao");
      const amigosConStats = await Promise.all(
        rows.map(async (friend) => {
          const stats = await EstadisticasDAO.obtenerEstadisticasAmigo(friend.idUsuario);
          return {
            ...friend,
            estadisticas: stats,
          };
        })
      );

      return amigosConStats;
    } catch (error) {
      console.error("Error al obtener amigos con estadísticas:", error);
      throw new Error("No se pudo obtener la lista de amigos con estadísticas.");
    }
  }
}

module.exports = AmistadDAO;
