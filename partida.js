/**
 * Representa una partida del juego.
 */
class Partida {
  /**
   * Crea una nueva partida.
   * @param {number} idPartida - Identificador único de la partida.
   * @param {Array<Object>} jugadores - Lista de jugadores con sus respectivos roles.
   */
  constructor(idPartida, jugadores) {
    this.idPartida = idPartida;
    this.estado = "en_curso"; // Estado de la partida ('en_curso', 'terminada')
    this.turno = "dia"; // Fase actual: 'dia' o 'noche'. La partida empieza de día
    this.jugadores = jugadores.map((jugador) => ({
      // Array de jugadores con sus roles
      id: jugador.id, // ID del jugador
      nombre: jugador.nombre, // Nombre del jugador
      socketId: jugador.socketId, // ID del socket del jugador
      rol: jugador.rol, // Rol asignado (por ejemplo: 'Hombre lobo', 'Bruja', 'Vidente','Cazador','Aldeano')
      avatar: jugador.avatar, // Avatar del jugador
      estaVivo: true, // ¿Está vivo?
      esAlguacil: false, // ¿Es alguacil?
      pocionCuraUsada: jugador.rol === "Bruja" ? false : undefined, // Si la bruja usó su poción de vida
      pocionMatarUsada: jugador.rol === "Bruja" ? false : undefined, // Si la bruja usó su poción de muerte
      haVisto: jugador.rol === "Vidente" ? false : undefined, // La vidente puede ver el rol de un jugador por la noche
    }));
    this.chat = []; // Mensajes de chat (día: global, noche: solo lobos)
    this.votosAlguacil = {}; // Votos para elegir al alguacil
    this.votos = {}; // Votos de los jugadores durante el día
    this.repetirVotacionAlguacil = false; // Para empates en elección de alguacil
    this.repetirVotosDia = false; // Controla si hubo un empate previo en las votaciones del día
    this.votosNoche = {}; // Votos de los lobos durante la noche
    this.colaEliminaciones = []; // Cola de eliminación al final del turno
    this.votacionActiva = false; // Indica si hay una votación activa
    this.temporizadorVotacion = null; // Temporizador para la votación
    this.tiempoLimiteVotacion = 30000; // Tiempo límite para la votación en milisegundos (30 segundos)
    this.tiempoLimiteHabilidad = 15000; // Tiempo límite para usar habilidades en milisegundos (15 segundos)
  }

  /**
   * (Método que usa partidaWS) Gestiona el cambio de turno en la partida.
   * Aplica las eliminaciones pendientes y verifica si la partida ha terminado.
   * Si la partida sigue en curso, cambia al siguiente turno.
   *
   * @returns {string} Mensaje indicando si el turno ha cambiado o si la partida ha finalizado.
   */
  gestionarTurno() {
    const resultado = this.aplicarEliminaciones(); // Ejecutar eliminaciones pendientes

    // Comprobar si la partida ha terminado o no
    if (resultado === null) {
      this.siguienteTurno(); // la partida sigue en curso, cambiar de turno
      return "El turno ha cambiado.";
    } else {
      return resultado; // la partida terminó, indicar quién ganó la partida
    }
  }

  /**
   * Método interno para cambiar turnos, cambia de día a noche y de noche a
   * día. Reinicia el uso de habilidad de la vidente.
   */
  siguienteTurno() {
    this.turno = this.turno === "dia" ? "noche" : "dia"; // Cambia de día a noche y de noche a día
    this.votos = {}; // Reiniciar votos en el día
    this.votosNoche = {}; // Reiniciar votos de los lobos en la noche
    this.votosAlguacil = {}; // Reiniciar votos para elegir alguacil

    // Reiniciar la habilidad de la vidente cuando comienza una nueva noche
    if (this.turno === "noche") {
      this.jugadores.forEach((jugador) => {
        if (jugador.rol === "Vidente") {
          jugador.haVisto = false;
        }
      });
    }
  }

