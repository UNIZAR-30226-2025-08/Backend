const request = require("supertest");
const express = require("express");
const bodyParser = require("body-parser");
const pool = require("../config/db"); // Usamos la pool existente

// Crear la aplicación Express para pruebas
const app = express();
app.use(bodyParser.json());

// Importar rutas
const usuarioRoutes = require("../routes/usuarioRoutes");
const partidaRoutes = require("../routes/partidaRoutes");
const solicitudAmistadRoutes = require("../routes/solicitudAmistadRoutes");
const amistadRoutes = require("../routes/amistadRoutes");
const juegaRoutes = require("../routes/juegaRoutes");
const sugerenciasRoutes = require("../routes/sugerenciasRoutes");
const rankingRoutes = require("../routes/rankingRoutes");
const administradorRoutes = require("../routes/administradorRoutes");
const estadisticasRoutes = require("../routes/estadisticasRoutes");

// Usar rutas
app.use("/api/usuario", usuarioRoutes);
app.use("/api/partida", partidaRoutes);
app.use("/api/solicitud", solicitudAmistadRoutes);
app.use("/api/amistad", amistadRoutes);
app.use("/api/juega", juegaRoutes);
app.use("/api/sugerencias", sugerenciasRoutes);
app.use("/api/ranking", rankingRoutes);
app.use("/api/admin", administradorRoutes);
app.use("/api/estadisticas", estadisticasRoutes);

// Variables globales para los tests
let testUserId;
let testUser2Id;
let testPartidaId;
let nombreActualizado;
let idSugerencia;

