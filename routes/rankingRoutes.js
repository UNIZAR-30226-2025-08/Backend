const express = require("express");
const router = express.Router();
const RankingDAO = require("../dao/rankingDao");

/**
 * @file RankingRoutes.js
 * @description Endpoints para la gestión de ranking.
 * @module API_Ranking
 */

/**
 * Obtiene el ranking global de jugadores con más victorias en partidas públicas.
 * @function GET /api/ranking/ranking
 *
 * @param {Object} res - Objeto de respuesta HTTP.
 *
 * @throws {500} Error interno al obtener el ranking global.
 *
 * @param {number} res.status - Código de estado HTTP.
 * @param {string} res.mensaje - Mensaje de confirmación de la obtención del ranking.
 * @param {Object[]} res.ranking - Lista de jugadores en el ranking global.
 * @param {number} res.ranking[].idUsuario - ID único del usuario en el ranking.
 * @param {string} res.ranking[].nombre - Nombre del usuario.
 * @param {string} res.ranking[].avatar - Avatar del usuario.
 * @param {number} res.ranking[].victorias - Número de victorias del usuario en partidas públicas.
 *
 * @param {Object} res.error - Objeto de error.
 * @param {string} res.error.mensaje - Descripción del error.
 */
router.get("/ranking", async (req, res) => {
  try {
    const ranking = await RankingDAO.obtenerRankingGlobal();
    res.status(200).json({ mensaje: "Ranking global obtenido", ranking });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener el ranking global" });
  }
});

module.exports = router;
