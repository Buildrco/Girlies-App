import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { api } from '../lib/api';

type Order = { id: string; status?: string; paymentStatus?: string; fulfillmentStatus?: string; createdAt?: string };

export default function Orders() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState('');
  useEffect(() => { if (!orderId) return; api<{ order?: Order }>(`/api/orders/${String(orderId)}`).then(response => setOrder(response.order || null)).catch(err => setError(err instanceof Error ? err.message : 'Could not load this order.')).finally(() => setLoading(false)); }, [orderId]);
  const status = order?.fulfillmentStatus || order?.status || 'awaiting_payment';
  const paid = order?.paymentStatus === 'paid' || order?.status === 'paid';
  const steps = [['✓', paid ? 'Payment confirmed' : 'Awaiting payment'], ['○', 'Seller preparing'], ['○', 'Rider assigned'], ['○', 'On the way'], ['○', 'Delivered']];
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.scroll}><View style={styles.top}><Pressable onPress={() => router.back()}><I name="back" size={34} /></Pressable><Text style={styles.heading}>Orders</Text><View style={{ width: 34 }} /></View>
    {loading ? <View style={styles.center}><ActivityIndicator color={C.pink} /><Text style={styles.muted}>Loading order…</Text></View> : error ? <View style={styles.empty}><Text style={styles.title}>Order unavailable</Text><Text style={styles.muted}>{error}</Text></View> : !order ? <View style={styles.empty}><Text style={styles.title}>No active order yet</Text><Text style={styles.muted}>Complete checkout to see payment and delivery updates here.</Text><Pressable onPress={() => router.push('/shop')} style={styles.primary}><Text style={styles.primaryText}>Browse the shop</Text></Pressable></View> : <><View style={styles.card}><Text style={styles.kicker}>ORDER #{order.id.slice(0, 8).toUpperCase()}</Text><Text style={styles.title}>{status === 'delivered' ? 'Your order is delivered' : status === 'awaiting_payment' ? 'Payment is still pending' : 'Your order is moving'}</Text>{steps.map((step, index) => <View key={step[1]} style={styles.timeline}><View style={[styles.icon, index === 0 && paid ? styles.activeIcon : null]}><Text style={{ color: index === 0 && paid ? '#FFF' : C.muted, fontWeight: '900' }}>{step[0]}</Text></View><View style={{ flex: 1 }}><Text style={{ fontWeight: index === 0 && paid ? '900' : '700', fontSize: 13 }}>{step[1]}</Text><Text style={styles.muted}>{index === 0 && paid ? 'Confirmed by the payment provider' : 'Waiting for an update'}</Text></View>{index < 4 && <View style={styles.vertical} />}</View>)}</View><Pressable onPress={() => router.push({ pathname: '/delivery', params: { orderId: order.id } })} style={styles.primary}><Text style={styles.primaryText}>Open Yango delivery</Text><I name="arrow" size={18} color="#FFF" /></Pressable></>}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.bg }, scroll: { padding: 18, paddingBottom: 32 }, top: { height: 55, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, heading: { fontSize: 20, fontWeight: '900' }, center: { minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: 10 }, empty: { marginTop: 60, padding: 24, backgroundColor: '#FFF', borderRadius: 30, alignItems: 'center', borderWidth: 1, borderColor: C.line }, card: { borderRadius: 30, backgroundColor: '#FFF', padding: 20, borderWidth: 1, borderColor: C.line }, kicker: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2, color: C.muted }, title: { fontSize: 21, fontWeight: '900', marginTop: 7, textAlign: 'center' }, muted: { fontSize: 11, color: C.muted, marginTop: 5, textAlign: 'center', lineHeight: 16 }, timeline: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11, position: 'relative' }, icon: { width: 29, height: 29, borderRadius: 15, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' }, activeIcon: { backgroundColor: C.green }, vertical: { position: 'absolute', left: 13, top: 42, width: 2, height: 30, backgroundColor: C.line }, primary: { minHeight: 52, borderRadius: 26, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 18, paddingHorizontal: 18 }, primaryText: { color: '#FFF', fontWeight: '900' } });
