const express = require("express");
const router = express.Router();
const SolicitudAmistadDAO = require("../dao/solicitudAmistadDao");
const UsuarioDAO = require("../dao/usuarioDao");

/**
 * @file SolicitudAmistadRoutes.js
 * @description Endpoints para gestionar solicitudes de amistad.
 * @module API_SolicitudAmistad
 */

/**
 * Envía una solicitud de amistad.
 *
 * Recibe los IDs del usuario emisor y del usuario receptor, y procesa el envío de la solicitud.
 * Si existe una solicitud en sentido contrario, se crea la amistad automáticamente y se retorna null.
 *
 * @function POST /api/solicitud/enviar
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.body - Cuerpo de la solicitud con los datos necesarios.
 * @param {number} req.body.idEmisor - ID del usuario que envía la solicitud.
 * @param {number} req.body.idReceptor - ID del usuario que recibe la solicitud.
 *
 * @param {Object} res - Objeto de respuesta HTTP.
 *
 * @throws {500} Error interno al enviar la solicitud de amistad.
 *
 * @param {number} res.status - Código de estado HTTP.
 * @param {string} res.mensaje - Mensaje de confirmación de que la solicitud fue enviada.
 * @param {Object|null} res.solicitud - Datos de la solicitud creada, o null si se creó la amistad automáticamente.
 * @param {number} [res.solicitud.idSolicitud] - ID único de la solicitud (según la estructura de la tabla).
 * @param {number} [res.solicitud.idUsuarioEmisor] - ID del usuario emisor.
 * @param {number} [res.solicitud.idUsuarioReceptor] - ID del usuario receptor.
 * @param {string} [res.solicitud.fechaSolicitud] - Fecha de envío de la solicitud en formato ISO.
 *
 * @param {Object} res.error - Objeto de error.
 * @param {string} res.error.mensaje - Descripción del error.
 */
router.post("/enviar", async (req, res) => {
  const { idEmisor, idReceptor } = req.body;
  try {
    const solicitud = await SolicitudAmistadDAO.enviarSolicitud(
      idEmisor,
      idReceptor
    );
    res.status(200).json({ mensaje: "Solicitud enviada", solicitud });
  } catch (error) {
    res.status(500).json({ error: "Error al enviar solicitud" });
  }
});

/**
 * Acepta una solicitud de amistad.
 *
 * Recibe los IDs del usuario emisor y receptor y procesa la aceptación de la solicitud,
 * creando la amistad y eliminando la solicitud de la base de datos.
 *
 * @function POST /api/solicitud/aceptar
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.body - Cuerpo de la solicitud con los datos necesarios.
 * @param {number} req.body.idEmisor - ID del usuario que envió la solicitud.
 * @param {number} req.body.idReceptor - ID del usuario que recibe y acepta la solicitud.
 *
 * @param {Object} res - Objeto de respuesta HTTP.
 *
 * @throws {500} Error interno al aceptar la solicitud de amistad.
 *
 * @param {number} res.status - Código de estado HTTP.
 * @param {string} res.mensaje - Mensaje de confirmación indicando que la solicitud fue aceptada y la amistad creada.
 *
 * @param {Object} res.error - Objeto de error.
 * @param {string} res.error.mensaje - Descripción del error.
 */
router.post("/aceptar", async (req, res) => {
  const { idEmisor, idReceptor } = req.body;
  try {
    await SolicitudAmistadDAO.aceptarSolicitud(idEmisor, idReceptor);
    res.status(200).json({ mensaje: "Solicitud de amistad aceptada y amistad creada." });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error al aceptar la solicitud de amistad." });
  }
});

/**
 * Rechaza una solicitud de amistad.
 *
 * Recibe los IDs del usuario emisor y receptor y elimina la solicitud de amistad de la base de datos.
 *
 * @function POST /api/solicitud/rechazar
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.body - Cuerpo de la solicitud con los datos necesarios.
 * @param {number} req.body.idEmisor - ID del usuario que envió la solicitud.
 * @param {number} req.body.idReceptor - ID del usuario que recibe y rechaza la solicitud.
 *
 * @param {Object} res - Objeto de respuesta HTTP.
 *
 * @throws {500} Error interno al rechazar la solicitud de amistad.
 *
 * @param {number} res.status - Código de estado HTTP.
 * @param {string} res.mensaje - Mensaje de confirmación indicando que la solicitud fue rechazada.
 *
 * @param {Object} res.error - Objeto de error.
 * @param {string} res.error.mensaje - Descripción del error.
 */
router.post("/rechazar", async (req, res) => {
  const { idEmisor, idReceptor } = req.body;
  try {
    await SolicitudAmistadDAO.rechazarSolicitud(idEmisor, idReceptor);
    res.status(200).json({ mensaje: "Solicitud de amistad rechazada." });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error al rechazar la solicitud de amistad." });
  }
});

/**
 * Lista las solicitudes de amistad recibidas por un usuario.
 * @function GET /api/solicitud/listar/:idUsuario
 *
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {number} req.params.idUsuario - ID del usuario receptor.
 *
 * @param {Object} res - Objeto de respuesta HTTP.
 *
 * @throws {500} Error interno al listar las solicitudes de amistad.
 *
 * @returns {Object} JSON con las solicitudes de amistad.
 * @returns {Array} res.solicitudes - Array de solicitudes de amistad con datos del emisor.
 */
router.get("/listar/:idUsuario", async (req, res) => {
  try {
    const idUsuario = parseInt(req.params.idUsuario, 10);
    if (isNaN(idUsuario)) {
      return res
        .status(400)
        .json({ error: "El ID de usuario debe ser un número válido." });
    }
    const solicitudes = await SolicitudAmistadDAO.listarSolicitudes(idUsuario);
    res.status(200).json({ solicitudes });
  } catch (error) {
    console.error("Error al listar solicitudes de amistad:", error);
    res.status(500).json({
      error: { mensaje: "Error al listar solicitudes de amistad." },
    });
  }
});

module.exports = router;
