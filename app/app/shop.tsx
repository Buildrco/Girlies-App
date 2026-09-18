import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, ScrollView, View, Text, Pressable, StyleSheet, Image, TextInput, Alert, useWindowDimensions } from 'react-native';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { ProductCard } from '../components/ProductCard';
import { useChromeVisibility } from '../components/BottomNav';
import { SectionTitle } from '../components/SectionTitle';
import { getProducts, getServices, type ProductRecord } from '../lib/social';
import { MARKETPLACE_CATEGORIES } from '../constants/categories';
import { useCart } from '../lib/cart';

const sortOptions = [['best_match', 'Best match'], ['price_low', 'Lowest price'], ['price_high', 'Highest price'], ['ending_soon', 'Ending soonest'], ['newest', 'Newly listed'], ['nearest', 'Nearest first']] as const;
const categoryFilters = (category: string) => {
  const key = category.toLowerCase();
  if (key.includes('hair')) return ['Straight', 'Body wave', 'Long length', 'Lace front', 'New', 'Custom'];
  if (key.includes('beauty')) return ['Skin care', 'Makeup', 'Vegan', 'Cruelty-free', 'New'];
  if (key.includes('fashion')) return ['Dresses', 'Tops', 'Shoes', 'Plus size', 'Handmade', 'New'];
  if (key.includes('fragrance')) return ['Perfume', 'Body mist', 'Giftable', 'Imported', 'New'];
  if (key.includes('gadget')) return ['Apple', 'Samsung', 'Audio', 'New', 'Imported'];
  if (key.includes('appliance')) return ['Kitchen', 'Cleaning', 'Cooling', 'New'];
  if (key.includes('furniture')) return ['Living room', 'Bedroom', 'Office', 'New'];
  return ['New', 'Handmade', 'Imported', 'Giftable'];
};

