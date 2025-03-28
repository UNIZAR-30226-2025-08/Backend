const express = require("express");
const router = express.Router();
const EstadisticasDAO = require("../dao/estadisticasDao");

/**
 * @file EstadisticasRoutes.js
 * @description Endpoints para la obtención de estadísticas de usuario.
 * @module API_Estadisticas
 */

/**
 * Obtiene las estadísticas de un usuario (amigo) a partir de su ID.
 * Las estadísticas se calculan utilizando los datos de las tablas "Juega" y "Partida".
 * @function GET /api/estadisticas/obtener/:idUsuario
 *
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {number} req.params.idUsuario - ID del usuario para el cual se desean obtener estadísticas.
 *
 * @param {Object} res - Objeto de respuesta HTTP.
 *
 * @throws {500} Error interno al obtener las estadísticas del usuario.
 *
 * @returns {Object} JSON con las estadísticas del usuario.
 * @returns {number} res.stats.partidasGanadas - Número de partidas ganadas.
 * @returns {number} res.stats.partidasTotales - Total de partidas jugadas.
 * @returns {number} res.stats.porcentajeVictorias - Porcentaje de victorias.
 * @returns {Object[]} res.stats.rolesMasJugados - Array con los roles más jugados y su cantidad.
 */
router.get("/obtener/:idUsuario", async (req, res) => {
  try {
    // Convertimos el parámetro a número para asegurar que es válido
    const idUsuario = parseInt(req.params.idUsuario, 10);
    if (isNaN(idUsuario)) {
      return res
        .status(400)
        .json({ error: "El ID de usuario debe ser un número válido." });
    }

    // Se obtienen las estadísticas del usuario (amigo) a través del DAO
    const stats = await EstadisticasDAO.obtenerEstadisticasAmigo(idUsuario);

    res.json({ stats });
  } catch (error) {
    console.error("Error en ruta de estadísticas:", error);
    res.status(500).json({
      error: { mensaje: "Error obteniendo estadísticas del usuario" },
    });
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
    res.json({ solicitudes });
  } catch (error) {
    console.error("Error al listar solicitudes de amistad:", error);
    res.status(500).json({
      error: { mensaje: "Error al listar solicitudes de amistad." },
    });
  }
});

module.exports = router;
