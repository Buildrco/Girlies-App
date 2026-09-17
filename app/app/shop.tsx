import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, View, Text, Pressable, StyleSheet, Image, TextInput, Alert } from 'react-native';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { ProductCard } from '../components/ProductCard';
import { useChromeVisibility } from '../components/BottomNav';
import { SectionTitle } from '../components/SectionTitle';
import { getProducts, getServices, type ProductRecord } from '../lib/social';

const cat = [['HAIR', 'Wigs, braids & bundles', C.rose, 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1000&q=85'], ['BEAUTY', 'Makeup, skincare & glow', C.sun, 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1000&q=85'], ['FASHION', 'Looks for every plan', C.lilac, 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=85'], ['FRAGRANCE', 'Scents that stay', C.mint, 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1000&q=85']];
const sortOptions = [['best_match', 'Best match'], ['price_low', 'Lowest price'], ['price_high', 'Highest price'], ['ending_soon', 'Ending soonest'], ['newest', 'Newly listed'], ['nearest', 'Nearest first']] as const;
const categoryFilters = (category: string) => {
  const key = category.toLowerCase();
  if (key.includes('hair')) return ['Texture: Straight', 'Texture: Body wave', 'Length: _body', 'Lace front', 'New', 'Custom'];
  if (key.includes('beauty')) return ['Skin care', 'Makeup', 'Vegan', 'Cruelty-free', 'New'];
  if (key.includes('fashion')) return ['Dresses', 'Tops', 'Shoes', 'Plus size', 'Handmade', 'New'];
  if (key.includes('fragrance')) return ['Perfume', 'Body mist', 'Giftable', 'Imported', 'New'];
  return ['New', 'Handmade', 'Imported', 'Giftable'];
};

const conditions = (category: string) => {
  const key = category.toLowerCase();
  if (key.includes('hair') || key.includes('wig')) return ['New', 'Custom', 'Pre-owned'];
  if (key.includes('gadget') || key.includes('appliance')) return ['New', 'Refurbished', 'Used'];
  if (key.includes('home') || key.includes('furniture')) return ['New', 'Good', 'Used'];
  return ['New', 'Like new', 'Used'];
};

