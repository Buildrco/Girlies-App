import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { getSellerDashboard } from '../lib/social';

export default function Analytics() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    getSellerDashboard().then(setDashboard).catch((loadError: any) => setError(loadError?.message || 'Could not load store analytics.')).finally(() => setLoading(false));
  }, []);
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.scroll}>
    <View style={s.top}><Pressable onPress={() => router.back()}><I name="back" size={34} /></Pressable><Text style={s.h}>Analytics</Text><Text style={s.range}>LIVE</Text></View>
    {loading ? <View style={s.state}><ActivityIndicator color={C.pink} /></View> : error ? <View style={s.state}><Text style={s.title}>{error}</Text></View> : !dashboard ? <View style={s.state}><Text style={s.title}>No store yet</Text><Text style={s.muted}>Create a store to see seller analytics.</Text></View> : <>
      <View style={s.hero}><Text style={s.k}>STORE PERFORMANCE</Text><Text style={s.big}>GH₵ {dashboard.revenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Text><Text style={s.mutedLight}>Recorded order subtotal</Text></View>
      <View style={s.stats}><View style={s.stat}><Text style={s.num}>{dashboard.productCount}</Text><Text style={s.label}>Products</Text></View><View style={s.stat}><Text style={s.num}>{dashboard.orderCount}</Text><Text style={s.label}>Orders</Text></View><View style={s.stat}><Text style={s.num}>—</Text><Text style={s.label}>Profile visits</Text></View><View style={s.stat}><Text style={s.num}>—</Text><Text style={s.label}>Conversion</Text></View></View>
      <View style={s.empty}><Text style={s.title}>Detailed traffic analytics unavailable</Text><Text style={s.muted}>The current database stores products and orders, but not view or conversion events. No estimates are shown here.</Text></View>
    </>}
  </ScrollView></SafeAreaView>;
}
const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.bg }, scroll: { padding: 18 }, top: { height: 55, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, h: { fontSize: 20, fontWeight: '900' }, range: { fontSize: 10, fontWeight: '900', backgroundColor: C.cream, padding: 8, borderRadius: 13 }, hero: { marginTop: 12, padding: 20, borderRadius: 30, backgroundColor: C.plum }, k: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2, color: C.sun }, big: { fontSize: 34, fontWeight: '900', color: '#FFF', marginTop: 7 }, mutedLight: { fontSize: 11, color: '#EADDE4', marginTop: 3 }, stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 12 }, stat: { width: '48%', padding: 16, borderRadius: 23, backgroundColor: '#FFF' }, num: { fontSize: 18, fontWeight: '900' }, label: { fontSize: 10, color: C.muted, marginTop: 3 }, state: { marginTop: 55, padding: 25, borderRadius: 28, backgroundColor: '#FFF', alignItems: 'center' }, empty: { marginTop: 15, padding: 20, borderRadius: 24, backgroundColor: '#FFF' }, title: { fontSize: 17, fontWeight: '900', textAlign: 'center' }, muted: { fontSize: 12, lineHeight: 18, color: C.muted, textAlign: 'center', marginTop: 6 } });