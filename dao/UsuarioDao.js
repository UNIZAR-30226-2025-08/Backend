const pool = require("../db");
const bcrypt = require("bcrypt");

class UsuarioDAO {
  /**
   * Crea un nuevo usuario.
   * @param {string} nombre - Nombre del usuario.
   * @param {string} email - Email único del usuario.
   * @param {string} contrasena - Contraseña en texto plano.
   * @param {string} [avatar] - URL del avatar (opcional).
   * @returns {Promise<Object>} Datos del usuario creado.
   */
  static async crearUsuario(nombre, email, contrasena, avatar = null) {
    const hashContrasena = await bcrypt.hash(contrasena, 10);
    const query = `
      INSERT INTO Usuario (nombre, email, hashContrasena, avatar)
      VALUES ($1, $2, $3, $4) RETURNING *`;
    const { rows } = await pool.query(query, [nombre, email, hashContrasena, avatar]);
    return rows[0];
  }

  /**
   * Busca un usuario por email.
   * @param {string} email - Email del usuario.
   * @returns {Promise<Object|null>} Datos del usuario o null si no existe.
   */
  static async obtenerUsuarioPorEmail(email) {
    const { rows } = await pool.query("SELECT * FROM Usuario WHERE email = $1", [email]);
    return rows[0] || null;
  }

  /**
   * Valida credenciales de usuario.
   * @param {string} email - Email del usuario.
   * @param {string} contrasena - Contraseña en texto plano.
   * @returns {Promise<Object|null>} Datos del usuario si las credenciales son correctas.
   */
  static async validarCredenciales(email, contrasena) {
    const usuario = await this.obtenerUsuarioPorEmail(email);
    if (!usuario) return null;
    const valid = await bcrypt.compare(contrasena, usuario.hashcontrasena);
    return valid ? usuario : null;
  }
}

module.exports = UsuarioDAO;
