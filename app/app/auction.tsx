import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { getProducts, getSessionUser, type ProductRecord } from '../lib/social';
import { supabase } from '../lib/supabase';

export default function Auction() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; productId?: string }>();
  const selectedId = String(params.productId || params.id || '');
  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [currentBid, setCurrentBid] = useState(0);
  const [minimumIncrement, setMinimumIncrement] = useState(10);
  const [status, setStatus] = useState('live');
  const [loading, setLoading] = useState(true);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');
    setServiceUnavailable(false);
    try {
      if (!selectedId) throw new Error('No product was selected.');
      const rows = await getProducts(1, { productId: selectedId });
      const selected = rows[0];
      if (!selected) throw new Error('This product is no longer available.');
      const { data: bid, error: bidError } = await supabase
        .from('bids')
        .select('amount')
        .eq('product_id', selected.id)
        .order('amount', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (bidError) throw bidError;
      setProduct(selected);
      setCurrentBid(Number(bid?.amount || selected.price || 0));
      setStatus('live');
    } catch (error) {
      setProduct(null);
      setServiceUnavailable(true);
      setMessage(error instanceof Error ? error.message : 'The auction could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => { void load(); }, [load]);

  async function placeBid() {
    if (!product) return;
    setSubmitting(true);
    setMessage('');
    try {
      const user = await getSessionUser();
      if (!user) throw new Error('Sign in before placing a bid.');
      const amount = currentBid + minimumIncrement;
      const { data, error } = await supabase.from('bids')
        .insert({ product_id: product.id, bidder_id: user.id, amount })
        .select('amount')
        .single();
      if (error) throw error;
      setCurrentBid(Number(data.amount));
      setServiceUnavailable(false);
      setMessage('Bid accepted. The auction result will be determined from the live bids.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Your bid could not be placed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator color={C.pink} /><Text style={styles.muted}>Loading auction…</Text></View></SafeAreaView>;
  if (!product) return <SafeAreaView style={styles.safe}><View style={styles.center}><Text style={styles.title}>Auction unavailable</Text><Text style={styles.muted}>{message}</Text><Pressable onPress={load} style={styles.retry}><Text style={styles.retryText}>Retry connection</Text></Pressable></View></SafeAreaView>;

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.scroll}><View style={styles.top}><Pressable onPress={() => router.back()}><I name="back" size={34} /></Pressable><Text style={styles.heading}>Live auction</Text><View style={{ width: 34 }} /></View><View style={styles.art}><Text style={{ fontSize: 82 }}>👗</Text><View style={styles.live}><Text style={styles.liveText}>{status.toUpperCase()}</Text></View></View><View style={styles.card}><Text style={styles.kicker}>{product.store?.name || 'GIRLIES SELLER'}</Text><Text style={styles.title}>{product.name}</Text>{serviceUnavailable ? <View style={styles.warning}><Text style={styles.warningTitle}>Auction connection unavailable</Text><Text style={styles.muted}>{message}</Text><Pressable onPress={load} style={styles.retry}><Text style={styles.retryText}>Retry connection</Text></Pressable></View> : null}<Text style={styles.label}>CURRENT BID</Text><Text style={styles.price}>GH₵ {currentBid.toFixed(0)}</Text><Text style={styles.muted}>Minimum next bid: GH₵ {minimumIncrement.toFixed(0)}</Text>{message && !serviceUnavailable ? <View style={styles.confirm}><Text style={styles.confirmText}>{message}</Text></View> : null}<Pressable disabled={submitting} onPress={placeBid} style={[styles.bid, submitting && { opacity: 0.5 }]}>{submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.bidText}>Place bid · GH₵ {(currentBid + minimumIncrement).toFixed(0)}</Text>}</Pressable></View></ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.bg }, scroll: { padding: 18, paddingBottom: 30 }, top: { height: 55, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, heading: { fontSize: 20, fontWeight: '900' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 }, art: { height: 220, borderRadius: 30, backgroundColor: C.plum, alignItems: 'center', justifyContent: 'center' }, live: { marginTop: 10, backgroundColor: C.coral, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16 }, liveText: { color: '#FFF', fontSize: 10, fontWeight: '900' }, card: { marginTop: -18, borderRadius: 30, backgroundColor: '#FFF', padding: 20, borderWidth: 1, borderColor: C.line }, kicker: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2, color: C.muted }, title: { fontSize: 25, fontWeight: '900', marginTop: 8, textAlign: 'center' }, label: { fontSize: 10, fontWeight: '900', color: C.muted, letterSpacing: 1.1, marginTop: 24 }, price: { fontSize: 34, fontWeight: '900', marginTop: 5 }, muted: { fontSize: 11, color: C.muted, marginTop: 5, lineHeight: 16, textAlign: 'center' }, warning: { marginTop: 18, padding: 14, borderRadius: 18, backgroundColor: C.rose }, warningTitle: { fontWeight: '900' }, retry: { height: 42, borderRadius: 21, borderWidth: 1, borderColor: C.pink, alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingHorizontal: 18 }, retryText: { color: C.pink, fontWeight: '900' }, confirm: { marginTop: 16, padding: 13, borderRadius: 17, backgroundColor: C.mint }, confirmText: { fontSize: 11, fontWeight: '800', lineHeight: 16 }, bid: { height: 54, borderRadius: 27, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', marginTop: 20 }, bidText: { color: '#FFF', fontWeight: '900', fontSize: 15 } });