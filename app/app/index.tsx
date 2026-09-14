import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { C } from '../constants/theme';
import { getCurrentUser } from '../lib/auth';

export default function Index() {
  const [route, setRoute] = useState<'loading' | 'home' | 'login'>('loading');
  useEffect(() => { let mounted = true; getCurrentUser().then(user => { if (mounted) setRoute(user ? 'home' : 'login'); }).catch(() => { if (mounted) setRoute('login'); }); return () => { mounted = false; }; }, []);
  if (route === 'loading') return <View style={styles.loading}><ActivityIndicator size="large" color={C.pink} /></View>;
  return <Redirect href={route === 'home' ? '/home' : '/login'} />;
}
const styles = StyleSheet.create({ loading: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' } });
