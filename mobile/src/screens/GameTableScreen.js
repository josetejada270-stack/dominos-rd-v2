import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, LayoutAnimation, Platform, UIManager } from 'react-native';
import { getSocket } from '../../socket';
import { BACKEND_URL, getToken } from '../../api';

// Activar animaciones en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// 🎵 SISTEMA DE SONIDOS REALISTAS (Web Audio API)
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = typeof window !== 'undefined' 
      ? new (window.AudioContext || window.webkitAudioContext)() 
      : null;
  }
  return audioCtx;
}

function playWoodHit(volume = 0.5) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const bufferSize = ctx.sampleRate * 0.1;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 800;
  filter.Q.value = 2;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start(now);
  noise.stop(now + 0.15);
  
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(volume * 0.4, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.12);
}

function playSlide(volume = 0.4) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const bufferSize = ctx.sampleRate * 0.25;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const env = Math.sin((i / bufferSize) * Math.PI);
    data[i] = (Math.random() * 2 - 1) * env * 0.5;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 2000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start(now);
}

function playVictory() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.50];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    const start = now + i * 0.15;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.4, start + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.3);
  });
}

function playError() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.linearRampToValueAtTime(80, now + 0.4);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.4);
}

function playSound(type) {
  if (type === 'colocar') playWoodHit(0.6);
  if (type === 'robar') playSlide(0.4);
  if (type === 'pasar') playSlide(0.3);
  if (type === 'ganar') playVictory();
  if (type === 'error') playError();
}

function Puntos({ valor }) {
  const dots = {
    0: [],
    1: [5],
    2: [1, 9],
    3: [1, 5, 9],
    4: [1, 3, 7, 9],
    5: [1, 3, 5, 7, 9],
    6: [1, 3, 4, 6, 7, 9]
  };
  const activeDots = dots[valor] || [];

  return (
    <View style={puntosStyles.grid}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((pos) => (
        <View key={pos} style={puntosStyles.cell}>
          {activeDots.includes(pos) && <View style={puntosStyles.dot} />}
        </View>
      ))}
    </View>
  );
}

const puntosStyles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: 26, height: 26, justifyContent: 'space-between', alignContent: 'space-between', padding: 2 },
  cell: { width: '33.33%', height: '33.33%', justifyContent: 'center', alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#111' }
});

function FichaH({ v1, v2 }) { 
  return (
    <View style={styles.fichaH}>
      <View style={styles.mitad}><Puntos valor={v1} /></View>
      <View style={styles.lineaV} />
      <View style={styles.mitad}><Puntos valor={v2} /></View>
    </View>
  ); 
}

function FichaDoble({ v1, v2 }) { 
  return (
    <View style={styles.fichaDoble}>
      <View style={styles.mitadD}><Puntos valor={v1} /></View>
      <View style={styles.lineaHD} />
      <View style={styles.mitadD}><Puntos valor={v2} /></View>
    </View>
  ); 
}

function FichaMano({ v1, v2, seleccionada, onPress, esJugable, esError, esMiTurno }) {
  return (
    <View style={{ alignItems: 'center', marginHorizontal: 4 }}>
      {esJugable && !seleccionada && !esError && <Text style={styles.indicadorTurno}>✨</Text>}
      <TouchableOpacity 
        style={[
          styles.fichaV, 
          seleccionada && styles.fichaSel, 
          !esJugable && esMiTurno && styles.fichaNormal,
          !esMiTurno && styles.fichaDesactivada,
          esError && styles.fichaError
        ]} 
        onPress={onPress} 
        disabled={!esMiTurno}
      >
        <View style={styles.mitadV}><Puntos valor={v1} /></View>
        <View style={styles.lineaHV} />
        <View style={styles.mitadV}><Puntos valor={v2} /></View>
      </TouchableOpacity>
    </View>
  );
}

