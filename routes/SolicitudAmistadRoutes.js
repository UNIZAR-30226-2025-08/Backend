const express = require('express');
const router = express.Router();
const SolicitudAmistadDAO = require("../dao/SolicitudAmistadDao");

/**
 * @file SolicitudAmistadRoutes.js
 * @description Endpoints para gestionar solicitudes de amistad.
 * @module API_SolicitudAmistad
 */

/**
 * Envía una solicitud de amistad.
 * @function POST /api/solicitud/enviar
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.body - Cuerpo de la solicitud.
 * @param {number} req.body.idEmisor - ID del usuario que envía la solicitud.
 * @param {number} req.body.idReceptor - ID del usuario que recibe la solicitud.
 * 
 * @param {Object} res - Objeto de respuesta HTTP.
 * 
 * @throws {500} Error interno al enviar la solicitud de amistad.
 * 
 * @returns {Object} JSON que contiene:
 *  - mensaje: Mensaje de confirmación.
 *  - solicitud: Objeto con la información de la solicitud creada.
 */
router.post("/enviar", async (req, res) => {
  const { idEmisor, idReceptor } = req.body;
  try {
    const solicitud = await SolicitudAmistadDAO.enviarSolicitud(idEmisor, idReceptor);
    res.json({ mensaje: "Solicitud enviada", solicitud });
  } catch (error) {
    res.status(500).json({ error: "Error al enviar solicitud" });
  }
});

/**
 * Acepta una solicitud de amistad.
 * @function POST /api/solicitud/aceptar
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.body - Cuerpo de la solicitud.
 * @param {number} req.body.idEmisor - ID del usuario que envió la solicitud.
 * @param {number} req.body.idReceptor - ID del usuario que recibe y acepta la solicitud.
 * 
 * @param {Object} res - Objeto de respuesta HTTP.
 * 
 * @throws {500} Error interno al aceptar la solicitud de amistad.
 * 
 * @returns {Object} JSON que contiene:
 *  - mensaje: Mensaje de confirmación de la aceptación y creación de la amistad.
 */
router.post("/aceptar", async (req, res) => {
  const { idEmisor, idReceptor } = req.body;
  try {
    await SolicitudAmistadDAO.aceptarSolicitud(idEmisor, idReceptor);
    res.json({ mensaje: "Solicitud de amistad aceptada y amistad creada." });
  } catch (error) {
    res.status(500).json({ error: "Error al aceptar la solicitud de amistad." });
  }
});

/**
 * Rechaza una solicitud de amistad.
 * @function POST /api/solicitud/rechazar
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.body - Cuerpo de la solicitud.
 * @param {number} req.body.idEmisor - ID del usuario que envió la solicitud.
 * @param {number} req.body.idReceptor - ID del usuario que recibe y rechaza la solicitud.
 * 
 * @param {Object} res - Objeto de respuesta HTTP.
 * 
 * @throws {500} Error interno al rechazar la solicitud de amistad.
 * 
 * @returns {Object} JSON que contiene:
 *  - mensaje: Mensaje de confirmación de que la solicitud fue rechazada.
 */
router.post("/rechazar", async (req, res) => {
  const { idEmisor, idReceptor } = req.body;
  try {
    await SolicitudAmistadDAO.rechazarSolicitud(idEmisor, idReceptor);
    res.json({ mensaje: "Solicitud de amistad rechazada." });
  } catch (error) {
    res.status(500).json({ error: "Error al rechazar la solicitud de amistad." });
  }
});

module.exports = router;