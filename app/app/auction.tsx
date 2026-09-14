import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { api } from '../lib/api';

export default function Auction() {
  const router = useRouter();
  const { id, productId } = useLocalSearchParams<{ id?: string; productId?: string }>();
  const auctionProductId = String(productId || id || 'p1');
  const [bid, setBid] = useState(520);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');

  async function placeBid() {
    const amount = bid + 10;
    setSubmitting(true); setError(''); setConfirmation('');
    try {
      const response = await api<{ bid: { amount: number } }>(`/api/auctions/${auctionProductId}/bids`, { method: 'POST', body: JSON.stringify({ userId: 'u1', amount }) });
      setBid(response.bid.amount);
      setConfirmation('Bid accepted. The auction result will be determined by the server.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your bid could not be placed.');
    } finally { setSubmitting(false); }
  }

  return <SafeAreaView style={styles.safe}><View style={styles.top}><Pressable onPress={() => router.back()}><I name="back" size={34} /></Pressable><Text style={styles.heading}>Live auction</Text><I name="more" /></View>
    <View style={styles.art}><Text style={{ fontSize: 85 }}>👗</Text><View style={styles.live}><Text style={styles.liveText}>LIVE</Text></View></View>
    <View style={styles.body}><Text style={styles.kicker}>NIA HAIR · VERIFIED</Text><Text style={styles.title}>Luxury body wave wig</Text><Text style={styles.timer}>00 : 18 : 42</Text><Text style={styles.label}>CURRENT BID</Text><Text style={styles.price}>GH₵ {bid}</Text><Text style={styles.meta}>Server-validated bids · Minimum increment GH₵ 10</Text>
      <View style={styles.bidRow}><Pressable onPress={() => setBid(Math.max(450, bid - 10))} style={styles.minus}><Text style={{ fontSize: 22 }}>−</Text></Pressable><View style={styles.current}><Text style={{ fontWeight: '900' }}>GH₵ {bid + 10}</Text></View><Pressable onPress={() => setBid(bid + 10)} style={styles.plus}><Text style={{ color: '#FFF', fontSize: 22 }}>+</Text></Pressable></View>
      {confirmation ? <View style={styles.confirm}><Text style={styles.confirmTitle}>Bid submitted</Text><Text style={styles.confirmText}>{confirmation}</Text></View> : null}
      {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}
      <Pressable disabled={submitting} onPress={placeBid} style={[styles.btn, submitting && { opacity: 0.55 }]}>{submitting ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: '900' }}>Place GH₵ {bid + 10} bid</Text>}</Pressable>
      <Text style={styles.note}>If you win, you’ll be asked to confirm your delivery address before payment.</Text></View></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.bg }, top: { height: 70, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, heading: { fontSize: 20, fontWeight: '900' }, art: { height: 330, margin: 18, borderRadius: 34, backgroundColor: C.lilac, alignItems: 'center', justifyContent: 'center', position: 'relative' }, live: { position: 'absolute', top: 15, right: 15, backgroundColor: C.coral, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 }, liveText: { fontSize: 9, fontWeight: '900' }, body: { padding: 20 }, kicker: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2, color: C.muted }, title: { fontSize: 27, fontWeight: '900', marginTop: 6 }, timer: { fontSize: 25, fontWeight: '900', marginTop: 15, color: C.pink }, label: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2, color: C.muted, marginTop: 18 }, price: { fontSize: 33, fontWeight: '900' }, meta: { fontSize: 11, color: C.muted, marginTop: 4 }, bidRow: { flexDirection: 'row', gap: 8, marginTop: 17 }, minus: { width: 52, height: 48, borderRadius: 20, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line }, current: { flex: 1, height: 48, borderRadius: 20, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' }, plus: { width: 52, height: 48, borderRadius: 20, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }, btn: { height: 54, borderRadius: 27, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center', marginTop: 12 }, confirm: { marginTop: 14, padding: 13, borderRadius: 18, backgroundColor: C.mint }, confirmTitle: { fontWeight: '900' }, confirmText: { color: C.muted, fontSize: 11, marginTop: 3, lineHeight: 16 }, error: { marginTop: 14, padding: 13, borderRadius: 18, backgroundColor: C.rose }, errorText: { color: C.plum, fontSize: 11, lineHeight: 16 }, note: { fontSize: 10, color: C.muted, textAlign: 'center', marginTop: 12, lineHeight: 15 } });
