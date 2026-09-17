import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { C } from '../../../constants/theme';
import { I } from '../../../components/Icons';
import { ProductCard } from '../../../components/ProductCard';
import { getCategory, MARKETPLACE_CATEGORIES } from '../../../constants/categories';
import { getProducts, getStore, type ProductRecord } from '../../../lib/social';

export default function CategoryScreen() {
  const router = useRouter();
  const { slug, store: storeParam } = useLocalSearchParams<{ slug?: string; store?: string }>();
  const category = getCategory(Array.isArray(slug) ? slug[0] : slug || '');
  const storeSlug = Array.isArray(storeParam) ? storeParam[0] : storeParam;
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [store, setStore] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const currentStore = storeSlug ? await getStore(storeSlug) : null;
        const rows = await getProducts(80, { category: category.label, storeId: currentStore?.id });
        if (active) { setStore(currentStore); setProducts(rows); setError(''); }
      } catch (e: any) {
        if (active) setError(e?.message || 'Could not load this category.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [category.label, storeSlug]);

  const routeToCategory = (nextSlug: string) => router.replace({ pathname: '/shop/category/[slug]', params: { slug: nextSlug, ...(storeSlug ? { store: storeSlug } : {}) } });
  const visibleCategories = useMemo(() => store?.categories?.length
    ? MARKETPLACE_CATEGORIES.filter(item => store.categories.includes(item.slug))
    : MARKETPLACE_CATEGORIES, [store]);

  return <SafeAreaView style={s.safe}>
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      <View style={s.top}><Pressable onPress={() => router.back()} style={s.back}><I name="back" size={27} /></Pressable><View style={s.topCopy}><Text style={s.k}>{store ? store.name.toUpperCase() : 'MARKETPLACE'}</Text><Text style={s.h}>{category.label}</Text></View><Pressable onPress={() => router.push('/cart')}><I name="bag" size={24} color={C.pink} filled /></Pressable></View>
      <View style={[s.hero, { backgroundColor: category.color }]}><Image source={{ uri: category.image }} style={s.heroImage} /><View style={s.heroTint} /><View style={s.heroCopy}><View style={s.icon}><I name={category.icon} size={24} color={C.ink} filled /></View><Text style={s.heroTitle}>{category.subtitle}</Text><Text style={s.heroText}>{store ? `Only ${store.name}'s ${category.label.toLowerCase()} picks.` : 'Discover products from shops across the marketplace.'}</Text></View></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categoryRail}><Pressable style={s.changeChip} onPress={() => router.replace(storeSlug ? { pathname: '/seller/[id]', params: { id: storeSlug } } : '/shop')}><Text style={s.changeText}>All categories</Text></Pressable>{visibleCategories.map(item => <Pressable key={item.slug} onPress={() => routeToCategory(item.slug)} style={[s.categoryChip, item.slug === category.slug && s.categoryChipOn]}><I name={item.icon} size={15} color={item.slug === category.slug ? '#FFF' : C.ink} filled /><Text style={[s.categoryText, item.slug === category.slug && s.categoryTextOn]}>{item.label}</Text></Pressable>)}</ScrollView>
      <Text style={s.subheading}>Explore {category.label.toLowerCase()}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.subRail}>{category.subcategories.map(item => <View key={item} style={s.subChip}><View style={s.subIcon}><I name={category.icon} size={15} color={C.pink} filled /></View><Text style={s.subText}>{item}</Text></View>)}</ScrollView>
      <View style={s.resultHead}><Text style={s.resultTitle}>{products.length ? `${products.length} listings` : 'Products'}</Text><Text style={s.resultMeta}>Latest first</Text></View>
      {loading && <View style={s.state}><ActivityIndicator color={C.pink} /><Text style={s.stateText}>Loading {category.label.toLowerCase()}…</Text></View>}
      {!loading && error && <View style={s.state}><Text style={s.stateText}>{error}</Text></View>}
      {!loading && !error && !products.length && <View style={s.state}><Text style={s.stateEmoji}>✦</Text><Text style={s.emptyTitle}>Nothing here yet</Text><Text style={s.stateText}>{store ? 'This seller has not added products in this category.' : 'New products will appear here as sellers list them.'}</Text></View>}
      <View style={s.grid}>{products.map(product => <ProductCard key={product.id} gridWidth="48%" productId={product.id} images={product.image_urls} name={product.name} price={`${product.currency === 'GHS' ? 'GH₵' : product.currency} ${Number(product.price || 0).toFixed(0)}`} image={product.image_urls?.[0] || ''} seller={product.store?.name || store?.name || 'Seller'} onPress={() => router.push({ pathname: '/product', params: { id: product.id } })} />)}</View>
    </ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 18, paddingBottom: 45 },
  top: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10 },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  topCopy: { flex: 1 },
  k: { fontSize: 9, letterSpacing: 1.1, fontWeight: '900', color: C.muted },
  h: { fontSize: 22, fontWeight: '900', marginTop: 3 },
  hero: { height: 190, borderRadius: 30, overflow: 'hidden', marginTop: 14, position: 'relative' },
  heroImage: { position: 'absolute', right: -14, width: '58%', height: '100%', resizeMode: 'cover' },
  heroTint: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FFFFFF33' },
  heroCopy: { position: 'absolute', left: 18, top: 18, width: '58%' },
  icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroTitle: { fontSize: 24, lineHeight: 27, fontWeight: '900' },
  heroText: { fontSize: 11, lineHeight: 16, fontWeight: '700', marginTop: 8 },
  categoryRail: { gap: 8, paddingVertical: 15 },
  changeChip: { paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  changeText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  categoryChip: { height: 36, paddingHorizontal: 13, borderRadius: 18, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.line },
  categoryChipOn: { backgroundColor: C.pink, borderColor: C.pink },
  categoryText: { fontSize: 11, fontWeight: '900' },
  categoryTextOn: { color: '#FFF' },
  subheading: { fontSize: 17, fontWeight: '900', marginTop: 3 },
  subRail: { gap: 8, paddingVertical: 11 },
  subChip: { width: 96, height: 72, borderRadius: 18, backgroundColor: '#FFF', padding: 10, justifyContent: 'space-between', borderWidth: 1, borderColor: C.line },
  subIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.rose, alignItems: 'center', justifyContent: 'center' },
  subText: { fontSize: 10, fontWeight: '900' },
  resultHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 10 },
  resultTitle: { fontSize: 18, fontWeight: '900' },
  resultMeta: { fontSize: 11, color: C.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  state: { padding: 28, alignItems: 'center', gap: 8 },
  stateEmoji: { fontSize: 30 },
  stateText: { color: C.muted, textAlign: 'center', fontSize: 12, lineHeight: 17 },
  emptyTitle: { fontSize: 18, fontWeight: '900' },
});