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
 * @throws {400} El ID de usuario debe ser un número válido.
 * @throws {500} Error interno al obtener las estadísticas del usuario.
 *
 * @returns {Object} JSON con las estadísticas del usuario.
 * @returns {number} res.stats.partidasGanadas - Número de partidas ganadas.
 * @returns {number} res.stats.partidasTotales - Total de partidas jugadas.
 * @returns {number} res.stats.porcentajeVictorias - Porcentaje de victorias.
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

    res.status(200).json({ mensaje: "Estadísticas obtenidas", stats });
  } catch (error) {
    console.error("Error en ruta de estadísticas:", error);
    res.status(500).json({
      error: { mensaje: "Error obteniendo estadísticas del usuario" },
    });
  }
});

module.exports = router;
