const express = require('express');
const router = express.Router();
const PartidaDAO = require("../dao/PartidaDao");

/**
 * @module API Partidas
 * @description Endpoints para la gestión de partidas.
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
 * Actualiza el estado de una partida.
 * @route PUT /api/partida/actualizar-estado
 * @param {number} req.body.idPartida - ID de la partida.
 * @param {string} req.body.estado - Nuevo estado ('en_curso' o 'terminada').
 * @returns {Object} Partida actualizada o mensaje de error.
 */
router.put("/actualizar-estado", async (req, res) => {
  const { idPartida, estado } = req.body;
  try {
    const partida = await PartidaDAO.actualizarEstado(idPartida, estado);
    res.json({ mensaje: "Estado de la partida actualizado", partida });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar el estado de la partida" });
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
    const partida = await PartidaDAO.obtenerPartida(req.params.id); // el id de la partida es un parámetro de ruta dinámico
    if (!partida) {
      return res.status(404).json({ error: "Partida no encontrada" });
    }
    res.json(partida);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener la partida" });
  }
});

/**
 * Verifica la contraseña de una partida privada.
 * @route POST /api/partida/verificar-contrasena
 * @param {number} req.body.idPartida - ID de la partida.
 * @param {string} req.body.contrasena - Contraseña ingresada.
 * @returns {Object} Resultado de la verificación.
 */
router.post("/verificar-contrasena", async (req, res) => {
  const { idPartida, contrasena } = req.body;
  try {
    const esValida = await PartidaDAO.verificarContrasena(idPartida, contrasena);
    res.json({ mensaje: esValida ? "Contraseña correcta" : "Contraseña incorrecta", valida: esValida });
  } catch (error) {
    res.status(500).json({ error: "Error al verificar la contraseña" });
  }
});

module.exports = router;