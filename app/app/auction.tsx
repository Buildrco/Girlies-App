import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
  const [currentBidderId, setCurrentBidderId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [endsIn, setEndsIn] = useState('');
  const [minimumIncrement, setMinimumIncrement] = useState(10);
  const [status, setStatus] = useState('live');
  const [loading, setLoading] = useState(true);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [bidAmount, setBidAmount] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');
    setServiceUnavailable(false);
    try {
      if (!selectedId) throw new Error('No product was selected.');
      const currentUser = await getSessionUser();
      setCurrentUserId(currentUser?.id || null);
      const rows = await getProducts(1, { productId: selectedId });
      const selected = rows[0];
      if (!selected) throw new Error('This product is no longer available.');
      const { data: bid, error: bidError } = await supabase
        .from('bids')
        .select('amount,bidder_id')
        .eq('product_id', selected.id)
        .order('amount', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (bidError) throw bidError;
      setProduct(selected);
       setCurrentBid(Number(bid?.amount || selected.bid_min_price || selected.price || 0));
       setCurrentBidderId(bid?.bidder_id || null);
       setBidAmount(String(Number(bid?.amount || selected.bid_min_price || selected.price || 0) + minimumIncrement));
       setStatus(selected.bid_ends_at && new Date(selected.bid_ends_at).getTime() <= Date.now() ? 'ended' : 'live');
    } catch (error) {
      setProduct(null);
      setServiceUnavailable(true);
      setMessage(error instanceof Error ? error.message : 'The auction could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!product?.bid_ends_at) return;
    const update = () => {
      const remaining = new Date(product.bid_ends_at as string).getTime() - Date.now();
      if (remaining <= 0) { setEndsIn('Ended'); setStatus('ended'); return; }
      const totalSeconds = Math.floor(remaining / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      setEndsIn(`${days ? `${days}d ` : ''}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [product?.bid_ends_at]);

  async function placeBid() {
    if (!product) return;
    setSubmitting(true);
    setMessage('');
    try {
      const user = await getSessionUser();
      if (!user) throw new Error('Sign in before placing a bid.');
       const amount = Number(bidAmount);
       if (!Number.isFinite(amount) || amount <= currentBid) throw new Error(`Your bid must be higher than GH₵ ${currentBid.toFixed(0)}.`);
      const { data, error } = await supabase.from('bids')
        .insert({ product_id: product.id, bidder_id: user.id, amount })
        .select('amount')
        .single();
      if (error) throw error;
       setCurrentBid(Number(data.amount));
       setCurrentBidderId(user.id);
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

    return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.scroll}><View style={styles.top}><Pressable onPress={() => router.back()}><I name="back" size={34} /></Pressable><Text style={styles.heading}>Live auction</Text><View style={{ width: 34 }} /></View><View style={styles.art}>{product.image_urls?.[0] ? <Image source={{ uri: product.image_urls[0] }} style={styles.artImage} /> : <Text style={{ fontSize: 82 }}>👗</Text>}<View style={styles.live}><Text style={styles.liveText}>{status.toUpperCase()}</Text></View></View><View style={styles.card}><Text style={styles.kicker}>{product.store?.name || 'GIRLIES SELLER'}</Text><Text style={styles.title}>{product.name}</Text>{serviceUnavailable ? <View style={styles.warning}><Text style={styles.warningTitle}>Auction connection unavailable</Text><Text style={styles.muted}>{message}</Text><Pressable onPress={load} style={styles.retry}><Text style={styles.retryText}>Retry connection</Text></Pressable></View> : null}<Text style={styles.label}>HIGHEST BID SO FAR</Text><Text style={styles.price}>GH₵ {currentBid.toFixed(0)}</Text>{currentUserId && currentBidderId === currentUserId && status !== 'ended' ? <Text style={styles.highest}>You’re the highest bidder. Would you like to bid higher?</Text> : null}{product.bid_ends_at && <Text style={styles.muted}>{status === 'ended' ? `Ended ${new Date(product.bid_ends_at).toLocaleString()}` : `Ends in ${endsIn} · ${new Date(product.bid_ends_at).toLocaleString()}`}</Text>}{status !== 'ended' && <><Text style={styles.label}>YOUR BID</Text><TextInput value={bidAmount} onChangeText={setBidAmount} keyboardType="decimal-pad" style={styles.bidInput} placeholder={`More than GH₵ ${currentBid.toFixed(0)}`} placeholderTextColor={C.muted} /></>}{message && !serviceUnavailable ? <View style={styles.confirm}><Text style={styles.confirmText}>{message}</Text></View> : null}<Pressable disabled={submitting || status === 'ended'} onPress={placeBid} style={[styles.bid, (submitting || status === 'ended') && { opacity: 0.5 }]}>{submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.bidText}>{status === 'ended' ? `Final highest bid · GH₵ ${currentBid.toFixed(0)}` : 'Place bid'}</Text>}</Pressable></View></ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.bg }, scroll: { padding: 18, paddingBottom: 30 }, top: { height: 55, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, heading: { fontSize: 20, fontWeight: '900' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 }, art: { height: 220, borderRadius: 30, backgroundColor: C.plum, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, artImage: { width: '100%', height: '100%', resizeMode: 'cover' }, live: { marginTop: 10, backgroundColor: C.coral, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16 }, liveText: { color: '#FFF', fontSize: 10, fontWeight: '900' }, card: { marginTop: -18, borderRadius: 30, backgroundColor: '#FFF', padding: 20, borderWidth: 1, borderColor: C.line }, kicker: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2, color: C.muted }, title: { fontSize: 25, fontWeight: '900', marginTop: 8, textAlign: 'center' }, label: { fontSize: 10, fontWeight: '900', color: C.muted, letterSpacing: 1.1, marginTop: 24 }, price: { fontSize: 34, fontWeight: '900', marginTop: 5 }, highest: { marginTop: 12, padding: 12, borderRadius: 16, backgroundColor: C.mint, fontWeight: '800', lineHeight: 17 }, muted: { fontSize: 11, color: C.muted, marginTop: 5, lineHeight: 16, textAlign: 'center' }, bidInput: { minHeight: 52, borderRadius: 18, backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, padding: 15, fontSize: 16, fontWeight: '800', marginTop: 8 }, warning: { marginTop: 18, padding: 14, borderRadius: 18, backgroundColor: C.rose }, warningTitle: { fontWeight: '900' }, retry: { height: 42, borderRadius: 21, borderWidth: 1, borderColor: C.pink, alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingHorizontal: 18 }, retryText: { color: C.pink, fontWeight: '900' }, confirm: { marginTop: 16, padding: 13, borderRadius: 17, backgroundColor: C.mint }, confirmText: { fontSize: 11, fontWeight: '800', lineHeight: 16 }, bid: { height: 54, borderRadius: 27, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', marginTop: 20 }, bidText: { color: '#FFF', fontWeight: '900', fontSize: 15 } });