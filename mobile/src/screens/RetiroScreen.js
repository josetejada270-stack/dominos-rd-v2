import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../api';
import { useAuth } from '../../App';

export default function RetiroScreen({ navigation }) {
  const { user, refresh } = useAuth();
  const [d, setD] = useState({ monto: '', banco: '', cuenta: '', titular: '' });
  const [hist, setHist] = useState([]);

  useEffect(() => { 
    api.get('/wallet/transactions').then(r => setHist(r.data.filter(t => t.tipo === 'RETIRO'))); 
  }, []);

  const enviarRetiro = async () => {
    if (!d.monto || !d.banco || !d.cuenta || !d.titular) return Alert.alert('Completa todos los datos');
    try { 
      await api.post('/wallet/withdraw', d); 
      Alert.alert('✅ Solicitado', 'El admin procesará tu retiro.'); 
      refresh(); 
      setD({ monto: '', banco: '', cuenta: '', titular: '' }); 
      api.get('/wallet/transactions').then(r => setHist(r.data.filter(t => t.tipo === 'RETIRO')));
    } catch (e) { 
      Alert.alert('Error', e.response?.data?.error || 'Falló'); 
    }
  };

  return (
    <ScrollView style={s.c} showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Retirar</Text>
        <View style={{ width: 80 }} />
      </View>

      <View style={s.balanceCard}>
        <Text style={s.balanceLabel}>Saldo Disponible</Text>
        <Text style={s.balanceValue}>RD$ {user.saldo.toFixed(2)}</Text>
      </View>

      <View style={[s.card, s.formCard]}>
        <View style={s.cardHeader}>
          <Text style={s.cardIcon}>💸</Text>
          <Text style={s.cardTitle}>Solicitar Retiro</Text>
        </View>
        
        <Text style={s.label}>Monto a retirar (RD$)</Text>
        <TextInput style={s.input} keyboardType="numeric" value={d.monto} onChangeText={v => setD({ ...d, monto: v })} placeholder="0.00" placeholderTextColor="#666" />
        
        <Text style={s.label}>Banco destino</Text>
        <TextInput style={s.input} value={d.banco} onChangeText={v => setD({ ...d, banco: v })} placeholder="Ej: Banreservas, BHD..." placeholderTextColor="#666" />
        
        <Text style={s.label}>Nº de cuenta</Text>
        <TextInput style={s.input} keyboardType="numeric" value={d.cuenta} onChangeText={v => setD({ ...d, cuenta: v })} placeholderTextColor="#666" />
        
        <Text style={s.label}>Nombre del titular</Text>
        <TextInput style={s.input} value={d.titular} onChangeText={v => setD({ ...d, titular: v })} placeholderTextColor="#666" />

        <TouchableOpacity style={s.submitBtn} onPress={enviarRetiro} activeOpacity={0.8}>
          <LinearGradient colors={['#e74c3c', '#c0392b']} style={s.submitGradient}>
            <Text style={s.submitText}>SOLICITAR RETIRO</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardIcon}>📊</Text>
          <Text style={s.cardTitle}>Historial de Retiros</Text>
        </View>
        {hist.length === 0 ? (
          <Text style={s.emptyText}>Sin movimientos recientes.</Text>
        ) : (
          hist.slice(0, 5).map(t => (
            <View key={t.id} style={s.histRow}>
              <Text style={s.histType}>Retiro · RD$ {t.monto}</Text>
              <Text style={[s.histStatus, t.estado === 'APROBADO' ? s.ok : t.estado === 'RECHAZADO' ? s.no : s.pen]}>{t.estado}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#0f1626', padding: 16, paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backBtn: { backgroundColor: 'rgba(255,215,0,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#FFD700' },
  backText: { color: '#FFD700', fontWeight: 'bold', fontSize: 13 },
  headerTitle: { color: '#fff', fontWeight: '900', fontSize: 18 },
  balanceCard: { backgroundColor: '#1a2332', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: '#FFD700', shadowColor: '#FFD700', shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  balanceLabel: { color: '#aaa', fontSize: 14 },
  balanceValue: { color: '#2ecc71', fontSize: 28, fontWeight: '900' },
  card: { backgroundColor: '#1a2332', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 2, borderColor: '#2a3454' },
  formCard: { borderColor: '#e74c3c', shadowColor: '#e74c3c', shadowOpacity: 0.2, shadowRadius: 10, elevation: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardIcon: { fontSize: 22, marginRight: 8 },
  cardTitle: { color: '#FFD700', fontWeight: '900', fontSize: 16 },
  label: { color: '#ccc', fontSize: 13, marginTop: 12, marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: '#0f1626', borderRadius: 12, padding: 14, color: '#fff', borderWidth: 2, borderColor: '#2a3454', fontSize: 15 },
  submitBtn: { marginTop: 20, borderRadius: 25, overflow: 'hidden', shadowColor: '#e74c3c', shadowOpacity: 0.5, shadowRadius: 10, elevation: 8 },
  submitGradient: { paddingVertical: 16, alignItems: 'center', borderRadius: 25 },
  submitText: { color: '#fff', fontWeight: '900', letterSpacing: 2, fontSize: 15 },
  emptyText: { color: '#666', textAlign: 'center', paddingVertical: 10 },
  histRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a3454' },
  histType: { color: '#fff', fontWeight: 'bold' },
  histStatus: { fontWeight: 'bold', fontSize: 12, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ok: { backgroundColor: 'rgba(46,204,113,0.2)', color: '#2ecc71', borderColor: '#2ecc71', borderWidth: 1 },
  no: { backgroundColor: 'rgba(231,76,60,0.2)', color: '#e74c3c', borderColor: '#e74c3c', borderWidth: 1 },
  pen: { backgroundColor: 'rgba(241,196,15,0.2)', color: '#f1c40f', borderColor: '#f1c40f', borderWidth: 1 }
});