import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';

export default function Live() {
  const router = useRouter();
  return <SafeAreaView style={s.safe}><View style={s.page}><Pressable onPress={() => router.back()} style={s.back}><I name="back" color="#FFF" size={30} /></Pressable><View style={s.center}><Text style={{ fontSize: 64 }}>✦</Text><Text style={s.title}>No live streams yet</Text><Text style={s.text}>Published live sessions will appear here when creators go live.</Text><Pressable onPress={() => router.push('/create')} style={s.button}><Text style={s.buttonText}>Create a post</Text></Pressable></View></View></SafeAreaView>;
}
const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#111' }, page: { flex: 1, backgroundColor: C.plum, padding: 18 }, back: { width: 43, height: 43, borderRadius: 22, backgroundColor: 'rgba(0,0,0,.3)', alignItems: 'center', justifyContent: 'center' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 25 }, title: { fontSize: 26, fontWeight: '900', color: '#FFF', marginTop: 10, textAlign: 'center' }, text: { color: '#F3E8EE', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7 }, button: { marginTop: 18, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 22, backgroundColor: C.sun }, buttonText: { fontWeight: '900' } });