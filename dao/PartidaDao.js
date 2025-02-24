const pool = require("../config/db");
const bcrypt = require("bcrypt");

class PartidaDAO {
  /**
   * Crea una nueva partida.
   * @param {string} nombre - Nombre de la partida.
   * @param {string} tipo - Tipo de partida ('publica' o 'privada').
   * @param {string} [contrasena] - Contraseña si es privada.
   * @returns {Promise<Object>} Datos de la partida creada.
   */
  static async crearPartida(nombre, tipo, contrasena = null) {
    try {
      // Validación de tipo de partida
      if (!['publica', 'privada'].includes(tipo)) {
        throw new Error("Tipo de partida inválido. Debe ser 'publica' o 'privada'.");
      }

      let hashContrasena = null;
      if (tipo === 'privada' && contrasena) {
        hashContrasena = await bcrypt.hash(contrasena, 10);
      }

      const query = `
        INSERT INTO "Partida" (nombre, tipo, "hashContrasena")
        VALUES ($1, $2, $3) 
        RETURNING "idPartida", nombre, tipo, fecha, estado, ganadores`;
      const { rows } = await pool.query(query, [nombre, tipo, hashContrasena]);

      return rows[0];
    } catch (error) {
      console.error("Error al crear la partida:", error);
      throw new Error("No se pudo crear la partida.");
    }
  }

  /**
   * Cambia el estado de una partida.
   * @param {number} idPartida - ID de la partida.
   * @param {string} estado - Nuevo estado ('en_curso', 'terminada').
   * @returns {Promise<Object>} Partida actualizada.
   */
  static async actualizarEstado(idPartida, estado) {
    try {
      if (!['en_curso', 'terminada'].includes(estado)) {
        throw new Error("Estado inválido. Debe ser 'en_curso' o 'terminada'.");
      }

      const query = `
        UPDATE "Partida" SET estado = $1 WHERE "idPartida" = $2 
        RETURNING "idPartida", nombre, tipo, fecha, estado, ganadores`;
      const { rows } = await pool.query(query, [estado, idPartida]);

      if (rows.length === 0) {
        throw new Error("Partida no encontrada.");
      }

      return rows[0];
    } catch (error) {
      console.error("Error al actualizar estado de la partida:", error);
      throw new Error("No se pudo actualizar el estado de la partida.");
    }
  }

  /**
   * Obtiene una partida por ID.
   * @param {number} idPartida - ID de la partida.
   * @returns {Promise<Object|null>} Datos de la partida o null si no existe.
   */
  static async obtenerPartida(idPartida) {
    try {
      const query = `
          SELECT "idPartida", nombre, tipo, fecha, estado, ganadores 
          FROM Partida WHERE "idPartida" = $1`;
      const { rows } = await pool.query(query, [idPartida]);
      return rows[0] || null;
    } catch (error) {
      console.error("Error al obtener la partida:", error);
      throw new Error("No se pudo obtener la partida.");
    }
  }

  /**
   * Verifica la contraseña de una partida privada.
   * @param {number} idPartida - ID de la partida.
   * @param {string} contrasena - Contraseña ingresada.
   * @returns {Promise<boolean>} Devuelve true si la contraseña es correcta, false si no lo es.
   */
  static async verificarContrasena(idPartida, contrasena) {
    try {
      const query = `SELECT "hashContrasena" FROM Partida WHERE "idPartida" = $1 AND tipo = 'privada'`;
      const { rows } = await pool.query(query, [idPartida]);

      if (rows.length === 0 || !rows[0].hashContrasena) {
          throw new Error("Partida no encontrada o no es privada.");
      }

      const esValida = await bcrypt.compare(contrasena, rows[0].hashContrasena);
      return esValida;
    } catch (error) {
      console.error("Error al verificar la contraseña:", error);
      throw new Error("No se pudo verificar la contraseña.");
    }
  }
}

module.exports = PartidaDAO;