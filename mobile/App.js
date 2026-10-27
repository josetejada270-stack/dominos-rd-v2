import React, { createContext, useContext, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { api, setToken, getToken } from './api';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import LobbyScreen from './src/screens/LobbyScreen';
import GameTableScreen from './src/screens/GameTableScreen';
import WalletScreen from './src/screens/WalletScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const AuthCtx = createContext({});
export const useAuth = () => useContext(AuthCtx);

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    const t = await getToken();
    if (t) { try { const r = await api.get('/me'); setUser(r.data.usuario); } catch { await setToken(null); } }
    setLoading(false);
  })(); }, []);

  const login = async (tok, u) => { await setToken(tok); setUser(u); };
  const logout = async () => { await setToken(null); setUser(null); };
  const refresh = async () => { const r = await api.get('/me'); setUser(r.data.usuario); };

  if (loading) return <View style={{ flex: 1, backgroundColor: '#0f1626', justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color="#FFD700" size="large" /></View>;

  return (
    <AuthCtx.Provider value={{ user, login, logout, refresh }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0f1626' } }}>
          {!user && <Stack.Screen name="Login" component={LoginScreen} />}
          {user && <Stack.Screen name="Home" component={HomeScreen} />}
          {user && <Stack.Screen name="Lobby" component={LobbyScreen} />}
          {user && <Stack.Screen name="Game" component={GameTableScreen} />}
          {user && <Stack.Screen name="Wallet" component={WalletScreen} />}
          {user && <Stack.Screen name="Profile" component={ProfileScreen} />}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthCtx.Provider>
  );
}