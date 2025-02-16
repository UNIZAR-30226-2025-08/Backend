// game.test.js
const Game = require('./Game');

// Función para crear jugadores
function createPlayers() {
  return [
    { id: '1', role: 'lobo' },
    { id: '2', role: 'lobo' },
    { id: '3', role: 'bruja' },
    { id: '4', role: 'vidente' },
    { id: '5', role: 'aldeano' }
  ];
}

describe('Game class', () => {

  let game;

  beforeEach(() => {
    // Inicializa un nuevo juego antes de cada test
    const players = createPlayers();
    game = new Game('game1', players);
  });

  test('should initialize the game correctly', () => {
    expect(game.gameId).toBe('game1');
    expect(game.status).toBe('ongoing');
    expect(game.turn).toBe('night');
    expect(game.players.length).toBe(5);
  });

  test('should change turn from night to day', () => {
    game.nextTurn(); // Cambia a 'day'
    expect(game.turn).toBe('day');
  });

  test('should add a chat message during the day', () => {
    game.addChatMessage('1', 'Hola a todos');
    expect(game.chat.length).toBe(1);
    expect(game.chat[0].message).toBe('Hola a todos');
  });

  test('should not allow dead players to send chat messages', () => {
    game.voteNight('1', '3'); // El jugador 1 (lobo) vota por el jugador 3
    game.voteNight('2', '3'); // El jugador 2 (lobo) vota por el jugador 3
    game.voteNight('3', '2'); // El jugador 3 (no es lobo) intenta votar por el jugador 2. No puede votar. 
    game.voteNight('4', '2'); // El jugador 4 (no es lobo) intenta votar por el jugador 2. No puede votar. 
    game.voteNight('5', '2'); // El jugador 5 (no es lobo) intenta votar por el jugador 2. No puede votar. 
    game.resolveNightVotes(); // Se eliminará al jugador 3 al cambiar de turno
    game.nextTurn(); // Cambia a 'day'
    game.addChatMessage('3', 'Hola a todos');
    expect(game.turn).toBe('day');
    expect(game.players.find(p => p.id === '3').alive).toBe(false);
    expect(game.chat.length).toBe(0); // No debe agregar el mensaje
  });

  test('should correctly vote for a target during the day and should resolve day votes and eliminate the player with most votes', () => {
    game.nextTurn(); 
    // Cambia a 'day'
    expect(game.turn).toBe('day');
    game.vote('1', '3'); // El jugador 1 vota por el jugador 3
    game.vote('2', '3'); // El jugador 2 vota por el jugador 3
    game.vote('3', '2'); // El jugador 3 vota por el jugador 2
    game.vote('4', '2'); // El jugador 4 vota por el jugador 2
    game.vote('5', '2'); // El jugador 5 vota por el jugador 2
    expect(game.votes['1']).toBe('3');
    expect(game.votes['2']).toBe('3');
    expect(game.votes['3']).toBe('2');
    expect(game.votes['4']).toBe('2');
    expect(game.votes['5']).toBe('2');
    game.resolveDayVotes();
    expect(game.eliminationQueue).toContain('2');
    game.nextTurn(); // Cambia a 'night'
    expect(game.players.find(p => p.id === '2').alive).toBe(false);
  });

  test('should handle the election of the sheriff and should handle tie votes during the day', () => {
    game.nextTurn(); // Cambia a 'day'
    game.voteSheriff('1', '2'); // Jugador 1 vota por jugador 2
    game.voteSheriff('3', '2'); // Jugador 3 vota por jugador 2
    game.voteSheriff('4', '3'); // Jugador 4 vota por jugador 3
    game.voteSheriff('5', '3'); // Jugador 5 vota por jugador 3
    resultado = game.electSheriff();
    expect(resultado).toBe('Empate en la elección del alguacil, se repiten las votaciones.');
    game.voteSheriff('1', '2'); // Jugador 1 vota por jugador 2
    game.voteSheriff('2', '3'); // Jugador 2 vota por jugador 3
    game.voteSheriff('3', '2'); // Jugador 3 vota por jugador 2
    game.voteSheriff('4', '3'); // Jugador 4 vota por jugador 3
    game.voteSheriff('5', '3'); // Jugador 5 vota por jugador 3
    resultado = game.electSheriff();
    expect(resultado).toBe('El jugador 3 ha sido elegido como alguacil.');
    expect(game.players.find(p => p.id === '1').isSheriff).toBe(false);
    expect(game.players.find(p => p.id === '2').isSheriff).toBe(false);
    expect(game.players.find(p => p.id === '3').isSheriff).toBe(true);
    expect(game.players.find(p => p.id === '4').isSheriff).toBe(false);
    expect(game.players.find(p => p.id === '5').isSheriff).toBe(false);
    game.vote('1', '3'); // El jugador 1 vota por el jugador 3
    game.vote('3', '2'); // El jugador 3 vota por el jugador 2
    game.vote('4', '3'); // El jugador 4 vota por el jugador 3
    resultado = game.resolveDayVotes();
    expect(resultado).toBe('Empate, se repiten las votaciones.');
    game.vote('1', '3'); // El jugador 1 vota por el jugador 3
    game.vote('3', '2'); // El jugador 3 vota por el jugador 2
    game.vote('4', '3'); // El jugador 4 vota por el jugador 3
    game.vote('5', '3'); // El jugador 5 vota por el jugador 3
    console.log(game.votes); // Ver los votos registrados
    resultado = game.resolveDayVotes();
    console.log(game.repeatVote); // Ver si la bandera de empate sigue activa
    console.log(resultado); // Ver qué mensaje devuelve resolveDayVotes()
    expect(resultado).toBe('El jugador 3 será eliminado al final del día.');
    game.nextTurn(); // Cambia a 'night'
    expect(game.players.find(p => p.id === '3').alive).toBe(false);
  });

  test('should not eliminate a werewolf target if no unanimity during night', () => {
    game.voteNight('1', '2');
    game.voteNight('2', '3'); // Los lobos no se ponen de acuerdo
    const result = game.resolveNightVotes();
    expect(result).toBe('Los lobos no se pusieron de acuerdo, no hay víctima esta noche.');
    expect(game.eliminationQueue).toEqual([]);
  });

  test('should use witch healing potion correctly', () => {
    game.voteNight('1', '3'); // El jugador 1 (lobo) vota por el jugador 3
    game.voteNight('2', '3'); // El jugador 2 (lobo) vota por el jugador 3
    game.resolveNightVotes(); // Se eliminará al jugador 3 al cambiar de turno
    expect(game.eliminationQueue).toContain('3');
    game.useWitchPotion('3', 'heal', '3'); // La bruja intenta sanarse así misma
    expect(game.eliminationQueue).not.toContain('3');
    game.nextTurn(); // Cambia a 'day'
    expect(game.turn).toBe('day');
    expect(game.players.find(p => p.id === '3').alive).toBe(true);
  });

  test('should use witch kill potion correctly', () => {
    game.voteNight('1', '4'); // El jugador 1 (lobo) vota por el jugador 4
    game.voteNight('2', '4'); // El jugador 2 (lobo) vota por el jugador 4
    game.resolveNightVotes(); // Se eliminará al jugador 4 al cambiar de turno
    game.useWitchPotion('3', 'kill', '1'); // La bruja intenta matar al jugador 1
    expect(game.eliminationQueue).toContain('4');
    expect(game.eliminationQueue).toContain('1');
    game.nextTurn(); // Cambia a 'day'
    expect(game.turn).toBe('day');
    expect(game.players.find(p => p.id === '4').alive).toBe(false);
    expect(game.players.find(p => p.id === '1').alive).toBe(false);
  });

  test('should prevent the seer from seeing a dead player\'s role', () => {
    game.voteNight('1', '3'); // El jugador 1 (lobo) vota por el jugador 3
    game.voteNight('2', '3'); // El jugador 2 (lobo) vota por el jugador 3
    game.resolveNightVotes(); // Se eliminará al jugador 4 al cambiar de turno
    expect(game.eliminationQueue).toContain('3');
    game.nextTurn(); // Cambia a 'day'
    game.nextTurn(); // Cambia a 'night'
    expect(game.turn).toBe('night');
    expect(game.players.find(p => p.id === '3').alive).toBe(false);
    result = game.seerReveal('4', '3'); // La vidente intenta ver el rol del jugador 3
    expect(result).toBe('Solo puedes ver el rol de un jugador vivo.');
    result = game.seerReveal('4', '1'); // La vidente intenta ver el rol del jugador 1
    expect(result).toBe('El jugador 1 es lobo.');
    result = game.seerReveal('4', '2'); // La vidente intenta ver el rol del jugador 2
    expect(result).toBe('No puedes usar esta habilidad.');
  });
});
