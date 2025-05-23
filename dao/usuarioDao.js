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

      const { rows } = await pool.query(query, [
        nombre,
        correo,
        contrasena,
        avatar,
      ]);
      return rows[0]; // Retorna los datos del usuario sin la contraseña encriptada.
    } catch (error) {
      if (error.code === "23505") {
        // Revisar el mensaje de error para detectar si es el nombre o el correo el que está duplicado
        if (error.detail.includes("(nombre)")) {
          throw new Error("El nombre de usuario ya está registrado.");
        }
        if (error.detail.includes("(correo)")) {
          throw new Error("El correo ya está registrado.");
        }
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
   * Busca un usuario por id.
   * @param {string} id - ID del usuario.
   * @returns {Promise<Object|null>} Datos del usuario sin contraseña o null si no existe.
   */
  static async obtenerUsuarioID(id) {
    try {
      const { rows } = await pool.query(
        `SELECT "idUsuario", nombre, correo, avatar, "fechaCreacion", "rolFavorito" FROM "Usuario" WHERE "idUsuario" = $1`,
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      console.error("Error al buscar usuario por id:", error);
      throw new Error(error.message);
    }
  }

  /**
   * Busca un usuario por nombre.
   * @param {string} nombre - nombre del usuario.
   * @returns {Promise<Object|null>} Datos del usuario sin contraseña o null si no existe.
   */
  static async obtenerUsuarioNombre(nombre) {
    try {
      const { rows } = await pool.query(
        `SELECT "idUsuario", nombre, correo, avatar, "fechaCreacion", "rolFavorito" FROM "Usuario" WHERE "nombre" = $1`,
        [nombre]
      );
      return rows[0] || null;
    } catch (error) {
      console.error("Error al buscar usuario por nombre:", error);
      throw new Error(error.message);
    }
  }

  /**
   * Valida las credenciales de un usuario.
   * @param {string} correo - Correo del usuario.
   * @param {string} contrasena - Hash de la contraseña.
   * @returns {Promise<Object|null>} Datos del usuario si las credenciales son correctas.
   */
  static async validarCredenciales(correo, contrasena) {
    try {
      const { rows } = await pool.query(
        'SELECT "idUsuario", "nombre", "correo", "avatar", "fechaCreacion", "rolFavorito", "hashContrasena" FROM "Usuario" WHERE "correo" = $1',
        [correo]
      );
      const usuario = rows[0];

      // Si no se encuentra el usuario, retornamos un objeto con un mensaje específico
      if (!usuario) {
        return { error: "Usuario no encontrado" }; // Puedes personalizar el mensaje
      }

      // Si la contraseña no coincide con el hash guardado, retornamos un mensaje específico
      if (contrasena !== usuario.hashContrasena) {
        return { error: "Contraseña incorrecta" }; // Mensaje personalizado para contraseñas incorrectas
      }

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
    /* COALESCE se utiliza para que si solo se actualiza el nombre y no el avatar,
      o viceversa, el parámetro que no se actualiza mantenga el valor que tenía antes
      Funcionamiento: Si en $1 el valor es null, el valor que se quedará será el del nombre actual,
      si en $2 el valor es null, el valor que se quedará será el del avatar actual,
      si en $3 el valor es null, el valor que se quedará será el del rolFavorito actual */
    try {
      const query = `
        UPDATE "Usuario"
        SET nombre = COALESCE($1, nombre),
            avatar = COALESCE($2, avatar),
            "rolFavorito" = COALESCE($3, "rolFavorito")
        WHERE "idUsuario" = $4
        RETURNING "idUsuario", nombre, correo, avatar, "fechaCreacion", "rolFavorito"
      `;
      const { rows } = await pool.query(query, [
        nombre,
        avatar,
        rolFavorito,
        idUsuario,
      ]);
      return rows[0];
    } catch (error) {
      if (error.code === "23505" && error.constraint === "Usuario_nombre_key") {
        throw new Error("El nombre de usuario ya está registrado en la plataforma.");
      }
      console.error("Error al actualizar el perfil:", error);
      throw new Error("No se pudo actualizar el perfil del usuario");
    }
  }

  /**
   * Obtiene el avatar de un usuario por su id.
   * @param {string} idUsuario - ID del usuario.
   * @returns {Promise<Object>} Avatar del usuario.
   */
  static async obtenerAvatarUsuario(idUsuario) {
    try {
      const { rows } = await pool.query(
        `SELECT avatar FROM "Usuario" WHERE "idUsuario" = $1`,
        [idUsuario]
      );
      return rows[0]; // Devuelve el avatar del usuario
    } catch (error) {
      console.error("Error al buscar el avatar de un usuario por id:", error);
      throw new Error(error.message);
    }
  }

  /**
   * Obtiene el nombre de un usuario por su id.
   * @param {string} idUsuario - ID del usuario.
   * @returns {Promise<Object>} Nombre del usuario.
   */
  static async obtenerNombreUsuario(idUsuario) {
    try {
      const { rows } = await pool.query(
        `SELECT nombre FROM "Usuario" WHERE "idUsuario" = $1`,
        [idUsuario]
      );
      return rows[0]; // Devuelve el nombre del usuario
    } catch (error) {
      console.error("Error al buscar el nombre de un usuario por id:", error);
      throw new Error(error.message);
    }
  }

  /**
   * Busca usuarios por nombre similar.
   * @param {string} nombre - Parte del nombre del usuario a buscar.
   * @returns {Promise<Object[]>} Lista de usuarios con nombres similares.
   */
  static async buscarUsuariosPorNombre(nombre) {
    try {
      const { rows } = await pool.query(
        `SELECT nombre, avatar FROM "Usuario" WHERE nombre ILIKE $1`,
        [`%${nombre}%`]
      );
      return rows; // Devuelve la lista de usuarios con nombres similares
    } catch (error) {
      console.error("Error al buscar usuarios por nombre:", error);
      throw new Error("Error al buscar usuarios por nombre");
    }
  }
}

module.exports = UsuarioDAO;
