const express = require('express');
const router = express.Router();
const AdministradorDAO = require("../dao/AdministradorDao");


/**
 * @file AdministradorRoutes.js
 * @description Endpoints para facilitar la gestión de administradores.
 * @module API_Administradores
 */

/**
 * Asigna el rol de administrador a un usuario.
 * @function POST /api/admin/asignar
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.body - Cuerpo de la solicitud con los datos necesarios.
 * @param {number} req.body.idUsuario - ID del usuario a asignar como administrador.
 * 
 * @param {Object} res - Objeto de respuesta HTTP.
 * 
 * @throws {400} Si no se proporciona el idUsuario.
 * @throws {500} Error interno al asignar el rol de administrador.
 * 
 * @param {number} res.status - Código de estado HTTP.
 * @param {string} res.mensaje - Mensaje de confirmación.
 * @param {Object} res.admin - Objeto con los datos del administrador asignado.
 */

router.post("/asignar", async (req, res) => {
    const { idUsuario } = req.body;
    if (!idUsuario) {
      return res.status(400).json({ error: "Se requiere el idUsuario al que se quiere asignar como admin." });
    }
    try {
      const admin = await AdministradorDAO.asignarAdministrador(idUsuario);
      res.status(201).json({ mensaje: "Administrador asignado correctamente", admin });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
});


/**
 * Quita el rol de administrador de un usuario.
 * @function POST /api/admin/quitar
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.body - Cuerpo de la solicitud.
 * @param {number} req.body.idUsuario - ID del usuario del que se quitará el rol de administrador.
 * 
 * @param {Object} res - Objeto de respuesta HTTP.
 * 
 * @throws {400} Si no se proporciona el idUsuario.
 * @throws {500} Error interno al quitar el rol de administrador.
 * 
 * @param {number} res.status - Código de estado HTTP.
 * @param {string} res.mensaje - Mensaje de confirmación de la eliminación del rol.
 */
router.post("/quitar", async (req, res) => {
    const { idUsuario } = req.body;
    if (!idUsuario) {
      return res.status(400).json({ error: "Se requiere el idUsuario al que se quiere quitar el rol." });
    }
    try {
      await AdministradorDAO.quitarAdministrador(idUsuario);
      res.json({ mensaje: "Rol de administrador eliminado exitosamente" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
});


/**
 * Verifica si un usuario es administrador.
 * @function POST /api/admin/esAdministrador
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.body - Cuerpo de la solicitud.
 * @param {number} req.body.idUsuario - ID del usuario a verificar.
 * 
 * @param {Object} res - Objeto de respuesta HTTP.
 * 
 * @throws {400} Si no se proporciona el idUsuario.
 * @throws {500} Error interno al verificar el rol de administrador.
 * 
 * @param {number} res.status - Código de estado HTTP.
 * @param {Object} res - Objeto que indica si el usuario es administrador.
 * @param {boolean} res.esAdministrador - Valor booleano que indica si el usuario es administrador.
 */
router.post("/esAdministrador", async (req, res) => {
    const { idUsuario } = req.body;
    if (!idUsuario) {
      return res.status(400).json({ error: "Se requiere el idUsuario." });
    }
    try {
      const esAdmin = await AdministradorDAO.esAdministrador(idUsuario);
      res.json({ esAdministrador: esAdmin });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
});


/**
 * Obtiene la lista de todos los administradores y la fecha en la que se les asignó el rol.
 * @function GET /api/admin/todos
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * 
 * @param {Object} res - Objeto de respuesta HTTP.
 * 
 * @throws {500} Error interno al obtener la lista de administradores.
 * 
 * @param {number} res.status - Código de estado HTTP.
 * @param {Array<Object>} res - Lista de administradores con sus datos y la fecha de asignación.
 */
router.get("/todos", async (req, res) => {
    try {
      const administradores = await AdministradorDAO.obtenerAdministradores();
      res.json(administradores);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
});
  
  module.exports = router;