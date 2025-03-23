const express = require("express");
const router = express.Router();
const SugerenciasDAO = require("../dao/sugerenciasDao");

/**
 * @file SugerenciasRoutes.js
 * @description Endpoints para gestionar las sugerencias y obtener recomendaciones.
 * @module API_Sugerencias
 */

/**
 * Envía una nueva sugerencia.
 *
 * Recibe el ID del usuario y el contenido de la sugerencia, y lo almacena en la base de datos.
 *
 * @function POST /api/sugerencias/enviar
 *
 * @param {Object} res - Objeto de respuesta HTTP.
 *
 * @throws {400} Se requieren idUsuario y contenido.
 * @throws {500} Error interno al enviar la sugerencia.
 *
 * @param {number} res.status - Código de estado HTTP.
 * @param {string} res.mensaje - Mensaje de confirmación de que la sugerencia fue enviada exitosamente.
 * @param {Object} res.sugerencia - Datos de la sugerencia creada.
 * @param {number} res.sugerencia.idSugerencia - ID único de la sugerencia.
 * @param {number} res.sugerencia.idUsuario - ID del usuario que envió la sugerencia.
 * @param {string} res.sugerencia.contenido - Contenido de la sugerencia.
 * @param {string} res.sugerencia.fechaSugerencia - Fecha de envío de la sugerencia en formato ISO.
 *
 * @param {Object} res.error - Objeto de error.
 * @param {string} res.error.mensaje - Descripción del error.
 */
