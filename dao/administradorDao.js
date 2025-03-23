const pool = require("../config/db");

class AdministradorDAO {
  /**
   * Asigna el rol de administrador a un usuario del sistema.
   * @param {number} idUsuario - ID del usuario a asignar como administrador.
   * @returns {Promise<Object>} Datos del administrador asignado.
   */
  static async asignarAdministrador(idUsuario) {
    try {
      const query = `
            INSERT INTO "Administrador" ("idUsuario")
            VALUES ($1)
            RETURNING "idAdmin", "idUsuario", "fechaAsignacion"
        `;
      const { rows } = await pool.query(query, [idUsuario]);
      return rows[0];
    } catch (error) {
      console.error("Error al asignar administrador:", error);
      throw new Error("No se pudo asignar el rol de administrador.");
    }
  }

  /**
   * Elimina el rol de administrador de un usuario del sistema.
   * @param {number} idAdmin - ID del administrador a eliminar.
   * @returns {Promise<void>}
   */
  static async quitarAdministrador(idUsuario) {
    try {
      const query = `
            DELETE FROM "Administrador"
            WHERE "idUsuario" = $1
          `;
      await pool.query(query, [idUsuario]);
    } catch (error) {
      console.error("Error al quitar administrador:", error);
      throw new Error("No se pudo quitar el rol de administrador.");
    }
  }

  /**
   * Verifica si un usuario es administrador.
   * Se usará para que si es administrador pueda ver los paneles habilitados para él.
   * @param {number} idUsuario - ID del usuario.
   * @returns {Promise<boolean>} True si es administrador, false en caso contrario.
   */
  static async esAdministrador(idUsuario) {
    try {
      const query = `
            SELECT "idAdmin" FROM "Administrador"
            WHERE "idUsuario" = $1
        `;
      const { rows } = await pool.query(query, [idUsuario]);
      return rows.length > 0;
    } catch (error) {
      console.error("Error al verificar administrador:", error);
      throw new Error("No se pudo verificar el rol de administrador.");
    }
  }

  /**
   * Obtiene la lista de todos los administradores.
   * Puede que no haga falta pero lo pongo por si fuese necesario.
   * @returns {Promise<Array>} Lista de administradores.
   */
  static async obtenerAdministradores() {
    try {
      const query = `
            SELECT "idAdmin", "idUsuario", "fechaAsignacion"
            FROM "Administrador"
            ORDER BY "fechaAsignacion" DESC
        `;
      const { rows } = await pool.query(query);
      return rows;
    } catch (error) {
      console.error("Error al obtener administradores:", error);
      throw new Error("No se pudieron obtener los administradores.");
    }
  }
}
module.exports = AdministradorDAO;
