import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../api';
import { useAuth } from '../../App';

export default function WalletScreen({ navigation, route }) {
  const { user, refresh } = useAuth();
  const [tab, setTab] = useState(route.params?.tab || 'recarga');
  const [cfg, setCfg] = useState(null);
  const [hist, setHist] = useState([]);
  const [metodoPago, setMetodoPago] = useState('banco');
  
  const [d, setD] = useState({ 
    monto: '', 
    referencia: '', 
    banco: '', 
    cuenta: '', 
    titular: '',
    red: '',
    moneda: '',
    wallet: ''
  });
  const [comp, setComp] = useState(null);

  useEffect(() => { 
    api.get('/config/public').then(r => setCfg(r.data)); 
    cargarHist(); 
  }, []);
  
  const cargarHist = () => api.get('/wallet/transactions').then(r => setHist(r.data));

  const pick = async () => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync(); 
    if (!p.granted) return Alert.alert('Permiso requerido');
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.6 });
    if (!r.canceled) setComp(r.assets[0]);
  };

  const enviarDeposito = async () => {
    if (!d.monto) return Alert.alert('Falta el monto');
    
    if (metodoPago === 'banco') {
      if (!comp) return Alert.alert('Falta el comprobante');
      const fd = new FormData();
      fd.append('monto', d.monto); 
      fd.append('referencia', d.referencia);
      fd.append('metodo', 'banco');
      fd.append('comprobante', { uri: comp.uri, type: comp.mimeType || 'image/jpeg', name: 'comprobante.jpg' });
      try { 
        await api.post('/wallet/deposit', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); 
        Alert.alert('✅ Enviado', 'Espera a que el admin apruebe tu recarga.'); 
        setD({ monto: '', referencia: '', banco: '', cuenta: '', titular: '', red: '', moneda: '', wallet: '' }); 
        setComp(null); 
        cargarHist(); 
      } catch (e) { 
        Alert.alert('Error', e.response?.data?.error || 'Falló'); 
      }
    } else {
      if (!d.red || !d.moneda || !d.wallet) return Alert.alert('Completa todos los campos de cripto');
      try {
        await api.post('/wallet/deposit', {
          monto: d.monto,
          metodo: 'crypto',
          red: d.red,
          moneda: d.moneda,
          wallet: d.wallet,
          referencia: d.referencia
        });
        Alert.alert('✅ Enviado', 'Espera a que el admin apruebe tu recarga cripto.');
        setD({ ...d, monto: '', referencia: '' });
        cargarHist();
      } catch (e) {
        Alert.alert('Error', e.response?.data?.error || 'Falló');
      }
    }
  };
  
  const enviarRetiro = async () => {
    if (!d.monto) return Alert.alert('Falta el monto');
    if (metodoPago === 'banco' && (!d.banco || !d.cuenta || !d.titular)) return Alert.alert('Completa todos los datos bancarios');
    if (metodoPago === 'crypto' && (!d.red || !d.wallet)) return Alert.alert('Completa la red y la dirección de la wallet');
    
    try { 
      const payload = { 
        monto: d.monto, 
        metodo: metodoPago,
        ...(metodoPago === 'banco' ? { banco: d.banco, cuenta: d.cuenta, titular: d.titular } : { red: d.red, wallet: d.wallet })
      };
      await api.post('/wallet/withdraw', payload); 
      Alert.alert('✅ Solicitado', 'El admin procesará tu retiro.'); 
      refresh(); 
      setD({ ...d, monto: '' }); 
      cargarHist(); 
    } catch (e) { 
      Alert.alert('Error', e.response?.data?.error || 'Falló'); 
    }
  };

  return (
    <View style={s.c}>
      <LinearGradient colors={['#1a2332', '#0f1626']} style={s.head}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={s.title}>Billetera</Text>
        <View style={s.chip}>
          <Text style={s.chipIcon}></Text>
          <Text style={s.chipT}>RD$ {user.saldo.toFixed(2)}</Text>
        </View>
      </LinearGradient>

      <View style={s.bigButtons}>
        <TouchableOpacity onPress={() => { setTab('recarga'); setMetodoPago('banco'); }} activeOpacity={0.9}>
          <LinearGradient 
            colors={tab === 'recarga' ? ['#2ecc71', '#27ae60'] : ['#1a2332', '#1a2332']} 
            style={[s.bigBtn, tab !== 'recarga' && { borderWidth: 2, borderColor: '#2a3454' }]}
          >
            <Text style={s.bigBtnIcon}>💳</Text>
            <Text style={[s.bigBtnText, tab === 'recarga' && s.bigBtnTextActive]}>Recargar</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { setTab('retiro'); setMetodoPago('banco'); }} activeOpacity={0.9}>
          <LinearGradient 
            colors={tab === 'retiro' ? ['#e74c3c', '#c0392b'] : ['#1a2332', '#1a2332']} 
            style={[s.bigBtn, tab !== 'retiro' && { borderWidth: 2, borderColor: '#2a3454' }]}
          >
            <Text style={s.bigBtnIcon}>💸</Text>
            <Text style={[s.bigBtnText, tab === 'retiro' && s.bigBtnTextActive]}>Retirar</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        
        {tab === 'recarga' && (
          <View>
            <View style={s.metodoSelector}>
              <TouchableOpacity 
                style={[s.metodoBtn, metodoPago === 'banco' && s.metodoBtnActivo]} 
                onPress={() => setMetodoPago('banco')}
              >
                <Text style={[s.metodoText, metodoPago === 'banco' && s.metodoTextActivo]}>🏦 Banco</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[s.metodoBtn, metodoPago === 'crypto' && s.metodoBtnActivo]} 
                onPress={() => setMetodoPago('crypto')}
              >
                <Text style={[s.metodoText, metodoPago === 'crypto' && s.metodoTextActivo]}>₿ Cripto</Text>
              </TouchableOpacity>
            </View>

            {metodoPago === 'banco' ? (
              <View>
                {cfg && cfg.cuentaAdmin && (
                  <View style={s.cardRecarga}>
                    <View style={s.cardHeader}>
                      <Text style={s.cardIcon}>🏦</Text>
                      <Text style={s.cardTitle}>Cuenta Destino</Text>
                    </View>
                    <Text style={s.cardSubtitle}>Transfiere aquí tu dinero</Text>
                    <View style={s.bankBox}>
                      <Text style={s.bankName}>{cfg.cuentaAdmin.banco}</Text>
                    </View>
                    <Fila l="Cuenta" v={cfg.cuentaAdmin.cuenta} />
                    <Fila l="Titular" v={cfg.cuentaAdmin.titular} />
                    <Fila l="Tipo" v={cfg.cuentaAdmin.tipo} />
                  </View>
                )}

                <View style={s.cardForm}>
                  <View style={s.cardHeader}>
                    <Text style={s.cardIcon}>✅</Text>
                    <Text style={s.cardTitle}>Confirmar Depósito</Text>
                  </View>
                  <Text style={s.label}>Monto transferido (RD$)</Text>
                  <TextInput style={s.input} keyboardType="numeric" value={d.monto} onChangeText={v => setD({ ...d, monto: v })} placeholder="0.00" placeholderTextColor="#666" />
                  <Text style={s.label}>Nº de referencia</Text>
                  <TextInput style={s.input} value={d.referencia} onChangeText={v => setD({ ...d, referencia: v })} placeholder="Ej: 0012345678" placeholderTextColor="#666" />
                  <Text style={s.label}>Comprobante</Text>
                  <TouchableOpacity style={s.uploadBox} onPress={pick}>
                    <Text style={s.uploadIcon}>{comp ? '✅' : '📎'}</Text>
                    <Text style={s.uploadText}>{comp ? 'Imagen seleccionada' : 'Toca para subir JPG, PNG o PDF'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.submitBtnRecarga} onPress={enviarDeposito} activeOpacity={0.8}>
                    <LinearGradient colors={['#2ecc71', '#27ae60']} style={s.submitGradient}>
                      <Text style={s.submitText}>ENVIAR SOLICITUD</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={s.cardCrypto}>
                <View style={s.cardHeader}>
                  <Text style={s.cardIcon}>₿</Text>
                  <Text style={s.cardTitle}>Depósito en Criptomonedas</Text>
                </View>
                <Text style={s.cardSubtitle}>Completa los datos de tu transacción cripto</Text>

                <Text style={s.label}>💱 Moneda Cripto</Text>
                <View style={s.cryptoSelector}>
                  {['USDT', 'BTC', 'ETH', 'BNB'].map(moneda => (
                    <TouchableOpacity 
                      key={moneda}
                      style={[s.cryptoOption, d.moneda === moneda && s.cryptoOptionActive]}
                      onPress={() => setD({ ...d, moneda })}
                    >
                      <Text style={[s.cryptoOptionText, d.moneda === moneda && s.cryptoOptionTextActive]}>
                        {moneda === 'USDT' ? '💵' : moneda === 'BTC' ? '₿' : moneda === 'ETH' ? '⟠' : '🔶'} {moneda}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.label}>🔗 Red de la Blockchain</Text>
                <View style={s.cryptoSelector}>
                  {['TRC20', 'BEP20', 'ERC20', 'SOL'].map(red => (
                    <TouchableOpacity 
                      key={red}
                      style={[s.cryptoOption, d.red === red && s.cryptoOptionActive]}
                      onPress={() => setD({ ...d, red })}
                    >
                      <Text style={[s.cryptoOptionText, d.red === red && s.cryptoOptionTextActive]}>
                        {red}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.label}>💰 Monto a depositar</Text>
                <TextInput 
                  style={s.input} 
                  keyboardType="numeric" 
                  value={d.monto} 
                  onChangeText={v => setD({ ...d, monto: v })} 
                  placeholder="Ej: 50.00 (en USD o equivalente)" 
                  placeholderTextColor="#666" 
                />

                <Text style={s.label}>📍 Dirección de Wallet destino</Text>
                <TextInput 
                  style={s.input} 
                  value={d.wallet} 
                  onChangeText={v => setD({ ...d, wallet: v })} 
                  placeholder="Pega la dirección de wallet del admin" 
                  placeholderTextColor="#666" 
                />

                <Text style={s.label}>🔑 TxID / Hash de transacción (opcional)</Text>
                <TextInput 
                  style={s.input} 
                  value={d.referencia} 
                  onChangeText={v => setD({ ...d, referencia: v })} 
                  placeholder="ID de la transacción en blockchain" 
                  placeholderTextColor="#666" 
                />

                <Text style={s.label}>📸 Comprobante (Captura de pantalla)</Text>
                <TouchableOpacity style={s.uploadBox} onPress={pick}>
                  <Text style={s.uploadIcon}>{comp ? '✅' : '📎'}</Text>
                  <Text style={s.uploadText}>{comp ? 'Imagen seleccionada' : 'Toca para subir captura'}</Text>
                </TouchableOpacity>

                <View style={s.warningBox}>
                  <Text style={s.warningText}>⚠️ Verifica que la red sea correcta. Las transacciones en blockchain son irreversibles.</Text>
                </View>

                <TouchableOpacity style={s.submitBtnCrypto} onPress={enviarDeposito} activeOpacity={0.8}>
                  <LinearGradient colors={['#F7971E', '#FFD200']} style={s.submitGradient}>
                    <Text style={s.submitText}>ENVIAR DEPÓSITO CRIPTO</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {tab === 'retiro' && (
          <View>
            <View style={s.metodoSelector}>
              <TouchableOpacity 
                style={[s.metodoBtn, metodoPago === 'banco' && s.metodoBtnActivo]} 
                onPress={() => setMetodoPago('banco')}
              >
                <Text style={[s.metodoText, metodoPago === 'banco' && s.metodoTextActivo]}> Banco</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[s.metodoBtn, metodoPago === 'crypto' && s.metodoBtnActivo]} 
                onPress={() => setMetodoPago('crypto')}
              >
                <Text style={[s.metodoText, metodoPago === 'crypto' && s.metodoTextActivo]}>₿ Cripto</Text>
              </TouchableOpacity>
            </View>

            <View style={[s.cardFormRetiro, { borderColor: metodoPago === 'crypto' ? '#F7971E' : '#e74c3c' }]}>
              <View style={s.cardHeader}>
                <Text style={s.cardIcon}>{metodoPago === 'crypto' ? '₿' : '💸'}</Text>
                <Text style={s.cardTitle}>Solicitar Retiro {metodoPago === 'crypto' ? 'Cripto' : 'Bancario'}</Text>
              </View>
              
              <Text style={s.label}>Monto a retirar (RD$)</Text>
              <TextInput style={s.input} keyboardType="numeric" value={d.monto} onChangeText={v => setD({ ...d, monto: v })} placeholder="0.00" placeholderTextColor="#666" />
              
              {metodoPago === 'banco' ? (
                <>
                  <Text style={s.label}>Banco destino</Text>
                  <TextInput style={s.input} value={d.banco} onChangeText={v => setD({ ...d, banco: v })} placeholder="Ej: Banreservas, BHD..." placeholderTextColor="#666" />
                  <Text style={s.label}>Nº de cuenta</Text>
                  <TextInput style={s.input} keyboardType="numeric" value={d.cuenta} onChangeText={v => setD({ ...d, cuenta: v })} placeholderTextColor="#666" />
                  <Text style={s.label}>Nombre del titular</Text>
                  <TextInput style={s.input} value={d.titular} onChangeText={v => setD({ ...d, titular: v })} placeholderTextColor="#666" />
                </>
              ) : (
                <>
                  <Text style={s.label}>Red de la Blockchain</Text>
                  <TextInput style={s.input} value={d.red} onChangeText={v => setD({ ...d, red: v })} placeholder="Ej: TRC20, BEP20, ERC20" placeholderTextColor="#666" />
                  <Text style={s.label}>Dirección de tu Wallet</Text>
                  <TextInput style={s.input} value={d.wallet} onChangeText={v => setD({ ...d, wallet: v })} placeholder="Pega tu dirección de wallet aquí" placeholderTextColor="#666" />
                  <Text style={s.warningText}>⚠️ Asegúrate de que la red sea correcta. Las transacciones en blockchain son irreversibles.</Text>
                </>
              )}

              <TouchableOpacity style={s.submitBtnRetiro} onPress={enviarRetiro} activeOpacity={0.8}>
                <LinearGradient colors={metodoPago === 'crypto' ? ['#F7971E', '#FFD200'] : ['#e74c3c', '#c0392b']} style={s.submitGradient}>
                  <Text style={s.submitText}>SOLICITAR RETIRO</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={s.cardHistorial}>
          <View style={s.cardHeader}>
            <Text style={s.cardIcon}>📊</Text>
            <Text style={s.cardTitle}>Historial</Text>
          </View>
          {hist.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyIcon}></Text>
              <Text style={s.emptyText}>Sin movimientos aún</Text>
            </View>
          ) : (
            hist.map(t => (
              <View key={t.id} style={s.histRow}>
                <View style={s.histLeft}>
                  <Text style={s.histIcon}>{t.tipo === 'DEPOSITO' ? '️' : '⬆️'}</Text>
                  <View>
                    <Text style={s.histType}>{t.tipo === 'DEPOSITO' ? 'Recarga' : 'Retiro'} {t.metodo === 'crypto' ? '(Cripto)' : ''}</Text>
                    <Text style={s.histAmount}>RD$ {t.monto}</Text>
                  </View>
                </View>
                <View style={[s.histStatus, t.estado === 'APROBADO' ? s.statusOk : t.estado === 'RECHAZADO' ? s.statusNo : s.statusPen]}>
                  <Text style={[s.histStatusText, t.estado === 'APROBADO' ? s.statusTextOk : t.estado === 'RECHAZADO' ? s.statusTextNo : s.statusTextPen]}>{t.estado}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const Fila = ({ l, v }) => (
  <View style={s.fila}>
    <Text style={s.filaLabel}>{l}</Text>
    <Text style={s.filaValue}>{v}</Text>
  </View>
);

const s = StyleSheet.create({ 
  c: { flex: 1, backgroundColor: '#0f1626' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 50, borderBottomWidth: 2, borderBottomColor: '#FFD700' },
  backBtn: { backgroundColor: 'rgba(255,215,0,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#FFD700' },
  backText: { color: '#FFD700', fontWeight: 'bold', fontSize: 13 },
  title: { color: '#fff', fontWeight: '900', fontSize: 18 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,215,0,0.15)', borderWidth: 2, borderColor: '#FFD700', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipIcon: { fontSize: 14, marginRight: 4 },
  chipT: { color: '#FFD700', fontWeight: '900', fontSize: 13 },
  bigButtons: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 15, gap: 10 },
  bigBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 20, flex: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  bigBtnIcon: { fontSize: 28, marginRight: 8 },
  bigBtnText: { color: '#aaa', fontWeight: 'bold', fontSize: 16 },
  bigBtnTextActive: { color: '#fff', fontWeight: '900', fontSize: 17 },
  scroll: { flex: 1, paddingHorizontal: 15, paddingBottom: 20 },
  metodoSelector: { flexDirection: 'row', backgroundColor: '#1a2332', borderRadius: 16, padding: 4, marginBottom: 15, borderWidth: 1, borderColor: '#2a3454' },
  metodoBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  metodoBtnActivo: { backgroundColor: '#FFD700' },
  metodoText: { color: '#aaa', fontWeight: 'bold', fontSize: 14 },
  metodoTextActivo: { color: '#000', fontWeight: '900' },
  cardRecarga: { backgroundColor: '#1a2332', borderRadius: 20, padding: 18, marginBottom: 15, borderWidth: 2, borderColor: '#FFD700', shadowColor: '#FFD700', shadowOpacity: 0.3, shadowRadius: 15, elevation: 10 },
  cardForm: { backgroundColor: '#1a2332', borderRadius: 20, padding: 18, marginBottom: 15, borderWidth: 2, borderColor: '#00B4DB', shadowColor: '#00B4DB', shadowOpacity: 0.3, shadowRadius: 15, elevation: 10 },
  cardCrypto: { backgroundColor: '#1a2332', borderRadius: 20, padding: 18, marginBottom: 15, borderWidth: 2, borderColor: '#F7971E', shadowColor: '#F7971E', shadowOpacity: 0.3, shadowRadius: 15, elevation: 10 },
  cardFormRetiro: { backgroundColor: '#1a2332', borderRadius: 20, padding: 18, marginBottom: 15, borderWidth: 2, shadowOpacity: 0.3, shadowRadius: 15, elevation: 10 },
  cardHistorial: { backgroundColor: '#1a2332', borderRadius: 20, padding: 18, marginBottom: 15, borderWidth: 2, borderColor: '#8E2DE2', shadowColor: '#8E2DE2', shadowOpacity: 0.3, shadowRadius: 15, elevation: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardIcon: { fontSize: 24, marginRight: 8 },
  cardTitle: { color: '#FFD700', fontWeight: '900', fontSize: 18 },
  cardSubtitle: { color: '#aaa', fontSize: 13, marginBottom: 15, fontStyle: 'italic' },
  bankBox: { backgroundColor: '#0f1626', padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 2, borderColor: '#2ecc71' },
  bankName: { color: '#2ecc71', fontWeight: '900', fontSize: 16, textAlign: 'center' },
  cryptoSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  cryptoOption: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#0f1626', borderWidth: 2, borderColor: '#2a3454' },
  cryptoOptionActive: { backgroundColor: '#F7971E', borderColor: '#FFD200' },
  cryptoOptionText: { color: '#aaa', fontWeight: 'bold', fontSize: 13 },
  cryptoOptionTextActive: { color: '#000', fontWeight: '900' },
  warningBox: { backgroundColor: 'rgba(255,107,107,0.1)', padding: 12, borderRadius: 12, marginTop: 15, borderWidth: 1, borderColor: '#ff6b6b' },
  warningText: { color: '#ff6b6b', fontSize: 12, fontStyle: 'italic' },
  fila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a3454' },
  filaLabel: { color: '#aaa', fontSize: 13 },
  filaValue: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  label: { color: '#ccc', fontSize: 13, marginTop: 12, marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: '#0f1626', borderRadius: 12, padding: 14, color: '#fff', borderWidth: 2, borderColor: '#2a3454', fontSize: 15 },
  uploadBox: { backgroundColor: '#0f1626', borderRadius: 12, padding: 18, borderWidth: 2, borderColor: '#FFD700', borderStyle: 'dashed', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 8 },
  uploadIcon: { fontSize: 20 },
  uploadText: { color: '#aaa', fontSize: 13 },
  submitBtnRecarga: { marginTop: 20, borderRadius: 25, overflow: 'hidden', shadowColor: '#2ecc71', shadowOpacity: 0.6, shadowRadius: 15, elevation: 10 },
  submitBtnCrypto: { marginTop: 20, borderRadius: 25, overflow: 'hidden', shadowColor: '#F7971E', shadowOpacity: 0.6, shadowRadius: 15, elevation: 10 },
  submitBtnRetiro: { marginTop: 20, borderRadius: 25, overflow: 'hidden', shadowOpacity: 0.6, shadowRadius: 15, elevation: 10 },
  submitGradient: { paddingVertical: 16, alignItems: 'center', borderRadius: 25 },
  submitText: { color: '#fff', fontWeight: '900', letterSpacing: 2, fontSize: 15 },
  emptyBox: { alignItems: 'center', paddingVertical: 30 },
  emptyIcon: { fontSize: 48, marginBottom: 10 },
  emptyText: { color: '#666', fontSize: 14 },
  histRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2a3454' },
  histLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  histIcon: { fontSize: 24 },
  histType: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  histAmount: { color: '#FFD700', fontWeight: '900', fontSize: 13 },
  histStatus: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  statusOk: { backgroundColor: 'rgba(46,204,113,0.2)', borderColor: '#2ecc71' },
  statusNo: { backgroundColor: 'rgba(231,76,60,0.2)', borderColor: '#e74c3c' },
  statusPen: { backgroundColor: 'rgba(241,196,15,0.2)', borderColor: '#f1c40f' },
  histStatusText: { fontWeight: '900', fontSize: 11 },
  statusTextOk: { color: '#2ecc71' },
  statusTextNo: { color: '#e74c3c' },
  statusTextPen: { color: '#f1c40f' }
});