router.post("/enviar", async (req, res) => {
  const { idUsuario, contenido } = req.body;
  if (!idUsuario || !contenido) {
    return res
      .status(400)
      .json({ error: "Se requieren idUsuario y contenido." });
  }
  try {
    const sugerencia = await SugerenciasDAO.enviarSugerencia(
      idUsuario,
      contenido
    );
    res
      .status(201)
      .json({ mensaje: "Sugerencia enviada exitosamente", sugerencia });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Obtiene todas las sugerencias.
 *
 * Útil para que un administrador visualice todas las sugerencias almacenadas en el sistema.
 *
 * @function GET /api/sugerencias/todas
 *
 * @param {Object} res - Objeto de respuesta HTTP.
 *
 * @throws {500} Error interno al obtener las sugerencias.
 *
 * @param {number} res.status - Código de estado HTTP.
 * @param {string} res.mensaje - Mensaje de confirmación de la obtención de las sugerencias.
 * @param {Object[]} res.sugerencias - Lista de todas las sugerencias.
 * @param {number} res.sugerencias[].idSugerencia - ID único de la sugerencia.
 * @param {number} res.sugerencias[].idUsuario - ID del usuario que envió la sugerencia.
 * @param {string} res.sugerencias[].contenido - Contenido de la sugerencia.
 * @param {string} res.sugerencias[].fechaSugerencia - Fecha de envío de la sugerencia en formato ISO.
 *
 * @param {Object} res.error - Objeto de error.
 * @param {string} res.error.mensaje - Descripción del error.
 */
router.get("/todas", async (req, res) => {
  try {
    const sugerencias = await SugerenciasDAO.obtenerSugerencias();
    res.json({ mensaje: "Sugerencias obtenidas", sugerencias });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Obtiene las sugerencias enviadas por un usuario en concreto.
 *
 * @function POST /api/sugerencias/usuario
 *
 * @param {Object} res - Objeto de respuesta HTTP.
 *
 * @throws {400} Se requiere el idUsuario.
 * @throws {500} Error interno al obtener las sugerencias del usuario.
 *
 * @param {number} res.status - Código de estado HTTP.
 * @param {string} res.mensaje - Mensaje de confirmación de la obtención de las sugerencias del usuario.
 * @param {Object[]} res.sugerencias - Lista de sugerencias enviadas por el usuario.
 * @param {number} res.sugerencias[].idSugerencia - ID único de la sugerencia.
 * @param {number} res.sugerencias[].idUsuario - ID del usuario que envió la sugerencia.
 * @param {string} res.sugerencias[].contenido - Contenido de la sugerencia.
 * @param {string} res.sugerencias[].fechaSugerencia - Fecha de envío de la sugerencia en formato ISO.
 *
 * @param {Object} res.error - Objeto de error.
 * @param {string} res.error.mensaje - Descripción del error.
 */
router.post("/usuario", async (req, res) => {
  const { idUsuario } = req.body;
  if (!idUsuario) {
    return res.status(400).json({ error: "Se requiere el idUsuario." });
  }
  try {
    const sugerencias = await SugerenciasDAO.obtenerSugerenciasPorUsuario(
      idUsuario
    );
    res.json({ mensaje: "Sugerencias del usuario obtenidas", sugerencias });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Marca si una sugerencia ha sido revisada.
 *
 * Permite que el administrador actualice el estado de revisión de una sugerencia.
 *
 * @function PUT /api/sugerencias/marcarRevisada
 *
 * @param {Object} res - Objeto de respuesta HTTP.
 *
 * @throws {400} Se requieren idSugerencia y revisada.
 * @throws {500} Error interno al actualizar la sugerencia.
 *
 * @param {number} res.status - Código de estado HTTP.
 * @param {string} res.mensaje - Mensaje de confirmación de la actualización.
 * @param {Object} res.sugerencia - Datos de la sugerencia actualizada.
 * @param {number} res.sugerencia.idSugerencia - ID único de la sugerencia.
 * @param {boolean} res.sugerencia.revisada - Nuevo estado de revisión.
 *
 * @param {Object} res.error - Objeto de error.
 * @param {string} res.error.mensaje - Descripción del error.
 */
router.put("/marcarRevisada", async (req, res) => {
  const { idSugerencia, revisada } = req.body;
  if (idSugerencia === undefined || revisada === undefined) {
    return res
      .status(400)
      .json({ error: "Se requieren idSugerencia y revisada." });
  }
  try {
    const sugerencia = await SugerenciasDAO.marcarRevisada(
      idSugerencia,
      revisada
    );
    res.json({ mensaje: "Sugerencia actualizada", sugerencia });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Responde a una sugerencia.
 *
 * Permite que el administrador responda a una sugerencia enviada por un usuario.
 *
 * @function PUT /api/sugerencias/responder
 *
 * @param {Object} res - Objeto de respuesta HTTP.
 *
 * @throws {400} Se requieren idSugerencia y respuesta.
 * @throws {500} Error interno al responder la sugerencia.
 *
 * @param {number} res.status - Código de estado HTTP.
 * @param {string} res.mensaje - Mensaje de confirmación de la respuesta.
 * @param {Object} res.sugerencia - Datos de la sugerencia actualizada.
 * @param {number} res.sugerencia.idSugerencia - ID único de la sugerencia.
 * @param {number} res.sugerencia.idUsuario - ID del usuario que envió la sugerencia.
 * @param {string} res.sugerencia.contenido - Contenido de la sugerencia.
 * @param {string} res.sugerencia.fechaSugerencia - Fecha de envío de la sugerencia en formato ISO.
 * @param {boolean} res.sugerencia.revisada - Estado de revisión.
 * @param {string} res.sugerencia.respuesta - Respuesta asignada a la sugerencia.
 *
 * @param {Object} res.error - Objeto de error.
 * @param {string} res.error.mensaje - Descripción del error.
 */
router.put("/responder", async (req, res) => {
  const { idSugerencia, respuesta } = req.body;
  if (!idSugerencia || respuesta === undefined) {
    return res
      .status(400)
      .json({ error: "Se requieren idSugerencia y respuesta." });
  }
  try {
    const sugerencia = await SugerenciasDAO.responderSugerencia(
      idSugerencia,
      respuesta
    );
    res.json({ mensaje: "Sugerencia respondida exitosamente", sugerencia });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Devuelve las sugerencias que no han sido revisadas.
 *
 * Útil para que el administrador identifique las sugerencias pendientes de revisión.
 *
 * @function GET /api/sugerencias/noRevisadas
 *
 * @param {Object} res - Objeto de respuesta HTTP.
 *
 * @throws {500} Error interno al obtener las sugerencias no revisadas.
 *
 * @param {number} res.status - Código de estado HTTP.
 * @param {string} res.mensaje - Mensaje de confirmación de la obtención de las sugerencias no revisadas.
 * @param {Object[]} res.sugerencias - Lista de sugerencias no revisadas.
 * @param {number} res.sugerencias[].idSugerencia - ID único de la sugerencia.
 * @param {number} res.sugerencias[].idUsuario - ID del usuario que envió la sugerencia.
 * @param {string} res.sugerencias[].contenido - Contenido de la sugerencia.
 * @param {string} res.sugerencias[].fechaSugerencia - Fecha de envío de la sugerencia en formato ISO.
 * @param {boolean} res.sugerencias[].revisada - Estado de revisión.
 *
 * @param {Object} res.error - Objeto de error.
 * @param {string} res.error.mensaje - Descripción del error.
 */
router.get("/noRevisadas", async (req, res) => {
  try {
    const sugerencias = await SugerenciasDAO.obtenerSugerenciasNoRevisadas();
    res.json({ mensaje: "Sugerencias no revisadas obtenidas", sugerencias });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
