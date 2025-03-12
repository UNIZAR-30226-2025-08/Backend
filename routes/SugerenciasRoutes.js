const express = require('express');
const router = express.Router();
const SugerenciasDAO = require("../dao/SugerenciasDao");

/**
 * @file SugerenciasRoutes.js
 * @description Endpoints para gestionar las sugerencias y obtener recomendaciones.
 * @module API_Sugerencias
 */

/**
 * Envía una nueva sugerencia.
 * Se almacena tanto el contenido como el usuario que la envía.
 * @function POST /api/sugerencias/enviar
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.body - Cuerpo de la solicitud.
 * @param {number} req.body.idUsuario - ID del usuario que envía la sugerencia.
 * @param {string} req.body.contenido - Contenido de la sugerencia.
 * 
 * @param {Object} res - Objeto de respuesta HTTP.
 * 
 * @throws {400} Si no se proporcionan idUsuario y contenido.
 * @throws {500} Error interno al enviar la sugerencia.
 * 
 * @returns {Object} JSON que contiene:
 *  - mensaje: Mensaje de confirmación.
 *  - sugerencia: Objeto con la sugerencia almacenada.
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
 * Obtiene todas las sugerencias.
 * Útil para un rol de administrador que quiera ver todas las sugerencias.
 * @function GET /api/sugerencias/todas
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * 
 * @param {Object} res - Objeto de respuesta HTTP.
 * 
 * @throws {500} Error interno al obtener las sugerencias.
 * 
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
 * Obtiene las sugerencias enviadas por un usuario en concreto.
 * @function POST /api/sugerencias/usuario
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.body - Cuerpo de la solicitud.
 * @param {number} req.body.idUsuario - ID del usuario.
 * 
 * @param {Object} res - Objeto de respuesta HTTP.
 * 
 * @throws {400} Si no se proporciona el idUsuario.
 * @throws {500} Error interno al obtener las sugerencias del usuario.
 * 
 * @returns {Array} Lista de sugerencias enviadas por el usuario.
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
 * @function PUT /api/sugerencias/marcarRevisada
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
 * Marca si una sugerencia ha sido revisada o no.
 * Esta acción está restringida al rol de administrador.
 * @function PUT /api/sugerencias/marcarRevisada
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.body - Cuerpo de la solicitud.
 * @param {number} req.body.idSugerencia - ID de la sugerencia.
 * @param {boolean} req.body.revisada - Estado de revisión (true si ha sido revisada).
 * 
 * @param {Object} res - Objeto de respuesta HTTP.
 * 
 * @throws {400} Si no se proporcionan idSugerencia y revisada.
 * @throws {500} Error interno al actualizar el estado de la sugerencia.
 * 
 * @returns {Object} JSON que contiene:
 *  - mensaje: Mensaje de confirmación.
 *  - sugerencia: Objeto con la sugerencia actualizada.
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
 * Responde a una sugerencia.
 * El administrador puede responder a las sugerencias de los usuarios.
 * @function PUT /api/sugerencias/responder
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.body - Cuerpo de la solicitud.
 * @param {number} req.body.idSugerencia - ID de la sugerencia a responder.
 * @param {string} req.body.respuesta - Respuesta a la sugerencia.
 * 
 * @param {Object} res - Objeto de respuesta HTTP.
 * 
 * @throws {400} Si no se proporcionan idSugerencia y respuesta.
 * @throws {500} Error interno al responder la sugerencia.
 * 
 * @returns {Object} JSON que contiene:
 *  - mensaje: Mensaje de confirmación.
 *  - sugerencia: Objeto con la sugerencia actualizada con la respuesta.
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