const express = require('express');
const router = express.Router();
const RankingDAO = require("../dao/RankingDao");

/**
 * @module API Ranking
 * @description Endpoints para la gestión de ranking.
 */


/**
 * Obtiene el ranking global de jugadores con más victorias en partidas públicas.
 * @route GET /api/ranking
 * @returns {Object} Lista de jugadores con sus victorias o mensaje de error.
 */
router.get("/ranking", async (req, res) => {
  try {
    const ranking = await RankingDAO.obtenerRankingGlobal();
    res.json({ mensaje: "Ranking global obtenido", ranking });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener el ranking global" });
  }
});


module.exports = router;