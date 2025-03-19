// EstadisticasDao.js
const pool = require("../config/db");

class EstadisticasDAO {
  /**
   * Obtiene las estadísticas de un usuario (amigo) a partir de su ID.
   * Las estadísticas se calculan sólo para partidas finalizadas.
   * @param {number} idUsuario - ID del usuario.
   * @returns {Promise<Object>} Objeto con partidas ganadas, totales, porcentaje de victorias y roles más jugados.
   */
  static async obtenerEstadisticasAmigo(idUsuario) {
    try {
      // Número de partidas ganadas
      //Hacemos un JOIN de la tabla Juega con la tabla partida
      // Y seleccionamos las partidas que esten en Juega que sean de ese usuario
      // Y que en esa partida el usuario este en el bando ganador
      const queryGanadas = `
        SELECT COUNT(*) AS ganadas
        FROM "Juega" j
        JOIN "Partida" p ON j."idPartida" = p."idPartida"
        WHERE j."idUsuario" = $1
          AND p.estado = 'terminada'
          AND (
            (j."rolJugado" = 'lobo' AND p.ganadores = 'lobos')
            OR (j."rolJugado" <> 'lobo' AND p.ganadores = 'aldeanos')
          )
      `;
      const { rows: ganadasRows } = await pool.query(queryGanadas, [idUsuario]);
      const partidasGanadas = parseInt(ganadasRows[0].ganadas, 10);

      // Total de partidas jugadas (finalizadas)
      const queryTotales = `
        SELECT COUNT(*) AS totales
        FROM "Juega" j
        JOIN "Partida" p ON j."idPartida" = p."idPartida"
        WHERE j."idUsuario" = $1
          AND p.estado = 'terminada'
      `;
      const { rows: totalesRows } = await pool.query(queryTotales, [idUsuario]);
      const partidasTotales = parseInt(totalesRows[0].totales, 10);

      // Roles más jugados
      //Contamos roles en partidas TERMINADAS,que haya jugado el usuario
      const queryRoles = `
        SELECT j."rolJugado", COUNT(*) AS cantidad
        FROM "Juega" j
        JOIN "Partida" p ON j."idPartida" = p."idPartida"
        WHERE j."idUsuario" = $1
          AND p.estado = 'terminada'
        GROUP BY j."rolJugado"
        ORDER BY cantidad DESC
      `;
      const { rows: rolesRows } = await pool.query(queryRoles, [idUsuario]);

      // Calcular el porcentaje de victorias
      const porcentajeVictorias = partidasTotales > 0 
        ? (partidasGanadas / partidasTotales) * 100 
        : 0;

      return {
        partidasGanadas,
        partidasTotales,
        porcentajeVictorias,
        rolesMasJugados: rolesRows
      };
    } catch (error) {
      console.error("Error obteniendo estadísticas para el usuario:", error);
      throw error;
    }
  }
}

module.exports = EstadisticasDAO;
