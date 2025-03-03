const express = require('express');
const router = express.Router();
const JuegaDAO = require("../dao/JuegaDao");

/**
 * @module API Juega
 * @description Endpoints para la gestión de usuarios en partidas.
 */

/**
 * Asigna un usuario a una partida con un rol específico.
 * @route POST /api/juega/asignar
 * @param {number} req.body.idUsuario - ID del usuario.
 * @param {number} req.body.idPartida - ID de la partida.
 * @param {string} req.body.rolJugado - Rol del usuario en la partida.
 * @returns {Object} Relación creada o mensaje de error.
 */
router.post("/asignar", async (req, res) => {
  const { idUsuario, idPartida, rolJugado } = req.body;
  try {
    const juega = await JuegaDAO.asignarUsuarioAPartida(idUsuario, idPartida, rolJugado);
    res.json({ mensaje: "Usuario asignado a la partida", juega });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Obtiene todas las partidas en las que ha participado un usuario.
 * @route GET /api/juega/usuario/:idUsuario
 * @param {number} req.params.idUsuario - ID del usuario.
 * @returns {Array} Lista de partidas con detalles.
 */
router.get("/usuario/:idUsuario", async (req, res) => {
  try {
    const idUsuario = parseInt(req.params.idUsuario, 10); // Convertir a número

    if (isNaN(idUsuario)) {
      return res.status(400).json({ error: "El ID de usuario debe ser un número válido." });
    }

    const partidas = await JuegaDAO.obtenerPartidasDeUsuario(idUsuario);
    res.json(partidas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Actualiza el resultado de un usuario en una partida tras finalizarla.
 * @route PUT /api/juega/actualizar-resultado
 * @param {number} req.body.idUsuario - ID del usuario.
 * @param {number} req.body.idPartida - ID de la partida.
 * @param {string} req.body.resultado - El resultado de la partida ('ganada' o 'perdida').
 * @returns {Object} Relación de la partida con el resultado actualizado o mensaje de error.
 */
router.put("/actualizar-resultado", async (req, res) => {
  const { idUsuario, idPartida, resultado } = req.body;

  try {
    const juega = await JuegaDAO.actualizarResultado(idUsuario, idPartida, resultado);
    res.json({ mensaje: "Resultado actualizado correctamente", juega });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;