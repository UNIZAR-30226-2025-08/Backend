const express = require('express');
const router = express.Router();
const JuegaDAO = require("../dao/juegaDao");

/**
 * @file JuegaRoutes.js
 * @description Endpoints para la gestión de usuarios en partidas.
 * @module API_Juega
 */

/**
 * Asigna un usuario a una partida con un rol específico.
 * @function POST /api/juega/asignar
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.body - Cuerpo de la solicitud con los datos de la asignación.
 * @param {number} req.body.idUsuario - ID del usuario a asignar.
 * @param {number} req.body.idPartida - ID de la partida donde se asignará al usuario.
 * @param {string} req.body.rolJugado - Rol del usuario en la partida.
 * 
 * @param {Object} res - Objeto de respuesta HTTP.
 * 
 * @throws {400} Los datos requeridos están incompletos o no son válidos.
 * @throws {500} Error interno al asignar el usuario a la partida.
 * 
 * @param {number} res.status - Código de estado HTTP.
 * @param {string} res.mensaje - Mensaje de confirmación de la asignación.
 * @param {Object} res.juega - Objeto con los datos de la asignación.
 * @param {number} res.juega.idUsuario - ID del usuario asignado.
 * @param {number} res.juega.idPartida - ID de la partida a la que fue asignado.
 * @param {string} res.juega.rolJugado - Rol asignado al usuario en la partida.
 * 
 * @param {Object} res.error - Objeto de error.
 * @param {string} res.error.mensaje - Descripción del error.
 */
router.post("/asignar", async (req, res) => {
  const { idUsuario, idPartida, rolJugado } = req.body;
  try {
    const juega = await JuegaDAO.asignarUsuarioAPartida(idUsuario, idPartida, rolJugado);
    res.json({ mensaje: "Usuario asignado a la partida", juega });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Obtiene todas las partidas en las que ha participado un usuario.
 * @function GET /api/juega/usuario/:idUsuario
 * 
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.params - Parámetros de la URL.
 * @param {number} req.params.idUsuario - ID del usuario cuyas partidas se desean consultar.
 * 
 * @param {Object} res - Objeto de respuesta HTTP.
 * 
 * @throws {400} El ID del usuario no es válido.
 * @throws {404} No se encontraron partidas para el usuario.
 * @throws {500} Error interno al obtener las partidas.
 * 
 * @param {number} res.status - Código de estado HTTP.
 * @param {Object[]} res.partidas - Lista de partidas en las que participó el usuario.
 * @param {number} res.partidas[].idPartida - ID único de la partida.
 * @param {string} res.partidas[].nombre - Nombre de la partida.
 * @param {string} res.partidas[].fecha - Fecha de la partida en formato ISO.
 * @param {string} res.partidas[].tipo - Tipo de partida ("publica" o "privada").
 * @param {string} res.partidas[].estado - Estado actual de la partida ("en_curso" o "terminada").
 * @param {string} [res.partidas[].ganadores] - Facción ganadora de la partida (opcional, `null` si aún no ha terminado).
 * @param {string} res.partidas[].rolJugado - Rol que jugó el usuario en la partida.
 * 
 * @param {Object} res.error - Objeto de error.
 * @param {string} res.error.mensaje - Descripción del error.
 */
router.get("/usuario/:idUsuario", async (req, res) => {
  try {
    const idUsuario = parseInt(req.params.idUsuario, 10); // Convertir a número

    if (isNaN(idUsuario)) {
      return res.status(400).json({ error: "El ID de usuario debe ser un número válido." });
    }

    const partidas = await JuegaDAO.obtenerPartidasDeUsuario(idUsuario);
    res.json(partidas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;