describe("Tests de rutas de Usuario", () => {
  const testUser = {
    nombre: "oscar",
    correo: "pruebaRoutes@unizar.es",
    contrasena: "Hola123",
    avatar: "https://example.com/avatar.jpg",
  };

  const testUser2 = {
    nombre: "testUser2",
    correo: "test2@unizar.es",
    contrasena: "Test123",
    avatar: "https://example.com/avatar2.jpg",
  };

  beforeAll(async () => {
    // Verificar conexión con la base de datos
    try {
      const res = await pool.query("SELECT NOW()");
      console.log("Conexión exitosa a la base de datos:", res.rows[0]);
    } catch (error) {
      console.error("Error conectando a la base de datos:", error);
      throw error;
    }

    // Limpiar usuarios de prueba si ya existen
    await pool.query(`DELETE FROM "Usuario" WHERE correo IN ($1, $2)`, [
      testUser.correo,
      testUser2.correo,
    ]);
  });

  test("POST /api/usuario/crear - Crear nuevo usuario", async () => {
    const response = await request(app)
      .post("/api/usuario/crear")
      .send(testUser);

    expect(response.status).toBe(201);
    expect(response.body.usuario).toBeDefined();
    expect(response.body.usuario.nombre).toBe(testUser.nombre);
    expect(response.body.usuario.correo).toBe(testUser.correo);
    testUserId = response.body.usuario.idUsuario;
  });

  test("POST /api/usuario/crear - Crear segundo usuario", async () => {
    const response = await request(app)
      .post("/api/usuario/crear")
      .send(testUser2);

    expect(response.status).toBe(201);
    expect(response.body.usuario).toBeDefined();
    expect(response.body.usuario.nombre).toBe(testUser2.nombre);
    expect(response.body.usuario.correo).toBe(testUser2.correo);
    testUser2Id = response.body.usuario.idUsuario;
  });

  test("POST /api/usuario/login - Login usuario", async () => {
    const response = await request(app).post("/api/usuario/login").send({
      correo: testUser.correo,
      contrasena: testUser.contrasena,
    });

    expect(response.status).toBe(200);
    expect(response.body.usuario).toBeDefined();
    expect(response.body.usuario.nombre).toBe(testUser.nombre);
    expect(response.body.usuario.correo).toBe(testUser.correo);
  });

  test("POST /api/usuario/obtener - Obtener usuario por correo", async () => {
    const response = await request(app)
      .post("/api/usuario/obtener")
      .send({ correo: testUser.correo });

    expect(response.status).toBe(200);
    expect(response.body.usuario).toBeDefined();
    expect(response.body.usuario.nombre).toBe(testUser.nombre);
    expect(response.body.usuario.correo).toBe(testUser.correo);
  });

  test("POST /api/usuario/obtener_por_id - Obtener usuario por id", async () => {
    const response = await request(app)
      .post("/api/usuario/obtener_por_id")
      .send({ idUsuario: testUserId });

    expect(response.status).toBe(200);
    expect(response.body.usuario).toBeDefined();
    expect(response.body.usuario.nombre).toBe(testUser.nombre);
    expect(response.body.usuario.correo).toBe(testUser.correo);
  });

  test("POST /api/usuario/obtener_por_nombre - Obtener usuario por nombre", async () => {
    const response = await request(app)
      .post("/api/usuario/obtener_por_nombre")
      .send({ nombre: testUser.nombre });

    expect(response.status).toBe(200);
    expect(response.body.usuario).toBeDefined();
    expect(response.body.usuario.nombre).toBe(testUser.nombre);
    expect(response.body.usuario.correo).toBe(testUser.correo);
  });

  test("POST /api/usuario/obtener_avatar_por_id - Obtener el avatar de un usuario por su id", async () => {
    const response = await request(app)
      .post("/api/usuario/obtener_avatar_por_id")
      .send({ idUsuario: testUserId });

    expect(response.status).toBe(200);
    expect(response.body.avatar).toBeDefined();
    expect(response.body.avatar).toBe(testUser.avatar);
  });

  test("POST /api/usuario/obtener_nombre_por_id - Obtener el nombre de un usuario por su id", async () => {
    const response = await request(app)
      .post("/api/usuario/obtener_nombre_por_id")
      .send({ idUsuario: testUserId });

    expect(response.status).toBe(200);
    expect(response.body.nombre).toBeDefined();
    expect(response.body.nombre).toBe(testUser.nombre);
  });

  test("POST /api/usuario/buscar_por_nombre - Buscar usuarios por nombre", async () => {
    const response = await request(app)
      .post("/api/usuario/buscar_por_nombre")
      .send({ nombre: testUser.nombre });

    expect(response.status).toBe(200);
    expect(response.body.usuarios).toBeDefined();
    expect(response.body.usuarios.length).toBeGreaterThanOrEqual(1);
    expect(response.body.usuarios[0].nombre).toBe(testUser.nombre);
    expect(response.body.usuarios[0].avatar).toBe(testUser.avatar);
  });

  test("PUT /api/usuario/actualizar - Actualizar perfil", async () => {
    const response = await request(app)
      .put("/api/usuario/actualizar")
      .send({
        idUsuario: testUserId,
        nombre: "testUserUpdated" + Date.now(), // Añadimos timestamp para evitar duplicados
        avatar: "https://example.com/new-avatar.jpg",
        rolFavorito: "lobo",
      });

    expect(response.status).toBe(200);
    expect(response.body.usuario).toBeDefined();
    expect(response.body.usuario.avatar).toBe(
      "https://example.com/new-avatar.jpg",
    );
    expect(response.body.usuario.rolFavorito).toBe("lobo");
    nombreActualizado = response.body.usuario.nombre;
  });
});

describe("Tests de rutas de Partida", () => {
  test("POST /api/partida/crear - Crear nueva partida", async () => {
    const response = await request(app).post("/api/partida/crear").send({
      tipo: "publica",
    });

    expect(response.status).toBe(201);
    expect(response.body.partida).toBeDefined();
    testPartidaId = response.body.partida.idPartida;
    expect(response.body.partida.tipo).toBe("publica");
    expect(response.body.partida.estado).toBe("en_curso");
    expect(testPartidaId).toBeDefined();
  });

  test("PUT /api/partida/finalizar-partida - Finalizar partida", async () => {
    const response = await request(app)
      .put("/api/partida/finalizar-partida")
      .send({
        idPartida: testPartidaId,
        estado: "terminada",
        ganadores: "lobos",
      });

    expect(response.status).toBe(200);
    expect(response.body.partida).toBeDefined();
    expect(response.body.partida.idPartida).toBe(testPartidaId);
    expect(response.body.partida.tipo).toBe("publica");
    expect(response.body.partida.estado).toBe("terminada");
    expect(response.body.partida.ganadores).toBe("lobos");
  });

  test("GET /api/partida/:id - Obtener partida por id", async () => {
    const response = await request(app).get(`/api/partida/${testPartidaId}`);

    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    expect(response.body.idPartida).toBe(testPartidaId);
    expect(response.body.tipo).toBe("publica");
    expect(response.body.estado).toBe("terminada");
    expect(response.body.ganadores).toBe("lobos");
  });
});

