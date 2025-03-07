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
 * @param {number} req.body.idUsuario1 - ID del usuario 1
 * @param {number} req.body.idUsuario2 - ID del usuario 2
 * @returns {Object} Relación de amistad o mensaje de error.
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
 * @param {number} req.body.idUsuario1 - ID del usuario 1
 * @param {number} req.body.idUsuario2 - ID del usuario 2
 * @returns {Object} Mensaje de confirmación o error.
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