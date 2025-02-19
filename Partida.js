class Partida {
  constructor(idPartida, jugadores) {
    this.idPartida = idPartida;
    this.estado = 'en_curso'; // Estado de la partida ('en_curso', 'completada')
    this.turno = 'noche'; // Fase actual: 'dia' o 'noche'. La partida empieza en la noche
    this.jugadores = jugadores.map(jugador => ({ // Array de jugadores con sus roles
      id: jugador.id,
      rol: jugador.rol, // Rol asignado (por ejemplo: 'lobo', 'bruja', 'vidente','cazador','aldeano')
      estaVivo: true,
      esAlguacil: false, // ¿Es alguacil?
      pocionCuraUsada: jugador.rol === 'bruja' ? false : undefined, // Si la bruja usó su poción de vida
      pocionMatarUsada: jugador.rol === 'bruja' ? false : undefined, // Si la bruja usó su poción de muerte
      haVisto: jugador.rol === 'vidente' ? false : undefined, // La vidente puede ver el rol de un jugador por la noche
    }));
    this.chat = []; // Mensajes de chat (día: global, noche: solo lobos)
    this.votosAlguacil = {}; // Votos para elegir al alguacil
    this.votos = {}; // Votos de los jugadores durante el día
    this.repetirVotacionAlguacil = false; // Para empates en elección de alguacil
    this.repetirVotosDia = false; // Controla si hubo un empate previo en las votaciones del día
    this.votosNoche = {}; // Votos de los lobos durante la noche
    this.colaEliminaciones = []; // Cola de eliminación al final del turno
  }

  // Precondición: antes de llamar a este método, se deben de aplicar las eliminaciones del turno actual
  // y comprobar si la partida ha terminado o no.
  // Para ello se debería de llamar antes al método aplicarEliminaciones() de esta misma clase Partida.
  // Si aplicarEliminaciones() detecta que la partida terminó, no se llama a siguienteTurno().
  // Solo si la partida sigue en curso, entonces se ejecuta siguienteTurno().
  // Método para cambiar turnos
  siguienteTurno() {
    // this.aplicarEliminaciones(); // Ejecutar eliminaciones pendientes !!!! PONER PARA LOS TEST !!!!
    this.turno = this.turno === 'noche' ? 'dia' : 'noche';
    this.votos = {}; // Reiniciar votos en el día
    this.votosNoche = {}; // Reiniciar votos de los lobos en la noche
    this.votosAlguacil = {}; // Reiniciar votos para elegir alguacil

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
    if (!jugador || !jugador.estaVivo) return;

    if (this.turno === 'dia' || jugador.rol === 'lobo') {
      this.chat.push({ idJugador, mensaje, timestamp: Date.now() });
    }
  }

  // Método para elegir al alguacil
  elegirAlguacil() {
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
      this.jugadores.forEach(j => (j.esAlguacil = false)); // Asegurarse de que ningún jugador sea alguacil
      const alguacil = this.jugadores.find(j => j.id === candidatos[0]);
      if (alguacil) alguacil.esAlguacil = true;
      this.repetirVotacionAlguacil = false; // Reiniciar flag de repetición
      return `El jugador ${candidatos[0]} ha sido elegido como alguacil.`;
    } else {
      if (this.repetirVotacionAlguacil) {
        return 'Segundo empate consecutivo, no se elige alguacil.';
      } else {
        this.repetirVotacionAlguacil = true;
        this.votosAlguacil = {}; // Resetear votos para repetir elección
        return 'Empate en la elección del alguacil, se repiten las votaciones.';
      }
    }
  }

  // Método para votar al alguacil
  votaAlguacil(idJugador, idObjetivo) {
    const jugador = this.jugadores.find(j => j.id === idJugador);
    if (!jugador || !jugador.estaVivo) return;

    this.votosAlguacil[idJugador] = idObjetivo;
  }

  // Método para manejar las votaciones de los jugadores durante el día
  // El voto del alguacil cuenta como dos
  vota(idJugador, idObjetivo) {
    if (this.turno !== 'dia') return;
    const jugador = this.jugadores.find(j => j.id === idJugador);
    if (!jugador || !jugador.estaVivo) return;

    this.votos[idJugador] = idObjetivo;
    if (jugador.esAlguacil) {
      this.votos[`alguacil_${idJugador}`] = idObjetivo; // Doble voto (voto extra del alguacil)
    }
  }

  // Votación de los lobos en la noche
  votaNoche(idJugador, idObjetivo) {
    if (this.turno !== 'noche') return;
    const jugador = this.jugadores.find(j => j.id === idJugador);
    if (!jugador || !jugador.estaVivo || jugador.rol !== 'lobo') return;

    this.votosNoche[idJugador] = idObjetivo;
  }

  // La vidente obtiene el rol de un jugador
  videnteRevela(idJugador, idObjetivo) {
    if (this.turno !== 'noche') return 'No es de noche.';
    const jugador = this.jugadores.find(j => j.id === idJugador);
    if (!jugador || !jugador.estaVivo || jugador.rol !== 'vidente' || jugador.haVisto) return 'No puedes usar esta habilidad.';

    const objetivo = this.jugadores.find(j => j.id === idObjetivo);
    if (!objetivo || !objetivo.estaVivo) 
      return 'Solo puedes ver el rol de un jugador vivo.';

    jugador.haVisto = true; // La vidente solo puede ver un jugador por noche
    
    return `El jugador ${idObjetivo} es ${objetivo.rol}.`;
  }

  // Método para que la bruja use sus pociones
  usaPocionBruja(idJugador, tipo, idObjetivo) {
    const jugador = this.jugadores.find(j => j.id === idJugador);
    if (!jugador || !jugador.estaVivo || jugador.rol !== 'bruja') return;
    
    if (tipo === 'curar' && !jugador.pocionCuraUsada) {
      jugador.pocionCuraUsada = true;
      this.colaEliminaciones = this.colaEliminaciones.filter(id => id !== idObjetivo); // Cancela la muerte de los lobos
    } else if (tipo === 'matar' && !jugador.pocionMatarUsada) {
      jugador.pocionMatarUsada = true;
      this.agregarAColaDeEliminacion(idObjetivo); // Se elimina al final del turno
    }
  }

  // Método del cazador para elegir a su víctima
  cazadorDispara(idJugador, idObjetivo) {
    const jugador = this.jugadores.find(j => j.id === idJugador);
    if (!jugador || jugador.rol !== 'cazador') return 'No puedes usar esta habilidad.';
    if (!idObjetivo || !idObjetivo.estaVivo) return 'Jugador erróneo.';

    this.colaDeEliminacion(idObjetivo); // Se elimina al final del turno
  }

  // Método del alguacil para elegir a su sucesor
  elegirSucesor(idJugador, idObjetivo) {
    const jugador = this.jugadores.find(j => j.id === idJugador);
    if (!jugador || !jugador.esAlguacil) return 'No puedes usar esta habilidad.';
    if (!idObjetivo || !idObjetivo.estaVivo) return 'Jugador erróneo.';
    
    jugador.esAlguacil = false;
    idObjetivo.esAlguacil = true;
  }

  // Resolver votos del día
  resolverVotosDia() {
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
      return `El jugador ${candidatos[0]} será eliminado al final del día.`;
    } else {
      if (this.repetirVotosDia) {
        return 'Segundo empate consecutivo, nadie es eliminado.';
      } else {
        this.repetirVotosDia = true;
        this.votos = {}; // Reiniciar votos para repetir la votación
        return 'Empate, se repiten las votaciones.';
      }
    }
  }

  // Resolver la decisión de los lobos (se elimina al final del turno)
  resolverVotosNoche() {
    const conteoVotos = {};
    
    for (const idLobo in this.votosNoche) {
      const votado = this.votosNoche[idLobo];
      if (votado) conteoVotos[votado] = (conteoVotos[votado] || 0) + 1;
    }
    
    // Buscar la víctima con unanimidad
    let victimaElegida = null;
    let totalLobos = this.jugadores.filter(j => j.rol === 'lobo' && j.estaVivo).length; // Número de lobos vivos
    for (const [idJugador, cuenta] of Object.entries(conteoVotos)) {
      if (cuenta === totalLobos) {
        victimaElegida = idJugador;
      }
    }
  
    if (victimaElegida) {
      this.agregarAColaDeEliminacion(victimaElegida);
      return `Los lobos atacaron al jugador ${victimaElegida}. Será eliminado al final de la noche.`;
    } else {
      return 'Los lobos no se pusieron de acuerdo, no hay víctima esta noche.';
    }
  }

  // Cola de eliminación para el final del turno
  agregarAColaDeEliminacion(idJugador) {
    const jugador = this.jugadores.find(j => j.id === idJugador);
    if (jugador && jugador.estaVivo) {
      this.colaEliminaciones.push(idJugador);
    }
  }

  // Aplicar eliminaciones al final del turno
  aplicarEliminaciones() {
    console.log("Aplicando eliminaciones a:", this.colaEliminaciones);
    this.colaEliminaciones.forEach(idJugador => {
      const jugador = this.jugadores.find(j => j.id === idJugador);
      if (jugador) {
        console.log(`Eliminando al jugador ${idJugador}`);
        jugador.estaVivo = false;
      }
    });
    this.colaEliminaciones = []; // Reiniciar la cola

    // Comprobar si hay un ganador y devolver el resultado
    return this.comprobarVictoria();
  }

  // Verifica si la partida ha terminado. Y en caso de terminar devuelve quién ganó
  comprobarVictoria() {
    const lobosVivos = this.jugadores.filter(j => j.estaVivo && j.rol === 'lobo').length;
    const aldeanosVivos = this.jugadores.filter(j => j.estaVivo && j.rol !== 'lobo').length;

    // Ganan los aldeanos cuando no quedan lobos vivos
    if (lobosVivos === 0 && aldeanosVivos !== 0) {
      this.estado = 'completada';
      return 'Los aldeanos han ganado la partida.';
      // Podemos emitir el estado de la partida devolviendo un objeto con el estado y un mensaje !!!
      // return { ganador: 'aldeanos', mensaje: 'Los aldeanos han ganado la partida.' };
    }

    // Ganan los lobos cuando no quedan aldeanos vivos
    if (aldeanosVivos === 0 && lobosVivos !== 0) { 
      this.estado = 'completada';
      return 'Los lobos han ganado la partida.';
      // return { ganador: 'lobos', mensaje: 'Los lobos han ganado la partida.' }; !!!
    }

    // Empate si todos los jugadores están muertos
    if(aldeanosVivos === 0 && lobosVivos === 0) {
      this.estado = 'completada';
      return 'Empate, no hay ganadores.';
      // return { ganador: 'empate', mensaje: 'Empate, no hay ganadores.' }; !!!
    }

    return null; // La partida sigue en curso
  }

}

module.exports = Partida; // exportar la clase
