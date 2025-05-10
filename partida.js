/**
 * Representa una partida del juego.
 */
class Partida {
  /**
   * (Constructor que usa partidaWS)
   * Crea una nueva partida.
   * @param {number} idPartida - Identificador único de la partida.
   * @param {Array<Object>} jugadores - Lista de jugadores con sus respectivos roles.
   * @param {number} idSala - Identificador único de la sala.
   */
  constructor(idPartida, jugadores, idSala) {
    this.idPartida = idPartida;
    this.idSala = idSala;
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
      haDisparado: jugador.rol === "Cazador" ? false : undefined, // Si el cazador disparó a un jugador
      desconectado: false, // ¿El jugador está desconectado?
    }));
    this.chat = []; // Mensajes de chat (durante el día los mensajes son públicos)
    this.votosAlguacil = {}; // Votos para elegir al alguacil
    this.votos = {}; // Votos de los jugadores durante el día
    this.repetirVotacionAlguacil = false; // Para empates en elección de alguacil
    this.repetirVotosDia = false; // Controla si hubo un empate previo en las votaciones del día
    this.votosNoche = {}; // Votos de los lobos durante la noche
    this.colaEliminaciones = []; // Cola de eliminación al final del turno
    this.temporizadorVotacion = null; // Temporizador para la votación
    this.temporizadorHabilidad = null; // Temporizador para la habilidad
    this.tiempoLimiteVotacion = 60000; // Tiempo límite para la votación en milisegundos (60 segundos)
    this.tiempoLimiteHabilidad = 55000; // Tiempo límite para usar habilidades en milisegundos (55 segundos)
    this.votacionAlguacilActiva = true; // Indica si hay una votación activa para elegir al alguacil
    this.votacionLobosActiva = false; // Indica si hay una votación activa para los lobos
    this.votacionActiva = false; // Indica si hay una votación activa para todos los jugadores
    this.victimaElegidaLobos = null; // Victima elegida por los lobos. Excepto que la bruja use su poción de curación
    // la victima elegida por los lobos es la que se elimina al final del turno.
    this.sucesionHecha = false; // Indica si se ha hecho una sucesión de alguacil
    this.numJornada = 1; // Número de jornada, inicialmente 1
    this.faseActual = "alguacil"; // Nombre de la fase actual
    this.faseInicio = null; // Timestamp (ms) de cuándo empezó la fase actual
    this.faseDuracion = null; // Duración en ms de la fase actual
    this.ultimasVictimas = []; // Lista de las últimas víctimas eliminadas
    this.cazadorDisparoACazador = false; // Indica si un cazador ha disparado a otro cazador
  }

  /**
   * (Método que usa partidaWS) Gestiona el cambio de turno en la partida.
   * Aplica las eliminaciones pendientes y verifica si la partida ha terminado.
   * Si la partida sigue en curso, cambia al siguiente turno.
   *
   * @returns {string} Mensaje indicando que el turno ha cambiado.
   *
   * @returns {Object} Si la partida ha terminado.
   * @returns {Object.mensaje} Mensaje con el resultado final de la partida.
   * @returns {Object.ganador} Ganador de la partida.
   * - Si han ganado los aldeanos : mensaje 'Los aldeanos han ganado la partida.' y ganador 'aldeanos'
   * - Si han ganado los lobos : mensaje 'Los hombres lobos han ganado la partida.' y ganador 'lobos'
   * - Si ha habido empate : mensaje 'Empate, no hay ganadores.' y ganador 'empate'
   */
  gestionarTurno() {
    const resultado = this.aplicarEliminaciones(); // Ejecutar eliminaciones pendientes

    // Comprobar si la partida ha terminado o no
    if (resultado === null) {
      this.siguienteTurno(); // la partida sigue en curso, cambiar de turno
      return "El turno ha cambiado.";
    } else {
      this.estado = "terminada";
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
        if (jugador.rol === "Vidente" && jugador.estaVivo) {
          jugador.haVisto = false;
        }
      });
    } else if (this.turno === "dia") {
      this.numJornada++;
    }
  }

  /**
   * (Método que usa partidaWS) Agrega un mensaje al chat de la partida
   * si el turno es de día y el jugador está vivo.
   * @param {string} idJugador - ID del jugador que envía el mensaje.
   * @param {string} mensaje - Contenido del mensaje.
   */
  agregarMensajeChatDia(idJugador, mensaje) {
    const jugador = this.jugadores.find((j) => j.id == idJugador);
    if (!jugador || !jugador.estaVivo || this.turno !== "dia") return;

    this.chat.push({
      nombre: jugador.nombre,
      mensaje,
      timestamp: Date.now(),
    });
  }

  /**
   * (Método que usa partidaWS) Comprueba si un jugador está vivo.
   * @param {string} idJugador - ID del jugador que se quiere comprobar.
   * @returns {boolean} - true si el jugador está vivo, false en caso contrario.
   */
  jugadorVivo(idJugador) {
    const jugador = this.jugadores.find((j) => j.id == idJugador);
    return jugador && jugador.estaVivo;
  }

  /**
   * (Método que usa partidaWS) Obtiene el nombre de un jugador.
   * @param {string} idJugador - ID del jugador que se quiere obtener el nombre.
   * @returns {string} - Nombre del jugador.
   */
  obtenerNombreJugador(idJugador) {
    const jugador = this.jugadores.find((j) => j.id == idJugador);
    return jugador ? jugador.nombre : null;
  }

  /**
   * (Método que usa partidaWS) Prepara los mensajes privados para los hombres lobos.
   * @param {string} idJugador - ID del jugador que intenta enviar el mensaje.
   * @param {string} mensaje - Contenido del mensaje.
   * @returns {Array<Object>} - Preparación de los mensajes privados para los hombres lobos.
   */
  prepararMensajesChatNoche(idJugador, mensaje) {
    const jugador = this.jugadores.find((j) => j.id == idJugador);
    if (!jugador || !jugador.estaVivo || jugador.rol !== "Hombre lobo") {
      return []; // El jugador que intenta enviar el mensaje no es un hombre lobo o está muerto
    }

    const preparacionMensajes = [];
    this.jugadores.forEach((j) => {
      if (j.rol === "Hombre lobo" && j.estaVivo) {
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
   * (Método de partidaWS) Elige al alguacil basándose en los votos de los jugadores.
   * En caso de empate, se repiten las votaciones una vez.
   *
   * @returns {Object}
   * @returns {string} Mensaje informativo si se ha producido un empate o
   * mensaje con el resultado de la elección si se ha elegido a un jugador como alguacil.
   * @returns {string} ID del jugador que ha sido elegido como alguacil o null si no hay alguacil elegido.
   *
   * - Si hay un ganador claro: Objeto con el mensaje "X ha sido elegido como alguacil." (deonde X es el nombre del jugador elegido)
   *    y el ID del jugador en el atributo 'alguacil'.
   * - Si hay empate en la primera votación: Objeto con el mensaje "Empate en la elección del alguacil, se repiten las votaciones."
   *    y null en el atributo 'alguacil'.
   * - Si hay empate en la segunda votación: Objeto con el mensaje "Segundo empate consecutivo, no se elige alguacil."
   *    y null en el atributo 'alguacil'.
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
      const alguacil = this.jugadores.find((j) => j.id == candidatos[0]);
      console.log(candidatos[0]);
      console.log(this.jugadores);
      console.log(alguacil);
      if (alguacil) alguacil.esAlguacil = true;
      this.repetirVotacionAlguacil = false; // Reiniciar flag de repetición
      this.votacionAlguacilActiva = false; // Desactivar la votación de elegir alguacil
      clearTimeout(this.temporizadorVotacion); // Limpiar el temporizador
      return {
        alguacil: candidatos[0],
        mensaje: `${alguacil.nombre} ha sido elegido como alguacil.`,
      };
    } else {
      if (this.repetirVotacionAlguacil) {
        this.votacionAlguacilActiva = false; // Desactivar la votación de elegir alguacil
        clearTimeout(this.temporizadorVotacion); // Limpiar el temporizador
        return {
          alguacil: null,
          mensaje: "Segundo empate consecutivo, no se elige alguacil.",
        };
      } else {
        this.repetirVotacionAlguacil = true;
        this.votosAlguacil = {}; // Resetear votos para repetir elección
        this.votacionAlguacilActiva = false; // Desactivar la votación de elegir alguacil
        clearTimeout(this.temporizadorVotacion); // Limpiar el temporizador
        return {
          alguacil: null,
          mensaje:
            "Empate en la elección del alguacil, se repiten las votaciones.",
        };
      }
    }
  }

  /**
   * (Método que usa partidaWS)
   * Registra el voto de un jugador para la elección del alguacil.
   *
   * @param {string} idJugador - ID del jugador que vota.
   * @param {string} idObjetivo - ID del jugador por el que vota.
   */
  votaAlguacil(idJugador, idObjetivo) {
    if (this.turno !== "dia" || !this.votacionAlguacilActiva) return;
    const jugador = this.jugadores.find((j) => j.id == idJugador);
    if (!jugador || !jugador.estaVivo) return;

    this.votosAlguacil[idJugador] = idObjetivo;

    // Verificar si todos jugadores han votado
    if (this.verificarVotos("alguacil")) {
      clearTimeout(this.temporizadorVotacion); // Limpiar el temporizador si todos votaron
    }
  }

  /**
   * (Método que usa partidaWS)
   * Registra el voto de un jugador durante el día.
   * El voto del alguacil cuenta doble.
   *
   * @param {string} idJugador - ID del jugador que vota.
   * @param {string} idObjetivo - ID del jugador al que vota.
   */
  vota(idJugador, idObjetivo) {
    if (this.turno !== "dia" || !this.votacionActiva) return;
    const jugador = this.jugadores.find((j) => j.id == idJugador);
    if (!jugador || !jugador.estaVivo) return;

    this.votos[idJugador] = idObjetivo;
    if (jugador.esAlguacil) {
      this.votos[`alguacil_${idJugador}`] = idObjetivo; // Doble voto (voto extra del alguacil)
    }

    // Verificar si todos los jugadores han votado
    if (this.verificarVotos("dia")) {
      clearTimeout(this.temporizadorVotacion); // Limpiar el temporizador si todos votaron
    }
  }

  /**
   * (Método que usa partidaWS)
   * Registra el voto de un lobo durante la fase nocturna.
   * Solo los jugadores con el rol de lobo pueden votar en esta fase.
   *
   * @param {string} idJugador - ID del jugador lobo que vota.
   * @param {string} idObjetivo - ID del jugador al que vota.
   */
  votaNoche(idJugador, idObjetivo) {
    if (this.turno !== "noche" || !this.votacionLobosActiva) return;

    // Buscar al jugador que vota y al objetivo
    const jugador = this.jugadores.find((j) => j.id == idJugador);
    const objetivo = this.jugadores.find((j) => j.id == idObjetivo);

    // Verificar si el jugador que vota es lobo y si el objetivo es válido
    if (!jugador || !jugador.estaVivo || jugador.rol !== "Hombre lobo") return;
    if (!objetivo || !objetivo.estaVivo || objetivo.rol === "Hombre lobo")
      return;

    this.votosNoche[idJugador] = idObjetivo;

    // Verificar si todos los hombres lobos han votado
    if (this.verificarVotos("noche")) {
      clearTimeout(this.temporizadorVotacion); // Limpiar el temporizador si todos votaron
    }
  }

  /**
   * (Método que usa partidaWS)
   * Permite a la vidente revelar el rol de un jugador durante la noche.
   * Solo puede usarse una vez por noche y solo en jugadores vivos.
   *
   * @param {string} idJugador - ID del jugador vidente.
   * @param {string} idObjetivo - ID del jugador cuyo rol se quiere revelar.
   * @returns {string} Mensaje con una advertencia si la acción no es válida.
   *
   * @returns {Object}
   * @returns {string} Mensaje con el rol revelado.
   * @returns {string} Rol del jugador seleccionado.
   *
   * - Si el jugador seleccionado está muerto : Objeto con el mensaje 'Solo puedes ver el rol de un jugador vivo.'
   *   y null en el atributo 'rol'.
   * - Si el jugador no puede realizar dicha acción: Objeto con el mensaje 'No puedes usar esta habilidad.'
   *   y null en el atributo 'rol'.
   * - Si la acción es correcta: Objeto con el mensaje 'El jugador ID es ROL' Siendo ROL el rol del jugador seleccionado
   *    y el rol del jugador en el atributo 'rol'.
   */
  videnteRevela(idJugador, idObjetivo) {
    if (this.turno !== "noche") return "No es de noche.";
    const jugador = this.jugadores.find((j) => j.id == idJugador);
    if (
      !jugador ||
      !jugador.estaVivo ||
      jugador.rol !== "Vidente" ||
      jugador.haVisto
    ) {
      return {
        mensaje: "No puedes usar esta habilidad.",
        rol: null,
      };
    }

    const objetivo = this.jugadores.find((j) => j.id == idObjetivo);
    if (!objetivo || !objetivo.estaVivo) {
      return {
        mensaje: "Solo puedes ver el rol de un jugador vivo.",
        rol: null,
      };
    }

    jugador.haVisto = true; // La vidente solo puede ver un jugador por noche

    return {
      mensaje: `El jugador ${
        this.jugadores.find((j) => j.id == idObjetivo).nombre
      } es ${objetivo.rol}.`,
      rol: objetivo.rol,
    };
  }

  /**
   * Devuelve la lista de jugadores que están en la cola de eliminaciones.
   * @returns {Array<string>} - Lista de IDs de jugadores en la cola de eliminaciones.
   */
  obtenerJugadoresEnColaEliminacion() {
    return this.colaEliminaciones;
  }

  /**
   * (Método que usa partidaWS)
   * Devuelve la victima elegida por los lobos si el jugador que llama a esta función es bruja.
   *
   * @param {string} idJugador - ID del jugador bruja.
   *
   * @returns {Object}
   * @returns {string} Mensaje de error si el jugador no es bruja, no es de noche o está muerto.
   * @returns {string} ID de la victima elegida por los lobos.
   * @returns {string} Mensaje con el nombre de la victima elegida por los lobos.
   */
  verVictimaElegidaLobos(idJugador) {
    const jugador = this.jugadores.find((j) => j.id == idJugador);

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
    } else {
      return {
        mensaje: `La victima elegida por los lobos es ${
          this.jugadores[this.victimaElegidaLobos].nombre
        }.`,
        victima: this.victimaElegidaLobos,
      };
    }
  }

  /**
   * (Método que usa partidaWS)
   * Permite a la bruja usar una de sus pociones.
   * Puede curar a un jugador o eliminar a otro que esté en la cola de eliminaciones.
   *
   * @param {string} idJugador - ID del jugador bruja.
   * @param {string} tipo - Tipo de poción a usar ('curar' o 'matar').
   * @param {string} idObjetivo - ID del jugador afectado por la poción.
   * @returns {Object} - Mensaje de éxito o error.
   * @returns {Object.error} Mensaje de error si el jugador no es bruja, no es de noche o está muerto.
   * @returns {Object.error} Mensaje de error si el jugador ya ha usado la poción de curación.
   * @returns {Object.error} Mensaje de error si el jugador objetivo no está a punto de morir.
   * @returns {Object.error} Mensaje de error si el jugador ya ha usado la poción de muerte.
   * @returns {Object.error} Mensaje de error si el jugador objetivo ya está muerto.
   * @returns {Object.error} Mensaje de error si el tipo de poción es inválido.
   * @returns {Object.mensaje} Mensaje de éxito si la poción se usa correctamente.
   */
  usaPocionBruja(idJugador, tipo, idObjetivo) {
    const jugador = this.jugadores.find((j) => j.id == idJugador);
    const objetivo = this.jugadores.find((j) => j.id == idObjetivo);

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
          error: `No puedes curar a ${
            this.jugadores.find((j) => j.id == idObjetivo).nombre
          } porque no está a punto de morir.`,
        };
      }

      jugador.pocionCuraUsada = true;
      this.colaEliminaciones = this.colaEliminaciones.filter(
        (id) => id !== idObjetivo
      ); // Cancela la muerte de los lobos
      this.victimaElegidaLobos = null; // Reiniciar la victima elegida por los lobos
      return {
        mensaje: `La bruja ha salvado a ${
          this.jugadores.find((j) => j.id == idObjetivo).nombre
        }.`,
      };
    }

    if (tipo === "matar") {
      if (jugador.pocionMatarUsada) {
        return { error: "Ya has usado la poción de muerte." };
      }
      if (!objetivo || !objetivo.estaVivo) {
        return {
          error: `No puedes matar a ${
            this.jugadores.find((j) => j.id == idObjetivo).nombre
          } porque ya está muerto.`,
        };
      }
      jugador.pocionMatarUsada = true;
      this.agregarAColaDeEliminacion(idObjetivo); // Se elimina al final del turno
      return {
        mensaje: `La bruja ha usado su poción de muerte con ${
          this.jugadores.find((j) => j.id == idObjetivo).nombre
        }.`,
      };
    }

    return { error: "Tipo de poción inválido." };
  }

  /**
   * (Método que usa partidaWS)
   * Permite al cazador disparar a un jugador si muere.
   * Solo puede usar esta habilidad al momento de su eliminación.
   *
   * @param {string} idJugador - ID del cazador.
   * @param {string} idObjetivo - ID del jugador al que dispara.
   *
   * @returns {Object}
   * @returns {Object.error} Mensaje de error si el jugador no es cazador o no puede usar la habilidad.
   * @returns {Object.error} Mensaje de error si el jugador objetivo no es válido.
   * @returns {Object.mensaje} Mensaje de éxito si el cazador dispara correctamente.
   */
  cazadorDispara(idJugador, idObjetivo) {
    const jugador = this.jugadores.find((j) => j.id == idJugador);
    const objetivo = this.jugadores.find((j) => j.id == idObjetivo);

    if (!jugador || jugador.rol !== "Cazador")
      return { error: "No puedes usar esta habilidad." };
    if (!objetivo || !objetivo.estaVivo) return { error: "Jugador erróneo." };

    this.agregarAColaDeEliminacion(idObjetivo); // Se elimina al final del turno
    jugador.haDisparado = true; // Marcar que el cazador ha usado su habilidad

    // Si el objetivo es un cazador, actualizamos el booleano 'cazadorDisparoACazador'
    if (objetivo.rol == "Cazador") {
      this.cazadorDisparoACazador = true;
    }

    return {
      mensaje: `El cazador ha disparado a ${objetivo.nombre}.`,
    };
  }

  /**
   * Verifica si hay al menos un jugador con el rol 'Cazador' en la cola de eliminaciones.
   * @returns {boolean} - True si hay al menos un cazador en la cola. False en caso contrario.
   */
  cazadorHaMuerto() {
    return this.colaEliminaciones.some((idJugador) => {
      const jugador = this.jugadores.find((j) => j.id == idJugador);
      return jugador && jugador.rol === "Cazador";
    });
  }

  /**
   * Verifica si el alguacil está en la cola de eliminaciones.
   * @returns {boolean} - True si el alguacil está en la cola. False en caso contrario.
   */
  alguacilHaMuerto() {
    return this.colaEliminaciones.some((idJugador) => {
      const jugador = this.jugadores.find((j) => j.id == idJugador);
      return jugador && jugador.esAlguacil;
    });
  }

  /**
   * Obtiene los IDs de los cazadores que están en la cola de eliminaciones.
   * @returns {Array<string>} - Lista de IDs de cazadores que han muerto.
   */
  obtenerCazadoresEnColaEliminacion() {
    return this.colaEliminaciones.filter((idJugador) => {
      const jugador = this.jugadores.find((j) => j.id == idJugador);
      return jugador && jugador.rol === "Cazador";
    });
  }

  /**
   * Obtiene el ID del alguacil que está en la cola de eliminaciones.
   * @returns {Object} - Objeto con toda la información del jugador del alguacil que ha muerto.
   * @returns {Object.id} - ID del jugador del alguacil que ha muerto.
   * @returns {Object.nombre} - Nombre del jugador del alguacil que ha muerto.
   * @returns {Object.esAlguacil} - True, puesto que el jugador que ha muerto es el alguacil.
   */
  obtenerAlguacilMuerto() {
    return this.jugadores.find(
      (j) =>
        this.colaEliminaciones.some((elimId) => elimId == j.id) && j.esAlguacil
    );
  }

  /**
   * (Método que usa partidaWS)
   * Permite al alguacil elegir a su sucesor antes de morir.
   *
   * @param {string} idJugador - ID del alguacil actual.
   * @param {string} idObjetivo - ID del jugador que será el nuevo alguacil.
   *
   * @returns {Object}
   * @returns {Object.mensaje} Mensaje de error si el jugador no es alguacil.
   * @returns {Object.mensaje} Mensaje de error si el jugador objetivo no es válido.
   * @returns {Object.mensaje} Mensaje de éxito si el jugador objetivo se convierte en el nuevo alguacil.
   * @returns {Object.alguacil} ID del jugador que se convierte en el nuevo alguacil si es exitoso. Null en caso contrario.
   */
  elegirSucesor(idJugador, idObjetivo) {
    const jugador = this.jugadores.find((j) => j.id == idJugador);
    const objetivo = this.jugadores.find((j) => j.id == idObjetivo);

    if (!jugador || !jugador.esAlguacil) {
      console.log("No es alguacil");
      return {
        mensaje: "No puedes usar esta habilidad.",
        alguacil: null,
      };
    }
    if (!objetivo || !objetivo.estaVivo) {
      console.log("Jugador erróneo");
      return {
        mensaje: "Jugador erróneo.",
        alguacil: null,
      };
    }

    jugador.esAlguacil = false; // El alguacil deja de serlo
    objetivo.esAlguacil = true; // El objetivo se convierte en el nuevo alguacil

    this.sucesionHecha = true;

    return {
      mensaje: `${objetivo.nombre} se convierte en el nuevo alguacil.`,
      alguacil: idObjetivo,
    };
  }

  /**
   * (Método que usa partidaWS) Resuelve la votación del día, determinando qué jugador será eliminado.
   * En caso de empate, se repiten las votaciones una vez.
   *
   * @returns {Object}
   * @returns {string} Mensaje informativo si se ha producido un empate o
   *                   mensaje con el resultado de la elección si se ha elegido a un jugador para ser eliminado.
   * @returns {string} ID del jugador que ha sido elegido para ser eliminado o null si no hay ninguno.
   * @returns {string} Rol del jugador que ha sido elegido para ser eliminado (si se ha logrado elegir a un jugador)
   *
   * - Si hay un ganador: Objeto con el mensaje "X será eliminado al final del día." (donde X es el nombre del jugador elegido),
   *    el ID del jugador en el atributo 'jugadorAEliminar' y su rol en el atributo 'rolJugadorAEliminar'.
   * - Si hay empate en la primera votación: Objeto con el mensaje "Empate, se repiten las votaciones."
   *    y null en el atributo 'jugadorAEliminar'.
   * - Si hay empate en la segunda votación: Objeto con el mensaje "Segundo empate consecutivo, nadie es eliminado."
   *    y null en el atributo 'jugadorAEliminar'.
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
      console.log("Sin problemas con idJugador");
      if (conteoVotos[idJugador] > maxVotos) {
        maxVotos = conteoVotos[idJugador];
        candidatos = [idJugador];
        console.log("Añade candidato");
      } else if (conteoVotos[idJugador] === maxVotos) {
        candidatos.push(idJugador);
        console.log("Valor final");
      }
    }

    if (candidatos.length === 1) {
      console.log("Eliminado por votación");
      this.agregarAColaDeEliminacion(candidatos[0]);
      this.repetirVotosDia = false; // Se reinicia al resolver una votación sin empate
      this.votacionActiva = false; // Desactivar la votación de día
      clearTimeout(this.temporizadorVotacion); // Limpiar el temporizador
      return {
        mensaje: `${
          this.jugadores.find((j) => j.id == candidatos[0]).nombre
        } será eliminado al final del día.`,
        jugadorAEliminar: candidatos[0],
        rolJugadorAEliminar: this.jugadores.find((j) => j.id == candidatos[0])
          .rol,
      };
    } else {
      if (this.repetirVotosDia) {
        this.votacionActiva = false; // Desactivar la votación de día
        clearTimeout(this.temporizadorVotacion); // Limpiar el temporizador
        return {
          mensaje: "Segundo empate consecutivo, nadie es eliminado.",
          jugadorAEliminar: null,
        };
      } else {
        this.repetirVotosDia = true;
        this.votos = {}; // Reiniciar votos para repetir la votación
        this.votacionActiva = false; // Desactivar la votación de día
        clearTimeout(this.temporizadorVotacion); // Limpiar el temporizador
        return {
          mensaje: "Empate, se repiten las votaciones.",
          jugadorAEliminar: null,
        };
      }
    }
  }

  /**
   * (Método que usa partidaWS) Resuelve la votación nocturna de los lobos.
   * Solo se elimina a un jugador si todos los hombres lobos votan por la misma persona.
   *
   * @returns {Object}
   * @returns {string} Mensaje informativo si no hay unanimidad o
   *  mensaje con el resultado de la votación si hay unanimidad.
   * @returns {string} ID del jugador que ha sido elegido para ser eliminado o null si no hay ninguno.
   * @returns {string} Rol del jugador que ha sido elegido para ser eliminado (si hay unanimidad)
   *
   * - Si hay unanimidad: Objeto con el mensaje "Los lobos van a atacar a X. Será eliminado al final de la noche.",
   *    el ID del jugador en el atributo 'victima' y su rol en el atributo 'rolVictima'.
   * - Si no hay acuerdo: Objeto con el mensaje "Los lobos no se pusieron de acuerdo, no hay víctima esta noche."
   *    y null en el atributo 'victima'.
   */
  resolverVotosNoche() {
    if (this.turno !== "noche") {
      console.log("No es de noche");
      return {
        mensaje: "Error, no se está realizando una votación",
        victima: null,
      };
    }
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
      this.victimaElegidaLobos = victimaElegida; // Se guarda la victima elegida por los lobos
      this.votacionLobosActiva = false; // Desactivar la votación
      clearTimeout(this.temporizadorVotacion); // Limpiar el temporizador
      return {
        mensaje: `Los lobos van a atacar a ${
          this.jugadores.find((j) => j.id == victimaElegida).nombre
        }. Será eliminado al final de la noche.`,
        victima: victimaElegida,
        rolVictima: this.jugadores.find((j) => j.id == victimaElegida).rol,
      };
    } else {
      this.votacionLobosActiva = false; // Desactivar la votación
      clearTimeout(this.temporizadorVotacion); // Limpiar el temporizador
      return {
        mensaje: `Los lobos no se pusieron de acuerdo, no hay víctima esta noche.`,
        victima: null,
      };
    }
  }

  /**
   * (Método que usa partidaWS) Prepara los resultados de la votación nocturna para los hombres lobos.
   * @param {string} mensaje - Contenido del mensaje.
   * @returns {Array<Object>} - Preparación de los resultados de la votación nocturna para los hombres lobos.
   */
  prepararResultadoVotacionNoche(mensaje) {
    const preparacionResultado = [];
    this.jugadores.forEach((j) => {
      if (j.rol === "Hombre lobo" && j.estaVivo) {
        preparacionResultado.push({
          socketId: j.socketId,
          mensaje,
        });
      }
    });

    return preparacionResultado; // Devuelve la preparación de los resultados para los hombres lobos
  }

  /**
   * (Método que usa partidaWS) Prepara el mensaje que será enviado a las brujas si los hombres lobos eligen
   * por unanimidad a un jugador para ser eliminado durante la noche.
   * @param {string} mensaje - Contenido del mensaje.
   * @returns {Array<Object>} - Preparación del mensaje para las brujas.
   * @returns {socketId} ID del socket del jugador que recibirá el mensaje.
   * @returns {string} Mensaje informativo.
   * @returns {string} ID del jugador que ha sido elegido para ser eliminado.
   */
  prepararMensajeBruja(mensaje) {
    const preparacionResultado = [];
    this.jugadores.forEach((j) => {
      if (j.rol === "Bruja" && j.estaVivo) {
        preparacionResultado.push({
          socketId: j.socketId,
          mensaje,
          victima: this.victimaElegidaLobos,
        });
      }
    });

    return preparacionResultado; // Devuelve la preparación del mensaje para las brujas
  }

  /**
   * Agrega un jugador a la cola de eliminación, marcándolo para ser eliminado al final del turno.
   *
   * @param {string} idJugador - ID del jugador que será eliminado.
   */
  agregarAColaDeEliminacion(idJugador) {
    const jugador = this.jugadores.find((j) => j.id == idJugador);
    if (jugador && jugador.estaVivo) {
      this.colaEliminaciones.push(idJugador);
    }
  }

  /**
   * Ejecuta las eliminaciones pendientes al final del turno.
   *
   * @returns {null} Si la partida sigue en curso.
   *
   * @returns {Object}
   * @returns {Object.mensaje} Mensaje con el resultado final de la partida.
   * @returns {Object.ganador} Ganador de la partida.
   * - Si han ganado los aldeanos : mensaje 'Los aldeanos han ganado la partida.' y ganador 'aldeanos'
   * - Si han ganado los lobos : mensaje 'Los hombres lobos han ganado la partida.' y ganador 'lobos'
   * - Si ha habido empate : mensaje 'Empate, no hay ganadores.' y ganador 'empate'
   */
  aplicarEliminaciones() {
    // Guardamos las últimas víctimas antes de eliminarlas con su información completa (nombre, roles)
    this.ultimasVictimas = this.colaEliminaciones.map((idJugador) => {
      const jugador = this.jugadores.find((j) => j.id == idJugador);
      return {
        id: jugador.id,
        nombre: jugador.nombre,
        rol: jugador.rol,
        esAlguacil: jugador.esAlguacil,
      };
    });

    // Eliminamos a los jugadores de la cola de eliminaciones
    this.colaEliminaciones.forEach((idJugador) => {
      const jugador = this.jugadores.find((j) => j.id == idJugador);
      if (jugador) {
        jugador.estaVivo = false;
      }
    });
    this.colaEliminaciones = []; // Reiniciar la cola de eliminaciones

    // Comprobar si hay un ganador y devolver el resultado
    return this.comprobarVictoria();
  }

  /**
   * Verifica si la partida ha terminado y determina el ganador.
   *
   * @returns {null} Si la partida sigue en curso.
   *
   * @returns {Object}
   * @returns {Object.mensaje} Mensaje con el resultado final de la partida.
   * @returns {Object.ganador} Ganador de la partida.
   * - Si han ganado los aldeanos : mensaje 'Los aldeanos han ganado la partida.' y ganador 'aldeanos'
   * - Si han ganado los lobos : mensaje 'Los hombres lobos han ganado la partida.' y ganador 'lobos'
   * - Si ha habido empate : mensaje 'Empate, no hay ganadores.' y ganador 'empate'
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
        ganador: "lobos",
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

  /**
   * (Método que usa partidaWS) Inicia la votación del alguacil.
   */
  iniciarVotacionAlguacil() {
    this.votacionAlguacilActiva = true;
    this.faseActual = "alguacil";
    this.faseInicio = Date.now();
    this.faseDuracion = this.tiempoLimiteVotacion;
    this.temporizadorVotacion = setTimeout(() => {
      this.votacionAlguacilActiva = false;
      this.temporizadorVotacion = null; // Reiniciar el temporizador
    }, this.tiempoLimiteVotacion); // Tiempo límite para la votación del alguacil
  }

  /**
   * (Método que usa partidaWS) Inicia la votación de los hombres lobos en la noche.
   */
  iniciarVotacionLobos() {
    this.votacionLobosActiva = true;
    this.faseActual = "votacionLobos";
    this.faseInicio = Date.now();
    this.faseDuracion = this.tiempoLimiteVotacion;
    this.ultimasVictimas = [];
    this.temporizadorVotacion = setTimeout(() => {
      this.votacionLobosActiva = false;
      this.temporizadorVotacion = null; // Reiniciar el temporizador
    }, this.tiempoLimiteVotacion);
  }

  /**
   * (Método que usa partidaWS) Inicia la votación en el turno de día.
   */
  iniciarVotacion() {
    this.votacionActiva = true;
    this.faseActual = "votacionDia";
    this.faseInicio = Date.now();
    this.faseDuracion = this.tiempoLimiteVotacion;
    this.temporizadorVotacion = setTimeout(() => {
      this.votacionActiva = false;
      this.temporizadorVotacion = null; // Reiniciar el temporizador
    }, this.tiempoLimiteVotacion);
  }

  /**
   * (Método que usa partidaWS) Inicia la habilidad de la vidente.
   */
  iniciarHabilidadVidente() {
    this.faseActual = "videnteRevela";
    this.faseInicio = Date.now();
    this.faseDuracion = this.tiempoLimiteHabilidad + 5000;
    // La variable de los jugadores videntes 'haVisto' se pone a false al gestionar el turno y cambiar de turno a noche
    // La variable de los jugadores videntes 'haVisto' se pone a true al usar la habilidad o al expirar el tiempo límite
    this.temporizadorHabilidad = setTimeout(() => {
      // Pone a true la variable 'haVisto' a todos los jugadores videntes
      this.jugadores.forEach((j) => {
        if (j.rol === "Vidente") {
          j.haVisto = true;
        }
      });
      this.temporizadorHabilidad = null; // Reiniciar el temporizador
    }, this.tiempoLimiteHabilidad + 5000); // !!! Sino no da tiempo
  }

  /**
   * (Método que usa partidaWS) Inicia la habilidad de la bruja.
   */
  iniciarHabilidadBruja() {
    this.faseActual = "pocionBruja";
    this.faseInicio = Date.now();
    this.faseDuracion = this.tiempoLimiteHabilidad;
    this.temporizadorHabilidad = setTimeout(() => {
      this.temporizadorHabilidad = null; // Reiniciar el temporizador
    }, this.tiempoLimiteHabilidad);
  }

  /**
   * (Método que usa partidaWS) Inicia la habilidad del cazador.
   */
  iniciarHabilidadCazador() {
    this.faseActual = "disparoCazador";
    this.faseInicio = Date.now();
    this.faseDuracion = this.tiempoLimiteHabilidad;
    this.temporizadorHabilidad = setTimeout(() => {
      this.temporizadorHabilidad = null; // Reiniciar el temporizador
    }, this.tiempoLimiteHabilidad);
  }

  /**
   * (Método que usa partidaWS) Inicia la habilidad del alguacil.
   */
  iniciarHabilidadAlguacil() {
    this.faseActual = "sucesionAlguacil";
    this.sucesionHecha = false;
    this.faseInicio = Date.now();
    this.faseDuracion = this.tiempoLimiteHabilidad;
    this.temporizadorHabilidad = setTimeout(() => {
      this.temporizadorHabilidad = null; // Reiniciar el temporizador
    }, this.tiempoLimiteHabilidad);
  }

  /**
   * Verifica si todas las videntes han visto a un jugador.
   * @returns {boolean} - True si todas las videntes han visto a un jugador. False en caso contrario.
   */
  todosVidentesHanVisto() {
    return this.jugadores
      .filter((j) => j.rol === "Vidente" && j.estaVivo)
      .every((j) => j.haVisto);
  }

  /**
   * (Método que usa partidaWS)
   * Verifica si todas las brujas han usado su habilidad.
   * @returns {boolean} - True si todas las brujas han usado su habilidad. False en caso contrario.
   */
  todasBrujasUsaronHabilidad() {
    return this.jugadores
      .filter((j) => j.rol === "Bruja" && j.estaVivo)
      .every((j) => j.pocionCuraUsada && j.pocionMatarUsada);
  }

  /**
   * (Método que usa partidaWS)
   * Verifica si todos los cazadores en la cola de eliminaciones han usado su habilidad.
   * @returns {boolean} - True si todos los cazadores han usado su habilidad. False en caso contrario.
   */
  todosCazadoresUsaronHabilidad() {
    const cazadoresEnCola = this.obtenerCazadoresEnColaEliminacion();
    console.log(cazadoresEnCola);
    return cazadoresEnCola.every((idCazador) => {
      const cazador = this.jugadores.find((j) => j.id == idCazador);
      return cazador && cazador.haDisparado;
    });
  }

  /**
   * (Método que usa partidaWS)
   * Verifica si el alguacil realizó su sucesión.
   * @returns {boolean} - True si el alguacil realizó su sucesión. False en caso contrario.
   */
  alguacilUsoHabilidad() {
    return this.sucesionHecha;
  }

  /**
   * (Método que usa partidaWS)
   * Limpia el temporizador de habilidad.
   */
  limpiarTemporizadorHabilidad() {
    if (this.temporizadorHabilidad) {
      clearTimeout(this.temporizadorHabilidad);
      this.temporizadorHabilidad = null;
    }
  }

  /**
   * (Método que usa partidaWS)
   * Verifica si hay un jugador vivo con un rol específico.
   * @param {string} rol - Rol del jugador a verificar.
   * @returns {boolean} - True si hay un jugador vivo con el rol especificado. False en caso contrario.
   */
  hayRolVivo(rol) {
    return this.jugadores.some(
      (jugador) => jugador.rol == rol && jugador.estaVivo
    );
  }

  /**
   * (Método que usa partidaWS)
   * Actualiza el socketId de un jugador en la partida.
   * @param {string} idJugador - ID del jugador a actualizar.
   * @param {string} socketId - SocketId del jugador a actualizar.
   */
  actualizarSocketId(idJugador, socketId) {
    const jugador = this.jugadores.find((j) => j.id == idJugador);
    if (jugador) {
      jugador.socketId = socketId;
      jugador.desconectado = false; // Asegurar que se marque como reconectado
    }
  }

  /*
   * (Método que usa partidaWS)
   * Permite a la bruja saltar el resto de su fase sin usar todas sus pociones.
   * @param {string} idJugador - ID del jugador a saltar el turno.
   * @returns {Object} - Objeto con el mensaje de éxito o error.
   * @returns {Object.mensaje} - Mensaje de éxito.
   * @returns {Object.error} - Mensaje de error.
   */
  pasarTurnoBruja(idJugador) {
    const jugador = this.jugadores.find((j) => j.id == idJugador);
    if (!jugador || !jugador.estaVivo || jugador.rol !== "Bruja") {
      return {
        error:
          "No puedes pasar el turno. No eres la bruja o has sido eliminada.",
      };
    }
    this.limpiarTemporizadorHabilidad();
    return { mensaje: "Turno de la bruja saltado correctamente." };
  }

  /**
   * Obtiene los jugadores vivos que no están en la cola de eliminaciones.
   * @returns {Array<Object>} - Lista de jugadores vivos que no están en la cola de eliminaciones.
   * @returns {string} jugadores[].id - ID del jugador.
   * @returns {string} jugadores[].nombre - Nombre del jugador.
   */
  obtenerJugadoresVivosNoEnCola() {
    return this.jugadores
      .filter(
        (j) =>
          j.estaVivo &&
          !this.colaEliminaciones.some((id) => String(id) === String(j.id))
      )
      .map((j) => ({
        id: j.id,
        nombre: j.nombre,
      }));
  }
}

module.exports = Partida; // exportar la clase
