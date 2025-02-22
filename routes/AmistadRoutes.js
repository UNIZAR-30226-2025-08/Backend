const express = require('express');
const router = express.Router();
const AmistadDAO = require("../dao/AmistadDao");

/**
 * @module API Amistades
 * @description Endpoints para gestión de amistades.
 */

/**
 * Agrega un amigo a la lista de amistades.
 * @route POST /api/amistad/agregar
 * @param {number} req.body.idUsuario1 - ID del usuario que agrega.
 * @param {number} req.body.idUsuario2 - ID del usuario agregado.
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

module.exports = router;