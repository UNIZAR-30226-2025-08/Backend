const express = require('express');
const router = express.Router();
const PartidaDAO = require("../dao/PartidaDao");

/**
 * @module API Partidas
 * @description Endpoints REST para la gestión de partidas.
 */

/**
 * Crea una nueva partida.
 * @route POST /api/partida/crear
 * @param {string} req.body.nombre - Nombre de la partida.
 * @param {string} req.body.tipo - Tipo de la partida ('publica' o 'privada').
 * @param {string} [req.body.contrasena] - Contraseña de la partida (si es privada).
 * @returns {Object} Partida creada o mensaje de error.
 */
router.post("/crear", async (req, res) => {
  const { nombre, tipo, contrasena } = req.body;
  try {
    const partida = await PartidaDAO.crearPartida(nombre, tipo, contrasena);
    res.json({ mensaje: "Partida creada", partida });
  } catch (error) {
    res.status(500).json({ error: "Error al crear la partida" });
  }
});


/**
 * Obtiene el estado de una partida.
 * @route GET /api/partida/:id
 * @param {number} req.params.id - ID de la partida.
 * @returns {Object} Datos de la partida o mensaje de error.
 */
router.get("/:id", async (req, res) => {
  try {
    const partida = await PartidaDAO.obtenerPartida(req.params.id);
    if (!partida) {
      return res.status(404).json({ error: "Partida no encontrada" });
    }
    res.json(partida);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener la partida" });
  }
});

module.exports = router;