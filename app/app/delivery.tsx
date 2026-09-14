import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { api } from '../lib/api';

type Quote = { provider?: string; status?: string; liveQuote?: number | null; etaMinutes?: number | null; message?: string };
type Order = { id: string; fulfillmentStatus?: string; status?: string; address?: { label?: string; details?: string } };

export default function Delivery() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      if (orderId) {
        const response = await api<{ order?: Order }>(`/api/orders/${String(orderId)}`);
        setOrder(response.order || null);
      }
      const response = await api<{ quote?: Quote }>(`/api/orders/${String(orderId || 'latest')}/delivery`);
      setQuote(response.quote || null);
    } catch { setError(true); setQuote(null); } finally { setLoading(false); }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);
  const quoteText = loading ? 'Getting delivery quote...' : quote?.liveQuote ? 'GH₵ ' + quote.liveQuote : 'Delivery quote unavailable';
  const etaText = quote?.etaMinutes ? 'About ' + quote.etaMinutes + ' min' : 'ETA will appear once a rider is assigned';

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.scroll}>
    <View style={styles.top}><Pressable onPress={() => router.back()}><I name="back" size={34} /></Pressable><Text style={styles.heading}>Yango delivery</Text><View style={{ width: 34 }} /></View>
    <View style={styles.map}><View style={styles.mapGrid} /><View style={styles.route} /><View style={styles.sellerPin}><Text style={styles.pinText}>S</Text></View><View style={styles.buyerPin}><I name="location" size={20} color="#FFF" /></View><View style={styles.mapLabel}><Text style={styles.mapLabelTitle}>Live route</Text><Text style={styles.muted}>Seller → buyer</Text></View></View>
    <View style={styles.card}><View style={styles.statusRow}><View><Text style={styles.kicker}>DELIVERY STATUS</Text><Text style={styles.title}>{order?.fulfillmentStatus === 'delivered' ? 'Delivered' : 'Waiting for rider'}</Text></View><View style={styles.live}><Text style={styles.liveText}>YANGO</Text></View></View>
      <View style={styles.quote}><View style={styles.quoteIcon}><I name="location" size={20} color={C.pink} /></View><View style={{ flex: 1 }}><Text style={styles.quoteTitle}>{quoteText}</Text><Text style={styles.muted}>{error ? 'The delivery provider is unavailable right now.' : quote?.message || 'Live pricing comes from the delivery provider.'}</Text></View>{loading && <ActivityIndicator color={C.pink} />}</View>
      <View style={styles.infoRow}><View><Text style={styles.kicker}>ETA</Text><Text style={styles.infoValue}>{etaText}</Text></View><View><Text style={styles.kicker}>DESTINATION</Text><Text style={styles.infoValue}>{order?.address?.label || 'Buyer location'}</Text></View></View>
      {error && <Pressable onPress={load} style={styles.retry}><Text style={styles.retryText}>Retry delivery quote</Text></Pressable>}
      {!loading && !error && !quote?.liveQuote && <Text style={styles.note}>Delivery quote unavailable. We will keep the screen available and retry when the provider is configured.</Text>}
      <Pressable onPress={() => router.push('/orders')} style={styles.track}><Text style={styles.trackText}>View tracking</Text><I name="arrow" size={18} color="#FFF" /></Pressable>
    </View>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.bg }, scroll: { padding: 18, paddingBottom: 32 }, top: { height: 55, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, heading: { fontSize: 20, fontWeight: '900' }, map: { height: 300, borderRadius: 34, backgroundColor: '#F2DDBB', overflow: 'hidden', position: 'relative' }, mapGrid: { ...StyleSheet.absoluteFillObject, opacity: 0.35, backgroundColor: '#EBCB9A' }, route: { position: 'absolute', left: 70, top: 145, width: 220, height: 6, backgroundColor: C.pink, transform: [{ rotate: '-20deg' }], borderRadius: 4 }, sellerPin: { position: 'absolute', left: 52, top: 128, width: 42, height: 42, borderRadius: 21, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }, buyerPin: { position: 'absolute', right: 48, bottom: 52, width: 42, height: 42, borderRadius: 21, backgroundColor: C.plum, alignItems: 'center', justifyContent: 'center' }, pinText: { color: '#FFF', fontWeight: '900' }, mapLabel: { position: 'absolute', left: 15, bottom: 15, backgroundColor: '#FFF', padding: 12, borderRadius: 18 }, mapLabelTitle: { fontWeight: '900' }, card: { marginTop: -20, borderRadius: 30, backgroundColor: '#FFF', padding: 20, borderWidth: 1, borderColor: C.line }, statusRow: { flexDirection: 'row', justifyContent: 'space-between' }, kicker: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2, color: C.muted }, title: { fontSize: 22, fontWeight: '900', marginTop: 5 }, live: { backgroundColor: C.rose, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 13, alignSelf: 'flex-start' }, liveText: { fontSize: 9, fontWeight: '900' }, quote: { marginTop: 22, padding: 15, borderRadius: 22, backgroundColor: C.mint, flexDirection: 'row', alignItems: 'center', gap: 10 }, quoteIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }, quoteTitle: { fontWeight: '900', fontSize: 15 }, muted: { fontSize: 11, color: C.muted, marginTop: 4 }, infoRow: { marginTop: 20, flexDirection: 'row', justifyContent: 'space-between', gap: 18 }, infoValue: { fontSize: 12, fontWeight: '800', marginTop: 5, maxWidth: 145 }, note: { color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 17 }, retry: { height: 46, borderRadius: 23, borderWidth: 1, borderColor: C.pink, alignItems: 'center', justifyContent: 'center', marginTop: 18 }, retryText: { color: C.pink, fontWeight: '900' }, track: { height: 52, borderRadius: 26, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 20 }, trackText: { color: '#FFF', fontWeight: '900' } });
