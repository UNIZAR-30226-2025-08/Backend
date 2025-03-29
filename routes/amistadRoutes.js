const express = require("express");
const router = express.Router();
const AmistadDAO = require("../dao/amistadDao");
const UsuarioDAO = require("../dao/usuarioDao");

/**
 * @file AmistadRoutes.js
 * @description Endpoints para la gestión de amistades.
 * @module API_Amistades
 */

/**
 * Agrega un amigo a la lista de amistades.
 * @function POST /api/amistad/agregar
 *
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.body - Cuerpo de la solicitud con los datos de la amistad.
 * @param {number} req.body.idUsuario1 - ID del primer usuario.
 * @param {number} req.body.idUsuario2 - ID del segundo usuario.
 *
 * @param {Object} res - Objeto de respuesta HTTP.
 *
 * @throws {400} Los datos requeridos están incompletos o no son válidos.
 * @throws {500} Error interno al agregar la amistad.
 *
 * @param {number} res.status - Código de estado HTTP.
 * @param {string} res.mensaje - Mensaje de confirmación de la amistad creada.
 * @param {Object} res.amistad - Objeto con los datos de la amistad creada.
 * @param {number} res.amistad.idUsuario1 - ID del primer usuario.
 * @param {number} res.amistad.idUsuario2 - ID del segundo usuario.
 *
 * @param {Object} res.error - Objeto de error.
 * @param {string} res.error.mensaje - Descripción del error.
 */
router.post("/agregar", async (req, res) => {
  const { idUsuario1, idUsuario2 } = req.body;
  try {
    const amistad = await AmistadDAO.agregarAmigo(idUsuario1, idUsuario2);
    res.status(200).json({ mensaje: "Amistad creada", amistad });
  } catch (error) {
    res.status(500).json({ error: "Error al agregar amigo" });
  }
});

/**
 * Elimina una amistad entre dos usuarios por id.
 * @function DELETE /api/amistad/eliminar
 *
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.body - Cuerpo de la solicitud con los datos de la amistad a eliminar.
 * @param {number} req.body.idUsuario1 - ID del primer usuario.
 * @param {number} req.body.idUsuario2 - ID del segundo usuario.
 *
 * @param {Object} res - Objeto de respuesta HTTP.
 *
 * @throws {400} Los datos requeridos están incompletos o no son válidos.
 * @throws {500} Error interno al eliminar la amistad.
 *
 * @param {number} res.status - Código de estado HTTP.
 * @param {string} res.mensaje - Mensaje de confirmación de la amistad eliminada.
 *
 * @param {Object} res.error - Objeto de error.
 * @param {string} res.error.mensaje - Descripción del error.
 */
router.delete("/eliminar", async (req, res) => {
  const { idUsuario1, idUsuario2 } = req.body;
  try {
    await AmistadDAO.eliminarAmigo(idUsuario1, idUsuario2);
    res.status(200).json({ mensaje: "Amistad eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar la amistad" });
  }
});

/**
 * Elimina una amistad entre dos usuarios por nombre.
 * @function DELETE /api/amistad/eliminar_por_nombre
 *
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} req.body - Cuerpo de la solicitud con los datos de la amistad a eliminar.
 * @param {number} req.body.idUsuario1 - ID del primer usuario.
 * @param {string} req.body.nombreUsuario2 - nombre del segundo usuario.
 *
 * @param {Object} res - Objeto de respuesta HTTP.
 *
 * @throws {400} Los datos requeridos están incompletos o no son válidos.
 * @throws {500} Error interno al eliminar la amistad.
 * @throws {404} El usuario no existe.
 *
 * @param {number} res.status - Código de estado HTTP.
 * @param {string} res.mensaje - Mensaje de confirmación de la amistad eliminada.
 *
 * @param {Object} res.error - Objeto de error.
 * @param {string} res.error.mensaje - Descripción del error.
 */