export default function GameTableScreen({ navigation, route }) {
  const params = route.params || {};
  const salaId = params.salaId;
  
  const [misFichas, setMisFichas] = useState(params.misFichasIniciales || []);
  const [miIndice, setMiIndice] = useState(params.miIndiceInicial !== undefined ? params.miIndiceInicial : -1);
  const [tablero, setTablero] = useState([]);
  const [turno, setTurno] = useState(0);
  const [pozo, setPozo] = useState(0);
  const [jugadores, setJugadores] = useState([]);
  const [apuesta, setApuesta] = useState(params.apuestaInicial || 0);
  const [fin, setFin] = useState(null);
  const [sock, setSock] = useState(null);
  const [fichaSel, setFichaSel] = useState(null);
  const [mensajeTemp, setMensajeTemp] = useState(null);
  const [miSaldo, setMiSaldo] = useState(0);
  const [fichaErrorId, setFichaErrorId] = useState(null);

  const fichaSelRef = useRef(fichaSel);
  useEffect(() => { fichaSelRef.current = fichaSel; }, [fichaSel]);

  const mostrarMensaje = (texto, duracion = 2000) => { setMensajeTemp(texto); setTimeout(() => setMensajeTemp(null), duracion); };

  const cargarSaldo = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.usuario) setMiSaldo(data.usuario.saldo);
    } catch (e) {}
  };

  const esJugable = (ficha) => {
    if (fin) return false;
    if (tablero.length === 0) return true;
    const extremoIzq = tablero[0].v1;
    const extremoDer = tablero[tablero.length - 1].v2;
    return (
      ficha.v1 === extremoIzq || ficha.v2 === extremoIzq ||
      ficha.v1 === extremoDer || ficha.v2 === extremoDer
    );
  };

  useEffect(() => {
    cargarSaldo();
    let isMounted = true;
    const setup = async () => {
      const sc = await getSocket();
      if (!isMounted) return;
      setSock(sc);
      
      sc.on('juego:estado', (data) => { 
        // ✨ Animación suave al actualizar la mesa y el turno
        LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
        console.log('[JUEGO] Estado - turno:', data.turno, 'miIndice:', miIndice);
        setTablero(data.tablero); 
        setTurno(data.turno); 
        setPozo(data.pozo); 
        setJugadores(data.jugadores); 
      });
      
      sc.on('juego:ficha', (data) => { 
        // ✨ Animación de "rebote" al colocar una ficha
        LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
        setMisFichas(prev => { 
          const eraMia = prev.some(f => f.id === data.ficha.id); 
          if (eraMia) { playSound('colocar'); return prev.filter(f => f.id !== data.ficha.id); } 
          return prev; 
        }); 
      });
      
      sc.on('juego:robo', (data) => { 
        // ✨ Animación suave al robar una ficha
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setMisFichas(prev => [...prev, data.ficha]); 
        playSound('robar'); 
      });
      
      sc.on('juego:error', (data) => { 
        mostrarMensaje(data.msg, 1500); 
        playSound('error'); 
        if (fichaSelRef.current) { 
          setFichaErrorId(fichaSelRef.current.id); 
          setTimeout(() => setFichaErrorId(null), 1000); 
        } 
        setFichaSel(null); 
      });
      
      sc.on('juego:fin', (data) => { 
        setFin(data); 
        cargarSaldo(); 
        if (data.ganadorIndice === miIndice) playSound('ganar'); 
      });
      
      sc.on('juego:trampa', (data) => {
        mostrarMensaje(data.msg, 4000);
        playSound('error');
      });

      sc.on('juego:sala_cerrada', (data) => { 
        mostrarMensaje('Sala cerrada: ' + data.motivo, 2500); 
        setTimeout(() => { if (isMounted) navigation.replace('Home'); }, 2500); 
      });
    };
    setup();
    return () => { isMounted = false; };
  }, []);

  const jugar = (fichaId, lado) => { 
    console.log('[JUEGO] Jugando ficha:', fichaId, 'lado:', lado);
    sock.emit('juego:jugar', { salaId, fichaId, lado }); 
    setFichaSel(null); 
  };
  
  const miTurno = miIndice >= 0 && turno === miIndice && !fin;

  if (fin) {
    const soyGanador = fin.ganadorIndice === miIndice;
    return (
      <View style={styles.container}>
        <View style={styles.overlay}>
          <View style={styles.finCard}>
            <Text style={styles.finIcon}>{soyGanador ? '👑' : '🏆'}</Text>
            <Text style={styles.finTitulo}>{soyGanador ? '¡VICTORIA!' : `Ganó ${fin.ganadorNombre}`}</Text>
            <View style={styles.resumenBox}>
              <View style={styles.resumenRow}><Text style={styles.resumenLabel}>Pozo de la sala:</Text><Text style={styles.resumenVal}>RD$ {fin.pozo}</Text></View>
              <View style={styles.resumenRow}><Text style={styles.resumenLabel}>Comisión casa:</Text><Text style={styles.resumenVal}>- RD$ {fin.comision}</Text></View>
              <View style={styles.resumenRow}><Text style={styles.resumenLabel}>Puntos fichas rivales:</Text><Text style={styles.resumenVal}>+ {fin.puntosRestantes}</Text></View>
              <View style={[styles.resumenRow, styles.resumenTotal]}><Text style={styles.resumenTotalLabel}>TOTAL GANADO:</Text><Text style={styles.resumenTotalVal}>RD$ {fin.totalGanado}</Text></View>
            </View>
            <View style={styles.saldoBox}><Text style={styles.saldoLabel}>Tu saldo actual:</Text><Text style={styles.saldoVal}>RD$ {miSaldo.toFixed(2)}</Text></View>
            <TouchableOpacity style={styles.btnVolver} onPress={() => navigation.replace('Home')}><Text style={styles.btnVolverText}>VOLVER AL SALÓN</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {mensajeTemp && (<View style={styles.toastBox}><Text style={styles.toastText}>{mensajeTemp}</Text></View>)}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.replace('Home')}><Text style={styles.btnSalir}>✕ Salir</Text></TouchableOpacity>
        <View style={styles.apuestaBox}><Text style={styles.apuestaLabel}>APUESTA</Text><Text style={styles.apuestaVal}>RD$ {apuesta}</Text></View>
        <View style={styles.saldoHeader}><Text style={styles.saldoHeaderLabel}>SALDO</Text><Text style={styles.saldoHeaderVal}>RD$ {miSaldo.toFixed(2)}</Text></View>
      </View>
      <View style={styles.oponentesRow}>
        {jugadores.map((j, i) => i !== miIndice && (
          <View key={i} style={[styles.oponente, turno === i && styles.oponenteActivo]}>
            {turno === i && <View style={styles.flechaTurno}><Text style={styles.flechaText}>▼</Text></View>}
            <View style={[styles.avatar, turno === i && styles.avatarActivo]}><Text style={styles.avatarText}>{j.nombre?.charAt(0).toUpperCase()}</Text></View>
            <Text style={styles.oponenteNombre}>{j.nombre?.split(' ')[0]}</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>{j.fichas}</Text></View>
          </View>
        ))}
      </View>
      <View style={styles.tableroBox}>
        <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={styles.tableroContent}>
          {tablero.length === 0 ? (<View style={styles.mesaVacia}><Text style={styles.mesaVaciaText}>Mesa lista. ¡Coloca la primera ficha!</Text></View>) : (tablero.map((f, i) => f.v1 === f.v2 ? <FichaDoble key={i} v1={f.v1} v2={f.v2} /> : <FichaH key={i} v1={f.v1} v2={f.v2} />))}
        </ScrollView>
        <View style={styles.turnoBox}><Text style={[styles.turnoText, miTurno && styles.turnoActivo]}>{miTurno ? '✅ ES TU TURNO' : `⏳ Turno de ${jugadores[turno]?.nombre || '...'}`}</Text></View>
      </View>
      <View style={styles.pozoBox}><Text style={styles.pozoText}>🎲 Pozo: {pozo} fichas</Text></View>
      
      {fichaSel && miTurno && (
        <View style={styles.selBox}>
          <Text style={styles.selText}>Colocar {fichaSel.v1} | {fichaSel.v2} {fichaSel.v1 === fichaSel.v2 ? '(DOBLE)' : ''}</Text>
          <View style={styles.selBtns}>
            <TouchableOpacity style={styles.btnSel} onPress={() => jugar(fichaSel.id, 'izquierda')}><Text style={styles.btnSelText}>⬅️ Izquierda</Text></TouchableOpacity>
            <TouchableOpacity style={styles.btnSel} onPress={() => jugar(fichaSel.id, 'derecha')}><Text style={styles.btnSelText}>Derecha ➡️</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.btnSel, {backgroundColor:'#e74c3c'}]} onPress={() => setFichaSel(null)}><Text style={styles.btnSelText}>Cancelar</Text></TouchableOpacity>
          </View>
        </View>
      )}
      
      <View style={styles.manoBox}>
        <View style={styles.manoHeader}><Text style={styles.manoLabel}>TUS FICHAS</Text><View style={styles.badge}><Text style={styles.badgeText}>{misFichas.length}</Text></View></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={styles.manoContent}>
          {misFichas.map((f, i) => {
            const puedeJugar = esJugable(f);
            return (
              <FichaMano 
                key={i} 
                v1={f.v1} 
                v2={f.v2} 
                seleccionada={fichaSel && fichaSel.id === f.id} 
                esJugable={puedeJugar && miTurno}
                esMiTurno={miTurno}
                esError={fichaErrorId === f.id} 
                onPress={() => { 
                  console.log('[JUEGO] Click - miTurno:', miTurno, 'puedeJugar:', puedeJugar);
                  if (!miTurno) { 
                    mostrarMensaje('⏳ Espera tu turno', 1200); 
                    return; 
                  }
                  if (!puedeJugar) { 
                    mostrarMensaje('❌ Esta ficha no encaja', 1200); 
                    return; 
                  } 
                  setFichaSel(f); 
                }} 
              />
            );
          })}
        </ScrollView>
      </View>
      
      <View style={styles.accionesBox}>
        <TouchableOpacity 
          style={[styles.btnAccion, styles.btnRobar, !miTurno && styles.btnDisabled]} 
          disabled={!miTurno} 
          onPress={() => {
            if (!miTurno) {
              mostrarMensaje('⏳ Espera tu turno', 1200);
              return;
            }
            sock.emit('juego:robar', {salaId});
          }}
        >
          <Text style={styles.btnAccionText}>🎲 Robar</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.btnAccion, styles.btnPasar, !miTurno && styles.btnDisabled]} 
          disabled={!miTurno} 
          onPress={() => {
            if (!miTurno) {
              mostrarMensaje('⏳ Espera tu turno', 1200);
              return;
            }
            sock.emit('juego:pasar', {salaId});
          }}
        >
          <Text style={styles.btnAccionText}>⏭️ Pasar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#143d22' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, paddingTop: 45 },
  btnSalir: { color: '#ff6b6b', fontSize: 16, fontWeight: 'bold' },
  apuestaBox: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  apuestaLabel: { color: '#aaa', fontSize: 9, textAlign: 'center' },
  apuestaVal: { color: '#FFD700', fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
  saldoHeader: { backgroundColor: 'rgba(46,204,113,0.3)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  saldoHeaderLabel: { color: '#a5d6a7', fontSize: 9, textAlign: 'center' },
  saldoHeaderVal: { color: '#2ecc71', fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
  oponentesRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 8 },
  oponente: { alignItems: 'center', opacity: 0.5 },
  oponenteActivo: { opacity: 1 },
  flechaTurno: { position: 'absolute', top: -15, zIndex: 10 },
  flechaText: { color: '#2ecc71', fontSize: 20, fontWeight: '900' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2ecc71', justifyContent: 'center', alignItems: 'center', marginBottom: 4, borderWidth: 2, borderColor: 'transparent' },
  avatarActivo: { borderColor: '#FFD700', shadowColor: '#FFD700', shadowOffset: {width:0, height:0}, shadowOpacity: 0.8, shadowRadius: 10, elevation: 5 },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  oponenteNombre: { color: '#fff', fontSize: 13, fontWeight: '600', marginBottom: 3 },
  badge: { backgroundColor: '#FFD700', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  badgeText: { color: '#000', fontWeight: '900', fontSize: 12 },
  tableroBox: { flex: 1, margin: 10, backgroundColor: '#1a5c2e', borderRadius: 16, borderWidth: 3, borderColor: '#3e2723', justifyContent: 'center', position: 'relative' },
  tableroContent: { flexDirection: 'row', alignItems: 'center', padding: 20, minHeight: 100 },
  mesaVacia: { width: '100%', alignItems: 'center' },
  mesaVaciaText: { color: '#81c784', fontSize: 16, fontWeight: '600', fontStyle: 'italic' },
  turnoBox: { position: 'absolute', bottom: 12, left: 0, right: 0, alignItems: 'center' },
  turnoText: { color: '#fff', fontSize: 13, fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16 },
  turnoActivo: { backgroundColor: '#FFD700', color: '#143d22', borderWidth: 1, borderColor: '#fff' },
  pozoBox: { alignItems: 'center', marginBottom: 6 },
  pozoText: { color: '#a5d6a7', fontSize: 13, fontWeight: '600' },
  selBox: { backgroundColor: '#0d2b18', padding: 10, marginHorizontal: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#FFD700', marginBottom: 10 },
  selText: { color: '#FFD700', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  selBtns: { flexDirection: 'row', gap: 8 },
  btnSel: { backgroundColor: '#2ecc71', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, minWidth: 90, alignItems: 'center' },
  btnSelText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  manoBox: { backgroundColor: '#0d2b18', padding: 10, borderTopWidth: 2, borderTopColor: '#2e7d32' },
  manoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  manoLabel: { color: '#FFD700', fontSize: 13, fontWeight: 'bold', letterSpacing: 1 },
  manoContent: { flexDirection: 'row', padding: 4 },
  accionesBox: { flexDirection: 'row', padding: 12, gap: 10, paddingBottom: 25 },
  btnAccion: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  btnRobar: { backgroundColor: '#3498db' },
  btnPasar: { backgroundColor: '#e67e22' },
  btnDisabled: { opacity: 0.4 },
  btnAccionText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  toastBox: { position: 'absolute', top: 100, left: '50%', transform: [{ translateX: -120 }], backgroundColor: 'rgba(231,76,60,0.95)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, zIndex: 100, minWidth: 240, alignItems: 'center' },
  toastText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  fichaH: { flexDirection: 'row', backgroundColor: '#fdfdfd', width: 55, height: 32, borderRadius: 5, borderWidth: 1, borderColor: '#999', marginHorizontal: 2 },
  fichaDoble: { flexDirection: 'column', backgroundColor: '#fdfdfd', width: 32, height: 55, borderRadius: 5, borderWidth: 2, borderColor: '#FFD700', marginHorizontal: 8 },
  fichaV: { backgroundColor: '#fdfdfd', width: 42, height: 76, borderRadius: 7, borderWidth: 1, borderColor: '#888', marginHorizontal: 3 },
  fichaSel: { borderColor: '#FFD700', borderWidth: 3, transform: [{ translateY: -10 }] },
  fichaNormal: { opacity: 1 },
  fichaDesactivada: { opacity: 0.4 },
  fichaError: { borderColor: '#e74c3c', borderWidth: 3, shadowColor: '#e74c3c', shadowOffset: {width:0, height:0}, shadowOpacity: 0.8, shadowRadius: 10, elevation: 5 },
  indicadorTurno: { fontSize: 16, marginBottom: 2 },
  mitad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mitadD: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mitadV: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lineaV: { width: 2, backgroundColor: '#333' },
  lineaHD: { height: 2, backgroundColor: '#333', width: '80%', alignSelf: 'center' },
  lineaHV: { height: 2, backgroundColor: '#333' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  finCard: { backgroundColor: '#1a5c2e', width: '100%', maxWidth: 380, borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 2, borderColor: '#FFD700' },
  finIcon: { fontSize: 50, marginBottom: 8 },
  finTitulo: { color: '#FFD700', fontSize: 24, fontWeight: '900', marginBottom: 16, textAlign: 'center' },
  resumenBox: { width: '100%', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 14, marginBottom: 16 },
  resumenRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  resumenLabel: { color: '#a5d6a7', fontSize: 14 },
  resumenVal: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  resumenTotal: { borderTopWidth: 1, borderTopColor: '#FFD700', paddingTop: 10, marginTop: 4 },
  resumenTotalLabel: { color: '#FFD700', fontSize: 16, fontWeight: 'bold' },
  resumenTotalVal: { color: '#FFD700', fontSize: 20, fontWeight: '900' },
  saldoBox: { backgroundColor: '#2ecc71', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginBottom: 16, width: '100%', alignItems: 'center' },
  saldoLabel: { color: '#fff', fontSize: 14 },
  saldoVal: { color: '#fff', fontSize: 22, fontWeight: '900' },
  btnVolver: { backgroundColor: '#FFD700', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 25, width: '100%', alignItems: 'center' },
  btnVolverText: { color: '#143d22', fontSize: 16, fontWeight: '900' },
});