import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet, Image, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { C } from '../../constants/theme';
import { I } from '../../components/Icons';
import { ProductCard } from '../../components/ProductCard';
import { useChromeVisibility } from '../../components/BottomNav';
import { SectionTitle } from '../../components/SectionTitle';
import { getProducts, type ProductRecord } from '../../lib/social';
import { MARKETPLACE_CATEGORIES } from '../../constants/categories';

export default function MarketplaceShop() {
  const router = useRouter();
  const { onScroll } = useChromeVisibility();
  const { width } = useWindowDimensions();
  const heroWidth = Math.max(1, width - 36);
  const heroGap = 12;
  const heroRef = useRef<ScrollView>(null);
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const selectedCategory = MARKETPLACE_CATEGORIES[categoryIndex].label;

  async function loadProducts() {
    try {
      setLoading(true);
      const rows = selectedCategory === 'Services' ? [] : await getProducts(80, { category: selectedCategory });
      setProducts(rows);
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Could not load products.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadProducts(); }, [selectedCategory]);

  return <SafeAreaView style={s.safe}>
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}>
      <View style={s.top}>
        <View><Text style={s.k}>SHOP</Text><Text style={s.h}>Find your next thing.</Text></View>
      </View>

      <ScrollView
        ref={heroRef}
        horizontal
        decelerationRate="fast"
         disableIntervalMomentum
         snapToInterval={heroWidth + heroGap}
         snapToAlignment="start"
         contentContainerStyle={{ gap: heroGap }}
        style={[s.heroRail, { width: heroWidth }]}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={event => {
           const next = Math.min(MARKETPLACE_CATEGORIES.length - 1, Math.max(0, Math.round(event.nativeEvent.contentOffset.x / (heroWidth + heroGap))));
           if (next !== categoryIndex) setCategoryIndex(next);
        }}
      >
         {MARKETPLACE_CATEGORIES.map(category => (
          <Pressable key={category.slug} style={[s.hero, { width: heroWidth }]} onPress={() => router.push({ pathname: '/shop/category/[slug]', params: { slug: category.slug } })}>
            <Image source={{ uri: category.image }} style={s.heroImg} />
            <View style={[s.heroColor, { backgroundColor: category.color }]} />
            <View style={s.heroCopy}><Text style={s.heroCat}>{category.label.toUpperCase()}</Text><Text style={s.heroTitle}>{category.subtitle}</Text><Text style={s.heroSmall}>Tap to shop · swipe for more</Text></View>
            <View style={s.heroIcon}><I name={category.icon} size={25} color={C.ink} filled /></View>
          </Pressable>
        ))}
      </ScrollView>
       <View style={s.dots}>{MARKETPLACE_CATEGORIES.map((category, index) => <View key={category.slug} style={[s.dot, index === categoryIndex && s.dotOn]} />)}</View>

      <View style={s.sectionIntro}><View><Text style={s.sectionEyebrow}>BROWSE THE MARKET</Text><Text style={s.sectionHeading}>Shop by category</Text></View><Text style={s.sectionHint}>Pick a lane, then explore.</Text></View>
      <View style={s.categoryGrid}>
        {MARKETPLACE_CATEGORIES.map(category => <Pressable key={category.slug} style={[s.categoryCard, { backgroundColor: category.color }]} onPress={() => router.push({ pathname: '/shop/category/[slug]', params: { slug: category.slug } })}>
          <Image source={{ uri: category.image }} style={s.categoryImage} />
          <View style={s.categoryShade} />
          <View style={s.categoryCopy}><View style={s.categoryIcon}><I name={category.icon} size={20} color={C.ink} filled /></View><Text style={s.categoryTitle}>{category.label}</Text><Text style={s.categorySubtitle}>{category.subtitle}</Text></View>
        </Pressable>)}
      </View>
       <Pressable style={s.servicesBanner} onPress={() => router.push({ pathname: '/shop/category/[slug]', params: { slug: 'services' } })}>
         <Image source={{ uri: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=85' }} style={s.servicesBannerImage} />
         <View style={s.servicesBannerShade} />
         <View style={s.servicesBannerCopy}><Text style={s.servicesEyebrow}>BOOK A SERVICE</Text><Text style={s.servicesTitle}>Find your next appointment.</Text><Text style={s.servicesText}>Hair, beauty, wellness and more from trusted providers.</Text></View>
         <View style={s.servicesArrow}><I name="forward" size={21} color={C.ink} /></View>
       </Pressable>

      <SectionTitle title={`Fresh finds in ${selectedCategory}`} />
      {loading && <View style={s.state}><Text style={s.stateText}>Loading products…</Text></View>}
      {!loading && error && <View style={s.state}><Text style={s.stateText}>{error}</Text></View>}
       {!loading && !error && !products.length && <View style={s.state}><Text style={s.stateText}>No products in this category yet.</Text></View>}
       <View style={s.grid}>{products.map(product => <ProductCard key={product.id} gridWidth="48%" productId={product.id} images={product.image_urls} name={product.name} price={`${product.currency === 'GHS' ? 'GH₵' : product.currency} ${Number(product.price || 0).toFixed(0)}`} image={product.image_urls?.[0] || ''} seller={product.store?.name || 'Seller'} onPress={() => router.push({ pathname: '/product', params: { id: product.id } })} />)}</View>
    </ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 18, paddingBottom: 120 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  k: { fontSize: 10, fontWeight: '900', letterSpacing: 1.3, color: C.muted },
  h: { fontSize: 27, fontWeight: '900', marginTop: 4 },
  heroRail: { marginTop: 17 },
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
  categoryCard: { width: '48.5%', height: 138, borderRadius: 22, overflow: 'hidden', position: 'relative' },
  categoryImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  categoryShade: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0003' },
  categoryCopy: { position: 'absolute', left: 13, right: 10, bottom: 13 },
  categoryIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  categoryTitle: { color: '#FFF', fontSize: 17, fontWeight: '900' },
  categorySubtitle: { color: '#FFF', fontSize: 10, fontWeight: '700', marginTop: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  servicesBanner: { height: 146, borderRadius: 24, overflow: 'hidden', position: 'relative', marginTop: 12 },
  servicesBannerImage: { ...StyleSheet.absoluteFillObject, resizeMode: 'cover' },
  servicesBannerShade: { ...StyleSheet.absoluteFillObject, backgroundColor: '#17131888' },
  servicesBannerCopy: { position: 'absolute', left: 17, right: 62, bottom: 17 },
  servicesEyebrow: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  servicesTitle: { color: '#FFF', fontSize: 21, lineHeight: 24, fontWeight: '900', marginTop: 5 },
  servicesText: { color: '#FFF', fontSize: 11, lineHeight: 15, fontWeight: '700', marginTop: 5 },
  servicesArrow: { position: 'absolute', right: 16, top: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  state: { padding: 20, alignItems: 'center' },
  stateText: { fontSize: 12, color: C.muted, textAlign: 'center' },
});