router.delete("/eliminar_por_nombre", async (req, res) => {
  const { idUsuario1, nombreUsuario2 } = req.body;
  // Obtengo el id del usuario
  try {
    const usuario2 = await UsuarioDAO.obtenerUsuarioNombre(nombreUsuario2);
    if (!usuario2) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    idUsuario2 = usuario2.idUsuario;
  } catch (error) {
    res.status(500).json({ error: "Error al obtener el id del usuario con ese nombre" });
  }

  try {
    await AmistadDAO.eliminarAmigo(idUsuario1, idUsuario2);
    res.status(200).json({ mensaje: "Amistad eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar la amistad" });
  }
});

/**
 * Obtiene la lista de amigos de un usuario.
 * @function GET /api/amistad/listar/:idUsuario
 *
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {number} req.params.idUsuario - ID del usuario que solicita la lista.
 *
 * @param {Object} res - Objeto de respuesta HTTP.
 *
 * @throws {500} Error interno al obtener la lista de amigos.
 * @throws {400} El ID de usuario debe ser un número válido.
 *
 * @returns {Object} JSON con la lista de amigos.
 * @returns {number[]} res.amigos - Array de IDs de amigos.
 */
router.get("/listar/:idUsuario", async (req, res) => {
  try {
    // Convertimos el parámetro a número
    const idUsuario = parseInt(req.params.idUsuario, 10);

    // Validación básica
    if (isNaN(idUsuario)) {
      return res
        .status(400)
        .json({ error: "El ID de usuario debe ser un número válido." });
    }

    // Llamamos al DAO para obtener los amigos
    const amigos = await AmistadDAO.obtenerAmigos(idUsuario);

    // Respondemos con la lista
    res.status(200).json({ amigos });
  } catch (error) {
    console.error("Error en endpoint de amigos", error);
    res.status(500).json({ error: "Error al obtener la lista de amigos" });
  }
});

/**
 * Obtiene la lista de amigos de un usuario junto con sus estadísticas.
 * @function GET /api/amistad/listarConEstadisticas/:idUsuario
 *
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {number} req.params.idUsuario - ID del usuario que solicita la lista.
 *
 * @param {Object} res - Objeto de respuesta HTTP.
 *
 * @throws {500} Error interno al obtener la lista de amigos con estadísticas.
 *
 * @returns {Object} JSON con la lista de amigos y, para cada uno, sus estadísticas.
 * @returns {Object[]} res.amigos - Array de objetos, cada objeto contiene los datos del amigo y un campo 'estadisticas' con:
 * @returns {number} res.amigos[].idUsuario - ID del amigo.
 * @returns {string} res.amigos[].nombre - Nombre del amigo.
 * @returns {string} res.amigos[].correo - Correo del amigo.
 * @returns {string} res.amigos[].avatar - Avatar del amigo.
 * @returns {string} res.amigos[].fechaCreacion - Fecha de creación del usuario.
 * @returns {Object} res.amigos[].estadisticas - Objeto con las estadísticas del amigo.
 * @returns {number} res.amigos[].estadisticas.partidasGanadas - Número de partidas ganadas.
 * @returns {number} res.amigos[].estadisticas.partidasTotales - Total de partidas jugadas (finalizadas).
 * @returns {number} res.amistads[].estadisticas.porcentajeVictorias - Porcentaje de victorias.
 * @returns {Object[]} res.amigos[].estadisticas.rolesMasJugados - Array con los roles más jugados y su cantidad.
 */
router.get("/listarConEstadisticas/:idUsuario", async (req, res) => {
  try {
    // Convertimos el parámetro a número
    const idUsuario = parseInt(req.params.idUsuario, 10);
    if (isNaN(idUsuario)) {
      return res
        .status(400)
        .json({ error: "El ID de usuario debe ser un número válido." });
    }

    // Llamamos al DAO para obtener los amigos con estadísticas
    const amigosConStats = await AmistadDAO.obtenerAmigosConEstadisticas(
      idUsuario
    );

    res.status(200).json({ amigos: amigosConStats });
  } catch (error) {
    console.error("Error en endpoint de amigos con estadísticas:", error);
    res.status(500).json({
      error: {
        mensaje: "Error al obtener la lista de amigos con estadísticas.",
      },
    });
  }
});

module.exports = router;
