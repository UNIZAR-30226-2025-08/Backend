
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