export default function Shop() {
  const router = useRouter();
  const { onScroll } = useChromeVisibility();
  const { count } = useCart();
  const { width } = useWindowDimensions();
  const heroWidth = width;
  const heroRef = useRef<ScrollView>(null);
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
  const selectedCategory = MARKETPLACE_CATEGORIES[categoryIndex].label;

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

  function selectHero(index: number) {
    setCategoryIndex(index);
    setCondition('');
    heroRef.current?.scrollTo({ x: index * heroWidth, animated: true });
  }

  return <SafeAreaView style={s.safe}>
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}>
      <View style={s.top}>
        <View><Text style={s.k}>SHOP</Text><Text style={s.h}>Find your next thing.</Text></View>
        <Pressable style={s.cartCircle} onPress={() => router.push('/cart')}>
          <I name="bag" size={23} color="#FFF" filled />
          {count > 0 && <View style={s.count}><Text style={s.countText}>{count > 99 ? '99+' : count}</Text></View>}
        </Pressable>
      </View>

      <ScrollView
        ref={heroRef}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        snapToInterval={heroWidth}
        style={[s.heroRail, { width: heroWidth }]}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={event => {
          const next = Math.round(event.nativeEvent.contentOffset.x / heroWidth);
          if (next !== categoryIndex) { setCategoryIndex(next); setCondition(''); }
        }}
      >
        {MARKETPLACE_CATEGORIES.slice(0, 4).map(category => (
          <Pressable key={category.slug} style={[s.hero, { width: heroWidth }]} onPress={() => router.push({ pathname: '/shop/category/[slug]', params: { slug: category.slug } })}>
            <Image source={{ uri: category.image }} style={s.heroImg} />
            <View style={[s.heroColor, { backgroundColor: category.color }]} />
            <View style={s.heroCopy}><Text style={s.heroCat}>{category.label.toUpperCase()}</Text><Text style={s.heroTitle}>{category.subtitle}</Text><Text style={s.heroSmall}>Tap to shop · swipe for more</Text></View>
            <View style={s.heroIcon}><I name={category.icon} size={25} color={C.ink} filled /></View>
          </Pressable>
        ))}
      </ScrollView>
      <View style={s.dots}>{MARKETPLACE_CATEGORIES.slice(0, 4).map((category, index) => <View key={category.slug} style={[s.dot, index === categoryIndex && s.dotOn]} />)}</View>

      <View style={s.sectionIntro}><View><Text style={s.sectionEyebrow}>BROWSE THE MARKET</Text><Text style={s.sectionHeading}>Shop by category</Text></View><Text style={s.sectionHint}>Pick a lane, then explore.</Text></View>
      <View style={s.categoryGrid}>
        {MARKETPLACE_CATEGORIES.map(category => <Pressable key={category.slug} style={[s.categoryCard, { backgroundColor: category.color }]} onPress={() => router.push({ pathname: '/shop/category/[slug]', params: { slug: category.slug } })}>
          <Image source={{ uri: category.image }} style={s.categoryImage} />
          <View style={s.categoryShade} />
          <View style={s.categoryCopy}><View style={s.categoryIcon}><I name={category.icon} size={20} color={C.ink} filled /></View><Text style={s.categoryTitle}>{category.label}</Text><Text style={s.categorySubtitle}>{category.subtitle}</Text></View>
        </Pressable>)}
      </View>

      <Pressable style={s.filterButton} onPress={openFilters}><I name="filter" size={18} /><Text style={s.filterButtonText}>Filters and sorting</Text><Text style={s.filterSummary}>{[minPrice && `GH₵${minPrice}+`, maxPrice && `up to GH₵${maxPrice}`, condition, sortOptions.find(item => item[0] === sort)?.[1]].filter(Boolean).join(' · ')}</Text></Pressable>
      <SectionTitle title={`Fresh finds in ${selectedCategory}`} />
      {loading && <View style={s.state}><Text style={s.stateText}>Loading products…</Text></View>}
      {!loading && error && <View style={s.state}><Text style={s.stateText}>{error}</Text></View>}
      {!loading && !error && !visibleProducts.length && <View style={s.state}><Text style={s.stateText}>No products match these filters yet.</Text></View>}
      <View style={s.grid}>{visibleProducts.map(product => <ProductCard key={product.id} gridWidth="48%" productId={product.id} images={product.image_urls} name={product.name} price={`${product.currency === 'GHS' ? 'GH₵' : product.currency} ${Number(product.price || 0).toFixed(0)}`} image={product.image_urls?.[0] || ''} seller={product.store?.name || 'Seller'} onPress={() => router.push({ pathname: '/product', params: { id: product.id } })} />)}</View>
      {!!services.length && <><SectionTitle title="Services" /><View style={s.services}>{services.map(service => <Pressable key={service.id} style={s.service} onPress={() => router.push({ pathname: '/service/[id]', params: { id: service.id } })}>{service.image_urls?.[0] ? <Image source={{ uri: service.image_urls[0] }} style={s.serviceImage} /> : null}<Text style={s.serviceName}>{service.name}</Text><Text style={s.serviceMeta}>{service.category} · {service.duration_minutes} min</Text><Text style={s.servicePrice}>GH₵ {Number(service.price).toFixed(0)}</Text></Pressable>)}</View></>}
    </ScrollView>
    <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}><View style={s.modalBackdrop}><View style={s.sheet}><View style={s.sheetTop}><Text style={s.sheetTitle}>Filter marketplace</Text><Pressable onPress={() => setFilterOpen(false)}><Text style={s.close}>×</Text></Pressable></View><Text style={s.label}>Price range</Text><View style={s.priceRow}><TextInput value={draftMin} onChangeText={setDraftMin} keyboardType="numeric" placeholder="Minimum" style={s.priceInput} /><TextInput value={draftMax} onChangeText={setDraftMax} keyboardType="numeric" placeholder="Maximum" style={s.priceInput} /></View><Text style={s.label}>Sort by</Text><View style={s.optionWrap}>{sortOptions.map(([value, label]) => <Pressable key={value} onPress={() => setDraftSort(value)} style={[s.option, draftSort === value && s.optionOn]}><Text style={[s.optionText, draftSort === value && s.optionTextOn]}>{label}</Text></Pressable>)}</View><Text style={s.label}>Category filters · {selectedCategory}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.optionWrap}><Pressable onPress={() => setDraftCondition('')} style={[s.option, !draftCondition && s.optionOn]}><Text style={[s.optionText, !draftCondition && s.optionTextOn]}>Any</Text></Pressable>{categoryFilters(selectedCategory).map(value => <Pressable key={value} onPress={() => setDraftCondition(value)} style={[s.option, draftCondition === value && s.optionOn]}><Text style={[s.optionText, draftCondition === value && s.optionTextOn]}>{value}</Text></Pressable>)}</ScrollView><Pressable style={s.apply} onPress={() => void applyFilters()}><Text style={s.applyText}>Apply filters</Text></Pressable></View></View></Modal>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 18, paddingBottom: 120 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  k: { fontSize: 10, fontWeight: '900', letterSpacing: 1.3, color: C.muted },
  h: { fontSize: 27, fontWeight: '900', marginTop: 4 },
  cartCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center' },
  count: { position: 'absolute', right: -3, top: -4, minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: 10, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.bg },
  countText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  heroRail: { marginTop: 17, marginHorizontal: -18 },
  hero: { height: 220, borderRadius: 34, overflow: 'hidden', position: 'relative', backgroundColor: C.rose, marginRight: 0 },
  heroImg: { position: 'absolute', right: -10, bottom: 0, width: '65%', height: '100%', resizeMode: 'cover' },
  heroColor: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '60%', opacity: .93 },
  heroCopy: { position: 'absolute', left: 20, top: 22, width: '55%' },
  heroCat: { fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  heroTitle: { fontSize: 27, lineHeight: 29, fontWeight: '900', marginTop: 8 },
  heroSmall: { fontSize: 11, fontWeight: '800', marginTop: 15 },
  heroIcon: { position: 'absolute', left: 20, bottom: 18, width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFF9', alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.line },
  dotOn: { width: 20, backgroundColor: C.pink },
  sectionIntro: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 25, marginBottom: 12 },
  sectionEyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1.1, color: C.pink },
  sectionHeading: { fontSize: 21, fontWeight: '900', marginTop: 4 },
  sectionHint: { maxWidth: 100, textAlign: 'right', color: C.muted, fontSize: 10, lineHeight: 14 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  categoryCard: { width: '48.5%', height: 170, borderRadius: 24, overflow: 'hidden', position: 'relative' },
  categoryImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  categoryShade: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0003' },
  categoryCopy: { position: 'absolute', left: 13, right: 10, bottom: 13 },
  categoryIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  categoryTitle: { color: '#FFF', fontSize: 17, fontWeight: '900' },
  categorySubtitle: { color: '#FFF', fontSize: 10, fontWeight: '700', marginTop: 3 },
  filterButton: { marginTop: 18, padding: 15, borderRadius: 22, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.line },
  filterButtonText: { fontWeight: '900' },
  filterSummary: { flex: 1, color: C.muted, fontSize: 10, textAlign: 'right' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  services: { gap: 8 },
  service: { padding: 16, borderRadius: 20, backgroundColor: '#FFF' },
  serviceImage: { width: '100%', height: 140, borderRadius: 15, marginBottom: 9 },
  serviceName: { fontSize: 14, fontWeight: '900' },
  serviceMeta: { fontSize: 11, color: C.muted, marginTop: 4 },
  servicePrice: { fontSize: 13, color: C.pink, fontWeight: '900', marginTop: 6 },
  state: { padding: 20, alignItems: 'center' },
  stateText: { fontSize: 12, color: C.muted, textAlign: 'center' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0007' },
  sheet: { maxHeight: '88%', backgroundColor: C.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, paddingBottom: 35 },
  sheetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 20, fontWeight: '900' },
  close: { fontSize: 30 },
  label: { fontSize: 12, fontWeight: '900', marginTop: 18, marginBottom: 9 },
  priceRow: { flexDirection: 'row', gap: 10 },
  priceInput: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 13, borderWidth: 1, borderColor: C.line },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 18, backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line },
  optionOn: { backgroundColor: C.ink, borderColor: C.ink },
  optionText: { fontSize: 11, fontWeight: '800' },
  optionTextOn: { color: '#FFF' },
  apply: { marginTop: 22, borderRadius: 23, backgroundColor: C.pink, padding: 15, alignItems: 'center' },
  applyText: { color: '#FFF', fontWeight: '900' },
});