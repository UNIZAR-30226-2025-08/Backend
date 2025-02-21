const pool = require("../db");
const bcrypt = require("bcrypt");

class UsuarioDAO {
  /**
   * Crea un nuevo usuario.
   * @param {string} nombre - Nombre del usuario.
   * @param {string} correo - Correo único del usuario.
   * @param {string} contrasena - Contraseña en texto plano.
   * @param {string} [avatar] - URL del avatar (opcional).
   * @returns {Promise<Object>} Datos del usuario creado (sin contraseña).
   */
  static async crearUsuario(nombre, correo, contrasena, avatar = null) {
    try {
      const hashContrasena = await bcrypt.hash(contrasena, 10);
      const query = `
        INSERT INTO "Usuario" (nombre, correo, "hashContrasena", avatar)
        VALUES ($1, $2, $3, $4) RETURNING "idUsuario", nombre, correo, avatar, "fechaCreacion"`;
      const { rows } = await pool.query(query, [nombre, correo, hashContrasena, avatar]);
      return rows[0]; // Retorna los datos del usuario sin la contraseña encriptada.
    } catch (error) {
      console.error("Error al crear usuario:", error);
      throw new Error("Error al registrar el usuario");
    }
  }

  /**
   * Busca un usuario por correo.
   * @param {string} correo - Correo del usuario.
   * @returns {Promise<Object|null>} Datos del usuario sin contraseña o null si no existe.
   */
  static async obtenerUsuarioPorCorreo(correo) {
    try {
      const { rows } = await pool.query(
        "SELECT idUsuario, nombre, correo, avatar, fechaCreacion FROM Usuario WHERE correo = $1",
        [correo]
      );
      return rows[0] || null;
    } catch (error) {
      console.error("Error al buscar usuario por correo:", error);
      throw new Error("Error al buscar usuario");
    }
  }

  /**
   * Valida credenciales de usuario.
   * @param {string} correo - Correo del usuario.
   * @param {string} contrasena - Contraseña en texto plano.
   * @returns {Promise<Object|null>} Datos del usuario si las credenciales son correctas.
   */
  static async validarCredenciales(correo, contrasena) {
    try {
      const { rows } = await pool.query(
        "SELECT idUsuario, nombre, correo, avatar, fechaCreacion, hashContrasena FROM Usuario WHERE correo = $1",
        [correo]
      );
      const usuario = rows[0];
      if (!usuario) return null;
      console.log("Usuario encontrado:", usuario);

      const valid = await bcrypt.compare(contrasena, usuario.hashContrasena);
      if (!valid) return null;

      // Devolver el usuario sin la contraseña
      const { hashContrasena, ...usuarioSinPassword } = usuario;
      return usuarioSinPassword;
    } catch (error) {
      console.error("Error al validar credenciales:", error);
      throw new Error("Error al validar credenciales");
    }
  }
}

module.exports = UsuarioDAO;
