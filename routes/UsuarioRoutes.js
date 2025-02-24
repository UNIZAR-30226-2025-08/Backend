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
 * @param {string} req.body.email - Correo electrónico del usuario.
 * @param {string} req.body.contrasena - Contraseña del usuario.
 * @param {string} [req.body.avatar] - URL del avatar del usuario (opcional).
 * @returns {Object} Usuario creado o mensaje de error.
 */
router.post("/crear", async (req, res) => {
  const { nombre, email, contrasena, avatar } = req.body;
  try {
    const usuario = await UsuarioDAO.crearUsuario(nombre, email, contrasena, avatar);
    res.json({ mensaje: "Usuario creado", usuario });
  } catch (error) {
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

/**
 * Obtiene un usuario por correo.
 * @route GET /api/usuario/:correo
 * @param {string} req.params.correo - Correo del usuario a buscar.
 * @returns {Object} Datos del usuario o mensaje de error.
 */
router.get("/:correo", async (req, res) => {
  const { correo } = req.params; // el correo es un parámetro de ruta dinámico
  try {
    const usuario = await UsuarioDAO.obtenerUsuarioPorCorreo(correo);
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json({ usuario });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener usuario" });
  }
});

/**
 * Inicia sesión validando credenciales.
 * @route POST /api/usuario/login
 * @param {string} req.body.email - Correo electrónico del usuario.
 * @param {string} req.body.contrasena - Contraseña del usuario.
 * @returns {Object} Datos del usuario autenticado o error.
 */
router.post("/login", async (req, res) => {
  const { email, contrasena } = req.body;
  try {
    const usuario = await UsuarioDAO.validarCredenciales(email, contrasena);
    if (!usuario) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }
    res.json({ mensaje: "Inicio de sesión exitoso", usuario });
  } catch (error) {
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

module.exports = router;