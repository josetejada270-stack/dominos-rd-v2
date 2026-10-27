import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { getSocket } from '../../socket';
import { BACKEND_URL, getToken } from '../../api';

export default function LobbyScreen({ navigation }) {
  const [salas, setSalas] = useState([]);
  const [apuesta, setApuesta] = useState('100');
  const [salaIdJoin, setSalaIdJoin] = useState('');
  const [msg, setMsg] = useState('');
  const [miSalaId, setMiSalaId] = useState('');
  const [esperandoJugador, setEsperandoJugador] = useState(false);
  const sockRef = useRef(null);

  const flash = (texto) => { setMsg(texto); setTimeout(() => setMsg(''), 2500); };

  useEffect(() => {
    let mounted = true;
    let sc = null;

    const setup = async () => {
      try {
        sc = await getSocket();
        sockRef.current = sc;

        sc.emit('salon:listar', (lista) => {
          if (mounted) setSalas(lista || []);
        });

        sc.on('salon:estado', (estado) => {
          if (mounted) {
            sc.emit('salon:listar', (lista) => {
              if (mounted) setSalas(lista || []);
            });
            
            if (esperandoJugador && estado.jugadores && estado.jugadores.length >= 2) {
              flash('🎮 ¡Jugador unido! Iniciando partida...');
            }
          }
        });

        // AQUÍ ESTÁ LA CLAVE: Recibimos los datos y los pasamos a la siguiente pantalla
        sc.on('juego:iniciado', (data) => {
          if (mounted) {
            flash('🎮 Partida iniciada');
            setTimeout(() => {
              navigation.replace('Game', { 
                salaId: miSalaId || data.salaId,
                misFichasIniciales: data.misFichas,
                miIndiceInicial: data.miIndice,
                apuestaInicial: data.apuesta
              });
            }, 500);
          }
        });

      } catch (e) {
        console.warn('Lobby error:', e);
      }
    };

    setup();

    return () => {
      mounted = false;
      if (sc) {
        sc.off('salon:estado');
        sc.off('juego:iniciado');
      }
    };
  }, [esperandoJugador, miSalaId, navigation]);

  const crearSala = () => {
    if (!sockRef.current) return flash('⚠️ Esperando conexión...');
    sockRef.current.emit('salon:crear', { apuesta: Number(apuesta) || 100 }, (res) => {
      if (res && res.error) flash('❌ ' + res.error);
      else if (res && res.salaId) {
        setMiSalaId(res.salaId);
        setEsperandoJugador(true);
        flash('✅ Sala creada: ' + res.salaId);
      }
    });
  };

  const unirseSala = (id) => {
    if (!sockRef.current) return flash('⚠️ Esperando conexión...');
    if (!id) return flash('⚠️ Ingresa un ID de sala');
    
    sockRef.current.emit('salon:unirse', { salaId: id }, (res) => {
      if (res && res.error) flash('❌ ' + res.error);
      else if (res && res.salaId) {
        setMiSalaId(res.salaId);
        flash('✅ Unido a la sala, esperando inicio...');
      }
    });
  };

  const copiarSalaId = () => {
    if (!miSalaId) return;
    try {
      navigator.clipboard.writeText(miSalaId);
      flash('📋 ID copiado: ' + miSalaId);
    } catch (e) {
      Alert.alert('ID de la sala', miSalaId);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.replace('Home')}>
          <Text style={styles.back}>◀ Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>SALÓN DE JUEGO</Text>
      </View>

      {msg ? <View style={styles.toast}><Text style={styles.toastTxt}>{msg}</Text></View> : null}

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.section}>CREAR PARTIDA</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Apuesta (RD$)</Text>
          <TextInput style={styles.input} value={apuesta} onChangeText={setApuesta} placeholder="100" keyboardType="numeric" />
          <TouchableOpacity style={styles.btn} onPress={crearSala}>
            <Text style={styles.btnText}>➕ CREAR SALA</Text>
          </TouchableOpacity>

          {miSalaId && esperandoJugador ? (
            <View style={styles.codeBox}>
              <Text style={styles.codeLabel}>ID DE TU SALA</Text>
              <Text style={styles.codeVal}>{miSalaId}</Text>
              <TouchableOpacity style={[styles.btnSmall, { backgroundColor: '#3498db' }]} onPress={copiarSalaId}>
                <Text style={styles.btnTextSmall}>📋 Copiar ID</Text>
              </TouchableOpacity>
              <Text style={styles.hint}>⏳ Esperando jugador... Comparte este ID</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.section}>UNIRSE CON ID</Text>
        <View style={styles.card}>
          <TextInput style={styles.input} value={salaIdJoin} onChangeText={setSalaIdJoin} placeholder="Pega el ID aquí" autoCapitalize="characters" />
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#f1c40f' }]} onPress={() => unirseSala(salaIdJoin.trim())}>
            <Text style={[styles.btnText, { color: '#000' }]}>🎯 ENTRAR A LA SALA</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>SALAS ABIERTAS</Text>
        {salas.length === 0 ? (
          <Text style={styles.empty}>No hay salas abiertas. ¡Crea la primera!</Text>
        ) : (
          salas.map((s) => (
            <View key={s.id} style={styles.roomRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.roomHost}>Sala: {s.id}</Text>
                <Text style={styles.roomMeta}>Apuesta: RD$ {s.apuesta} · {s.jugadores}/4 jugadores</Text>
              </View>
              <TouchableOpacity style={[styles.btnSmall, { backgroundColor: '#2ecc71' }]} onPress={() => unirseSala(s.id)}>
                <Text style={styles.btnTextSmall}>UNIRSE</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#143d22' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingTop: 45, backgroundColor: '#0d2b18', borderBottomWidth: 2, borderBottomColor: '#FFD700' },
  back: { color: '#ff6b6b', fontWeight: 'bold', fontSize: 15 },
  title: { color: '#FFD700', fontWeight: '900', fontSize: 18 },
  toast: { position: 'absolute', top: 90, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 18, zIndex: 200 },
  toastTxt: { color: '#FFD700', fontWeight: 'bold' },
  scroll: { padding: 14, paddingBottom: 50 },
  section: { color: '#FFD700', fontWeight: '900', fontSize: 14, marginTop: 18, marginBottom: 8 },
  empty: { color: '#a5d6a7', fontStyle: 'italic', fontSize: 13 },
  card: { backgroundColor: '#1a5c2e', borderRadius: 16, padding: 14, borderWidth: 2, borderColor: '#3e2723', gap: 10 },
  label: { color: '#a5d6a7', fontSize: 12, fontWeight: 'bold' },
  input: { color: '#fff', fontSize: 16, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#0d2b18', borderRadius: 10, borderWidth: 1, borderColor: '#2e7d32' },
  btn: { backgroundColor: '#2ecc71', paddingVertical: 13, borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: 'rgba(0,0,0,0.25)' },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  btnSmall: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  btnTextSmall: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  codeBox: { backgroundColor: '#0d2b18', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FFD700', marginTop: 4 },
  codeLabel: { color: '#a5d6a7', fontSize: 11, fontWeight: 'bold' },
  codeVal: { color: '#FFD700', fontSize: 24, fontWeight: '900', letterSpacing: 2, marginVertical: 6 },
  hint: { color: '#f1c40f', fontSize: 12, textAlign: 'center', marginTop: 8, fontWeight: '600' },
  roomRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a5c2e', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#3e2723', gap: 10 },
  roomHost: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  roomMeta: { color: '#a5d6a7', fontSize: 12, marginTop: 2 }
});