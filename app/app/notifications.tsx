import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { getSessionUser } from '../lib/social';

export default function Notifications() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let active = true;
    getSessionUser().then(user => {
      if (active) {
        setSignedIn(Boolean(user));
        setLoading(false);
      }
    }).catch(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return <SafeAreaView style={s.safe}>
    <ScrollView contentContainerStyle={s.scroll}>
      <View style={s.top}><Pressable onPress={() => router.back()}><I name="back" size={34} /></Pressable><Text style={s.h}>Notifications</Text><View style={{ width: 45 }} /></View>
      {loading ? <View style={s.state}><ActivityIndicator color={C.pink} /></View> : !signedIn ? <View style={s.state}><Text style={s.title}>Sign in to see notifications</Text><Text style={s.muted}>Activity for your account will appear here.</Text><Pressable onPress={() => router.push('/login')} style={s.button}><Text style={s.buttonText}>Sign in</Text></Pressable></View> : <View style={s.state}><Text style={{ fontSize: 40 }}>✦</Text><Text style={s.title}>You’re all caught up</Text><Text style={s.muted}>New activity will appear here when someone follows, likes or messages you.</Text></View>}
    </ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 18 },
  top: { height: 55, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h: { fontSize: 20, fontWeight: '900' },
  state: { marginTop: 55, padding: 26, borderRadius: 28, backgroundColor: '#FFF', alignItems: 'center', borderWidth: 1, borderColor: C.line },
  title: { fontSize: 18, fontWeight: '900', textAlign: 'center', marginTop: 8 },
  muted: { fontSize: 12, lineHeight: 18, color: C.muted, textAlign: 'center', marginTop: 6 },
  button: { marginTop: 16, paddingHorizontal: 22, paddingVertical: 11, borderRadius: 22, backgroundColor: C.ink },
  buttonText: { color: '#FFF', fontWeight: '900' },
});