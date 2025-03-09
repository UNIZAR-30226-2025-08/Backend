const express = require('express');
const router = express.Router();
const AmistadDAO = require("../dao/AmistadDao");

/**
 * @file AmistadRoutes.js
 * @description Endpoints para la gestión de amistades.
 * @module API_Amistades
 */

/**
 * Agrega un amigo a la lista de amistades.
 * @function POST /api/amistad/agregar
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.body - Cuerpo de la solicitud con los datos de la amistad.
 * @param {number} req.body.idUsuario1 - ID del primer usuario.
 * @param {number} req.body.idUsuario2 - ID del segundo usuario.
 * 
 * @param {Object} res - Objeto de respuesta HTTP.
 * 
 * @throws {400} Los datos requeridos están incompletos o no son válidos.
 * @throws {500} Error interno al agregar la amistad.
 * 
 * @param {number} res.status - Código de estado HTTP.
 * @param {string} res.mensaje - Mensaje de confirmación de la amistad creada.
 * @param {Object} res.amistad - Objeto con los datos de la amistad creada.
 * @param {number} res.amistad.idUsuario1 - ID del primer usuario.
 * @param {number} res.amistad.idUsuario2 - ID del segundo usuario.
 * 
 * @param {Object} res.error - Objeto de error.
 * @param {string} res.error.mensaje - Descripción del error.
 */
router.post("/agregar", async (req, res) => {
  const { idUsuario1, idUsuario2 } = req.body;
  try {
    const amistad = await AmistadDAO.agregarAmigo(idUsuario1, idUsuario2);
    res.json({ mensaje: "Amistad creada", amistad });
  } catch (error) {
    res.status(500).json({ error: "Error al agregar amigo" });
  }
});

/**
 * Elimina una amistad entre dos usuarios.
 * @function DELETE /api/amistad/eliminar
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.body - Cuerpo de la solicitud con los datos de la amistad a eliminar.
 * @param {number} req.body.idUsuario1 - ID del primer usuario.
 * @param {number} req.body.idUsuario2 - ID del segundo usuario.
 * 
 * @param {Object} res - Objeto de respuesta HTTP.
 * 
 * @throws {400} Los datos requeridos están incompletos o no son válidos.
 * @throws {500} Error interno al eliminar la amistad.
 * 
 * @param {number} res.status - Código de estado HTTP.
 * @param {string} res.mensaje - Mensaje de confirmación de la amistad eliminada.
 * 
 * @param {Object} res.error - Objeto de error.
 * @param {string} res.error.mensaje - Descripción del error.
 */
router.delete("/eliminar", async (req, res) => {
  const { idUsuario1, idUsuario2 } = req.body;
  try {
    await AmistadDAO.eliminarAmigo(idUsuario1, idUsuario2);
    res.json({ mensaje: "Amistad eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar la amistad" });
  }
});

module.exports = router;