const express = require("express");
const router = express.Router();
const UsuarioDAO = require("../dao/usuarioDao");

/**
 * @file usuarioRoutes.js
 * @description Endpoints para la gestión de usuarios.
 * @module API_Usuario
 */

/**
 * Crea un nuevo usuario en el sistema.
 *
 * Recibe los datos de un nuevo usuario (nombre, correo, contraseña y avatar opcional)
 * y los guarda en la base de datos. Devuelve una respuesta indicando el éxito o fallo de la operación.
 *
 * @function POST /api/usuario/crear
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.body - Cuerpo de la solicitud con los datos del usuario.
 * @param {string} req.body.nombre - Nombre del usuario.
 * @param {string} req.body.correo - Correo electrónico del usuario.
 * @param {string} req.body.contrasena - Contraseña del usuario.
 * @param {string} [req.body.avatar] - URL del avatar del usuario (opcional).
 *
 * @param {Object} res - Objeto de respuesta HTTP.
 *
 * @throws {201} Usuario creado exitosamente.
 * @throws {409} El correo ya está registrado.
 * @throws {500} Error interno al crear el usuario.
 *
 * @param {number} res.status - Código de estado HTTP.
 * @param {string} res.mensaje - Mensaje de confirmación.
 * @param {Object} res.usuario - Datos del usuario creado.
 * @param {number} res.usuario.id - ID único del usuario.
 * @param {string} res.usuario.nombre - Nombre del usuario.
 * @param {string} res.usuario.correo - Correo del usuario.
 * @param {string} [res.usuario.avatar] - URL del avatar (opcional).
 *
 * @param {Object} res.error - Objeto de error.
 * @param {string} res.error.mensaje - Descripción del error.
 */
