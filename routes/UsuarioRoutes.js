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

module.exports = router;