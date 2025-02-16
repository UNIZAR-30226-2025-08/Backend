class Game {
  constructor(gameId, players) {
    this.gameId = gameId;
    this.status = 'ongoing'; // Estado de la partida ('ongoing', 'completed')
    this.turn = 'night'; // Fase actual: 'day' o 'night'. La partida empieza en la noche
    this.players = players.map(player => ({ // Array de jugadores con sus roles
      id: player.id,
      role: player.role,
      alive: true,
      usedPotionHeal: player.role === 'bruja' ? false : undefined, // Si la bruja usó su poción de vida
      usedPotionKill: player.role === 'bruja' ? false : undefined, // Si la bruja usó su poción de muerte
    }));
    this.chat = []; // Mensajes de chat (día: global, noche: solo lobos)
    this.votes = {}; // Votos de los jugadores durante el día
    this.repeatVote = false; // Controla si hubo un empate previo en las votaciones del día
    this.nightVotes = {}; // Votos de los lobos durante la noche
    this.eliminationQueue = []; // Cola de eliminación al final del turno
  }

  // Precondición: antes de llamar a este método, se deben de aplicar las eliminaciones del turno actual
  // y comprobar si la partida ha terminado o no.
  // Para ello se debería de llamar antes al método applyEliminations() de esta misma clase Game.
  // Si applyEliminations() detecta que la partida terminó, no se llama a nextTurn().
  // Solo si la partida sigue en curso, entonces se ejecuta nextTurn().
  // Método para cambiar turnos
  nextTurn() {
    this.applyEliminations(); // Ejecutar eliminaciones pendientes
    this.turn = this.turn === 'night' ? 'day' : 'night';
    this.votes = {}; // Reiniciar votos en el día
    this.nightVotes = {}; // Reiniciar votos de los lobos en la noche
  }

  // Método para registrar un mensaje en el chat
  addChatMessage(playerId, message) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || !player.alive) return;

    if (this.turn === 'day' || player.role === 'lobo') {
      this.chat.push({ playerId, message, timestamp: Date.now() });
    }
  }

  // Método para manejar las votaciones de los jugadores durante el día
  vote(playerId, targetId) {
    if (this.turn !== 'day') return;
    const player = this.players.find(p => p.id === playerId);
    if (!player || !player.alive) return;

    this.votes[playerId] = targetId;
  }

  // Votación de los lobos en la noche
  voteNight(playerId, targetId) {
    if (this.turn !== 'night') return;
    const player = this.players.find(p => p.id === playerId);
    if (!player || !player.alive || player.role !== 'lobo') return;

    this.nightVotes[playerId] = targetId;
  }

  // Método para que la bruja use sus pociones
  useWitchPotion(playerId, type, targetId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || !player.alive || player.role !== 'bruja') return;
    
    if (type === 'heal' && !player.usedPotionHeal) {
      player.usedPotionHeal = true;
      this.eliminationQueue = this.eliminationQueue.filter(id => id !== targetId); // Cancela la muerte de los lobos
    } else if (type === 'kill' && !player.usedPotionKill) {
      player.usedPotionKill = true;
      this.queueElimination(targetId); // Se elimina al final del turno
    }
  }

  // Resolver votos del día
  resolveDayVotes() {
    const voteCounts = {};
    
    for (const voter in this.votes) {
      const voted = this.votes[voter];
      voteCounts[voted] = (voteCounts[voted] || 0) + 1;
    }
  
    // Determinar el jugador con más votos
    let maxVotes = 0;
    let candidates = [];
    
    for (const playerId in voteCounts) {
      if (voteCounts[playerId] > maxVotes) {
        maxVotes = voteCounts[playerId];
        candidates = [playerId];
      } else if (voteCounts[playerId] === maxVotes) {
        candidates.push(playerId);
      }
    }
  
    if (candidates.length === 1) {
      this.queueElimination(candidates[0]);
      this.repeatVote = false; // Se reinicia al resolver una votación sin empate
      return `El jugador ${candidates[0]} será eliminado al final del día.`;
    } else {
      if (this.repeatVote) {
        return 'Segundo empate consecutivo, nadie es eliminado.';
      } else {
        this.repeatVote = true;
        this.votes = {}; // Reiniciar votos para repetir la votación
        return 'Empate, se repiten las votaciones.';
      }
    }
  }

  // Resolver la decisión de los lobos (se elimina al final del turno)
  resolveNightVotes() {
    const voteCounts = {};
    
    for (const wolfId in this.nightVotes) {
      const voted = this.nightVotes[wolfId];
      if (voted) voteCounts[voted] = (voteCounts[voted] || 0) + 1;
    }
    
    // Buscar la víctima con unanimidad
    let selectedVictim = null;
    let totalWolves = this.players.filter(p => p.role === 'lobo' && p.alive).length; // Número de lobos vivos
    for (const [playerId, count] of Object.entries(voteCounts)) {
      if (count === totalWolves) {
        selectedVictim = playerId;
      }
    }
  
    if (selectedVictim) {
      this.queueElimination(selectedVictim);
      return `Los lobos atacaron al jugador ${selectedVictim}. Será eliminado al final de la noche.`;
    } else {
      return 'Los lobos no se pusieron de acuerdo, no hay víctima esta noche.';
    }
  }

  // Cola de eliminación para el final del turno
  queueElimination(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (player && player.alive) {
      this.eliminationQueue.push(playerId);
    }
  }

  // Aplicar eliminaciones al final del turno
  applyEliminations() {
    console.log("Aplicando eliminaciones a:", this.eliminationQueue);
    this.eliminationQueue.forEach(playerId => {
      const player = this.players.find(p => p.id === playerId);
      if (player) {
        console.log(`Eliminando al jugador ${playerId}`);
        player.alive = false;
      }
    });
    this.eliminationQueue = []; // Reiniciar la cola

    // Comprobar si hay un ganador y devolver el resultado
    return this.checkVictory();
  }

  // Verifica si la partida ha terminado. Y en caso de terminar devuelve quién ganó
  checkVictory() {
    const aliveWolves = this.players.filter(p => p.alive && p.role === 'lobo').length;
    const aliveVillagers = this.players.filter(p => p.alive && p.role !== 'lobo').length;

    // Ganan los aldeanos cuando no quedan lobos vivos
    if (aliveWolves === 0 && aliveVillagers !== 0) {
      this.status = 'completed';
      return 'Los aldeanos han ganado la partida.';
      // Podemos emitir el estado de la partida devolviendo un objeto con el estado y un mensaje
      // return { winner: 'aldeanos', message: 'Los aldeanos han ganado la partida.' };
    }

    // Ganan los lobos cuando no quedan aldeanos vivos
    if (aliveVillagers === 0 && aliveWolves !== 0) { 
      this.status = 'completed';
      return 'Los lobos han ganado la partida.';
      // return { winner: 'lobos', message: 'Los lobos han ganado la partida.' };
    }

    // Empate si todos los jugadores están muertos
    if(aliveVillagers === 0 && aliveWolves === 0) {
      this.status = 'completed';
      return 'Empate, no hay ganadores.';
      // return { winner: 'empate', message: 'Empate, no hay ganadores.' };
    }

    return null; // La partida sigue en curso
  }

}
