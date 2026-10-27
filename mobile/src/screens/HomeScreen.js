import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Modal, ScrollView, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../App';
import { api } from '../../api';

// PALETAS DE COLORES PARA EL BOTÓN JUGAR (cambian aleatoriamente)
const PALETAS_JUGAR = [
  ['#00B4DB', '#0083B0', '#00B4DB'], // Azul tropical
  ['#FF416C', '#FF4B2B', '#FF416C'], // Rojo fuego
  ['#8E2DE2', '#4A00E0', '#8E2DE2'], // Morado gamer
  ['#11998e', '#38ef7d', '#11998e'], // Verde esmeralda
  ['#F7971E', '#FFD200', '#F7971E'], // Dorado
  ['#FC466B', '#3F5EFB', '#FC466B'], // Rosa-azul neón
  ['#00c6ff', '#0072ff', '#00c6ff'], // Cyan eléctrico
];

const COLORES_BORDE = ['#fff', '#FFD700', '#FF416C', '#00FF00', '#00B4DB', '#FF4B2B'];

export default function HomeScreen({ navigation }) {
  const { user, refresh } = useAuth();
  const [cfg, setCfg] = useState(null);
  const [mostrarReglas, setMostrarReglas] = useState(false);

  // Estado para colores aleatorios del botón JUGAR
  const [paletaActual, setPaletaActual] = useState(0);
  const [bordeActual, setBordeActual] = useState(0);

  // ANIMACIONES
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shineAnim = useRef(new Animated.Value(0)).current;
  const crownBounce = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(1)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const colorFade = useRef(new Animated.Value(1)).current; // Para transición suave de colores
  
  const recargaScale = useRef(new Animated.Value(1)).current;
  const retiroScale = useRef(new Animated.Value(1)).current;
  const navIcon1 = useRef(new Animated.Value(1)).current;
  const navIcon2 = useRef(new Animated.Value(1)).current;
  const navIcon3 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 1200, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }),
      ])
    );
    pulse.start();

    const shine = Animated.loop(
      Animated.timing(shineAnim, { toValue: 1, duration: 2500, easing: Easing.linear, useNativeDriver: true })
    );
    shine.start();

    const crown = Animated.loop(
      Animated.sequence([
        Animated.timing(crownBounce, { toValue: 1, duration: 600, easing: Easing.bounce, useNativeDriver: true }),
        Animated.timing(crownBounce, { toValue: 0, duration: 600, easing: Easing.linear, useNativeDriver: true }),
      ])
    );
    crown.start();

    const logoAnim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(logoScale, { toValue: 1.05, duration: 2000, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(logoRotate, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(logoScale, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(logoRotate, { toValue: 0, duration: 4000, easing: Easing.linear, useNativeDriver: true }),
        ]),
      ])
    );
    logoAnim.start();

    // 🎲 CAMBIO ALEATORIO DE COLORES DEL BOTÓN JUGAR cada 2.5 segundos
    const cambiarColores = setInterval(() => {
      // Fade out
      Animated.timing(colorFade, {
        toValue: 0.3,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        const nuevaPaleta = Math.floor(Math.random() * PALETAS_JUGAR.length);
        const nuevoBorde = Math.floor(Math.random() * COLORES_BORDE.length);
        setPaletaActual(nuevaPaleta);
        setBordeActual(nuevoBorde);
        // Fade in
        Animated.timing(colorFade, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 2500);

    return () => {
      pulse.stop(); shine.stop(); crown.stop(); logoAnim.stop();
      clearInterval(cambiarColores);
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      api.get('/config/public').then(r => setCfg(r.data));
      refresh();
    }, [])
  );

  const animarBoton = (animValue, callback) => {
    Animated.sequence([
      Animated.timing(animValue, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.timing(animValue, { toValue: 1.05, duration: 150, easing: Easing.bounce, useNativeDriver: true }),
      Animated.timing(animValue, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start(() => callback && callback());
  };

  const animarNavIcon = (animValue, callback) => {
    Animated.sequence([
      Animated.timing(animValue, { toValue: 1.3, duration: 150, easing: Easing.bounce, useNativeDriver: true }),
      Animated.timing(animValue, { toValue: 1, duration: 200, easing: Easing.bounce, useNativeDriver: true }),
    ]).start(() => callback && callback());
  };

  if (!user) return null;

  const coloresJugar = PALETAS_JUGAR[paletaActual];
  const colorBordeJugar = COLORES_BORDE[bordeActual];

  return (
    <View style={s.c}>
      {/* FONDO CON COLORES DE BANDERA DOMINICANA */}
      <LinearGradient 
        colors={['#CE1126', '#CE1126', '#fff', '#002D62', '#002D62']} 
        style={s.flagBg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={s.flagCrossV} />
      <View style={s.flagCrossH} />

      {/* MODAL DE REGLAS */}
      <Modal visible={mostrarReglas} animationType="slide" transparent={true}>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>📜 Reglas del Juego</Text>
            <ScrollView style={s.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={s.ruleItem}>1️⃣ El juego es para 2 jugadores. Cada uno recibe 7 fichas.</Text>
              <Text style={s.ruleItem}>2️⃣ Inicia el jugador con el doble más alto (o la ficha más alta).</Text>
              <Text style={s.ruleItem}>3️⃣ Debes colocar una ficha que coincida con los números de los extremos de la mesa.</Text>
              <Text style={s.ruleItem}>4️⃣ Si no tienes fichas jugables, debes <Text style={s.highlight}>ROBAR</Text> del pozo hasta encontrar una.</Text>
              <Text style={s.ruleItem}>5️⃣ Si el pozo está vacío y no tienes fichas jugables, debes <Text style={s.highlight}>PASAR</Text>.</Text>
              
              <Text style={[s.ruleItem, s.ruleWarning]}>
                ⚠️ REGLA DE ORO: Si PASAS teniendo una ficha jugable en tu mano, pierdes la partida automáticamente y tu rival gana el pozo completo.
              </Text>
              
              <Text style={[s.ruleItem, s.ruleWarning]}>
                🚫 REGLA DE ABANDONO: Si te desconectas o sales del juego durante una partida en curso, <Text style={{color: '#fff'}}>perderás tu apuesta automáticamente</Text>. El dinero solo se reembolsa a los jugadores que permanezcan en la mesa.
              </Text>

              <Text style={s.ruleItem}>6️⃣ Gana quien se quede sin fichas primero, o quien tenga menos puntos al cerrar el juego.</Text>
            </ScrollView>
            <TouchableOpacity style={s.modalBtn} onPress={() => { setMostrarReglas(false); navigation.navigate('Lobby'); }}>
              <Text style={s.modalBtnText}>✅ Entendido, Ir al Salón</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CONTENIDO PRINCIPAL */}
      <ScrollView style={s.scrollContent} contentContainerStyle={s.scrollInner} showsVerticalScrollIndicator={false}>
        
        {/* CABECERA DE USUARIO */}
        <View style={s.header}>
          <View style={s.userInfo}>
            <View style={s.avatarContainer}>
              <Image 
                source={{ uri: 'https://i.pravatar.cc/100?u=' + user.email }} 
                style={s.avatar} 
              />
              <View style={s.avatarBorde} />
            </View>
            <View style={s.userDetails}>
              <Text style={s.userName}>{user.nombre}</Text>
              <View style={s.levelRow}>
                <Text style={s.starIcon}>⭐</Text>
                <Text style={s.levelText}>Nivel 3</Text>
              </View>
            </View>
          </View>

          <View style={s.balanceContainer}>
            <View style={s.monedaIcono}>
              <Text style={s.monedaSimbolo}>$</Text>
            </View>
            <Text style={s.balanceText}>{user.saldo.toFixed(2)}</Text>
            <TouchableOpacity style={s.addBtn} onPress={() => navigation.navigate('Wallet', { tab: 'recarga' })}>
              <Text style={s.addText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* LOGO PERSONALIZADO ANIMADO */}
        <Animated.View style={[
          s.logoSection,
          {
            transform: [
              { scale: logoScale },
              { rotate: logoRotate.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '3deg'] }) },
            ],
          }
        ]}>
          <Animated.View style={[
            s.crownContainer,
            {
              transform: [
                { translateY: crownBounce.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) },
                { scale: crownBounce.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) },
              ],
            }
          ]}>
            <Text style={s.crownIcon}>👑</Text>
          </Animated.View>
          
          <Text style={s.logoMain}>DOMINÓ</Text>
          <Text style={s.logoSub}>RD</Text>
          
          <Text style={s.slogan}>Juega • Comparte • Gana</Text>
        </Animated.View>

        {/* 🎲 BOTÓN JUGAR CON COLORES ALEATORIOS */}
        <Animated.View style={[
          s.playWrapper, 
          { 
            transform: [{ scale: pulseAnim }],
            opacity: colorFade,
          }
        ]}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => setMostrarReglas(true)} style={[s.playBtn, { borderColor: colorBordeJugar }]}>
            <LinearGradient colors={coloresJugar} style={s.playGradient}>
              <Animated.View 
                style={[
                  s.shine,
                  { transform: [{ translateX: shineAnim.interpolate({ inputRange: [0, 1], outputRange: [-150, 400] }) }] }
                ]} 
              />
              <Text style={s.playDice}>🎲</Text>
              <Text style={s.playText}>JUGAR</Text>
              <Text style={s.playArrow}>▶</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* TARJETAS DE TRANSACCIÓN */}
        <View style={s.transactionCards}>
          <Animated.View style={[s.cardBtn, { transform: [{ scale: recargaScale }] }]}>
            <TouchableOpacity 
              onPress={() => animarBoton(recargaScale, () => navigation.navigate('Wallet', { tab: 'recarga' }))} 
              activeOpacity={0.9}
            >
              <LinearGradient colors={['#11998e', '#38ef7d']} style={s.cardGradient}>
                <Text style={s.cardIcon}>💳</Text>
                <Text style={s.cardTitle}>Recargar</Text>
                <Text style={s.cardSubtitle}>Añade créditos</Text>
                <Text style={s.cardArrow}>›</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[s.cardBtn, { transform: [{ scale: retiroScale }] }]}>
            <TouchableOpacity 
              onPress={() => animarBoton(retiroScale, () => navigation.navigate('Wallet', { tab: 'retiro' }))} 
              activeOpacity={0.9}
            >
              <LinearGradient colors={['#ee0979', '#ff6a00']} style={s.cardGradient}>
                <Text style={s.cardIcon}>💸</Text>
                <Text style={s.cardTitle}>Retirar</Text>
                <Text style={s.cardSubtitle}>Solicita tu retiro</Text>
                <Text style={s.cardArrow}>›</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* 🎮 PANEL INFERIOR CLÁSICO CON ICONOS GAMER */}
        <View style={s.bottomNavContainer}>
          <View style={s.navBackground}>
            {/* Borde exterior dorado */}
            <View style={s.navBordeExterior}>
              {/* Fondo negro clásico */}
              <View style={s.navInterior}>
                
                {/* INICIO - Icono Gamer 🎮 */}
                <TouchableOpacity style={s.navItem} onPress={() => animarNavIcon(navIcon1, () => navigation.navigate('Home'))}>
                  <Animated.View style={[s.navIconWrapper, { transform: [{ scale: navIcon1 }] }]}>
                    <Text style={s.navIcon}>🎮</Text>
                  </Animated.View>
                  <Text style={[s.navLabel, s.navLabelActive]}>Inicio</Text>
                  <View style={s.navIndicator} />
                </TouchableOpacity>

                {/* BILLETERA - Icono Gamer 💰 */}
                <TouchableOpacity style={s.navItem} onPress={() => animarNavIcon(navIcon2, () => navigation.navigate('Wallet'))}>
                  <Animated.View style={[s.navIconWrapper, { transform: [{ scale: navIcon2 }] }]}>
                    <Text style={s.navIcon}>💰</Text>
                  </Animated.View>
                  <Text style={s.navLabel}>Billetera</Text>
                </TouchableOpacity>

                {/* PERFIL - Icono Gamer */}
                <TouchableOpacity style={s.navItem} onPress={() => animarNavIcon(navIcon3, () => navigation.navigate('Profile'))}>
                  <Animated.View style={[s.navIconWrapper, { transform: [{ scale: navIcon3 }] }]}>
                    <Text style={s.navIcon}>🦸</Text>
                  </Animated.View>
                  <Text style={s.navLabel}>Perfil</Text>
                </TouchableOpacity>

              </View>
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({ 
  c: { flex: 1 },
  
  // FONDO CON COLORES DE BANDERA DOMINICANA
  flagBg: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  flagCrossV: {
    position: 'absolute',
    width: 60, height: '100%',
    backgroundColor: '#fff',
    left: '50%', marginLeft: -30,
    opacity: 0.85,
  },
  flagCrossH: {
    position: 'absolute',
    width: '100%', height: 60,
    backgroundColor: '#fff',
    top: '50%', marginTop: -30,
    opacity: 0.85,
  },

  // SCROLL
  scrollContent: { flex: 1 },
  scrollInner: { paddingBottom: 20 },

  // CABECERA
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    paddingTop: 40,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 10,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  
  avatarContainer: {
    position: 'relative',
    width: 44,
    height: 44,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  avatarBorde: {
    position: 'absolute',
    top: -3, left: -3, right: -3, bottom: -3,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#FFD700',
    opacity: 0.5,
  },
  
  userDetails: { marginLeft: 8 },
  userName: {
    color: '#fff', fontSize: 14, fontWeight: 'bold',
    textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2,
  },
  levelRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  starIcon: { fontSize: 10, marginRight: 3 },
  levelText: { color: '#FFD700', fontSize: 11, fontWeight: 'bold' },
  
  balanceContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 2, borderColor: '#FFD700',
  },
  monedaIcono: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#FFD700',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 6,
    borderWidth: 1, borderColor: '#B8860B',
  },
  monedaSimbolo: {
    color: '#000', fontWeight: '900', fontSize: 13,
  },
  balanceText: {
    color: '#00FF00', fontSize: 14, fontWeight: '900',
    marginRight: 6,
    textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2,
  },
  addBtn: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#2ecc71', justifyContent: 'center', alignItems: 'center',
  },
  addText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  // LOGO ANIMADO
  logoSection: { alignItems: 'center', marginTop: 5, zIndex: 10 },
  crownContainer: { marginBottom: -8 },
  crownIcon: {
    fontSize: 38,
    textShadowColor: '#FFD700', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8,
  },
  logoMain: {
    fontSize: 44, fontWeight: '900', color: '#FFD700',
    textShadowColor: '#000', textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 6,
    letterSpacing: 2,
  },
  logoSub: {
    fontSize: 32, fontWeight: '900', color: '#fff', marginTop: -12,
    textShadowColor: '#000', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 5,
  },
  slogan: {
    color: '#fff', fontSize: 13, marginTop: 5, letterSpacing: 1, fontWeight: '700',
    textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2,
  },

  // 🎲 BOTÓN JUGAR CON COLORES ALEATORIOS
  playWrapper: {
    marginHorizontal: 25, marginTop: 10, marginBottom: 10,
    shadowColor: '#FFD700', shadowOpacity: 0.9, shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 }, elevation: 15, zIndex: 10,
  },
  playBtn: {
    borderRadius: 30, overflow: 'hidden', borderWidth: 3,
  },
  playGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 30,
  },
  playDice: { fontSize: 26, marginRight: 8 },
  playText: {
    fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: 3,
    textShadowColor: '#000', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4,
  },
  playArrow: {
    fontSize: 24, color: '#fff', marginLeft: 8, fontWeight: 'bold',
  },
  shine: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.3)',
    transform: [{ skewX: '-20deg' }], width: 40,
  },

  // TARJETAS DE TRANSACCIÓN
  transactionCards: {
    flexDirection: 'row', paddingHorizontal: 15, marginBottom: 15, zIndex: 10,
  },
  cardBtn: {
    flex: 1, marginHorizontal: 5, borderRadius: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  cardGradient: {
    padding: 15, borderRadius: 18, alignItems: 'center', position: 'relative',
  },
  cardIcon: { fontSize: 30, marginBottom: 5 },
  cardTitle: {
    color: '#fff', fontSize: 17, fontWeight: 'bold', marginBottom: 3,
    textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2,
  },
  cardSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 11 },
  cardArrow: {
    position: 'absolute', right: 10, top: '50%', marginTop: -15,
    fontSize: 24, color: '#fff',
  },

  // 🎮 PANEL INFERIOR CLÁSICO CON BORDES DORADOS
  bottomNavContainer: {
    paddingHorizontal: 15,
    marginBottom: 15,
    zIndex: 10,
  },
  navBackground: {
    borderRadius: 30,
    padding: 3,
    backgroundColor: '#FFD700', // Borde dorado exterior
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 15,
  },
  navBordeExterior: {
    borderRadius: 28,
    padding: 2,
    backgroundColor: '#B8860B', // Borde dorado oscuro medio
  },
  navInterior: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 26,
    backgroundColor: '#0a0f1c', // Fondo negro clásico
    borderWidth: 1,
    borderColor: '#1a2332', // Borde interior sutil
  },
  navItem: {
    alignItems: 'center', flex: 1, paddingVertical: 5, position: 'relative',
  },
  navIconWrapper: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#1a2332', // Fondo oscuro para el icono
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4, 
    borderWidth: 2, 
    borderColor: '#FFD700', // Borde dorado del círculo
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  navIcon: { fontSize: 28 },
  navLabel: {
    color: '#aaa', fontSize: 12, fontWeight: '600',
    textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2,
  },
  navLabelActive: {
    color: '#FFD700', fontWeight: 'bold',
  },
  navIndicator: {
    position: 'absolute', bottom: -2,
    width: 40, height: 3, backgroundColor: '#FFD700', borderRadius: 2,
  },

  // MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1a5c2e', width: '100%', maxWidth: 400, borderRadius: 20, padding: 20, borderWidth: 2, borderColor: '#FFD700' },
  modalTitle: { color: '#FFD700', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 15 },
  modalScroll: { maxHeight: 350, marginBottom: 20 }, // Aumenté un poco la altura para que quepa bien la nueva regla
  ruleItem: { color: '#fff', fontSize: 14, marginBottom: 12, lineHeight: 20 },
  highlight: { color: '#FFD700', fontWeight: 'bold' },
  ruleWarning: { color: '#ff6b6b', fontWeight: 'bold', borderWidth: 1, borderColor: '#ff6b6b', padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,107,107,0.1)' },
  modalBtn: { backgroundColor: '#FFD700', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: '#B8860B' },
  modalBtnText: { color: '#000', fontSize: 16, fontWeight: '900' }
});