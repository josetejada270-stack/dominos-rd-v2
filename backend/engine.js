function crearMazo() {
  const mazo = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      mazo.push({ v1: i, v2: j, id: `${i}-${j}` });
    }
  }
  return mazo;
}

function barajar(mazo) {
  for (let i = mazo.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mazo[i], mazo[j]] = [mazo[j], mazo[i]];
  }
  return mazo;
}

class Partida {
  constructor(jugadores, apuesta) {
    this.jugadores = jugadores;
    this.apuesta = apuesta;
    this.mazo = barajar(crearMazo());
    this.manos = jugadores.map(() => []);
    this.tablero = [];
    this.turno = 0;
    this.terminada = false;
    this.ganador = null;
    this.pasosConsecutivos = 0; // Para detectar juego trancado
    
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < jugadores.length; j++) {
        this.manos[j].push(this.mazo.pop());
      }
    }
    
    this.turno = this._buscarDobleMayor();
  }

  _buscarDobleMayor() {
    let mejorDoble = -1;
    let jugadorInicio = 0;
    for (let i = 0; i < this.manos.length; i++) {
      for (let ficha of this.manos[i]) {
        if (ficha.v1 === ficha.v2 && ficha.v1 > mejorDoble) {
          mejorDoble = ficha.v1;
          jugadorInicio = i;
        }
      }
    }
    return jugadorInicio;
  }

  _extremos() {
    if (this.tablero.length === 0) return { izq: null, der: null };
    return {
      izq: this.tablero[0].v1,
      der: this.tablero[this.tablero.length - 1].v2
    };
  }

  _tengoFichaParaJugar(indice) {
    const ext = this._extremos();
    if (ext.izq === null) return true;
    return this.manos[indice].some(f => 
      f.v1 === ext.izq || f.v2 === ext.izq || f.v1 === ext.der || f.v2 === ext.der
    );
  }

  getEstado() {
    return {
      tablero: this.tablero,
      turno: this.turno,
      pozo: this.mazo.length,
      manos: this.manos.map(m => m.length),
      terminada: this.terminada,
      ganador: this.ganador,
    };
  }

  getFichasJugador(indice) {
    return this.manos[indice];
  }

  jugar(indice, fichaId, lado) {
    if (this.terminada) return { error: 'Partida terminada' };
    if (indice !== this.turno) return { error: 'No es tu turno' };

    const fichaIndex = this.manos[indice].findIndex(f => f.id === fichaId);
    if (fichaIndex === -1) return { error: 'Ficha no encontrada' };

    const ficha = this.manos[indice][fichaIndex];

    // Lógica especial para la PRIMERA ficha (tablero vacío)
    if (this.tablero.length === 0) {
      this.tablero.push({ v1: ficha.v1, v2: ficha.v2, id: ficha.id });
      this.manos[indice].splice(fichaIndex, 1);
      this.pasosConsecutivos = 0;
      this.turno = (this.turno + 1) % this.jugadores.length;
      return { ok: true, ficha, lado };
    }

    // Lógica para jugadas posteriores
    const ext = this._extremos();
    let encaja = false;
    if (lado === 'izquierda') {
      if (ficha.v1 === ext.izq || ficha.v2 === ext.izq) encaja = true;
    } else {
      if (ficha.v1 === ext.der || ficha.v2 === ext.der) encaja = true;
    }

    if (!encaja) return { error: 'Esa ficha no encaja en ese lado' };

    if (lado === 'izquierda') {
      if (ficha.v2 === ext.izq) {
        this.tablero.unshift({ v1: ficha.v1, v2: ficha.v2, id: ficha.id });
      } else {
        this.tablero.unshift({ v1: ficha.v2, v2: ficha.v1, id: ficha.id });
      }
    } else {
      if (ficha.v1 === ext.der) {
        this.tablero.push({ v1: ficha.v1, v2: ficha.v2, id: ficha.id });
      } else {
        this.tablero.push({ v1: ficha.v2, v2: ficha.v1, id: ficha.id });
      }
    }

    this.manos[indice].splice(fichaIndex, 1);
    this.pasosConsecutivos = 0;

    if (this.manos[indice].length === 0) {
      this.terminada = true;
      this.ganador = indice;
    } else {
      this.turno = (this.turno + 1) % this.jugadores.length;
    }

    return { ok: true, ficha, lado };
  }

  robar(indice) {
    if (this.terminada) return { error: 'Partida terminada' };
    if (indice !== this.turno) return { error: 'No es tu turno' };
    if (this._tengoFichaParaJugar(indice)) {
      return { error: 'Tienes fichas para jugar, no puedes robar' };
    }
    if (this.mazo.length === 0) {
      return { error: 'El pozo está vacío' };
    }
    
    const ficha = this.mazo.pop();
    this.manos[indice].push(ficha);
    return { ok: true, ficha };
  }

  pasar(indice) {
    if (this.terminada) return { error: 'Partida terminada' };
    if (indice !== this.turno) return { error: 'No es tu turno' };
    
    // Si tiene ficha para jugar pero intenta pasar, es trampa
    if (this._tengoFichaParaJugar(indice)) {
      return { 
        error: 'TRAMPA: Tienes ficha para jugar. Se te cobrará penalización.',
        esTrampa: true 
      };
    }
    
    if (this.mazo.length > 0) {
      return { error: 'Debes robar del pozo primero' };
    }
    
    this.pasosConsecutivos++;
    this.turno = (this.turno + 1) % this.jugadores.length;

    // Si todos los jugadores pasan consecutivamente y el pozo está vacío, se tranca
    if (this.pasosConsecutivos >= this.jugadores.length) {
      this.terminada = true;
      const puntos = this.manos.map(mano => mano.reduce((sum, f) => sum + f.v1 + f.v2, 0));
      const minPuntos = Math.min(...puntos);
      this.ganador = puntos.indexOf(minPuntos);
    }

    return { ok: true };
  }
}

module.exports = { Partida };