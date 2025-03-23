const express = require("express");
const router = express.Router();
const PartidaDAO = require("../dao/partidaDao");

/**
 * @file PartidaRoutes.js
 * @description Endpoints para la gestión de partidas.
 * @module API_Partida
 */

/**
 * Crea una nueva partida.
 * @function POST /api/partida/crear
 *
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {string} req.body.nombre - Nombre de la partida.
 * @param {string} req.body.tipo - Tipo de la partida ('publica' o 'privada').
 * @param {string} [req.body.contrasena] - Contraseña de la partida (si es privada).
 *
 * @throws {500} Error interno al crear la partida.
 *
 * @param {Object} res - Objeto de respuesta HTTP.
 * @param {number} res.status - Código de estado HTTP.
 * @param {string} res.mensaje - Mensaje de confirmación de la creación de la partida.
 * @param {Object} res.partida - Objeto con la información de la partida creada.
 * @param {number} res.partida.idPartida - ID único de la partida creada.
 * @param {string} res.partida.nombre - Nombre de la partida.
 * @param {string} res.partida.tipo - Tipo de la partida ('publica' o 'privada').
 * @param {string} res.partida.fecha - Fecha y hora de creación de la partida.
 * @param {string} res.partida.estado - Estado actual de la partida.
 * @param {string|null} res.partida.ganadores - Ganadores de la partida (null si aún no ha terminado).
 *
 * @param {Object} res.error - Objeto de error.
 * @param {string} res.error.mensaje - Descripción del error.
 */
router.post("/crear", async (req, res) => {
  const { nombre, tipo, contrasena } = req.body;
  try {
    const partida = await PartidaDAO.crearPartida(nombre, tipo, contrasena);
    res.json({ mensaje: "Partida creada", partida });
  } catch (error) {
    res.status(500).json({ error: "Error al crear la partida" });
  }
});

/**
 * Actualiza el estado y los ganadores de una partida al finalizarla.
 * @function PUT /api/partida/finalizar-partida
 *
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {number} req.body.idPartida - ID de la partida.
 * @param {string} req.body.estado - Nuevo estado ('terminada').
 * @param {string} req.body.ganadores - Bando ganador ('lobos' o 'aldeanos').
 *
 * @throws {400} Faltan parámetros en la solicitud.
 * @throws {400} El estado debe ser 'terminada' para finalizar la partida.
 * @throws {400} El bando ganador debe ser 'lobos' o 'aldeanos'.
 * @throws {404} Partida no encontrada.
 * @throws {500} Error interno al finalizar la partida.
 *
 * @param {Object} res - Objeto de respuesta HTTP.
 * @param {number} res.status - Código de estado HTTP.
 * @param {string} res.mensaje - Mensaje de confirmación de la finalización de la partida.
 * @param {Object} res.partida - Objeto con la información de la partida finalizada.
 * @param {number} res.partida.idPartida - ID único de la partida finalizada.
 * @param {string} res.partida.nombre - Nombre de la partida.
 * @param {string} res.partida.tipo - Tipo de la partida ('publica' o 'privada').
 * @param {string} res.partida.fecha - Fecha y hora de creación de la partida.
 * @param {string} res.partida.estado - Estado final de la partida ('terminada').
 * @param {string} res.partida.ganadores - Bando ganador ('lobos' o 'aldeanos').
 *
 * @param {Object} res.error - Objeto de error.
 * @param {string} res.error.mensaje - Descripción del error.
 */
router.put("/finalizar-partida", async (req, res) => {
  const { idPartida, estado, ganadores } = req.body;

  // Validaciones
  if (!idPartida || !estado || !ganadores) {
    return res.status(400).json({ error: "Faltan parámetros en la solicitud" });
  }

  // Validar estado
  if (estado !== "terminada") {
    return res
      .status(400)
      .json({
        error: "El estado debe ser 'terminada' para finalizar la partida",
      });
  }

  // Validar bando ganador
  if (!["lobos", "aldeanos"].includes(ganadores)) {
    return res
      .status(400)
      .json({ error: "El bando ganador debe ser 'lobos' o 'aldeanos'" });
  }

  try {
    const partida = await PartidaDAO.finalizarPartida(
      idPartida,
      estado,
      ganadores
    );

    // Si no se encontró la partida, devolvemos un error
    if (!partida) {
      return res.status(404).json({ error: "Partida no encontrada" });
    }

    // Retornamos el mensaje de éxito con la partida finalizada
    res.json({ mensaje: "Partida finalizada", partida });
  } catch (error) {
    res.status(500).json({ error: "Error al finalizar la partida" });
  }
});

/**
 * Obtiene el estado de una partida.
 * @function GET /api/partida/:id
 *
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {number} req.params.id - ID de la partida.
 *
 * @throws {400} El ID de la partida debe ser un número válido.
 * @throws {404} Partida no encontrada.
 * @throws {500} Error interno al obtener la partida.
 *
 * @param {Object} res - Objeto de respuesta HTTP.
 * @param {number} res.status - Código de estado HTTP.
 * @param {Object} res.partida - Objeto con la información de la partida.
 * @param {number} res.partida.idPartida - ID único de la partida.
 * @param {string} res.partida.nombre - Nombre de la partida.
 * @param {string} res.partida.tipo - Tipo de la partida ('publica' o 'privada').
 * @param {string} res.partida.fecha - Fecha y hora de creación de la partida.
 * @param {string} res.partida.estado - Estado actual de la partida.
 * @param {string|null} res.partida.ganadores - Ganadores de la partida (null si aún no ha terminado).
 *
 * @param {Object} res.error - Objeto de error.
 * @param {string} res.error.mensaje - Descripción del error.
 */
router.get("/:id", async (req, res) => {
  try {
    const idPartida = parseInt(req.params.id, 10); // Convertir a número

    if (isNaN(idPartida)) {
      return res
        .status(400)
        .json({ error: "El ID de la partida debe ser un número válido." });
    }

    const partida = await PartidaDAO.obtenerPartida(idPartida); // el id de la partida es un parámetro de ruta dinámico
    if (!partida) {
      return res.status(404).json({ error: "Partida no encontrada" });
    }
    res.json(partida);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener la partida" });
  }
});

/**
 * Verifica la contraseña de una partida privada.
 * @function POST /api/partida/verificar-contrasena
 *
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {number} req.body.idPartida - ID de la partida.
 * @param {string} req.body.contrasena - Contraseña ingresada.
 *
 * @throws {500} Error interno al verificar la contraseña.
 *
 * @param {Object} res - Objeto de respuesta HTTP.
 * @param {number} res.status - Código de estado HTTP.
 * @param {string} res.mensaje - Mensaje de verificación de la contraseña.
 * @param {boolean} res.valida - Indica si la contraseña es correcta o no.
 *
 * @param {Object} res.error - Objeto de error.
 * @param {string} res.error.mensaje - Descripción del error.
 */
router.post("/verificar-contrasena", async (req, res) => {
  const { idPartida, contrasena } = req.body;
  try {
    const esValida = await PartidaDAO.verificarContrasena(
      idPartida,
      contrasena
    );
    res.json({
      mensaje: esValida ? "Contraseña correcta" : "Contraseña incorrecta",
      valida: esValida,
    });
  } catch (error) {
    res.status(500).json({ error: "Error al verificar la contraseña" });
  }
});

module.exports = router;
