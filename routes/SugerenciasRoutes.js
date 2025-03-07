const express = require('express');
const router = express.Router();
const SugerenciasDAO = require("../dao/SugerenciasDao");

/**
 * @module API Sugerencias y Recomendaciones
 * @description Endpoints para gestionar las sugerencias y obtener recomendaciones.
 */



/**
 * Envía una nueva sugerencia
 * Se almacena tanto el contenido como el usuario que la envía
 * @route POST /api/sugerencias/enviar
 * @param {number} req.body.idUsuario - ID del usuario que envía la sugerencia.
 * @param {string} req.body.contenido - Contenido de la sugerencia.
 * @returns {Object} La sugerencia almacenada o mensaje de error.
 */
router.post("/enviar", async (req, res) => {
    const { idUsuario, contenido } = req.body;
    if (!idUsuario || !contenido) {
      return res.status(400).json({ error: "Se requieren idUsuario y contenido." });
    }
    try {
      const sugerencia = await SugerenciasDAO.enviarSugerencia(idUsuario, contenido);
      res.status(201).json({ mensaje: "Sugerencia enviada exitosamente", sugerencia });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
});

/**
 * Obtiene todas las sugerencias
 * Útil para un rol de administrador que quiera ver todas las sugerencias
 * @route GET /api/sugerencias/todas
 * @returns {Array} Lista de todas las sugerencias.
 */
router.get("/todas", async (req, res) => {
  try {
    const sugerencias = await SugerenciasDAO.obtenerSugerencias();
    res.json(sugerencias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


/**
 * Obtiene las sugerencias que han sido enviadas por un usuario en concreto
 * @route POST /api/sugerencias/usuario
 * @param {number} req.body.idUsuario - ID del usuario.
 * @returns {Array} Lista de sugerencias del usuario.
 */
router.post("/usuario", async (req, res) => {
  const { idUsuario } = req.body;
  if (!idUsuario) {
    return res.status(400).json({ error: "Se requiere el idUsuario." });
  }
  try {
    const sugerenciasUsuario = await SugerenciasDAO.obtenerSugerenciasPorUsuario(idUsuario);
    res.json(sugerenciasUsuario);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


/**
 * Marca si una sugerencia ha sido revisada o no
 * Perteneciente solo al rol de administrador
 * @route PUT /api/sugerencias/marcarRevisada
 * @param {number} req.body.idSugerencia - ID de la sugerencia.
 * @param {boolean} req.body.revisada - Estado de revisión (true si ha sido revisada).
 * @returns {Object} La sugerencia actualizada con el nuevo estado.
 */
router.put("/marcarRevisada", async (req, res) => {
  const { idSugerencia, revisada } = req.body;
  if (idSugerencia === undefined || revisada === undefined) {
    return res.status(400).json({ error: "Se requieren idSugerencia y revisada." });
  }
  try {
    const resultado = await SugerenciasDAO.marcarRevisada(idSugerencia, revisada);
    res.json({ mensaje: "Sugerencia actualizada", sugerencia: resultado });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  
});

/**
 * Responde a una sugerencia.
 * El administrador puede responder a las sugerencias de los usuarios.
 * @route PUT /api/sugerencias/responder
 * @param {number} req.body.idSugerencia - ID de la sugerencia a responder.
 * @param {string} req.body.respuesta - Respuesta a la sugerencia.
 * @returns {Object} La sugerencia actualizada con la respuesta o mensaje de error.
 */
router.put("/responder", async (req, res) => {
  const { idSugerencia, respuesta } = req.body;
  if (!idSugerencia || respuesta === undefined) {
    return res.status(400).json({ error: "Se requieren idSugerencia y respuesta." });
  }
  try {
    const sugerenciaActualizada = await SugerenciasDAO.responderSugerencia(idSugerencia, respuesta);
    res.json({ mensaje: "Sugerencia respondida exitosamente", sugerencia: sugerenciaActualizada });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Devuelve las sugerencias que no han sido revisadas.
 * Útil si el administrador quiere ver las sugerencias que aún no ha revisado.
 * @route GET /api/sugerencias/noRevisadas
 * @returns {Array} Lista de sugerencias no revisadas.
 */
router.get("/noRevisadas", async (req, res) => {
  try {
    const sugerencias = await SugerenciasDAO.obtenerSugerenciasNoRevisadas();
    res.json(sugerencias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;