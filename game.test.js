// juego.test.js
const Juego = require('./Juego');

// Función para crear jugadores
function crearJugadores() {
  return [
    { id: '1', rol: 'lobo' },
    { id: '2', rol: 'lobo' },
    { id: '3', rol: 'bruja' },
    { id: '4', rol: 'vidente' },
    { id: '5', rol: 'aldeano' }
  ];
}

describe('Juego class', () => {

  let juego;

  beforeEach(() => {
    // Inicializa un nuevo juego antes de cada test
    const jugadores = crearJugadores();
    juego = new Juego('juego1', jugadores);
  });

  test('deberia iniciar el juego correctamente', () => {
    expect(juego.juegoId).toBe('juego1');
    expect(juego.estado).toBe('en_curso');
    expect(juego.turno).toBe('noche');
    expect(juego.jugadores.length).toBe(5);
  });

  test('debería cambiar el turno de noche a día', () => {
    juego.sigTurno(); // Cambia a 'dia'
    expect(juego.turno).toBe('dia');
  });

  test('debería añadir un mensaje al chat durante el día', () => {
    juego.addChatMensaje('1', 'Hola a todos');
    expect(juego.chat.length).toBe(1);
    expect(juego.chat[0].message).toBe('Hola a todos');
  });

  test('no debería permitir a los jugadores eliminados enviar mensaje', () => {
    juego.VotaNoche('1', '3'); // El jugador 1 (lobo) vota por el jugador 3
    juego.VotaNoche('2', '3'); // El jugador 2 (lobo) vota por el jugador 3
    juego.VotaNoche('3', '2'); // El jugador 3 (no es lobo) intenta votar por el jugador 2. No puede votar. 
    juego.VotaNoche('4', '2'); // El jugador 4 (no es lobo) intenta votar por el jugador 2. No puede votar. 
    juego.VotaNoche('5', '2'); // El jugador 5 (no es lobo) intenta votar por el jugador 2. No puede votar. 
    juego.resolverNocheVotos(); // Se eliminará al jugador 3 al cambiar de turno
    juego.sigTurno(); // Cambia a 'dia'
    juego.addChatMensaje('3', 'Hola a todos');
    expect(juego.turno).toBe('dia');
    expect(juego.jugadores.find(p => p.id === '3').vivo).toBe(false);
    expect(juego.chat.length).toBe(0); // No debe agregar el mensaje
  });

  test('debería realizar una votación correctamente, eliminando a un jugador tras alcanzar una mayoría', () => {
    juego.sigTurno(); 
    // Cambia a 'dia'
    expect(juego.turno).toBe('dia');
    juego.vota('1', '3'); // El jugador 1 vota por el jugador 3
    juego.vota('2', '3'); // El jugador 2 vota por el jugador 3
    juego.vota('3', '2'); // El jugador 3 vota por el jugador 2
    juego.vota('4', '2'); // El jugador 4 vota por el jugador 2
    juego.vota('5', '2'); // El jugador 5 vota por el jugador 2
    expect(juego.votos['1']).toBe('3');
    expect(juego.votos['2']).toBe('3');
    expect(juego.votos['3']).toBe('2');
    expect(juego.votos['4']).toBe('2');
    expect(juego.votos['5']).toBe('2');
    juego.resolverDiaVotos();
    expect(juego.colaEliminaciones).toContain('2');
    juego.sigTurno(); // Cambia a 'noche'
    expect(juego.jugadores.find(p => p.id === '2').vivo).toBe(false);
  });

  test('debería hacer la votación del Alguacil y debería dar empate duante el dia', () => {
    juego.sigTurno(); // Cambia a 'dia'
    juego.votarAlguacil('1', '2'); // Jugador 1 vota por jugador 2
    juego.votarAlguacil('3', '2'); // Jugador 3 vota por jugador 2
    juego.votarAlguacil('4', '3'); // Jugador 4 vota por jugador 3
    juego.votarAlguacil('5', '3'); // Jugador 5 vota por jugador 3
    resultado = juego.elegirAlguacil();
    expect(resultado).toBe('Empate en la elección del alguacil, se repiten las votaciones.');
    juego.votarAlguacil('1', '2'); // Jugador 1 vota por jugador 2
    juego.votarAlguacil('2', '3'); // Jugador 2 vota por jugador 3
    juego.votarAlguacil('3', '2'); // Jugador 3 vota por jugador 2
    juego.votarAlguacil('4', '3'); // Jugador 4 vota por jugador 3
    juego.votarAlguacil('5', '3'); // Jugador 5 vota por jugador 3
    resultado = juego.elegirAlguacil();
    expect(resultado).toBe('El jugador 3 ha sido elegido como alguacil.');
    expect(juego.jugadores.find(p => p.id === '1').isSheriff).toBe(false);
    expect(juego.jugadores.find(p => p.id === '2').isSheriff).toBe(false);
    expect(juego.jugadores.find(p => p.id === '3').isSheriff).toBe(true);
    expect(juego.jugadores.find(p => p.id === '4').isSheriff).toBe(false);
    expect(juego.jugadores.find(p => p.id === '5').isSheriff).toBe(false);
    juego.vota('1', '3'); // El jugador 1 vota por el jugador 3
    juego.vota('3', '2'); // El jugador 3 vota por el jugador 2
    juego.vota('4', '3'); // El jugador 4 vota por el jugador 3
    resultado = juego.resolverDiaVotos();
    expect(resultado).toBe('Empate, se repiten las votaciones.');
    juego.vota('1', '3'); // El jugador 1 vota por el jugador 3
    juego.vota('3', '2'); // El jugador 3 vota por el jugador 2
    juego.vota('4', '3'); // El jugador 4 vota por el jugador 3
    juego.vota('5', '3'); // El jugador 5 vota por el jugador 3
    console.log(juego.votos); // Ver los votos registrados
    resultado = juego.resolverDiaVotos();
    console.log(juego.repiteVote); // Ver si la bandera de empate sigue activa
    console.log(resultado); // Ver qué mensaje devuelve resolverDiaVotos()
    expect(resultado).toBe('El jugador 3 será eliminado al final del día.');
    juego.sigTurno(); // Cambia a 'noche'
    expect(juego.jugadores.find(p => p.id === '3').vivo).toBe(false);
  });

  test('no debería eliminar al objetivo si no hay consenso entre los lobos durante la noche', () => {
    juego.VotaNoche('1', '2');
    juego.VotaNoche('2', '3'); // Los lobos no se ponen de acuerdo
    const result = juego.resolverNocheVotos();
    expect(result).toBe('Los lobos no se pusieron de acuerdo, no hay víctima esta noche.');
    expect(juego.colaEliminaciones).toEqual([]);
  });

  test('debería usar la poción de la bruja correctamente', () => {
    juego.VotaNoche('1', '3'); // El jugador 1 (lobo) vota por el jugador 3
    juego.VotaNoche('2', '3'); // El jugador 2 (lobo) vota por el jugador 3
    juego.resolverNocheVotos(); // Se eliminará al jugador 3 al cambiar de turno
    expect(juego.colaEliminaciones).toContain('3');
    juego.usaPocionBruja('3', 'curar', '3'); // La bruja intenta sanarse así misma
    expect(juego.colaEliminaciones).not.toContain('3');
    juego.sigTurno(); // Cambia a 'dia'
    expect(juego.turno).toBe('dia');
    expect(juego.jugadores.find(p => p.id === '3').vivo).toBe(true);
  });

  test('debería usar la poción de matar de la bruja correctamente', () => {
    juego.VotaNoche('1', '4'); // El jugador 1 (lobo) vota por el jugador 4
    juego.VotaNoche('2', '4'); // El jugador 2 (lobo) vota por el jugador 4
    juego.resolverNocheVotos(); // Se eliminará al jugador 4 al cambiar de turno
    juego.usaPocionBruja('3', 'matar', '1'); // La bruja intenta matar al jugador 1
    expect(juego.colaEliminaciones).toContain('4');
    expect(juego.colaEliminaciones).toContain('1');
    juego.sigTurno(); // Cambia a 'dia'
    expect(juego.turno).toBe('dia');
    expect(juego.jugadores.find(p => p.id === '4').vivo).toBe(false);
    expect(juego.jugadores.find(p => p.id === '1').vivo).toBe(false);
  });

  test('debería prevenir a la vidente de ver el rol de un jugador muerto\'s rol', () => {
    juego.VotaNoche('1', '3'); // El jugador 1 (lobo) vota por el jugador 3
    juego.VotaNoche('2', '3'); // El jugador 2 (lobo) vota por el jugador 3
    juego.resolverNocheVotos(); // Se eliminará al jugador 4 al cambiar de turno
    expect(juego.colaEliminaciones).toContain('3');
    juego.sigTurno(); // Cambia a 'dia'
    juego.sigTurno(); // Cambia a 'noche'
    expect(juego.turno).toBe('noche');
    expect(juego.jugadores.find(p => p.id === '3').vivo).toBe(false);
    result = juego.videnteRevela('4', '3'); // La vidente intenta ver el rol del jugador 3
    expect(result).toBe('Solo puedes ver el rol de un jugador vivo.');
    result = juego.videnteRevela('4', '1'); // La vidente intenta ver el rol del jugador 1
    expect(result).toBe('El jugador 1 es lobo.');
    result = juego.videnteRevela('4', '2'); // La vidente intenta ver el rol del jugador 2
    expect(result).toBe('No puedes usar esta habilidad.');
  });
});