  /**
   * (Método que usa partidaWS) Agrega un mensaje al chat de la partida si el turno es de día.
   * @param {number} idJugador - ID del jugador que envía el mensaje.
   * @param {string} mensaje - Contenido del mensaje.
   */
  agregarMensajeChatDia(idJugador, mensaje) {
    const jugador = this.jugadores.find((j) => j.id === idJugador);
    if (!jugador || !jugador.estaVivo) return;

    if (this.turno === "dia") {
      this.chat.push({
        nombre: jugador.nombre,
        mensaje,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * (Método que usa partidaWS) Prepara los mensajes privados para los hombres lobos.
   * @param {number} idJugador - ID del jugador que intenta enviar el mensaje.
   * @param {string} mensaje - Contenido del mensaje.
   * @returns {Array<Object>} - Preparación de los mensajes privados para los hombres lobos.
   */
  prepararMensajesChatNoche(idJugador, mensaje) {
    const jugador = this.jugadores.find((j) => j.id === idJugador);
    if (!jugador || !jugador.estaVivo || jugador.rol !== "Hombre lobo") {
      return []; // El jugador que intenta enviar el mensaje no es un hombre lobo o está muerto
    }

    const preparacionMensajes = [];
    this.jugadores.forEach((j) => {
      if (j.rol === "Hombre lobo" && j.estaVivo && j.id !== idJugador) {
        preparacionMensajes.push({
          socketId: j.socketId,
          nombre: jugador.nombre,
          mensaje,
          timestamp: Date.now(),
        });
      }
    });

    return preparacionMensajes; // Retorna la preparación de los mensajes
  }

  /**
   * (Método de server) Elige al alguacil basándose en los votos de los jugadores.
   * En caso de empate, se repiten las votaciones una vez.
   *
   * @returns {string} Mensaje con el resultado de la elección.
   * - Si hay un ganador claro: "El jugador X ha sido elegido como alguacil."
   * - Si hay empate en la primera votación: "Empate en la elección del alguacil, se repiten las votaciones."
   * - Si hay empate en la segunda votación: "Segundo empate consecutivo, no se elige alguacil."
   */
  elegirAlguacil() {
    if (this.turno !== "dia") return;
    const conteoVotos = {};
    for (const votante in this.votosAlguacil) {
      const votado = this.votosAlguacil[votante];
      conteoVotos[votado] = (conteoVotos[votado] || 0) + 1;
    }

    let maxVotos = 0;
    let candidatos = [];

    for (const idJugador in conteoVotos) {
      if (conteoVotos[idJugador] > maxVotos) {
        maxVotos = conteoVotos[idJugador];
        candidatos = [idJugador];
      } else if (conteoVotos[idJugador] === maxVotos) {
        candidatos.push(idJugador);
      }
    }

    if (candidatos.length === 1) {
      this.jugadores.forEach((j) => (j.esAlguacil = false)); // Asegurarse de que ningún jugador sea alguacil
      const alguacil = this.jugadores.find((j) => j.id === candidatos[0]);
      if (alguacil) alguacil.esAlguacil = true;
      this.repetirVotacionAlguacil = false; // Reiniciar flag de repetición
      this.votacionActiva = false; // Desactivar la votación
      clearTimeout(this.temporizadorVotacion); // Limpiar el temporizador
      return `El jugador ${candidatos[0]} ha sido elegido como alguacil.`;
    } else {
      if (this.repetirVotacionAlguacil) {
        this.votacionActiva = false; // Desactivar la votación
        clearTimeout(this.temporizadorVotacion); // Limpiar el temporizador
        return "Segundo empate consecutivo, no se elige alguacil.";
      } else {
        this.repetirVotacionAlguacil = true;
        this.votosAlguacil = {}; // Resetear votos para repetir elección
        this.votacionActiva = false; // Desactivar la votación
        clearTimeout(this.temporizadorVotacion); // Limpiar el temporizador
        return "Empate en la elección del alguacil, se repiten las votaciones.";
      }
    }
  }

  /**
   * Registra el voto de un jugador para la elección del alguacil.
   *
   * @param {string} idJugador - ID del jugador que vota.
   * @param {string} idObjetivo - ID del jugador por el que vota.
   */
  votaAlguacil(idJugador, idObjetivo) {
    if (this.turno !== "dia" || !this.votacionActiva) return;
    const jugador = this.jugadores.find((j) => j.id === idJugador);
    if (!jugador || !jugador.estaVivo) return;

    this.votosAlguacil[idJugador] = idObjetivo;

    // Verificar si todos jugadores han votado
    if (this.verificarVotos("alguacil")) {
      clearTimeout(this.temporizadorVotacion); // Limpiar el temporizador si todos votaron
      this.elegirAlguacil(); // Resuelve la votación de alguacil
    }
  }

  /**
   * Registra el voto de un jugador durante el día.
   * El voto del alguacil cuenta doble.
   *
   * @param {string} idJugador - ID del jugador que vota.
   * @param {string} idObjetivo - ID del jugador al que vota.
   */
  vota(idJugador, idObjetivo) {
    if (this.turno !== "dia" || !this.votacionActiva) return;
    const jugador = this.jugadores.find((j) => j.id === idJugador);
    if (!jugador || !jugador.estaVivo) return;

    this.votos[idJugador] = idObjetivo;
    if (jugador.esAlguacil) {
      this.votos[`alguacil_${idJugador}`] = idObjetivo; // Doble voto (voto extra del alguacil)
    }

    // Verificar si todos los jugadores han votado
    if (this.verificarVotos("dia")) {
      clearTimeout(this.temporizadorVotacion); // Limpiar el temporizador si todos votaron
      this.resolverVotosDia(); // Resuelve la votación de día
    }
  }

  /**
   * Registra el voto de un lobo durante la fase nocturna.
   * Solo los jugadores con el rol de lobo pueden votar en esta fase.
   *
   * @param {string} idJugador - ID del jugador lobo que vota.
   * @param {string} idObjetivo - ID del jugador al que vota.
   */
  votaNoche(idJugador, idObjetivo) {
    if (this.turno !== "noche" || !this.votacionActiva) return;
    const jugador = this.jugadores.find((j) => j.id === idJugador);
    const objetivo = this.jugadores.find((j) => j.id === idObjetivo);

    // Verificar si el jugador que vota es lobo y si el objetivo es válido
    if (!jugador || !jugador.estaVivo || jugador.rol !== "Hombre lobo") return;
    if (!objetivo || !objetivo.estaVivo || objetivo.rol === "Hombre lobo")
      return;

    this.votosNoche[idJugador] = idObjetivo;

    // Verificar si todos los hombres lobos han votado
    if (this.verificarVotos("noche")) {
      clearTimeout(this.temporizadorVotacion); // Limpiar el temporizador si todos votaron
      this.resolverVotosNoche(); // Resuelve la votación de noche
    }
  }

  /**
   * Permite a la vidente revelar el rol de un jugador durante la noche.
   * Solo puede usarse una vez por noche y solo en jugadores vivos.
   *
   * @param {string} idJugador - ID del jugador vidente.
   * @param {string} idObjetivo - ID del jugador cuyo rol se quiere revelar.
   * @returns {string} Mensaje con el rol revelado o una advertencia si la acción no es válida.
   * - Si el jugador seleccionado esta muerto : 'Solo puedes ver el rol de un jugador vivo.'
   * - Si el jugador no puede realizar dicha acción: 'No puedes usar esta habilidad.'
   * - Si la acción es correcta: `El jugador ID es ROL' Siendo ROL el rol del jugador seleccionado
   */
  videnteRevela(idJugador, idObjetivo) {
    if (this.turno !== "noche") return "No es de noche.";
    const jugador = this.jugadores.find((j) => j.id === idJugador);
    if (
      !jugador ||
      !jugador.estaVivo ||
      jugador.rol !== "Vidente" ||
      jugador.haVisto
    )
      return "No puedes usar esta habilidad.";

    const objetivo = this.jugadores.find((j) => j.id === idObjetivo);
    if (!objetivo || !objetivo.estaVivo)
      return "Solo puedes ver el rol de un jugador vivo.";

    jugador.haVisto = true; // La vidente solo puede ver un jugador por noche

    return `El jugador ${idObjetivo} es ${objetivo.rol}.`;
  }

  /**
   * Devuelve la lista de jugadores que están en la cola de eliminaciones.
   * @returns {Array<string>} - Lista de IDs de jugadores en la cola de eliminaciones.
   */
  obtenerJugadoresEnColaEliminacion() {
    return this.colaEliminaciones;
  }

  /**
   * Permite a la bruja usar una de sus pociones.
   * Puede curar a un jugador o eliminar a otro que esté en la cola de eliminaciones.
   *
   * @param {string} idJugador - ID del jugador bruja.
   * @param {string} tipo - Tipo de poción a usar ('curar' o 'matar').
   * @param {string} idObjetivo - ID del jugador afectado por la poción.
   * @returns {Object} - Mensaje de éxito o error.
   */
  usaPocionBruja(idJugador, tipo, idObjetivo) {
    const jugador = this.jugadores.find((j) => j.id === idJugador);
    const objetivo = this.jugadores.find((j) => j.id === idObjetivo);

    if (
      !jugador ||
      !jugador.estaVivo ||
      jugador.rol !== "Bruja" ||
      this.turno !== "noche"
    ) {
      return {
        error:
          "Acción no permitida. No eres la bruja, no es de noche o estás muerto.",
      };
    }

    if (tipo === "curar") {
      if (jugador.pocionCuraUsada) {
        return { error: "Ya has usado la poción de curación." };
      }
      if (!this.colaEliminaciones.includes(idObjetivo)) {
        return {
          error: `No puedes curar a ${idObjetivo} porque no está a punto de morir.`,
        };
      }
      jugador.pocionCuraUsada = true;
      this.colaEliminaciones = this.colaEliminaciones.filter(
        (id) => id !== idObjetivo
      ); // Cancela la muerte de los lobos
      return { mensaje: `La bruja ha salvado a ${idObjetivo}.` };
    }

    if (tipo === "matar") {
      if (jugador.pocionMatarUsada) {
        return { error: "Ya has usado la poción de muerte." };
      }
      if (!objetivo || !objetivo.estaVivo) {
        return {
          error: `No puedes matar a ${idObjetivo} porque ya está muerto.`,
        };
      }
      jugador.pocionMatarUsada = true;
      this.agregarAColaDeEliminacion(idObjetivo); // Se elimina al final del turno
      return {
        mensaje: `La bruja ha usado su poción de muerte con ${idObjetivo}.`,
      };
    }

    return { error: "Tipo de poción inválido." };
  }

  /**
   * Permite al cazador disparar a un jugador si muere.
   * Solo puede usar esta habilidad al momento de su eliminación.
   *
   * @param {string} idJugador - ID del cazador.
   * @param {string} idObjetivo - ID del jugador al que dispara.
   */
  cazadorDispara(idJugador, idObjetivo) {
    const jugador = this.jugadores.find((j) => j.id === idJugador);
    const objetivo = this.jugadores.find((j) => j.id === idObjetivo);

    if (!jugador || jugador.rol !== "Cazador")
      return "No puedes usar esta habilidad.";
    if (!objetivo || !objetivo.estaVivo) return "Jugador erróneo.";

    this.agregarAColaDeEliminacion(idObjetivo); // Se elimina al final del turno
  }

  /**
   * Permite al alguacil elegir a su sucesor antes de morir.
   *
   * @param {string} idJugador - ID del alguacil actual.
   * @param {string} idObjetivo - ID del jugador que será el nuevo alguacil.
   */
  elegirSucesor(idJugador, idObjetivo) {
    const jugador = this.jugadores.find((j) => j.id === idJugador);
    const objetivo = this.jugadores.find((j) => j.id === idObjetivo);

    if (!jugador || !jugador.esAlguacil)
      return "No puedes usar esta habilidad.";
    if (!objetivo || !objetivo.estaVivo) return "Jugador erróneo.";

    jugador.esAlguacil = false; // El alguacil deja de serlo
    objetivo.esAlguacil = true; // El objetivo se convierte en el nuevo alguacil
  }

  /**
   * Resuelve la votación del día, determinando qué jugador será eliminado.
   * En caso de empate, se repiten las votaciones una vez.
   *
   * @returns {string} Mensaje con el resultado de la votación.
   * - Si hay un ganador: "El jugador X será eliminado al final del día."
   * - Si hay empate en la primera votación: "Empate, se repiten las votaciones."
   * - Si hay empate en la segunda votación: "Segundo empate consecutivo, nadie es eliminado."
   */
  resolverVotosDia() {
    if (this.turno !== "dia") return;
    const conteoVotos = {};

    for (const votante in this.votos) {
      const votado = this.votos[votante];
      conteoVotos[votado] = (conteoVotos[votado] || 0) + 1;
    }

    // Determinar el jugador con más votos
    let maxVotos = 0;
    let candidatos = [];

    for (const idJugador in conteoVotos) {
      if (conteoVotos[idJugador] > maxVotos) {
        maxVotos = conteoVotos[idJugador];
        candidatos = [idJugador];
      } else if (conteoVotos[idJugador] === maxVotos) {
        candidatos.push(idJugador);
      }
    }

    if (candidatos.length === 1) {
      this.agregarAColaDeEliminacion(candidatos[0]);
      this.repetirVotosDia = false; // Se reinicia al resolver una votación sin empate
      this.votacionActiva = false; // Desactivar la votación
      clearTimeout(this.temporizadorVotacion); // Limpiar el temporizador
      return `El jugador ${candidatos[0]} será eliminado al final del día.`;
    } else {
      if (this.repetirVotosDia) {
        this.votacionActiva = false; // Desactivar la votación
        clearTimeout(this.temporizadorVotacion); // Limpiar el temporizador
        return "Segundo empate consecutivo, nadie es eliminado.";
      } else {
        this.repetirVotosDia = true;
        this.votos = {}; // Reiniciar votos para repetir la votación
        this.votacionActiva = false; // Desactivar la votación
        clearTimeout(this.temporizadorVotacion); // Limpiar el temporizador
        return "Empate, se repiten las votaciones.";
      }
    }
  }

  /**
   * Resuelve la votación nocturna de los lobos.
   * Solo se elimina a un jugador si todos los lobos votan por la misma persona.
   *
   * @returns {string} Mensaje con el resultado de la votación nocturna.
   * - Si hay unanimidad: "Los lobos atacaron al jugador X. Será eliminado al final de la noche."
   * - Si no hay acuerdo: "Los lobos no se pusieron de acuerdo, no hay víctima esta noche."
   */
  resolverVotosNoche() {
    if (this.turno !== "noche") return;
    const conteoVotos = {};

    for (const idLobo in this.votosNoche) {
      const votado = this.votosNoche[idLobo];
      if (votado) conteoVotos[votado] = (conteoVotos[votado] || 0) + 1;
    }

    // Buscar la víctima con unanimidad
    let victimaElegida = null;
    let totalLobos = this.jugadores.filter(
      (j) => j.rol === "Hombre lobo" && j.estaVivo
    ).length; // Número de lobos vivos
    for (const [idJugador, cuenta] of Object.entries(conteoVotos)) {
      if (cuenta === totalLobos) {
        victimaElegida = idJugador;
      }
    }

    if (victimaElegida) {
      this.agregarAColaDeEliminacion(victimaElegida);
      this.votacionActiva = false; // Desactivar la votación
      clearTimeout(this.temporizadorVotacion); // Limpiar el temporizador
      return `Los lobos atacaron al jugador ${victimaElegida}. Será eliminado al final de la noche.`;
    } else {
      this.votacionActiva = false; // Desactivar la votación
      clearTimeout(this.temporizadorVotacion); // Limpiar el temporizador
      return "Los lobos no se pusieron de acuerdo, no hay víctima esta noche.";
    }
  }

  /**
   * Agrega un jugador a la cola de eliminación, marcándolo para ser eliminado al final del turno.
   *
   * @param {string} idJugador - ID del jugador que será eliminado.
   */
  agregarAColaDeEliminacion(idJugador) {
    const jugador = this.jugadores.find((j) => j.id === idJugador);
    if (jugador && jugador.estaVivo) {
      this.colaEliminaciones.push(idJugador);
    }
  }

  /**
   * Ejecuta las eliminaciones pendientes al final del turno.
   * @returns {string|null} Mensaje indicando el estado de la partida o null si sigue en curso.
   * - Si han ganado los aldeanos : 'Los aldeanos han ganado la partida.'
   * - Si han ganado los lobos : 'Los lobos han ganado la partida.'
   * - Si ha habido empate : 'Empate, no hay ganadores.'
   */
  aplicarEliminaciones() {
    this.colaEliminaciones.forEach((idJugador) => {
      const jugador = this.jugadores.find((j) => j.id === idJugador);
      if (jugador) {
        jugador.estaVivo = false;
      }
    });
    this.colaEliminaciones = []; // Reiniciar la cola

    // Comprobar si hay un ganador y devolver el resultado
    return this.comprobarVictoria();
  }

  /**
   * Verifica si la partida ha terminado y determina el ganador.
   * @returns {string|null} Mensaje con el resultado de la partida o null si sigue en curso.
   * - Si han ganado los aldeanos : 'Los aldeanos han ganado la partida.'
   * - Si han ganado los lobos : 'Los lobos han ganado la partida.'
   * - Si ha habido empate : 'Empate, no hay ganadores.'
   */
  comprobarVictoria() {
    const lobosVivos = this.jugadores.filter(
      (j) => j.estaVivo && j.rol === "Hombre lobo"
    ).length;
    const aldeanosVivos = this.jugadores.filter(
      (j) => j.estaVivo && j.rol !== "Hombre lobo"
    ).length;

    // Ganan los aldeanos cuando no quedan lobos vivos
    if (lobosVivos === 0 && aldeanosVivos !== 0) {
      this.estado = "terminada";
      // Emitir el estado de la partida devolviendo un objeto con el ganador y un mensaje
      return {
        ganador: "aldeanos",
        mensaje: "Los aldeanos han ganado la partida.",
      };
    }

    // Ganan los lobos cuando no quedan aldeanos vivos
    if (aldeanosVivos === 0 && lobosVivos !== 0) {
      this.estado = "terminada";
      return {
        ganador: "hombres lobos",
        mensaje: "Los hombres lobos han ganado la partida.",
      };
    }

    // Empate si todos los jugadores están muertos
    if (aldeanosVivos === 0 && lobosVivos === 0) {
      this.estado = "terminada";
      return { ganador: "empate", mensaje: "Empate, no hay ganadores." };
    }

    return null; // La partida sigue en curso
  }

  /**
   * (Método que usa partidaWS) Verifica si todos los jugadores vivos han votado.
   * Si todos han votado, devuelve true. En caso contrario, devuelve false.
   * @param {string} contexto - Contexto de la votación ('dia', 'noche' o 'alguacil').
   * @returns {boolean} true si todos han votado, false en caso contrario.
   */
  verificarVotos(contexto) {
    let totalJugadoresVivos = 0;
    let totalLobosVivos = 0;
    let totalVotos = 0;
    if (contexto === "dia") {
      totalJugadoresVivos = this.jugadores.filter((j) => j.estaVivo).length;
      totalVotos = Object.keys(this.votos).length;
    } else if (contexto === "noche") {
      totalLobosVivos = this.jugadores.filter(
        (j) => j.estaVivo && j.rol === "Hombre lobo"
      ).length;
      totalVotos = Object.keys(this.votosNoche).length;
    } else if (contexto === "alguacil") {
      totalJugadoresVivos = this.jugadores.filter((j) => j.estaVivo).length;
      totalVotos = Object.keys(this.votosAlguacil).length;
    }

    if (
      (contexto === "alguacil" || contexto === "dia") &&
      totalJugadoresVivos <= totalVotos
    ) {
      // Puede haber más votos que jugadores vivos, por el caso de los votos del jugador que tiene el cargo de alguacil
      return true;
    } else if (contexto === "noche" && totalLobosVivos === totalVotos) {
      return true;
    } else {
      return false;
    }
  }

  // Método para iniciar la votación en el día
  iniciarVotacion() {
    this.votacionActiva = true;
    this.temporizadorVotacion = setTimeout(() => {
      this.resolverVotosDia(); // Resuelve la votación si se agota el tiempo
    }, this.tiempoLimiteVotacion);
  }

  // Método para iniciar la votación del alguacil
  iniciarVotacionAlguacil() {
    this.votacionActiva = true;
    this.temporizadorVotacion = setTimeout(() => {
      this.elegirAlguacil(); // Resuelve la votación si se agota el tiempo
    }, this.tiempoLimiteVotacion);
  }

  // Método para iniciar la votación de los hombres lobos en la noche
  iniciarVotacionLobos() {
    this.votacionActiva = true;
    this.temporizadorVotacion = setTimeout(() => {
      this.resolverVotosNoche(); // Resuelve la votación si se agota el tiempo
    }, this.tiempoLimiteVotacion);
  }
}

module.exports = Partida; // exportar la clase
