import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { getProduct, getSessionUser } from '../lib/social';
import { supabase } from '../lib/supabase';

export default function Auction() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; productId?: string }>();
  const selectedId = String(params.productId || params.id || '');
  const [product, setProduct] = useState<any>(null);
  const [currentBid, setCurrentBid] = useState(0);
  const [minimumIncrement, setMinimumIncrement] = useState(10);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    if (!selectedId) { setMessage('No product was selected.'); setLoading(false); return; }
    setLoading(true); setMessage('');
    try {
      const item = await getProduct(selectedId);
      if (!item) throw new Error('This product is no longer available.');
      const { data: bids, error } = await supabase.from('bids').select('amount').eq('product_id', selectedId).order('amount', { ascending: false }).limit(1);
      if (error) throw error;
      const bid = Number(bids?.[0]?.amount || item.price);
      setProduct(item); setCurrentBid(bid); setMinimumIncrement(Math.max(1, Math.round(bid * 0.02)));
    } catch (error: any) {
      setMessage(error?.message || 'Could not load this auction.');
    } finally { setLoading(false); }
  }, [selectedId]);
  useEffect(() => { void load(); }, [load]);
  async function placeBid() {
    if (!product) return;
    setSubmitting(true); setMessage('');
    try {
      const user = await getSessionUser();
      if (!user) throw new Error('Sign in before placing a bid.');
      const amount = currentBid + minimumIncrement;
      const { error } = await supabase.from('bids').insert({ product_id: product.id, bidder_id: user.id, amount });
      if (error) throw error;
      setCurrentBid(amount); setMessage('Your bid was recorded.');
    } catch (error: any) { setMessage(error?.message || 'Your bid could not be placed.'); }
    finally { setSubmitting(false); }
  }
  if (loading) return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator color={C.pink} /><Text style={s.muted}>Loading auction…</Text></View></SafeAreaView>;
  if (!product) return <SafeAreaView style={s.safe}><View style={s.center}><Text style={s.title}>Auction unavailable</Text><Text style={s.muted}>{message}</Text><Pressable onPress={() => router.back()} style={s.bid}><Text style={s.bidText}>Go back</Text></Pressable></View></SafeAreaView>;
  const image = product.image_urls?.[0];
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.scroll}><View style={s.top}><Pressable onPress={() => router.back()}><I name="back" size={34} /></Pressable><Text style={s.heading}>Live auction</Text><View style={{ width: 34 }} /></View><View style={s.art}>{image ? <Image source={{ uri: image }} style={s.artImage} /> : <Text style={{ fontSize: 70 }}>✦</Text>}<View style={s.live}><Text style={s.liveText}>BIDS OPEN</Text></View></View><View style={s.card}><Text style={s.kicker}>{product.store?.name || 'Seller'}</Text><Text style={s.title}>{product.name}</Text><Text style={s.label}>CURRENT BID</Text><Text style={s.price}>GH₵ {currentBid.toFixed(0)}</Text><Text style={s.muted}>Minimum next bid: GH₵ {minimumIncrement.toFixed(0)}</Text>{message ? <View style={s.confirm}><Text style={s.confirmText}>{message}</Text></View> : null}<Pressable disabled={submitting} onPress={placeBid} style={[s.bid, submitting && { opacity: 0.5 }]}>{submitting ? <ActivityIndicator color="#FFF" /> : <Text style={s.bidText}>Place bid · GH₵ {(currentBid + minimumIncrement).toFixed(0)}</Text>}</Pressable></View></ScrollView></SafeAreaView>;
}
const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.bg }, scroll: { padding: 18, paddingBottom: 30 }, top: { height: 55, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, heading: { fontSize: 20, fontWeight: '900' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 }, art: { height: 270, borderRadius: 30, backgroundColor: C.plum, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, artImage: { width: '100%', height: '100%', resizeMode: 'cover' }, live: { position: 'absolute', bottom: 16, backgroundColor: C.coral, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16 }, liveText: { color: '#FFF', fontSize: 10, fontWeight: '900' }, card: { marginTop: -18, borderRadius: 30, backgroundColor: '#FFF', padding: 20, borderWidth: 1, borderColor: C.line }, kicker: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2, color: C.muted }, title: { fontSize: 25, fontWeight: '900', marginTop: 8, textAlign: 'center' }, label: { fontSize: 10, fontWeight: '900', color: C.muted, letterSpacing: 1.1, marginTop: 24 }, price: { fontSize: 34, fontWeight: '900', marginTop: 5, textAlign: 'center' }, muted: { fontSize: 11, color: C.muted, marginTop: 5, lineHeight: 16, textAlign: 'center' }, confirm: { marginTop: 16, padding: 13, borderRadius: 17, backgroundColor: C.mint }, confirmText: { fontSize: 11, fontWeight: '800', lineHeight: 16 }, bid: { height: 54, borderRadius: 27, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', marginTop: 20, paddingHorizontal: 20 }, bidText: { color: '#FFF', fontWeight: '900', fontSize: 15 } });