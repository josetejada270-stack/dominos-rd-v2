import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../api';
import { useAuth } from '../../App';

export default function RecargaScreen({ navigation }) {
  const { user, refresh } = useAuth();
  const [cfg, setCfg] = useState(null);
  const [d, setD] = useState({ monto: '', referencia: '' });
  const [comp, setComp] = useState(null);
  const [hist, setHist] = useState([]);

  useEffect(() => { 
    api.get('/config/public').then(r => setCfg(r.data)); 
    api.get('/wallet/transactions').then(r => setHist(r.data.filter(t => t.tipo === 'DEPOSITO'))); 
  }, []);

  const pick = async () => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync(); 
    if (!p.granted) return Alert.alert('Permiso requerido');
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.6 });
    if (!r.canceled) setComp(r.assets[0]);
  };

  const enviarDeposito = async () => {
    if (!d.monto || !comp) return Alert.alert('Falta monto o comprobante');
    const fd = new FormData();
    fd.append('monto', d.monto); 
    fd.append('referencia', d.referencia);
    fd.append('comprobante', { uri: comp.uri, type: comp.mimeType || 'image/jpeg', name: 'comprobante.jpg' });
    try { 
      await api.post('/wallet/deposit', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); 
      Alert.alert('✅ Enviado', 'Espera a que el admin apruebe tu recarga.'); 
      setD({ monto: '', referencia: '' }); 
      setComp(null); 
      refresh();
      api.get('/wallet/transactions').then(r => setHist(r.data.filter(t => t.tipo === 'DEPOSITO')));
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
        <Text style={s.headerTitle}>Recargar</Text>
        <View style={{ width: 80 }} />
      </View>

      <View style={s.balanceCard}>
        <Text style={s.balanceLabel}>Saldo Actual</Text>
        <Text style={s.balanceValue}>RD$ {user.saldo.toFixed(2)}</Text>
      </View>

      {cfg && (
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardIcon}>🏦</Text>
            <Text style={s.cardTitle}>Cuenta Destino</Text>
          </View>
          <Text style={s.cardSubtitle}>Transfiere exactamente este monto</Text>
          <View style={s.bankBox}>
            <Text style={s.bankName}>{cfg.cuentaAdmin.banco}</Text>
          </View>
          <Fila l="Cuenta" v={cfg.cuentaAdmin.cuenta} />
          <Fila l="Titular" v={cfg.cuentaAdmin.titular} />
          <Fila l="Tipo" v={cfg.cuentaAdmin.tipo} />
        </View>
      )}

      <View style={[s.card, s.formCard]}>
        <View style={s.cardHeader}>
          <Text style={s.cardIcon}>✅</Text>
          <Text style={s.cardTitle}>Confirmar Depósito</Text>
        </View>
        
        <Text style={s.label}>Monto transferido (RD$)</Text>
        <TextInput style={s.input} keyboardType="numeric" value={d.monto} onChangeText={v => setD({ ...d, monto: v })} placeholder="0.00" placeholderTextColor="#666" />
        
        <Text style={s.label}>Nº de referencia</Text>
        <TextInput style={s.input} value={d.referencia} onChangeText={v => setD({ ...d, referencia: v })} placeholder="Ej: 0012345678" placeholderTextColor="#666" />
        
        <Text style={s.label}>Comprobante de pago</Text>
        <TouchableOpacity style={s.uploadBox} onPress={pick}>
          <Text style={s.uploadIcon}>{comp ? '✅' : '📎'}</Text>
          <Text style={s.uploadText}>{comp ? 'Imagen seleccionada' : 'Toca para subir JPG, PNG o PDF'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.submitBtn} onPress={enviarDeposito} activeOpacity={0.8}>
          <LinearGradient colors={['#2ecc71', '#27ae60']} style={s.submitGradient}>
            <Text style={s.submitText}>ENVIAR SOLICITUD</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardIcon}>📊</Text>
          <Text style={s.cardTitle}>Historial de Recargas</Text>
        </View>
        {hist.length === 0 ? (
          <Text style={s.emptyText}>Sin movimientos recientes.</Text>
        ) : (
          hist.slice(0, 5).map(t => (
            <View key={t.id} style={s.histRow}>
              <Text style={s.histType}>Recarga · RD$ {t.monto}</Text>
              <Text style={[s.histStatus, t.estado === 'APROBADO' ? s.ok : t.estado === 'RECHAZADO' ? s.no : s.pen]}>{t.estado}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const Fila = ({ l, v }) => (<View style={s.fila}><Text style={s.filaLabel}>{l}</Text><Text style={s.filaValue}>{v}</Text></View>);

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
  formCard: { borderColor: '#00B4DB', shadowColor: '#00B4DB', shadowOpacity: 0.2, shadowRadius: 10, elevation: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardIcon: { fontSize: 22, marginRight: 8 },
  cardTitle: { color: '#FFD700', fontWeight: '900', fontSize: 16 },
  cardSubtitle: { color: '#aaa', fontSize: 12, marginBottom: 12, fontStyle: 'italic' },
  bankBox: { backgroundColor: '#0f1626', padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 2, borderColor: '#2ecc71' },
  bankName: { color: '#2ecc71', fontWeight: '900', fontSize: 16, textAlign: 'center' },
  fila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a3454' },
  filaLabel: { color: '#aaa', fontSize: 13 },
  filaValue: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  label: { color: '#ccc', fontSize: 13, marginTop: 12, marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: '#0f1626', borderRadius: 12, padding: 14, color: '#fff', borderWidth: 2, borderColor: '#2a3454', fontSize: 15 },
  uploadBox: { backgroundColor: '#0f1626', borderRadius: 12, padding: 18, borderWidth: 2, borderColor: '#FFD700', borderStyle: 'dashed', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 4 },
  uploadIcon: { fontSize: 20 },
  uploadText: { color: '#aaa', fontSize: 13 },
  submitBtn: { marginTop: 20, borderRadius: 25, overflow: 'hidden', shadowColor: '#2ecc71', shadowOpacity: 0.5, shadowRadius: 10, elevation: 8 },
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