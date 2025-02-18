class Juego {
  constructor(idPartida, jugadores) {
    this.idPartida = idPartida;
    this.estado = 'en curso'; // Estado de la partida ('en curso', 'completada')
    this.turno = 'noche'; // Fase actual: 'día' o 'noche'. La partida empieza en la noche
    this.jugadores = jugadores.map(jugador => ({
      id: jugador.id,
      rol: jugador.rol, // Rol asignado (por ejemplo, 'bruja', 'vidente', 'lobo', etc.)
      vivo: true,
      esAlguacil: false, // ¿Es alguacil?
      usoPociónDeVida: jugador.rol === 'bruja' ? false : undefined, // Si la bruja usó su poción de vida
      usoPociónDeMuerte: jugador.rol === 'bruja' ? false : undefined, // Si la bruja usó su poción de muerte
      haVisto: jugador.rol === 'vidente' ? false : undefined, // La vidente puede ver el rol de un jugador por la noche
    }));
    this.chat = []; // Mensajes de chat (día: global, noche: solo lobos)
    this.votosAlAlguacil = {}; // Votos para elegir al alguacil
    this.votos = {}; // Votos de los jugadores durante el día
    this.votoRepetidoAlAlguacil = false; // Para empates en elección de alguacil
    this.votoRepetido = false; // Controla si hubo un empate previo en las votaciones del día
    this.votosNocturnos = {}; // Votos de los lobos durante la noche
    this.colaEliminacion = []; // Cola de eliminación al final del turno
  }

  // Precondición: antes de llamar a este método, se deben aplicar las eliminaciones del turno actual
  // y comprobar si la partida ha terminado o no.
  // Para ello se debería llamar antes al método aplicarEliminaciones() de esta misma clase Juego.
  // Si aplicarEliminaciones() detecta que la partida terminó, no se llama a siguienteTurno().
  // Solo si la partida sigue en curso, se ejecuta siguienteTurno().
  // Método para cambiar turnos
  siguienteTurno() {
    // !!!! this.aplicarEliminaciones(); // Ejecutar eliminaciones pendientes (PONER PARA LOS TEST)
    this.turno = this.turno === 'noche' ? 'día' : 'noche';
    this.votos = {}; // Reiniciar votos en el día
    this.votosNocturnos = {}; // Reiniciar votos de los lobos en la noche
    this.votosAlAlguacil = {}; // Reiniciar votos para elegir alguacil

    // Reiniciar la habilidad de la vidente cuando comienza una nueva noche
    if (this.turno === 'noche') {
      this.jugadores.forEach(jugador => {
        if (jugador.rol === 'vidente') {
          jugador.haVisto = false;
        }
      });
    }
  }

  // Método para registrar un mensaje en el chat
  agregarMensajeChat(idJugador, mensaje) {
    const jugador = this.jugadores.find(j => j.id === idJugador);
    if (!jugador || !jugador.vivo) return;

    if (this.turno === 'día' || jugador.rol === 'lobo') {
      this.chat.push({ idJugador, mensaje, timestamp: Date.now() });
    }
  }

  // Método para elegir al alguacil
  elegirAlguacil() {
    const conteoVotos = {};
    for (const votante in this.votosAlAlguacil) {
      const votado = this.votosAlAlguacil[votante];
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
      this.jugadores.forEach(j => (j.esAlguacil = false)); // Asegurarse de que ningún jugador sea alguacil
      const alguacil = this.jugadores.find(j => j.id === candidatos[0]);
      if (alguacil) alguacil.esAlguacil = true;
      this.votoRepetidoAlAlguacil = false; // Reiniciar flag de repetición
      return `El jugador ${candidatos[0]} ha sido elegido como alguacil.`;
    } else {
      if (this.votoRepetidoAlAlguacil) {
        return 'Segundo empate consecutivo, no se elige alguacil.';
      } else {
        this.votoRepetidoAlAlguacil = true;
        this.votosAlAlguacil = {}; // Resetear votos para repetir elección
        return 'Empate en la elección del alguacil, se repiten las votaciones.';
      }
    }
  }

  // Método para votar al alguacil
  votarAlAlguacil(idJugador, idObjetivo) {
    const jugador = this.jugadores.find(j => j.id === idJugador);
    if (!jugador || !jugador.vivo) return;

    this.votosAlAlguacil[idJugador] = idObjetivo;
  }

  // Método para manejar las votaciones de los jugadores durante el día
  // El voto del alguacil cuenta como dos
  votar(idJugador, idObjetivo) {
    if (this.turno !== 'día') return;
    const jugador = this.jugadores.find(j => j.id === idJugador);
    if (!jugador || !jugador.vivo) return;

    this.votos[idJugador] = idObjetivo;
    if (jugador.esAlguacil) {
      this.votos[`alguacil_${idJugador}`] = idObjetivo; // Doble voto (voto extra del alguacil)
    }
  }

  // Votación de los lobos en la noche
  votarNoche(idJugador, idObjetivo) {
    if (this.turno !== 'noche') return;
    const jugador = this.jugadores.find(j => j.id === idJugador);
    if (!jugador || !jugador.vivo || jugador.rol !== 'lobo') return;

    this.votosNocturnos[idJugador] = idObjetivo;
  }

  // La vidente obtiene el rol de un jugador
  revelarVidente(idJugador, idObjetivo) {
    if (this.turno !== 'noche') return 'No es de noche.';
    const jugador = this.jugadores.find(j => j.id === idJugador);
    if (!jugador || !jugador.vivo || jugador.rol !== 'vidente' || jugador.haVisto) return 'No puedes usar esta habilidad.';

    const objetivo = this.jugadores.find(j => j.id === idObjetivo);
    if (!objetivo || !objetivo.vivo)
      return 'Solo puedes ver el rol de un jugador vivo.';

    jugador.haVisto = true; // La vidente solo puede ver un jugador por noche

    return `El jugador ${idObjetivo} es ${objetivo.rol}.`;
  }

  // Método para que la bruja use sus pociones
  usarPocionBruja(idJugador, tipo, idObjetivo) {
    const jugador = this.jugadores.find(j => j.id === idJugador);
    if (!jugador || !jugador.vivo || jugador.rol !== 'bruja') return;

    if (tipo === 'heal' && !jugador.usoPociónDeVida) {
      jugador.usoPociónDeVida = true;
      this.colaEliminacion = this.colaEliminacion.filter(id => id !== idObjetivo); // Cancela la muerte de los lobos
    } else if (tipo === 'kill' && !jugador.usoPociónDeMuerte) {
      jugador.usoPociónDeMuerte = true;
      this.agregarAColaEliminacion(idObjetivo); // Se elimina al final del turno
    }
  }

  // Resolver votos del día
  resolverVotosDia() {
    const conteoVotos = {};

    for (const votante in this.votos) {
      const votado = this.votos[votante];
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
      this.agregarAColaEliminacion(candidatos[0]);
      this.votoRepetido = false; // Se reinicia al resolver una votación sin empate
      return `El jugador ${candidatos[0]} será eliminado al final del día.`;
    } else {
      if (this.votoRepetido) {
        return 'Segundo empate consecutivo, nadie es eliminado.';
      } else {
        this.votoRepetido = true;
        this.votos = {}; // Reiniciar votos para repetir la votación
        return 'Empate, se repiten las votaciones.';
      }
    }
  }

  // Resolver la decisión de los lobos (se elimina al final del turno)
  resolverVotosNoche() {
    const conteoVotos = {};

    for (const idLobo in this.votosNocturnos) {
      const votado = this.votosNocturnos[idLobo];
      if (votado) conteoVotos[votado] = (conteoVotos[votado] || 0) + 1;
    }

    // Buscar la víctima con unanimidad
    let victimaSeleccionada = null;
    const totalLobos = this.jugadores.filter(j => j.rol === 'lobo' && j.vivo).length; // Número de lobos vivos
    for (const [idJugador, cuenta] of Object.entries(conteoVotos)) {
      if (cuenta === totalLobos) {
        victimaSeleccionada = idJugador;
      }
    }

    if (victimaSeleccionada) {
      this.agregarAColaEliminacion(victimaSeleccionada);
      return `Los lobos atacaron al jugador ${victimaSeleccionada}. Será eliminado al final de la noche.`;
    } else {
      return 'Los lobos no se pusieron de acuerdo, no hay víctima esta noche.';
    }
  }

  // Cola de eliminación para el final del turno
  agregarAColaEliminacion(idJugador) {
    const jugador = this.jugadores.find(j => j.id === idJugador);
    if (jugador && jugador.vivo) {
      this.colaEliminacion.push(idJugador);
    }
  }

  // Aplicar eliminaciones al final del turno
  aplicarEliminaciones() {
    console.log("Aplicando eliminaciones a:", this.colaEliminacion);
    this.colaEliminacion.forEach(idJugador => {
      const jugador = this.jugadores.find(j => j.id === idJugador);
      if (jugador) {
        console.log(`Eliminando al jugador ${idJugador}`);
        jugador.vivo = false;
      }
    });
    this.colaEliminacion = []; // Reiniciar la cola

    // Comprobar si hay un ganador y devolver el resultado
    return this.verificarVictoria();
  }

  // Verifica si la partida ha terminado y, en caso afirmativo, devuelve quién ganó
  verificarVictoria() {
    const lobosVivos = this.jugadores.filter(j => j.vivo && j.rol === 'lobo').length;
    const aldeanosVivos = this.jugadores.filter(j => j.vivo && j.rol !== 'lobo').length;

    // Ganan los aldeanos cuando no quedan lobos vivos
    if (lobosVivos === 0 && aldeanosVivos !== 0) {
      this.estado = 'completada';
      return 'Los aldeanos han ganado la partida.';
    }

    // Ganan los lobos cuando no quedan aldeanos vivos
    if (aldeanosVivos === 0 && lobosVivos !== 0) {
      this.estado = 'completada';
      return 'Los lobos han ganado la partida.';
    }

    // Empate si todos los jugadores están muertos
    if (aldeanosVivos === 0 && lobosVivos === 0) {
      this.estado = 'completada';
      return 'Empate, no hay ganadores.';
    }

    return null; // La partida sigue en curso
  }
}

module.exports = Juego; // Exportar la clase
