const express = require('express');
const router = express.Router();
const UsuarioDAO = require("../dao/UsuarioDao");

/**
 * @module API Usuarios
 * @description Endpoints para la gestión de usuarios.
 */


/**
 * Crea un nuevo usuario.
 * @route POST /api/usuario/crear
 * @param {string} req.body.nombre - Nombre del usuario.
 * @param {string} req.body.correo - Correo electrónico del usuario.
 * @param {string} req.body.contrasena - Contraseña del usuario.
 * @param {string} [req.body.avatar] - URL del avatar del usuario (opcional).
 * @returns {Object} Usuario creado o mensaje de error.
 */
router.post("/crear", async (req, res) => {
  const { nombre, correo, contrasena, avatar } = req.body;
  try {
    const usuario = await UsuarioDAO.crearUsuario(nombre, correo, contrasena, avatar);
    res.status(201).json({ mensaje: "Usuario creado", usuario });
  } catch (error) {
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

/**
 * Obtiene un usuario por correo.
 * @route POST /api/usuario/correo
 * @param {string} req.body.correo - Correo del usuario a buscar.
 * @returns {Object} Datos del usuario o mensaje de error.
 */
router.post("/correo", async (req, res) => {
  const { correo } = req.body; // Ahora obtenemos el correo del body

  if (!correo) {
    return res.status(400).json({ error: "El correo es requerido." });
  }

  try {
    const usuario = await UsuarioDAO.obtenerUsuarioPorCorreo(correo);
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json({ usuario });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


/**
 * Inicia sesión validando credenciales.
 * @route POST /api/usuario/login
 * @param {string} req.body.correo - Correo electrónico del usuario.
 * @param {string} req.body.contrasena - Contraseña del usuario.
 * @returns {Object} Datos del usuario autenticado o error.
 */
router.post("/login", async (req, res) => {
  const { correo, contrasena } = req.body;
  try {
    const usuario = await UsuarioDAO.validarCredenciales(correo, contrasena);
    if (!usuario) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }
    res.status(200).json({ mensaje: "Inicio de sesión exitoso", usuario });
  } catch (error) {
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

/**
 * Actualiza el perfil del usuario.
 * Parámetros modificables: Nombre y Avatar.
 * @route PUT /api/usuario/actualizar
 * @param {number} req.body.idUsuario - ID del usuario que se va a actualizar.
 * @param {string} [req.body.nombre] - Nuevo nombre del usuario.
 * @param {string} [req.body.avatar] - Nueva URL del avatar del usuario.
 * @returns {Object} Datos del usuario actualizado o mensaje de error.
 */
router.put("/actualizar", async (req, res) => {
  const { idUsuario, nombre, avatar } = req.body;
  try {
    const usuarioActualizado = await UsuarioDAO.actualizarPerfil(idUsuario, { nombre, avatar });
    res.status(200).json({ mensaje: "Perfil actualizado exitosamente", usuario: usuarioActualizado });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;