export default function Shop() {
  const router = useRouter();
  const { onScroll } = useChromeVisibility();
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState<(typeof sortOptions)[number][0]>('best_match');
  const [condition, setCondition] = useState('');
  const [draftMin, setDraftMin] = useState('');
  const [draftMax, setDraftMax] = useState('');
  const [draftSort, setDraftSort] = useState<(typeof sortOptions)[number][0]>('best_match');
  const [draftCondition, setDraftCondition] = useState('');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const selectedCategory = cat[categoryIndex][0].toLowerCase();

  async function loadProducts() {
    try {
      setLoading(true);
      const [rows, serviceRows] = await Promise.all([
        getProducts(80, {
          category: selectedCategory,
          minPrice: minPrice ? Number(minPrice) : undefined,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
          sort: sort === 'nearest' ? 'best_match' : sort,
        }),
        getServices(),
      ]);
      setProducts(rows);
      setServices(serviceRows);
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Could not load products.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadProducts(); }, [selectedCategory, minPrice, maxPrice, sort]);

  const visibleProducts = useMemo(() => {
    const matching = products.filter(product => {
      if (condition && !Object.keys(product.filters || {}).some(key => key.toLowerCase() === condition.toLowerCase())) return false;
      return true;
    });
    if (sort !== 'nearest') return matching;
    const distance = (product: ProductRecord) => {
      if (!coordinates || product.store?.lat == null || product.store?.lng == null) return Number.POSITIVE_INFINITY;
      const lat = (product.store.lat - coordinates.latitude) * 111;
      const lng = (product.store.lng - coordinates.longitude) * 111 * Math.cos(coordinates.latitude * Math.PI / 180);
      return Math.sqrt(lat * lat + lng * lng);
    };
    return [...matching].sort((a, b) => distance(a) - distance(b));
  }, [products, condition, sort, coordinates]);

  function openFilters() {
    setDraftMin(minPrice); setDraftMax(maxPrice); setDraftSort(sort); setDraftCondition(condition); setFilterOpen(true);
  }

  async function applyFilters() {
    if (draftSort === 'nearest') {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Location needed', 'Allow location access to sort listings by distance.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({}).catch(() => null);
      if (position) setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    }
    setMinPrice(draftMin); setMaxPrice(draftMax); setSort(draftSort); setCondition(draftCondition); setFilterOpen(false);
  }

  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}>
    <View style={s.top}><View><Text style={s.k}>SHOP</Text><Text style={s.h}>Find your next thing.</Text></View><Pressable style={s.circle}><I name="bag" /></Pressable></View>
    <View style={s.hero}><Image source={{ uri: cat[categoryIndex][3] }} style={s.heroImg} /><View style={[s.heroColor, { backgroundColor: cat[categoryIndex][2] }]} /><View style={s.heroCopy}><Text style={s.heroCat}>{cat[categoryIndex][0]}</Text><Text style={s.heroTitle}>{cat[categoryIndex][1]}</Text><Text style={s.heroSmall}>Swipe categories →</Text></View></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>{cat.map((category, index) => <Pressable key={category[0]} onPress={() => { setCategoryIndex(index); setCondition(''); }} style={[s.catChip, index === categoryIndex && { backgroundColor: C.ink }]}><Text style={{ fontWeight: '900', fontSize: 11, color: index === categoryIndex ? '#FFF' : C.ink }}>{category[0]}</Text></Pressable>)}</ScrollView>
    <Pressable style={s.filterButton} onPress={openFilters}><I name="filter" size={18} /><Text style={s.filterButtonText}>Filters and sorting</Text><Text style={s.filterSummary}>{[minPrice && `GH₵${minPrice}+`, maxPrice && `up to GH₵${maxPrice}`, condition, sortOptions.find(item => item[0] === sort)?.[1]].filter(Boolean).join(' · ')}</Text></Pressable>
    <SectionTitle title="Fresh finds" />
    {loading && <View style={s.state}><Text style={s.stateText}>Loading products…</Text></View>}
    {!loading && error && <View style={s.state}><Text style={s.stateText}>{error}</Text></View>}
    {!loading && !error && !visibleProducts.length && <View style={s.state}><Text style={s.stateText}>No products match these filters.</Text></View>}
    <View style={s.grid}>{visibleProducts.map(product => <ProductCard key={product.id} gridWidth="48%" productId={product.id} images={product.image_urls} name={product.name} price={`${product.currency === 'GHS' ? 'GH₵' : product.currency} ${Number(product.price || 0).toFixed(0)}`} image={product.image_urls?.[0] || ''} seller={product.store?.name || 'Seller'} onPress={() => router.push({ pathname: '/product', params: { id: product.id } })} />)}</View>
    <SectionTitle title="Services" /><View style={s.services}>{services.map(service => <Pressable key={service.id} style={s.service} onPress={() => router.push({ pathname: '/service/[id]', params: { id: service.id } })}>{service.image_urls?.[0] ? <Image source={{ uri: service.image_urls[0] }} style={s.serviceImage} /> : null}<Text style={s.serviceName}>{service.name}</Text><Text style={s.serviceMeta}>{service.category} · {service.duration_minutes} min</Text><Text style={s.servicePrice}>GH₵ {Number(service.price).toFixed(0)}</Text></Pressable>)}</View>
  </ScrollView>
  <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}><View style={s.modalBackdrop}><View style={s.sheet}><View style={s.sheetTop}><Text style={s.sheetTitle}>Filter marketplace</Text><Pressable onPress={() => setFilterOpen(false)}><Text style={s.close}>×</Text></Pressable></View><Text style={s.label}>Price range</Text><View style={s.priceRow}><TextInput value={draftMin} onChangeText={setDraftMin} keyboardType="numeric" placeholder="Minimum" style={s.priceInput} /><TextInput value={draftMax} onChangeText={setDraftMax} keyboardType="numeric" placeholder="Maximum" style={s.priceInput} /></View><Text style={s.label}>Sort by</Text><View style={s.optionWrap}>{sortOptions.map(([value, label]) => <Pressable key={value} onPress={() => setDraftSort(value)} style={[s.option, draftSort === value && s.optionOn]}><Text style={[s.optionText, draftSort === value && s.optionTextOn]}>{label}</Text></Pressable>)}</View><Text style={s.label}>Category filters · {cat[categoryIndex][0]}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.optionWrap}><Pressable onPress={() => setDraftCondition('')} style={[s.option, !draftCondition && s.optionOn]}><Text style={[s.optionText, !draftCondition && s.optionTextOn]}>Any</Text></Pressable>{categoryFilters(selectedCategory).map(value => <Pressable key={value} onPress={() => setDraftCondition(value)} style={[s.option, draftCondition === value && s.optionOn]}><Text style={[s.optionText, draftCondition === value && s.optionTextOn]}>{value}</Text></Pressable>)}</ScrollView><Pressable style={s.apply} onPress={() => void applyFilters()}><Text style={s.applyText}>Apply filters</Text></Pressable></View></View></Modal>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, scroll: { padding: 18, paddingBottom: 120 }, top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, k: { fontSize: 10, fontWeight: '900', letterSpacing: 1.3, color: C.muted }, h: { fontSize: 27, fontWeight: '900', marginTop: 4 }, circle: { width: 45, height: 45, borderRadius: 23, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' }, hero: { height: 235, borderRadius: 34, overflow: 'hidden', marginTop: 17, position: 'relative', backgroundColor: C.rose }, heroImg: { position: 'absolute', right: -10, bottom: 0, width: '62%', height: '100%', resizeMode: 'cover' }, heroColor: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '59%', opacity: .95 }, heroCopy: { position: 'absolute', left: 20, top: 20, width: '50%' }, heroCat: { fontSize: 11, fontWeight: '900', letterSpacing: 1.4 }, heroTitle: { fontSize: 27, lineHeight: 29, fontWeight: '900', marginTop: 8 }, heroSmall: { fontSize: 11, fontWeight: '800', marginTop: 15 }, catChip: { paddingHorizontal: 17, paddingVertical: 10, borderRadius: 19, backgroundColor: '#FFF', marginRight: 8, borderWidth: 1, borderColor: C.line }, filterButton: { marginTop: 15, padding: 15, borderRadius: 22, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.line }, filterButtonText: { fontWeight: '900' }, filterSummary: { flex: 1, color: C.muted, fontSize: 10, textAlign: 'right' }, grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }, services: { gap: 8 }, service: { padding: 16, borderRadius: 20, backgroundColor: '#FFF' }, serviceName: { fontSize: 14, fontWeight: '900' }, serviceMeta: { fontSize: 11, color: C.muted, marginTop: 4 }, servicePrice: { fontSize: 13, color: C.pink, fontWeight: '900', marginTop: 6 }, state: { padding: 20, alignItems: 'center' }, stateText: { fontSize: 12, color: C.muted, textAlign: 'center' }, modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0007' }, sheet: { maxHeight: '88%', backgroundColor: C.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, paddingBottom: 35 }, sheetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sheetTitle: { fontSize: 20, fontWeight: '900' }, close: { fontSize: 30 }, label: { fontSize: 12, fontWeight: '900', marginTop: 18, marginBottom: 9 }, priceRow: { flexDirection: 'row', gap: 10 }, priceInput: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 13, borderWidth: 1, borderColor: C.line }, optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, option: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 18, backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line }, optionOn: { backgroundColor: C.ink, borderColor: C.ink }, optionText: { fontSize: 11, fontWeight: '800' }, optionTextOn: { color: '#FFF' }, apply: { marginTop: 22, borderRadius: 23, backgroundColor: C.pink, padding: 15, alignItems: 'center' }, applyText: { color: '#FFF', fontWeight: '900' },
});