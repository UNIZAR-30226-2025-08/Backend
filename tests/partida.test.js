// partida.test.js
const Partida = require("../partida");

/**
 * Crea una lista de jugadores con roles predefinidos.
 * @returns {Array<Object>} Lista de jugadores.
 */
function crearJugadores() {
  return [
    { id: "1", rol: "Hombre lobo" },
    { id: "2", rol: "Hombre lobo" },
    { id: "3", rol: "Bruja" },
    { id: "4", rol: "Vidente" },
    { id: "5", rol: "Aldeano" },
  ];
}

describe("Clase Partida", () => {
  let partida;

  beforeEach(() => {
    // Inicializa una nueva partida antes de cada test
    const jugadores = crearJugadores();
    partida = new Partida("partida1", jugadores);
  });

  /**
   * Test para verificar que la partida se inicia correctamente.
   */
  test("iniciar la partida correctamente", () => {
    expect(partida.idPartida).toBe("partida1");
    expect(partida.estado).toBe("en_curso");
    expect(partida.turno).toBe("dia");
    expect(partida.jugadores.length).toBe(5);
  });

  /**
   * Test para cambiar el turno de día a noche.
   */
  test("cambiar el turno de día a noche", () => {
    partida.gestionarTurno(); // Cambia a 'noche'
    expect(partida.turno).toBe("noche");
  });

  /**
   * Test para verificar si la partida ha terminado.
   */
  test("verificar si la partida ha terminado", () => {
    expect(partida.gestionarTurno()).toBe("El turno ha cambiado.");

    // Simular una situación de victoria de los lobos
    partida.jugadores = [
      { id: "1", rol: "Hombre lobo", estaVivo: true },
      { id: "2", rol: "Hombre lobo", estaVivo: true },
      { id: "3", rol: "Bruja", estaVivo: false },
      { id: "4", rol: "Vidente", estaVivo: false },
      { id: "5", rol: "Aldeano", estaVivo: false },
    ];
    expect(partida.gestionarTurno().mensaje).toBe(
      "Los hombres lobos han ganado la partida.",
    );
    expect(partida.gestionarTurno().ganador).toBe("hombres lobos");
  });

  /**
   * Test para revisar que los jugadores eliminados no puedan votar.
   */
  test("revisar que los jugadores eliminados no puedan votar", () => {
    // Simular que el jugador 3 está eliminado
    partida.jugadores.find((j) => j.id === "3").estaVivo = false;
    partida.vota("3", "2");
    expect(partida.votos["3"]).toBe(undefined);
  });

  /**
   * Test para verificar que los jugadores vivos pueden votar.
   */
  test("los jugadores vivos pueden votar", () => {
    partida.vota("1", "5");
    expect(partida.votos["1"]).toBe("5");
  });

  /**
   * Test para añadir un mensaje al chat durante el día.
   */
  test("añadir un mensaje al chat durante el día", () => {
    partida.agregarMensajeChatDia("1", "Hola a todos");
    expect(partida.chat.length).toBe(1);
    expect(partida.chat[0].mensaje).toBe("Hola a todos");
  });

  /**
   * Test para impedir a los jugadores eliminados enviar mensaje.
   */
  test("impedir a los jugadores eliminados enviar mensaje", () => {
    partida.gestionarTurno(); // Cambia a 'noche'
    partida.votaNoche("1", "3"); // El jugador 1 (lobo) vota por el jugador 3
    partida.votaNoche("2", "3"); // El jugador 2 (lobo) vota por el jugador 3
    partida.votaNoche("3", "2"); // El jugador 3 (no es lobo) intenta votar por el jugador 2. No puede votar.
    partida.votaNoche("4", "2"); // El jugador 4 (no es lobo) intenta votar por el jugador 2. No puede votar.
    partida.votaNoche("5", "2"); // El jugador 5 (no es lobo) intenta votar por el jugador 2. No puede votar.
    partida.resolverVotosNoche(); // Se eliminará al jugador 3 al cambiar de turno
    partida.gestionarTurno(); // Cambia a 'dia'
    partida.agregarMensajeChatDia("3", "Hola a todos");
    expect(partida.turno).toBe("dia");
    expect(partida.jugadores.find((j) => j.id === "3").estaVivo).toBe(false);
    expect(partida.chat.length).toBe(0); // No debe agregar el mensaje
  });

  /**
   * Test para realizar una votación correctamente, eliminando a un jugador tras alcanzar una mayoría.
   */
  test("realizar una votación correctamente, eliminando a un jugador tras alcanzar una mayoría", () => {
    expect(partida.turno).toBe("dia");
    partida.vota("1", "3"); // El jugador 1 vota por el jugador 3
    partida.vota("2", "3"); // El jugador 2 vota por el jugador 3
    partida.vota("3", "2"); // El jugador 3 vota por el jugador 2
    partida.vota("4", "2"); // El jugador 4 vota por el jugador 2
    partida.vota("5", "2"); // El jugador 5 vota por el jugador 2
    expect(partida.votos["1"]).toBe("3");
    expect(partida.votos["2"]).toBe("3");
    expect(partida.votos["3"]).toBe("2");
    expect(partida.votos["4"]).toBe("2");
    expect(partida.votos["5"]).toBe("2");
    partida.resolverVotosDia();
    expect(partida.colaEliminaciones).toContain("2");
    partida.gestionarTurno(); // Cambia a 'noche'
    expect(partida.jugadores.find((j) => j.id === "2").estaVivo).toBe(false);
  });

  /**
   * Test para hacer la votación del Alguacil dando empate durante el día. El alguacil tiene voto doble.
   */
  test("hacer la votación del Alguacil dando empate durante el dia. El alguacil tiene voto doble", () => {
    partida.votaAlguacil("1", "2"); // Jugador 1 vota por jugador 2
    partida.votaAlguacil("3", "2"); // Jugador 3 vota por jugador 2
    partida.votaAlguacil("4", "3"); // Jugador 4 vota por jugador 3
    partida.votaAlguacil("5", "3"); // Jugador 5 vota por jugador 3
    resultado = partida.elegirAlguacil();
    expect(partida.repetirVotacionAlguacil).toBe(true);
    expect(resultado).toBe(
      "Empate en la elección del alguacil, se repiten las votaciones.",
    );
    partida.votaAlguacil("1", "2"); // Jugador 1 vota por jugador 2
    partida.votaAlguacil("2", "3"); // Jugador 2 vota por jugador 3
    partida.votaAlguacil("3", "2"); // Jugador 3 vota por jugador 2
    partida.votaAlguacil("4", "3"); // Jugador 4 vota por jugador 3
    partida.votaAlguacil("5", "3"); // Jugador 5 vota por jugador 3
    resultado = partida.elegirAlguacil();
    expect(partida.repetirVotacionAlguacil).toBe(false);
    expect(resultado).toBe("El jugador 3 ha sido elegido como alguacil.");
    expect(partida.jugadores.find((j) => j.id === "1").esAlguacil).toBe(false);
    expect(partida.jugadores.find((j) => j.id === "2").esAlguacil).toBe(false);
    expect(partida.jugadores.find((j) => j.id === "3").esAlguacil).toBe(true);
    expect(partida.jugadores.find((j) => j.id === "4").esAlguacil).toBe(false);
    expect(partida.jugadores.find((j) => j.id === "5").esAlguacil).toBe(false);
    partida.vota("1", "3"); // El jugador 1 vota por el jugador 3
    partida.vota("3", "2"); // El jugador 3 (alguacil) vota por el jugador 2. Su voto cuenta doble
    partida.vota("4", "3"); // El jugador 4 vota por el jugador 3
    resultado = partida.resolverVotosDia();
    expect(resultado).toBe("Empate, se repiten las votaciones.");
    partida.vota("1", "3"); // El jugador 1 vota por el jugador 3
    partida.vota("3", "2"); // El jugador 3 vota por el jugador 2
    partida.vota("4", "3"); // El jugador 4 vota por el jugador 3
    partida.vota("5", "3"); // El jugador 5 vota por el jugador 3
    resultado = partida.resolverVotosDia();
    expect(resultado).toBe("El jugador 3 será eliminado al final del día.");
    partida.gestionarTurno(); // Cambia a 'noche'
    expect(partida.jugadores.find((j) => j.id === "3").estaVivo).toBe(false);
  });

  /**
   * Test para impedir eliminar al objetivo si no hay consenso entre los lobos durante la noche.
   */
  test("impedir eliminar al objetivo si no hay consenso entre los lobos durante la noche", () => {
    partida.gestionarTurno(); // Cambia a 'noche'
    partida.votaNoche("1", "4");
    partida.votaNoche("2", "3"); // Los lobos no se ponen de acuerdo
    const result = partida.resolverVotosNoche();
    expect(result).toBe(
      "Los lobos no se pusieron de acuerdo, no hay víctima esta noche.",
    );
    expect(partida.colaEliminaciones).toEqual([]);
    partida.gestionarTurno(); // Cambia a 'dia'
    expect(partida.turno).toBe("dia");
    expect(partida.jugadores.find((j) => j.id === "4").estaVivo).toBe(true);
    expect(partida.jugadores.find((j) => j.id === "3").estaVivo).toBe(true);
  });

  /**
   * Test para evitar que un lobo vote a otro lobo durante la noche.
   */
  test("evitar que un lobo vote a otro lobo durante la noche", () => {
    partida.gestionarTurno(); // Cambia a 'noche'
    partida.votaNoche("1", "1");
    partida.votaNoche("2", "1");
    partida.resolverVotosNoche();
    expect(partida.colaEliminaciones).toEqual([]);
    partida.gestionarTurno(); // Cambia a 'dia'
    expect(partida.turno).toBe("dia");
    expect(partida.jugadores.find((j) => j.id === "1").estaVivo).toBe(true);
  });

  /**
   * Test para verificar que los lobos eliminan a un jugador si hay consenso.
   */
  test("los lobos eliminan a un jugador si hay consenso", () => {
    partida.gestionarTurno(); // Cambia a 'noche'
    partida.votaNoche("1", "4");
    partida.votaNoche("2", "4");
    partida.resolverVotosNoche();
    expect(partida.colaEliminaciones).toContain("4");
    partida.gestionarTurno(); // Cambia a 'dia'
    expect(partida.turno).toBe("dia");
    expect(partida.jugadores.find((j) => j.id === "4").estaVivo).toBe(false);
  });

  /**
   * Test para usar la poción de cura de la bruja correctamente. Evitar que la bruja use la poción de curar dos veces.
   */
  test("usar la poción de cura de la bruja correctamente. Evitar que la bruja use la poción de curar dos veces", () => {
    partida.gestionarTurno(); // Cambia a 'noche'
    partida.votaNoche("1", "3"); // El jugador 1 (lobo) vota por el jugador 3
    partida.votaNoche("2", "3"); // El jugador 2 (lobo) vota por el jugador 3
    partida.resolverVotosNoche(); // Se eliminará al jugador 3 al cambiar de turno
    expect(partida.colaEliminaciones).toContain("3");
    partida.usaPocionBruja("3", "curar", "3"); // La bruja intenta sanarse así misma
    expect(partida.colaEliminaciones).not.toContain("3");
    partida.gestionarTurno(); // Cambia a 'dia'
    expect(partida.turno).toBe("dia");
    expect(partida.jugadores.find((j) => j.id === "3").estaVivo).toBe(true);

    partida.gestionarTurno(); // Cambia a 'noche'
    partida.votaNoche("1", "3"); // El jugador 1 (lobo) vota por el jugador 3
    partida.votaNoche("2", "3"); // El jugador 2 (lobo) vota por el jugador 3
    partida.resolverVotosNoche(); // Se eliminará al jugador 3 al cambiar de turno
    expect(partida.colaEliminaciones).toContain("3");
    partida.usaPocionBruja("3", "curar", "3"); // La bruja intenta sanarse así misma, pero ya usó la poción
    expect(partida.colaEliminaciones).toContain("3");
    partida.gestionarTurno(); // Cambia a 'dia'
    expect(partida.turno).toBe("dia");
    expect(partida.jugadores.find((j) => j.id === "3").estaVivo).toBe(false);
  });

  /**
   * Test para usar la poción de muerte de la bruja correctamente. Evitar que la bruja use la poción de matar dos veces.
   */
  test("usar la poción de muerte de la bruja correctamente. Evitar que la bruja use la poción de matar dos veces", () => {
    partida.gestionarTurno(); // Cambia a 'noche'
    partida.votaNoche("1", "4"); // El jugador 1 (lobo) vota por el jugador 4
    partida.votaNoche("2", "4"); // El jugador 2 (lobo) vota por el jugador 4
    partida.resolverVotosNoche(); // Se eliminará al jugador 4 al cambiar de turno
    partida.usaPocionBruja("3", "matar", "1"); // La bruja intenta matar al jugador 1
    expect(partida.colaEliminaciones).toContain("4");
    expect(partida.colaEliminaciones).toContain("1");
    partida.gestionarTurno(); // Cambia a 'dia'
    expect(partida.turno).toBe("dia");
    expect(partida.jugadores.find((j) => j.id === "4").estaVivo).toBe(false);
    expect(partida.jugadores.find((j) => j.id === "1").estaVivo).toBe(false);

    partida.gestionarTurno(); // Cambia a 'noche'
    partida.votaNoche("2", "5"); // El jugador 2 (lobo) vota por el jugador 5
    partida.resolverVotosNoche(); // Se eliminará al jugador 5 al cambiar de turno
    partida.usaPocionBruja("3", "matar", "2"); // La bruja intenta matar al jugador 2
    expect(partida.colaEliminaciones).toContain("5");
    expect(partida.colaEliminaciones).not.toContain("2");
    partida.gestionarTurno(); // Cambia a 'dia'
    expect(partida.turno).toBe("dia");
    expect(partida.jugadores.find((j) => j.id === "5").estaVivo).toBe(false);
    expect(partida.jugadores.find((j) => j.id === "2").estaVivo).toBe(true);
  });

  /**
   * Test para prevenir a la vidente de ver el rol de un jugador muerto, ver el rol de un jugador vivo e
   * impedir volver a ver el rol de otro jugador durante la misma noche.
   */
  test(`prevenir a la vidente de ver el rol de un jugador muerto, 
    ver el rol de un jugador vivo e impedir volver a ver el rol de otro jugador durante la misma noche`, () => {
    partida.gestionarTurno(); // Cambia a 'noche'
    partida.votaNoche("1", "3"); // El jugador 1 (lobo) vota por el jugador 3
    partida.votaNoche("2", "3"); // El jugador 2 (lobo) vota por el jugador 3
    partida.resolverVotosNoche(); // Se eliminará al jugador 3 al cambiar de turno
    expect(partida.colaEliminaciones).toContain("3");
    partida.gestionarTurno(); // Cambia a 'dia'
    partida.gestionarTurno(); // Cambia a 'noche'
    expect(partida.turno).toBe("noche");
    expect(partida.jugadores.find((j) => j.id === "3").estaVivo).toBe(false);
    result = partida.videnteRevela("4", "3"); // La vidente intenta ver el rol del jugador 3
    expect(result).toBe("Solo puedes ver el rol de un jugador vivo.");
    result = partida.videnteRevela("4", "1"); // La vidente intenta ver el rol del jugador 1
    expect(result).toBe("El jugador 1 es Hombre lobo.");
    result = partida.videnteRevela("4", "2"); // La vidente intenta ver el rol del jugador 2
    expect(result).toBe("No puedes usar esta habilidad.");
  });

  /**
   * Test para elegir sucesor para el alguacil cuando muere.
   */
  test("elegir sucesor para el alguacil cuando muere", () => {
    // Elegir a un alguacil inicial
    partida.votaAlguacil("1", "3");
    partida.votaAlguacil("2", "3");
    partida.votaAlguacil("3", "3");
    partida.votaAlguacil("4", "5");
    partida.votaAlguacil("5", "5");
    partida.elegirAlguacil();

    // El jugador 3 es el alguacil
    expect(partida.jugadores.find((j) => j.id === "3").esAlguacil).toBe(true);

    partida.gestionarTurno(); // Cambia a 'noche'
    partida.votaNoche("1", "3"); // El jugador 1 (lobo) vota por el jugador 3
    partida.votaNoche("2", "3"); // El jugador 2 (lobo) vota por el jugador 3
    partida.resolverVotosNoche(); // Se eliminará al jugador 3 al cambiar de turno
    expect(partida.colaEliminaciones).toContain("3");
    partida.gestionarTurno(); // Cambia a 'dia'
    // El alguacil es eliminado y elige un sucesor
    partida.jugadores.find((j) => j.id === "3").estaVivo = false;
    partida.elegirSucesor("3", "1"); // Elegir sucesor

    expect(partida.jugadores.find((j) => j.id === "3").esAlguacil).toBe(false);
    // El jugador 1 es el nuevo alguacil
    expect(partida.jugadores.find((j) => j.id === "1").esAlguacil).toBe(true);
  });

  /**
   * Test para verificar que el cazador dispara al morir.
   */
  test("el cazador dispara al morir", () => {
    partida.gestionarTurno(); // Cambia a 'noche'
    // Añadir al cazador a la partida
    partida.jugadores.push({ id: "6", rol: "Cazador", estaVivo: true });

    // Aseguramos que el cazador está en la partida
    expect(partida.jugadores.find((j) => j.id === "6").rol).toBe("Cazador");

    partida.votaNoche("1", "6"); // El jugador 1 (lobo) vota por el jugador 6
    partida.votaNoche("2", "6"); // El jugador 2 (lobo) vota por el jugador 6
    partida.resolverVotosNoche(); // Se eliminará al jugador 6 al cambiar de turno
    expect(partida.colaEliminaciones).toContain("6");
    partida.gestionarTurno(); // Cambia a 'dia'
    // El cazador muere y elige a un objetivo
    partida.jugadores.find((j) => j.id === "6").estaVivo = false;
    partida.cazadorDispara("6", "2"); // El cazador dispara al jugador 2

    // Verificar que el jugador 2 también muere
    partida.gestionarTurno(); // Cambia a 'noche'
    expect(partida.jugadores.find((j) => j.id === "2").estaVivo).toBe(false);
  });
});
