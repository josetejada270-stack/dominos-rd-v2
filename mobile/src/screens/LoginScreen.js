import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { api } from '../../api';
import { useAuth } from '../../App';

export default function LoginScreen() {
  const { login } = useAuth();
  const [modo, setModo] = useState('login');
  const [f, setF] = useState({ nombre: '', email: '', password: '', telefono: '' });
  const go = async () => {
    try {
      const r = modo === 'login' ? await api.post('/auth/login', f) : await api.post('/auth/register', f);
      login(r.data.token, r.data.usuario);
    } catch (e) { Alert.alert('Error', e.response?.data?.error || 'Revisa tus datos'); }
  };
  return (
    <View style={s.box}>
      <Text style={s.logo}>🎲 Dominó RD$</Text>
      <Text style={s.sub}>{modo === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}</Text>
      {modo === 'register' && <TextInput style={s.in} placeholder="Nombre" value={f.nombre} onChangeText={v => setF({ ...f, nombre: v })} />}
      <TextInput style={s.in} placeholder="Email" autoCapitalize="none" value={f.email} onChangeText={v => setF({ ...f, email: v })} />
      {modo === 'register' && <TextInput style={s.in} placeholder="Teléfono" value={f.telefono} onChangeText={v => setF({ ...f, telefono: v })} />}
      <TextInput style={s.in} placeholder="Contraseña" secureTextEntry value={f.password} onChangeText={v => setF({ ...f, password: v })} />
      <TouchableOpacity style={s.btn} onPress={go}><Text style={s.btnT}>{modo === 'login' ? 'ENTRAR' : 'REGISTRARME'}</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => setModo(modo === 'login' ? 'register' : 'login')}><Text style={s.link}>{modo === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Entra'}</Text></TouchableOpacity>
    </View>
  );
}
const s = StyleSheet.create({ box: { flex: 1, backgroundColor: '#0f1626', justifyContent: 'center', padding: 30 }, logo: { color: '#FFD700', fontSize: 34, fontWeight: 'bold', textAlign: 'center' }, sub: { color: '#aaa', textAlign: 'center', marginBottom: 24 }, in: { backgroundColor: '#1a2238', color: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#2a3454' }, btn: { backgroundColor: '#FFD700', padding: 16, borderRadius: 30, alignItems: 'center', marginTop: 8 }, btnT: { color: '#5a2d00', fontWeight: 'bold', fontSize: 16 }, link: { color: '#FFD700', textAlign: 'center', marginTop: 16 } });