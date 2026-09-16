import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { Avatar, VerifiedMark } from '../Avatar';
import { ProductCard } from '../components/ProductCard';
import { searchMarketplace } from '../lib/social';

export default function Search() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ profiles: any[]; stores: any[]; products: any[] }>({ profiles: [], stores: [], products: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (!query.trim()) {
        setResults({ profiles: [], stores: [], products: [] });
        setError('');
        return;
      }
      setLoading(true);
      searchMarketplace(query).then(next => {
        if (active) setResults(next);
      }).catch(loadError => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not search.');
      }).finally(() => {
        if (active) setLoading(false);
      });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [query]);

  const hasResults = results.profiles.length || results.stores.length || results.products.length;
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.scroll}>
    <View style={s.top}><Pressable onPress={() => router.back()}><I name="back" size={34} /></Pressable><View style={s.search}><I name="search" size={20} color={C.muted} /><TextInput autoFocus value={query} onChangeText={setQuery} placeholder="Search people, shops, products…" placeholderTextColor={C.muted} style={s.input} /></View></View>
    {loading ? <View style={s.state}><ActivityIndicator color={C.pink} /></View> : error ? <View style={s.state}><Text style={s.meta}>{error}</Text></View> : !query.trim() ? <View style={s.state}><Text style={s.title}>Search the marketplace</Text><Text style={s.meta}>Find real profiles, stores and products from Supabase.</Text></View> : !hasResults ? <View style={s.state}><Text style={s.title}>No results</Text><Text style={s.meta}>Try another name, shop or product.</Text></View> : <>
      {results.profiles.length ? <><Text style={s.k}>PEOPLE</Text>{results.profiles.map(profile => <Pressable key={profile.id} style={s.row} onPress={() => router.push('/profile')}><Avatar size={44} uri={profile.avatar_url} /><View style={{ flex: 1 }}><Text style={s.name}>{profile.display_name} {profile.verified && <VerifiedMark size={14} />}</Text><Text style={s.meta}>@{profile.handle}</Text></View><I name="arrow" color={C.muted} /></Pressable>)}</> : null}
      {results.stores.length ? <><Text style={s.k}>SHOPS</Text>{results.stores.map(store => <Pressable key={store.id} style={s.row} onPress={() => router.push('/seller/' + store.id)}><Avatar size={44} uri={store.owner?.avatar_url} /><View style={{ flex: 1 }}><Text style={s.name}>{store.name}</Text><Text style={s.meta}>{Number(store.owner?.followers_count || 0).toLocaleString()} followers</Text></View><I name="arrow" color={C.muted} /></Pressable>)}</> : null}
      {results.products.length ? <><Text style={s.k}>PRODUCTS</Text><View style={s.grid}>{results.products.map(product => <ProductCard key={product.id} productId={product.id} name={product.name} price={`${product.currency === 'GHS' ? 'GH₵' : product.currency} ${Number(product.price).toFixed(0)}`} image={product.image_urls?.[0] || ''} seller={product.store?.name || ''} verified={Boolean(product.store?.owner?.verified)} onPress={() => router.push({ pathname: '/product', params: { id: product.id } })} />)}</View></> : null}
    </>}
  </ScrollView></SafeAreaView>;
}

const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.bg }, scroll: { padding: 18, paddingBottom: 120 }, top: { flexDirection: 'row', alignItems: 'center', gap: 8 }, search: { flex: 1, height: 50, borderRadius: 25, backgroundColor: '#F2ECEF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 8 }, input: { flex: 1, fontSize: 14 }, k: { fontSize: 10, letterSpacing: 1.3, fontWeight: '900', color: C.muted, marginTop: 24, marginBottom: 5 }, row: { paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: C.line }, name: { fontSize: 14, fontWeight: '900' }, meta: { fontSize: 11, color: C.muted, marginTop: 4 }, grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }, state: { marginTop: 55, padding: 25, borderRadius: 28, backgroundColor: '#FFF', alignItems: 'center' }, title: { fontSize: 18, fontWeight: '900', textAlign: 'center' } });