describe("Tests de rutas de Juega", () => {
  test("POST /api/juega/asignar - Asignar rol a usuario en partida", async () => {
    const response = await request(app).post("/api/juega/asignar").send({
      idUsuario: testUserId,
      idPartida: testPartidaId,
      rolJugado: "lobo",
    });

    expect(response.status).toBe(200);
    expect(response.body.juega).toBeDefined();
    expect(response.body.juega.idUsuario).toBe(testUserId);
    expect(response.body.juega.idPartida).toBe(testPartidaId);
    expect(response.body.juega.rolJugado).toBe("lobo");
    expect(response.body.mensaje).toBeDefined();
  });

  test("GET /api/juega/usuario/:idUsuario - Obtener partidas de usuario", async () => {
    const response = await request(app).get(`/api/juega/usuario/${testUserId}`);

    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0].idPartida).toBe(testPartidaId);
    expect(response.body[0].rolJugado).toBe("lobo");
  });
});

describe("Tests de rutas de Amistad", () => {
  test("POST /api/amistad/agregar - Agregar amistad", async () => {
    const response = await request(app).post("/api/amistad/agregar").send({
      idUsuario1: testUserId,
      idUsuario2: testUser2Id,
    });

    expect(response.status).toBe(200);
    expect(response.body.amistad).toBeDefined();
    expect(response.body.amistad.idUsuario1).toBe(testUserId);
    expect(response.body.amistad.idUsuario2).toBe(testUser2Id);
    expect(response.body.mensaje).toBeDefined();
  });

  test("GET /api/amistad/listar/:idUsuario - Listar amigos", async () => {
    const response = await request(app).get(
      `/api/amistad/listar/${testUserId}`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    expect(response.body.amigos).toBeDefined();
    expect(response.body.amigos.length).toBe(1);
    expect(response.body.amigos[0]).toBe(testUser2Id);
  });

  test("GET /api/amistad/listarConEstadisticas/:idUsuario - Listar amigos con estadísticas", async () => {
    const response = await request(app).get(
      `/api/amistad/listarConEstadisticas/${testUserId}`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    expect(response.body.amigos.length).toBe(1);
    expect(response.body.amigos[0].idUsuario).toBe(testUser2Id);
    expect(response.body.amigos[0].estadisticas).toBeDefined();
    expect(
      response.body.amigos[0].estadisticas.partidasGanadas,
    ).toBeGreaterThanOrEqual(0);
    expect(
      response.body.amigos[0].estadisticas.partidasTotales,
    ).toBeGreaterThanOrEqual(0);
    expect(
      response.body.amigos[0].estadisticas.porcentajeVictorias,
    ).toBeGreaterThanOrEqual(0);
  });

  test("DELETE /api/amistad/eliminar - Eliminar amistad", async () => {
    const response = await request(app).delete("/api/amistad/eliminar").send({
      idUsuario1: testUserId,
      idUsuario2: testUser2Id,
    });

    expect(response.status).toBe(200);
    expect(response.body.mensaje).toBeDefined();
    expect(response.body.mensaje).toBe("Amistad eliminada correctamente");
  });

  test("POST /api/amistad/agregar - Agregar amistad", async () => {
    const response = await request(app).post("/api/amistad/agregar").send({
      idUsuario1: testUserId,
      idUsuario2: testUser2Id,
    });

    expect(response.status).toBe(200);
    expect(response.body.amistad).toBeDefined();
    expect(response.body.amistad.idUsuario1).toBe(testUserId);
    expect(response.body.amistad.idUsuario2).toBe(testUser2Id);
    expect(response.body.mensaje).toBeDefined();
  });

  test("DELETE /api/amistad/eliminar_por_nombre - Eliminar amistad por nombre", async () => {
    const response = await request(app)
      .delete("/api/amistad/eliminar_por_nombre")
      .send({
        idUsuario1: testUserId,
        nombreUsuario2: "testUser2",
      });

    expect(response.status).toBe(200);
    expect(response.body.mensaje).toBeDefined();
    expect(response.body.mensaje).toBe("Amistad eliminada correctamente");
  });
});

describe("Tests de rutas de Solicitud de Amistad", () => {
  test("POST /api/solicitud/enviar - Enviar solicitud de amistad", async () => {
    const response = await request(app).post("/api/solicitud/enviar").send({
      idEmisor: testUserId,
      idReceptor: testUser2Id,
    });

    expect(response.status).toBe(200);
    expect(response.body.solicitud).toBeDefined();
    expect(response.body.mensaje).toBeDefined();
    expect(response.body.mensaje).toBe("Solicitud enviada");
    expect(response.body.solicitud.idUsuarioEmisor).toBe(testUserId);
    expect(response.body.solicitud.idUsuarioReceptor).toBe(testUser2Id);
  });

  test("GET /api/solicitud/listar/:idUsuario - Listar solicitudes de amistad", async () => {
    const response = await request(app).get(
      `/api/solicitud/listar/${testUser2Id}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.solicitudes).toBeDefined();
    expect(response.body.solicitudes.length).toBe(1);
    expect(response.body.solicitudes[0].idUsuarioEmisor).toBe(testUserId);
    expect(response.body.solicitudes[0].idUsuarioReceptor).toBe(testUser2Id);
    expect(response.body.solicitudes[0].fechaSolicitud).toBeDefined();
    expect(response.body.solicitudes[0].nombreEmisor).toBe(nombreActualizado);
    expect(response.body.solicitudes[0].avatarEmisor).toBe(
      "https://example.com/new-avatar.jpg",
    );
  });

  test("POST /api/solicitud/rechazar - Rechazar solicitud de amistad", async () => {
    const response = await request(app).post("/api/solicitud/rechazar").send({
      idEmisor: testUserId,
      idReceptor: testUser2Id,
    });

    expect(response.status).toBe(200);
    expect(response.body.mensaje).toBeDefined();
    expect(response.body.mensaje).toBe("Solicitud de amistad rechazada.");
  });

  test("POST /api/solicitud/enviar - Enviar solicitud de amistad", async () => {
    const response = await request(app).post("/api/solicitud/enviar").send({
      idEmisor: testUserId,
      idReceptor: testUser2Id,
    });

    expect(response.status).toBe(200);
    expect(response.body.solicitud).toBeDefined();
    expect(response.body.mensaje).toBeDefined();
    expect(response.body.mensaje).toBe("Solicitud enviada");
    expect(response.body.solicitud.idUsuarioEmisor).toBe(testUserId);
    expect(response.body.solicitud.idUsuarioReceptor).toBe(testUser2Id);
  });

  test("POST /api/solicitud/aceptar - Aceptar solicitud de amistad", async () => {
    const response = await request(app).post("/api/solicitud/aceptar").send({
      idEmisor: testUserId,
      idReceptor: testUser2Id,
    });

    expect(response.status).toBe(200);
    expect(response.body.mensaje).toBeDefined();
    expect(response.body.mensaje).toBe(
      "Solicitud de amistad aceptada y amistad creada.",
    );
  });
});

describe("Tests de rutas de Sugerencias", () => {
  test("POST /api/sugerencias/enviar - Enviar sugerencia", async () => {
    const response = await request(app).post("/api/sugerencias/enviar").send({
      idUsuario: testUserId,
      contenido: "Sugerencia de prueba",
    });

    expect(response.status).toBe(201);
    expect(response.body.sugerencia).toBeDefined();
    expect(response.body.mensaje).toBeDefined();
    expect(response.body.mensaje).toBe("Sugerencia enviada exitosamente");
    expect(response.body.sugerencia.idUsuario).toBe(testUserId);
    expect(response.body.sugerencia.contenido).toBe("Sugerencia de prueba");
    idSugerencia = response.body.sugerencia.idSugerencia;

    // Agregar más sugerencias para asegurar que hay suficientes datos
    await request(app).post("/api/sugerencias/enviar").send({
      idUsuario: testUserId,
      contenido: "Otra sugerencia de prueba",
    });
  });

  test("GET /api/sugerencias/todas - Obtener todas las sugerencias", async () => {
    const response = await request(app).get("/api/sugerencias/todas");

    expect(response.status).toBe(200);
    expect(response.body.sugerencias).toBeDefined();
    expect(response.body.sugerencias.length).toBeGreaterThanOrEqual(2); // >= 2

    // Buscar el índice de idSugerencia
    const sugerenciaIndex = response.body.sugerencias.findIndex(
      (s) => s.idSugerencia === idSugerencia,
    );
    expect(sugerenciaIndex).toBeGreaterThanOrEqual(0); // Asegurarse de que se encontró la sugerencia
    expect(response.body.sugerencias[sugerenciaIndex].idUsuario).toBe(
      testUserId,
    );
    expect(response.body.sugerencias[sugerenciaIndex].contenido).toBe(
      "Sugerencia de prueba",
    );
  });

  test("POST /api/sugerencias/usuario - Obtener sugerencias de usuario", async () => {
    const response = await request(app)
      .post("/api/sugerencias/usuario")
      .send({ idUsuario: testUserId });

    expect(response.status).toBe(200);
    expect(response.body.sugerencias).toBeDefined();
    expect(response.body.sugerencias.length).toBeGreaterThanOrEqual(2);

    // Buscar el índice de idSugerencia
    const sugerenciaIndex = response.body.sugerencias.findIndex(
      (s) => s.idSugerencia === idSugerencia,
    );

    expect(response.body.sugerencias[sugerenciaIndex].idUsuario).toBe(
      testUserId,
    );
    expect(response.body.sugerencias[sugerenciaIndex].contenido).toBe(
      "Sugerencia de prueba",
    );
    expect(
      response.body.sugerencias[sugerenciaIndex].fechaSugerencia,
    ).toBeDefined();
    expect(response.body.mensaje).toBeDefined();
    expect(response.body.mensaje).toBe("Sugerencias del usuario obtenidas");
  });

  test("GET /api/sugerencias/noRevisadas - Obtener sugerencias no revisadas", async () => {
    const response = await request(app).get("/api/sugerencias/noRevisadas");

    expect(response.status).toBe(200);
    expect(response.body.sugerencias).toBeDefined();
    expect(response.body.sugerencias.length).toBeGreaterThanOrEqual(2);

    // Buscar el índice de idSugerencia
    const sugerenciaIndex = response.body.sugerencias.findIndex(
      (s) => s.idSugerencia === idSugerencia,
    );

    expect(response.body.sugerencias[sugerenciaIndex].idUsuario).toBe(
      testUserId,
    );
    expect(response.body.sugerencias[sugerenciaIndex].contenido).toBe(
      "Sugerencia de prueba",
    );
    expect(
      response.body.sugerencias[sugerenciaIndex].fechaSugerencia,
    ).toBeDefined();
    expect(response.body.sugerencias[sugerenciaIndex].revisada).toBe(false);
    expect(response.body.mensaje).toBeDefined();
    expect(response.body.mensaje).toBe("Sugerencias no revisadas obtenidas");
  });

  test("PUT /api/sugerencias/responder - Responder sugerencia", async () => {
    const response = await request(app).put("/api/sugerencias/responder").send({
      idSugerencia: idSugerencia,
      respuesta: "Respuesta de prueba",
    });

    expect(response.status).toBe(200);
    expect(response.body.mensaje).toBeDefined();
    expect(response.body.mensaje).toBe("Sugerencia respondida exitosamente");
    expect(response.body.sugerencia.idSugerencia).toBe(idSugerencia);
    expect(response.body.sugerencia.respuesta).toBe("Respuesta de prueba");
  });

  test("PUT /api/sugerencias/marcarRevisada - Marcar sugerencia como revisada", async () => {
    const response = await request(app)
      .put("/api/sugerencias/marcarRevisada")
      .send({
        idSugerencia: idSugerencia,
        revisada: true,
      });

    expect(response.status).toBe(200);
    expect(response.body.mensaje).toBeDefined();
    expect(response.body.mensaje).toBe("Sugerencia actualizada");
    expect(response.body.sugerencia.idSugerencia).toBe(idSugerencia);
    expect(response.body.sugerencia.revisada).toBe(true);
  });
});

describe("Tests de rutas de Administrador", () => {
  test("POST /api/admin/asignar - Asignar rol de administrador", async () => {
    const response = await request(app).post("/api/admin/asignar").send({
      idUsuario: testUserId,
    });

    expect(response.status).toBe(201);
    expect(response.body.mensaje).toBeDefined();
    expect(response.body.mensaje).toBe("Administrador asignado correctamente");
    expect(response.body.admin).toBeDefined();
    expect(response.body.admin.idUsuario).toBe(testUserId);
    expect(response.body.admin.fechaAsignacion).toBeDefined();
    expect(response.body.admin.idAdmin).toBeDefined();
  });

  test("POST /api/admin/quitar - Quitar rol de administrador", async () => {
    const response = await request(app).post("/api/admin/quitar").send({
      idUsuario: testUserId,
    });

    expect(response.status).toBe(200);
    expect(response.body.mensaje).toBeDefined();
    expect(response.body.mensaje).toBe(
      "Rol de administrador eliminado exitosamente",
    );
  });

  test("POST /api/admin/esAdministrador - Verificar si un usuario es administrador", async () => {
    const response = await request(app)
      .post("/api/admin/esAdministrador")
      .send({
        idUsuario: testUserId,
      });

    expect(response.status).toBe(200);
    expect(response.body.esAdministrador).toBeDefined();
    expect(response.body.esAdministrador).toBe(false);
  });

  test("GET /api/admin/todos - Obtener todos los administradores", async () => {
    const response = await request(app).get("/api/admin/todos");

    expect(response.status).toBe(200);
    expect(response.body.administradores).toBeDefined();
    expect(response.body.administradores.length).toBeGreaterThanOrEqual(0);
    expect(response.body.mensaje).toBeDefined();
    expect(response.body.mensaje).toBe("Administradores obtenidos");
  });
});

describe("Tests de rutas de Estadisticas", () => {
  test("GET /api/estadisticas/obtener/:idUsuario - Obtener estadisticas de un usuario", async () => {
    const response = await request(app).get(
      `/api/estadisticas/obtener/${testUserId}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.stats).toBeDefined();
    expect(response.body.stats.partidasGanadas).toBeDefined();
    expect(response.body.stats.partidasTotales).toBeDefined();
    expect(response.body.stats.porcentajeVictorias).toBeDefined();
    expect(response.body.mensaje).toBeDefined();
    expect(response.body.mensaje).toBe("Estadísticas obtenidas");
  });
});

describe("Tests de rutas de Ranking", () => {
  test("GET /api/ranking/ranking - Obtener ranking global", async () => {
    const response = await request(app).get("/api/ranking/ranking");

    expect(response.status).toBe(200);
    expect(response.body.ranking).toBeDefined();
    expect(response.body.ranking.length).toBeGreaterThanOrEqual(0);
    expect(response.body.mensaje).toBeDefined();
    expect(response.body.mensaje).toBe("Ranking global obtenido");

    // Verificar que el usuario de prueba esté en el ranking
    const testUserRankingIndex = response.body.ranking.findIndex(
      (user) => user.idUsuario === testUserId,
    );
    expect(response.body.ranking[testUserRankingIndex]).toBeDefined(); // Asegurarse de que el usuario de prueba está en el ranking
    expect(response.body.ranking[testUserRankingIndex].nombre).toBe(
      nombreActualizado,
    ); // Verificar el nombre
    expect(response.body.ranking[testUserRankingIndex].avatar).toBe(
      "https://example.com/new-avatar.jpg",
    ); // Verificar el avatar

    // Convertir victorias a número antes de la comparación
    const victorias = parseInt(
      response.body.ranking[testUserRankingIndex].victorias,
      10,
    );
    expect(victorias).toBeGreaterThanOrEqual(0); // Verificar que el número de victorias sea válido
  });
});

// Cerrar la conexión con la base de datos después de todos los tests
afterAll(async () => {
  try {
    // Limpiar datos de prueba
    await pool.query(
      `DELETE FROM "Partida" WHERE "idPartida" = ${testPartidaId}`,
    );
    await pool.query(
      `DELETE FROM "Sugerencias" WHERE "idUsuario" = ${testUserId}`,
    );
    await pool.query(
      `DELETE FROM "Amistad" WHERE "idUsuario1" = ${testUserId} OR "idUsuario2" = ${testUserId}`,
    );
    await pool.query(
      `DELETE FROM "SolicitudAmistad" WHERE "idUsuarioEmisor" = ${testUserId} OR "idUsuarioReceptor" = ${testUserId}`,
    );
    await pool.query(
      `DELETE FROM "Administrador" WHERE "idUsuario" = ${testUserId}`,
    );
    await pool.query(`DELETE FROM "Juega" WHERE "idUsuario" = ${testUserId}`);
    await pool.query(
      `DELETE FROM "Usuario" WHERE correo IN ('pruebaRoutes@unizar.es', 'test2@unizar.es')`,
    );

    // Esperar un momento antes de cerrar la conexión
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Cerrando la conexión con la base de datos...");
    await pool.end();
  } catch (error) {
    console.error("Error al limpiar datos y cerrar conexión:", error);
    throw error;
  }
});
