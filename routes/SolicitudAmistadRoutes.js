const express = require('express');
const router = express.Router();
const SolicitudAmistadDAO = require("../dao/SolicitudAmistadDao");

/**
 * @module API Solicitudes de Amistad
 * @description Endpoints para gestionar solicitudes de amistad.
 */

/**
 * Envía una solicitud de amistad.
 * @route POST /api/solicitud/enviar
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
 * Cambia el estado de una solicitud de amistad.
 * @route POST /api/solicitud/responder
 * @param {number} req.body.idEmisor - ID del usuario que envió la solicitud.
 * @param {number} req.body.idReceptor - ID del usuario que recibió la solicitud.
 * @param {string} req.body.estado - Estado nuevo ('aceptada' o 'rechazada').
 * @returns {Object} Mensaje de éxito o error.
 */
router.post("/responder", async (req, res) => {
  const { idEmisor, idReceptor, estado } = req.body;
  try {
    await SolicitudAmistadDAO.actualizarEstadoSolicitud(idEmisor, idReceptor, estado);
    res.json({ mensaje: "Solicitud actualizada" });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar solicitud" });
  }
});

module.exports = router;