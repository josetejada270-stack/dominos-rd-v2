import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useAuth } from '../../App';
import { closeSocket } from '../../socket';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const salir = async () => { closeSocket(); await logout(); };
  return (
    <View style={s.c}>
      <Text style={s.h}>Perfil</Text>
      <View style={s.card}><Image source={{ uri: 'https://i.pravatar.cc/120?u=' + user.email }} style={s.av} /><Text style={s.n}>{user.nombre}</Text><Text style={s.e}>{user.email}</Text><View style={s.bal}><Text style={s.balT}>Saldo: RD$ {user.saldo.toFixed(2)}</Text></View></View>
      <TouchableOpacity style={s.item} onPress={() => navigation.navigate('Wallet')}><Text style={s.itemT}>💳 Billetera y movimientos</Text></TouchableOpacity>
      <TouchableOpacity style={[s.item, { borderColor: '#e74c3c' }]} onPress={salir}><Text style={[s.itemT, { color: '#e74c3c' }]}>🚪 Cerrar sesión</Text></TouchableOpacity>
    </View>
  );
}
const s = StyleSheet.create({ c: { flex: 1, backgroundColor: '#0f1626', padding: 16, paddingTop: 50 }, h: { color: '#FFD700', fontSize: 22, fontWeight: 'bold', marginBottom: 16 }, card: { backgroundColor: '#1a2238', borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#2a3454' }, av: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#FFD700' }, n: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 10 }, e: { color: '#aaa', marginTop: 2 }, bal: { backgroundColor: '#0f1626', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, marginTop: 12 }, balT: { color: '#2ecc71', fontWeight: 'bold' }, item: { backgroundColor: '#1a2238', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#2a3454' }, itemT: { color: '#fff', fontWeight: '600' } });