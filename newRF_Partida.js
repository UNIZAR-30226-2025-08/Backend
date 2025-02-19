  // Aplicar eliminaciones al final del turno
  aplicarEliminaciones() {
    console.log("Aplicando eliminaciones a:", this.colaEliminaciones);
    this.colaEliminaciones.forEach(jugadorId => {
      const jugador = this.jugadores.find(p => p.id === jugadorId);
      if (jugador) {
        if (jugador.esAlguacil) {
          this.elegirSucesor();
        }
        if (jugador.rol === 'cazador') {
          this.disparoCazador();
        }
        console.log(`Eliminando al jugador ${jugadorId}`);
        jugador.vivo = false;
      }
    });
    this.colaEliminaciones = []; // Reiniciar la cola

    // Comprobar si hay un ganador y devolver el resultado
    return this.comprobarVictoria();
  }


    // Método del cazador para elegir a su víctima
    disparoCazador(jugadorId, type, objetivoId) {
        const jugador = this.jugadores.find(p => p.id === jugadorId);
        if (!jugador || jugador.rol !== 'cazador') return 'No puedes usar esta habilidad.';
        if (!objetivoId || !objetivoId.vivo) return 'Jugador erróneo.';
          this.colaDeEliminacion(objetivoId); // Se elimina al final del turno
    }

    // Método del Alguacil para elegir a su sucesor
    elegirSucesor(jugadorId, type, objetivoId) {
        const jugador = this.jugadores.find(p => p.id === jugadorId);
        if (!jugador || !jugador.esAlguacil) return 'No puedes usar esta habilidad.';
        if (!objetivoId || !objetivoId.vivo) return 'Jugador erróneo.';
        jugador.esAlguacil = false;
        objetivoId.esAlguacil = true;
    }