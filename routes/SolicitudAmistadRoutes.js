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
 * @param {number} req.body.idEmisor - ID del usuario que envía la solicitud.
 * @param {number} req.body.idReceptor - ID del usuario que recibe la solicitud.
 * @returns {Object} Solicitud enviada o error.
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
 * @param {number} req.body.idEmisor - ID del usuario que envió la solicitud.
 * @param {number} req.body.idReceptor - ID del usuario que recibe y acepta la solicitud.
 * @returns {Object} Mensaje de éxito o error.
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
 * @param {number} req.body.idEmisor - ID del usuario que envió la solicitud.
 * @param {number} req.body.idReceptor - ID del usuario que recibe y rechaza la solicitud.
 * @returns {Object} Mensaje de éxito o error.
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