const pool = require("../config/db");

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
      const query = `
        INSERT INTO "Usuario" (nombre, correo, "hashContrasena", avatar)
        VALUES ($1, $2, $3, $4) RETURNING "idUsuario", nombre, correo, avatar, "fechaCreacion", "rolFavorito"`;
      const { rows } = await pool.query(query, [nombre, correo, contrasena, avatar]);
      return rows[0]; // Retorna los datos del usuario sin la contraseña encriptada.
    } catch (error) {
      if (error.code === "23505") {
        // Código 23505 = violación de restricción UNIQUE en PostgreSQL
        throw new Error("El correo ya está registrado.");
      }
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
        `SELECT "idUsuario", nombre, correo, avatar, "fechaCreacion", "rolFavorito" FROM "Usuario" WHERE correo = $1`,
        [correo]
      );
      return rows[0] || null;
    } catch (error) {
      console.error("Error al buscar usuario por correo:", error);
      throw new Error(error.message);
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
        'SELECT "idUsuario", "nombre", "correo", "avatar", "fechaCreacion", "rolFavorito", "hashContrasena" FROM "Usuario" WHERE "correo" = $1',
        [correo]
      );
      const usuario = rows[0];
      if (!usuario) return null;
  
      // Comparar hash con hash
      if (contrasena !== usuario.hashContrasena) return null;
  
      // Devolver el usuario sin la contraseña
      const { hashContrasena, ...usuarioSinPassword } = usuario;
      return usuarioSinPassword;
    } catch (error) {
      console.error("Error al validar credenciales:", error);
      throw new Error("Error al validar credenciales");
    }
  }  

  /**
  * Actualizaciones de Perfil de los Usuarios
  * Parámetros modificables: Nombre y Avatar
  * (Se podría cambira también la contraseña pero no creo que sea algo imprescindible)
  * @param {number} idUsuario - ID del usuario que envía la solicitud de modificación
  * @param {Object} datos - Objeto que contiene los datos a actualizar.
  * @param {string} [datos.nombre] - Nuevo nombre del usuario.
  * @param {string} [datos.avatar] - Nueva URL del avatar.
  * @param {string} [datos.rolFavorito] - Nuevo rol favorito del usuario.
  * @returns {Promise<Object>} Datos del usuario actualizado.
  */
  static async actualizarPerfil(idUsuario, { nombre, avatar, rolFavorito }) {
    /*COALESCE se utiliza para que si solo se actualiza el nombre y no el avatar
      o viceversa, el parámetro que no se actualiza mantiene el valor que tenia antes
      Funcionamiento: Si en $1 el valor es null, el valor que se quedará será el de nombre */
    try {
      const query = `
        UPDATE "Usuario"
        SET nombre = COALESCE($1, nombre),
            avatar = COALESCE($2, avatar),
            "rolFavorito" = COALESCE($3, "rolFavorito")
        WHERE "idUsuario" = $4
        RETURNING "idUsuario", nombre, correo, avatar, "fechaCreacion", "rolFavorito"
      `;
      const { rows } = await pool.query(query, [nombre, avatar, rolFavorito, idUsuario]);
      return rows[0];
    } catch (error) {
      console.error("Error al actualizar el perfil:", error);
      throw new Error("No se pudo actualizar el perfil del usuario");
    }
  }
}

module.exports = UsuarioDAO;
