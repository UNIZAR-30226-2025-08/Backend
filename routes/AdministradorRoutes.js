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
 * @param {number} req.body.idUsuario - ID del usuario a asignar como administrador.
 * @returns {Object} Datos del administrador asignado o mensaje de error.
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
 * @param {number} req.body.idUsuario - ID del usuario.
 * @returns {Object} Mensaje de confirmación o error.
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
 * @param {number} req.body.idUsuario - ID del usuario.
 * @returns {Object} { esAdministrador: true/false } o mensaje de error.
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
 * Obtiene la lista de todos los administradores y la fecha en la que se les asigno.
 * @function GET /api/admin/todos
 * @returns {Array} Lista de administradores.
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