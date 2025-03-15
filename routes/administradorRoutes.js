const express = require('express');
const router = express.Router();
const AdministradorDAO = require("../dao/administradorDao");

/**
 * @file AdministradorRoutes.js
 * @description Endpoints para facilitar la gestión de administradores.
 * @module API_Administradores
 */

/**
 * Asigna el rol de administrador a un usuario.
 *
 * @function POST /api/admin/asignar
 * 
 * @param {Object} res - Objeto de respuesta HTTP.
 * 
 * @throws {400} Se requiere el idUsuario.
 * @throws {500} Error interno al asignar el rol de administrador.
 * 
 * @param {number} res.status - Código de estado HTTP.
 * @param {string} res.mensaje - Mensaje de confirmación de que el rol fue asignado correctamente.
 * @param {Object} res.admin - Datos del administrador asignado.
 * @param {number} res.admin.idAdmin - ID único del administrador.
 * @param {number} res.admin.idUsuario - ID del usuario que ha sido asignado como administrador.
 * @param {string} res.admin.fechaAsignacion - Fecha en la que se asignó el rol de administrador.
 * 
 * @param {Object} res.error - Objeto de error.
 * @param {string} res.error.mensaje - Descripción del error.
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
 *
 * @function POST /api/admin/quitar
 * 
 * @param {Object} res - Objeto de respuesta HTTP.
 * 
 * @throws {400} Se requiere el idUsuario.
 * @throws {500} Error interno al quitar el rol de administrador.
 * 
 * @param {number} res.status - Código de estado HTTP.
 * @param {string} res.mensaje - Mensaje de confirmación de que el rol fue eliminado correctamente.
 * 
 * @param {Object} res.error - Objeto de error.
 * @param {string} res.error.mensaje - Descripción del error.
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
 *
 * @function POST /api/admin/esAdministrador
 * 
 * @param {Object} res - Objeto de respuesta HTTP.
 * 
 * @throws {400} Se requiere el idUsuario.
 * @throws {500} Error interno al verificar el rol de administrador.
 * 
 * @param {number} res.status - Código de estado HTTP.
 * @param {Object} res - Objeto que indica si el usuario es administrador.
 * @param {boolean} res.esAdministrador - Valor booleano que indica si el usuario es administrador.
 * 
 * @param {Object} res.error - Objeto de error.
 * @param {string} res.error.mensaje - Descripción del error.
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
 *
 * @function GET /api/admin/todos
 * 
 * @param {Object} res - Objeto de respuesta HTTP.
 * 
 * @throws {500} Error interno al obtener la lista de administradores.
 * 
 * @param {number} res.status - Código de estado HTTP.
 * @param {string} res.mensaje - Mensaje de confirmación de la obtención de administradores.
 * @param {Object[]} res.administradores - Lista de administradores.
 * @param {number} res.administradores[].idAdmin - ID único del administrador.
 * @param {number} res.administradores[].idUsuario - ID del usuario que es administrador.
 * @param {string} res.administradores[].fechaAsignacion - Fecha en la que se asignó el rol en formato ISO.
 * 
 * @param {Object} res.error - Objeto de error.
 * @param {string} res.error.mensaje - Descripción del error.
 */
router.get("/todos", async (req, res) => {
    try {
      const administradores = await AdministradorDAO.obtenerAdministradores();
      res.json({ mensaje: "Administradores obtenidos", administradores });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
});
  
module.exports = router;