router.post("/crear", async (req, res) => {
  const { nombre, correo, contrasena, avatar } = req.body;
  try {
    const usuario = await UsuarioDAO.crearUsuario(
      nombre,
      correo,
      contrasena,
      avatar
    );
    res.status(201).json({ mensaje: "Usuario creado", usuario });
  } catch (error) {
    if (error.message === "El nombre de usuario ya está registrado.") {
      return res.status(409).json({ error: error.message });
    }
    if (error.message === "El correo ya está registrado.") {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

/**
 * Obtiene un usuario por correo electrónico.
 *
 * @function POST /api/usuario/obtener
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.body - Cuerpo de la solicitud con los datos requeridos.
 * @param {string} req.body.correo - Correo electrónico del usuario a buscar.
 *
 * @param {Object} res - Objeto de respuesta HTTP.
 *
 * @throws {400} El correo es requerido.
 * @throws {404} Usuario no encontrado.
 * @throws {500} Error interno al obtener el usuario.
 *
 * @param {number} res.status - Código de estado HTTP.
 * @param {Object} res.usuario - Datos del usuario encontrado.
 * @param {number} res.usuario.idUsuario - ID único del usuario.
 * @param {string} res.usuario.nombre - Nombre del usuario.
 * @param {string} res.usuario.correo - Correo electrónico del usuario.
 * @param {string} [res.usuario.avatar] - URL del avatar del usuario (opcional).
 * @param {string} res.usuario.fechaCreacion - Fecha de creación del usuario en formato ISO.
 * @param {string} res.usuario.rolFavorito - Rol favorito del usuario en el sistema.
 *
 * @param {Object} res.error - Objeto de error.
 * @param {string} res.error.mensaje - Descripción del error.
 */
router.post("/obtener", async (req, res) => {
  const { correo } = req.body; // Obtenemos el correo del body

  if (!correo) {
    return res.status(400).json({ error: "El correo es requerido." });
  }

  try {
    const usuario = await UsuarioDAO.obtenerUsuarioPorCorreo(correo);
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.status(200).json({ usuario });
  } catch (error) {
    res.status(500).json({ error: error.message }); //Cambiar? !!!!!!!
  }
});

/**
 * Obtiene un usuario por id.
 *
 * @function POST /api/usuario/obtener_por_id
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.body - Cuerpo de la solicitud con los datos requeridos.
 * @param {string} req.body.idUsuario - Correo electrónico del usuario a buscar.
 *
 * @param {Object} res - Objeto de respuesta HTTP.
 *
 * @throws {400} El id es requerido.
 * @throws {404} Usuario no encontrado.
 * @throws {500} Error interno al obtener el usuario.
 *
 * @param {number} res.status - Código de estado HTTP.
 * @param {Object} res.usuario - Datos del usuario encontrado.
 * @param {number} res.usuario.idUsuario - ID único del usuario.
 * @param {string} res.usuario.nombre - Nombre del usuario.
 * @param {string} res.usuario.correo - Correo electrónico del usuario.
 * @param {string} [res.usuario.avatar] - URL del avatar del usuario (opcional).
 * @param {string} res.usuario.fechaCreacion - Fecha de creación del usuario en formato ISO.
 * @param {string} res.usuario.rolFavorito - Rol favorito del usuario en el sistema.
 *
 * @param {Object} res.error - Objeto de error.
 * @param {string} res.error.mensaje - Descripción del error.
 */
router.post("/obtener_por_id", async (req, res) => {
  const { idUsuario } = req.body; // Obtenemos el id del body

  if (!idUsuario) {
    return res.status(400).json({ error: "El id es requerido." });
  }

  try {
    const usuario = await UsuarioDAO.obtenerUsuarioID(idUsuario);
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.status(200).json({ usuario });
  } catch (error) {
    res.status(500).json({ error: error.message }); //Cambiar? !!!!!!!
  }
});

/**
 * Obtiene el avatar de un usuario por id.
 *
 * @function POST /api/usuario/obtener_avatar_por_id
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.body - Cuerpo de la solicitud con los datos requeridos.
 * @param {string} req.body.idUsuario - ID del usuario a buscar.
 *
 * @param {Object} res - Objeto de respuesta HTTP.
 *
 * @throws {400} El id del usuario es requerido.
 * @throws {404} Usuario no encontrado.
 * @throws {500} Error interno al obtener el avatar.
 *
 * @param {number} res.status - Código de estado HTTP.
 * @param {string} res.avatar - URL del avatar del usuario (si se encuentra).
 * 
 * @param {Object} res.error - Objeto de error en caso de fallo.
 * @param {string} res.error.mensaje - Descripción del error.
 */
router.post("/obtener_avatar_por_id", async (req, res) => {
  const { idUsuario } = req.body; // Obtenemos el id del body

  if (!idUsuario) {
    return res.status(400).json({ error: "El id es requerido." });
  }

  try {
    const avatar = await UsuarioDAO.obtenerAvatarUsuario(idUsuario);
    if (!avatar) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.status(200).json({ avatar: avatar.avatar });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Inicia sesión validando las credenciales del usuario.
 *
 * @function POST /api/usuario/login
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.body - Cuerpo de la solicitud con las credenciales del usuario.
 * @param {string} req.body.correo - Correo electrónico del usuario.
 * @param {string} req.body.contrasena - Contraseña del usuario.
 *
 * @param {Object} res - Objeto de respuesta HTTP.
 *
 * @throws {401} Credenciales incorrectas.
 * @throws {500} Error interno al iniciar sesión.
 *
 * @param {number} res.status - Código de estado HTTP.
 * @param {string} res.mensaje - Mensaje de confirmación del inicio de sesión.
 * @param {Object} res.usuario - Datos del usuario autenticado.
 * @param {number} res.usuario.idUsuario - ID único del usuario.
 * @param {string} res.usuario.nombre - Nombre del usuario.
 * @param {string} res.usuario.correo - Correo electrónico del usuario.
 * @param {string} [res.usuario.avatar] - URL del avatar del usuario (opcional).
 * @param {string} res.usuario.fechaCreacion - Fecha de creación del usuario en formato ISO.
 * @param {string} res.usuario.rolFavorito - Rol favorito del usuario en el sistema.
 *
 * @param {Object} res.error - Objeto de error.
 * @param {string} res.error.mensaje - Descripción del error.
 */
router.post("/login", async (req, res) => {
  const { correo, contrasena } = req.body;
  try {
    const usuario = await UsuarioDAO.validarCredenciales(correo, contrasena);

    // Si la respuesta de validarCredenciales contiene un error
    if (usuario && usuario.error) {
      // Si el error es 'Usuario no encontrado'
      if (usuario.error === "Usuario no encontrado") {
        return res
          .status(404)
          .json({ error: "No existe una cuenta con este correo" });
      }
      // Si el error es 'Contraseña incorrecta'
      if (usuario.error === "Contraseña incorrecta") {
        return res.status(401).json({ error: "La contraseña es incorrecta" });
      }
    }

    // Si no hay errores, usuario encontrado y validado
    res.status(200).json({ mensaje: "Inicio de sesión exitoso", usuario });
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

/**
 * Actualiza el perfil del usuario.
 * Parámetros modificables: Nombre y Avatar.
 * @function PUT /api/usuario/actualizar
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.body - Cuerpo de la solicitud con los datos a actualizar.
 * @param {number} req.body.idUsuario - ID del usuario que se va a actualizar.
 * @param {string} [req.body.nombre] - Nuevo nombre del usuario (opcional).
 * @param {string} [req.body.avatar] - Nueva URL del avatar del usuario (opcional).
 * @param {string} [req.body.rolFavorito] - Nuevo rol favorito del usuario (opcional).
 *
 * @param {Object} res - Objeto de respuesta HTTP.
 *
 * @throws {400} El ID del usuario es requerido.
 * @throws {404} Usuario no encontrado.
 * @throws {500} Error interno al actualizar el perfil.
 *
 * @param {number} res.status - Código de estado HTTP.
 * @param {string} res.mensaje - Mensaje de confirmación de la actualización.
 * @param {Object} res.usuario - Datos del usuario actualizado.
 * @param {number} res.usuario.idUsuario - ID único del usuario.
 * @param {string} res.usuario.nombre - Nombre actualizado del usuario.
 * @param {string} res.usuario.correo - Correo electrónico del usuario (no modificable).
 * @param {string} [res.usuario.avatar] - URL del avatar actualizado (opcional).
 * @param {string} res.usuario.fechaCreacion - Fecha de creación del usuario en formato ISO.
 * @param {string} res.usuario.rolFavorito - Rol favorito actualizado del usuario.
 *
 * @param {Object} res.error - Objeto de error.
 * @param {string} res.error.mensaje - Descripción del error.
 */
router.put("/actualizar", async (req, res) => {
  const { idUsuario, nombre, avatar, rolFavorito } = req.body;
  try {
    const usuarioActualizado = await UsuarioDAO.actualizarPerfil(idUsuario, {
      nombre,
      avatar,
      rolFavorito,
    });
    res.status(200).json({
      mensaje: "Perfil actualizado exitosamente",
      usuario: usuarioActualizado,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

/**
 * Obtiene un usuario por nombre.
 *
 * @function POST /api/usuario/obtener_por_nombre
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.body - Cuerpo de la solicitud con los datos requeridos.
 * @param {string} req.body.nombre - Nombre del usuario a buscar.
 *
 * @param {Object} res - Objeto de respuesta HTTP.
 *
 * @throws {400} El nombre es requerido.
 * @throws {404} Usuario no encontrado.
 * @throws {500} Error interno al obtener el usuario.
 *
 * @param {number} res.status - Código de estado HTTP.
 * @param {Object} res.usuario - Datos del usuario encontrado.
 * @param {number} res.usuario.idUsuario - ID único del usuario.
 * @param {string} res.usuario.nombre - Nombre del usuario.
 * @param {string} res.usuario.correo - Correo electrónico del usuario.
 * @param {string} [res.usuario.avatar] - URL del avatar del usuario (opcional).
 * @param {string} res.usuario.fechaCreacion - Fecha de creación del usuario en formato ISO.
 * @param {string} res.usuario.rolFavorito - Rol favorito del usuario en el sistema.
 *
 * @param {Object} res.error - Objeto de error.
 * @param {string} res.error.mensaje - Descripción del error.
 */
router.post("/obtener_por_nombre", async (req, res) => {
  const { nombre } = req.body; // Obtenemos el nombre del body

  if (!nombre) {
    return res.status(400).json({ error: "El nombre es requerido." });
  }

  try {
    const usuario = await UsuarioDAO.obtenerUsuarioNombre(nombre);
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.status(200).json({ usuario });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
