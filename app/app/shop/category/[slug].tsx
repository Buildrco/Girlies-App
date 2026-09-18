import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { C } from '../../../constants/theme';
import { I } from '../../../components/Icons';
import { ProductCard } from '../../../components/ProductCard';
import { getCategory, MARKETPLACE_CATEGORIES } from '../../../constants/categories';
import { getProducts, getServices, getStore, type ProductRecord, type ServiceRecord } from '../../../lib/social';

const sortOptions = [['best_match', 'Recommended'], ['newest', 'Recently added'], ['price_low', 'Price: Low to High'], ['price_high', 'Price: High to Low']] as const;
const SERVICE_CATEGORY = {
  slug: 'services',
  label: 'Services',
  subtitle: 'Book trusted talent for your next plan',
  icon: 'beauty',
  color: '#F6A7D4',
  image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=85',
  subcategories: ['Hair services', 'Beauty services', 'Nails', 'Wellness', 'Photography', 'Events'],
};
const SUBCATEGORY_IMAGES: Record<string, string> = {
  Wigs: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=500&q=85',
  Bundles: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=500&q=85',
  Braids: 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&w=500&q=85',
  Closures: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=500&q=85',
  'Hair care': 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=500&q=85',
  Makeup: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=500&q=85',
  Skincare: 'https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=500&q=85',
  'Body care': 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=500&q=85',
  Tools: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=500&q=85',
  Nails: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=500&q=85',
  Kitchen: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=500&q=85',
  Cleaning: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=500&q=85',
  Cooling: 'https://images.unsplash.com/photo-1631545806609-6df41e4c0d2c?auto=format&fit=crop&w=500&q=85',
  'Small appliances': 'https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=500&q=85',
  Electronics: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=500&q=85',
  'Hair services': 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=500&q=85',
  'Beauty services': 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&w=500&q=85',
  Wellness: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=500&q=85',
  Photography: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=500&q=85',
  Events: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=500&q=85',
};

function matchesCategoryFilter(product: ProductRecord, selected: string) {
  if (!selected) return true;
  const values = Object.entries(product.filters || {}).flatMap(([key, value]) => [
    key,
    Array.isArray(value) ? value.join(' ') : String(value ?? ''),
  ]);
  values.push(product.category, product.stock_status || '', product.stock > 0 ? 'in stock' : 'out of stock');
  return values.some(value => value.toLowerCase().includes(selected.toLowerCase()));
}

function matchesServiceFilter(service: ServiceRecord, selected: string) {
  if (!selected) return true;
  const values = Object.entries(service.filters || {}).flatMap(([key, value]) => [key, Array.isArray(value) ? value.join(' ') : String(value ?? '')]);
  values.push(service.category, ...(service.delivery_options || []));
  return values.some(value => value.toLowerCase().includes(selected.toLowerCase()));
}

function hasDelivery(value: { delivery_options?: string[] | null }, selected: string) {
  return !selected || (value.delivery_options || []).some(option => option.toLowerCase().includes(selected.toLowerCase()));
}

export default function CategoryScreen() {
  const router = useRouter();
  const { slug, store: storeParam } = useLocalSearchParams<{ slug?: string; store?: string }>();
  const slugValue = Array.isArray(slug) ? slug[0] : slug || '';
  const isServices = slugValue === 'services';
  const category = isServices ? SERVICE_CATEGORY : getCategory(slugValue);
  const storeSlug = Array.isArray(storeParam) ? storeParam[0] : storeParam;
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [store, setStore] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState<(typeof sortOptions)[number][0]>('best_match');
  const [condition, setCondition] = useState('');
  const [draftMin, setDraftMin] = useState('');
  const [draftMax, setDraftMax] = useState('');
  const [draftSort, setDraftSort] = useState<(typeof sortOptions)[number][0]>('best_match');
  const [draftCondition, setDraftCondition] = useState('');
  const [categoryOption, setCategoryOption] = useState('');
  const [draftCategoryOption, setDraftCategoryOption] = useState('');
  const [buyingFormat, setBuyingFormat] = useState<'all' | 'buy_now' | 'auction'>('all');
  const [draftBuyingFormat, setDraftBuyingFormat] = useState<'all' | 'buy_now' | 'auction'>('all');
  const [deliveryOption, setDeliveryOption] = useState('');
  const [draftDeliveryOption, setDraftDeliveryOption] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        if (isServices) {
          const serviceRows = await getServices();
          if (active) { setServices(serviceRows); setProducts([]); setStore(null); setError(''); }
          return;
        }
        const currentStore = storeSlug ? await getStore(storeSlug) : null;
        const rows = await getProducts(80, { category: category.label, storeId: currentStore?.id, minPrice: minPrice ? Number(minPrice) : undefined, maxPrice: maxPrice ? Number(maxPrice) : undefined, sort });
        if (active) { setStore(currentStore); setProducts(rows); setError(''); }
      } catch (e: any) {
        if (active) setError(e?.message || 'Could not load this category.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [category.label, isServices, storeSlug, minPrice, maxPrice, sort]);

  const routeToCategory = (nextSlug: string) => router.replace({ pathname: '/shop/category/[slug]', params: { slug: nextSlug, ...(storeSlug ? { store: storeSlug } : {}) } });
  const visibleCategories = useMemo(() => isServices ? []
    : store?.categories?.length
    ? MARKETPLACE_CATEGORIES.filter(item => store.categories.includes(item.slug))
    : MARKETPLACE_CATEGORIES, [isServices, store]);
  const visibleProducts = useMemo(() => products.filter(product => {
    if (!matchesCategoryFilter(product, condition) || !matchesCategoryFilter(product, categoryOption) || !hasDelivery(product, deliveryOption)) return false;
    if (buyingFormat === 'all') return true;
    const auction = Boolean(product.bid_min_price || (product.attributes as any)?.bid_enabled);
    return buyingFormat === 'auction' ? auction : !auction;
  }), [products, condition, categoryOption, deliveryOption, buyingFormat]);
  const visibleServices = useMemo(() => {
    const filtered = services.filter(service => matchesServiceFilter(service, condition) && matchesServiceFilter(service, categoryOption) && hasDelivery(service, deliveryOption));
    if (sort === 'price_low') return [...filtered].sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === 'price_high') return [...filtered].sort((a, b) => Number(b.price) - Number(a.price));
    return filtered;
  }, [services, condition, categoryOption, deliveryOption, sort]);
  const resultCount = isServices ? visibleServices.length : visibleProducts.length;
  const activeFilterCount = [condition, categoryOption, minPrice, maxPrice, deliveryOption, buyingFormat === 'all' ? '' : buyingFormat].filter(Boolean).length;

  function openFilters() {
    setDraftMin(minPrice);
    setDraftMax(maxPrice);
    setDraftSort(sort);
    setDraftCondition(condition);
    setDraftCategoryOption(categoryOption);
    setDraftBuyingFormat(buyingFormat);
    setDraftDeliveryOption(deliveryOption);
    setFilterOpen(true);
  }

  function applyFilters() {
    setMinPrice(draftMin);
    setMaxPrice(draftMax);
    setSort(draftSort);
    setCondition(draftCondition);
    setCategoryOption(draftCategoryOption);
    setBuyingFormat(draftBuyingFormat);
    setDeliveryOption(draftDeliveryOption);
    setFilterOpen(false);
  }

  function openSort() {
    setDraftSort(sort);
    setSortOpen(true);
  }

  return <SafeAreaView style={s.safe}>
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      <View style={s.top}><Pressable onPress={() => router.back()} style={s.back}><I name="back" size={27} /></Pressable><View style={s.topCopy}><Text style={s.k}>{store ? store.name.toUpperCase() : 'MARKETPLACE'}</Text><Text style={s.h}>{category.label}</Text></View></View>
      <View style={[s.hero, { backgroundColor: category.color }]}><Image source={{ uri: category.image }} style={s.heroImage} /><View style={s.heroTint} /><View style={s.heroCopy}><View style={s.icon}><I name={category.icon} size={24} color={C.ink} filled /></View><Text style={s.heroTitle}>{category.subtitle}</Text><Text style={s.heroText}>{isServices ? 'Choose a provider and book your next appointment.' : store ? `Only ${store.name}'s ${category.label.toLowerCase()} picks.` : 'Discover products from shops across the marketplace.'}</Text></View></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categoryRail}><Pressable style={s.changeChip} onPress={() => router.replace(storeSlug ? { pathname: '/seller/[id]', params: { id: storeSlug } } : '/shop')}><Text style={s.changeText}>{isServices ? 'Marketplace' : 'All categories'}</Text></Pressable>{visibleCategories.map(item => <Pressable key={item.slug} onPress={() => routeToCategory(item.slug)} style={[s.categoryChip, item.slug === category.slug && s.categoryChipOn]}><I name={item.icon} size={15} color={item.slug === category.slug ? '#FFF' : C.ink} filled /><Text style={[s.categoryText, item.slug === category.slug && s.categoryTextOn]}>{item.label}</Text></Pressable>)}</ScrollView>
      <Text style={s.subheading}>{isServices ? 'Choose a service type' : `Explore ${category.label.toLowerCase()}`}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.subRail}>{category.subcategories.map(item => <Pressable key={item} accessibilityLabel={item} style={s.subChip} onPress={() => { setDraftCategoryOption(item); setCategoryOption(item); }}><Image source={{ uri: SUBCATEGORY_IMAGES[item] || category.image }} style={s.subImage} /></Pressable>)}</ScrollView>
       <View style={s.controlRow}>
         <Pressable style={[s.controlButton, sort !== 'best_match' && s.controlButtonOn]} onPress={openSort}>
           <Text style={s.sortGlyph}>⇅</Text>
           <Text style={s.controlText}>Sort by</Text>
           <Text style={s.controlValue} numberOfLines={1}>{sortOptions.find(item => item[0] === sort)?.[1]}</Text>
         </Pressable>
         <Pressable style={[s.controlButton, activeFilterCount > 0 && s.controlButtonOn]} onPress={openFilters}>
           <I name="filter" size={18} color={activeFilterCount > 0 ? C.pink : C.ink} />
           <Text style={s.controlText}>Filter</Text>
           {activeFilterCount > 0 && <View style={s.filterCount}><Text style={s.filterCountText}>{activeFilterCount}</Text></View>}
         </Pressable>
       </View>
        <View style={s.resultHead}><Text style={s.resultTitle}>{resultCount ? `${resultCount} ${isServices ? 'services' : 'listings'}` : isServices ? 'Services' : 'Products'}</Text><Text style={s.resultMeta}>{sortOptions.find(item => item[0] === sort)?.[1]}</Text></View>
      {loading && <View style={s.state}><ActivityIndicator color={C.pink} /><Text style={s.stateText}>Loading {category.label.toLowerCase()}…</Text></View>}
      {!loading && error && <View style={s.state}><Text style={s.stateText}>{error}</Text></View>}
        {!loading && !error && !resultCount && <View style={s.state}><Text style={s.stateEmoji}>✦</Text><Text style={s.emptyTitle}>Nothing here yet</Text><Text style={s.stateText}>{isServices ? 'New services will appear here as providers publish them.' : store ? 'This seller has not added products in this category.' : 'New products will appear here as sellers list them.'}</Text></View>}
        {!isServices && <View style={s.grid}>{visibleProducts.map(product => <ProductCard key={product.id} gridWidth="48%" productId={product.id} images={product.image_urls} name={product.name} price={`${product.currency === 'GHS' ? 'GH₵' : product.currency} ${Number(product.price || 0).toFixed(0)}`} image={product.image_urls?.[0] || ''} seller={product.store?.name || store?.name || 'Seller'} onPress={() => router.push({ pathname: '/product', params: { id: product.id } })} />)}</View>}
        {isServices && <View style={s.serviceGrid}>{visibleServices.map(service => <Pressable key={service.id} style={s.serviceCard} onPress={() => router.push({ pathname: '/service/[id]', params: { id: service.id } })}><Image source={{ uri: service.image_urls?.[0] || category.image }} style={s.serviceImage} /><View style={s.serviceCopy}><Text style={s.serviceName} numberOfLines={1}>{service.name}</Text><Text style={s.serviceMeta} numberOfLines={1}>{service.category} · {service.duration_minutes} min</Text><Text style={s.servicePrice}>GH₵ {Number(service.price || 0).toFixed(0)}</Text></View></Pressable>)}</View>}
    </ScrollView>
      <Modal visible={sortOpen} transparent animationType="fade" onRequestClose={() => setSortOpen(false)}>
        <View style={s.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSortOpen(false)} />
          <View style={s.sortSheet}>
            <View style={s.sortHeader}><Text style={s.sortTitle}>Sort by</Text><Pressable onPress={() => setSortOpen(false)}><Text style={s.close}>×</Text></Pressable></View>
            {sortOptions.map(([value, label]) => <Pressable key={value} style={s.sortOption} onPress={() => { setSort(value); setDraftSort(value); setSortOpen(false); }}>
              <Text style={s.sortOptionText}>{label}</Text>
              <View style={[s.radio, draftSort === value && s.radioOn]}>{draftSort === value && <View style={s.radioDot} />}</View>
            </Pressable>)}
          </View>
        </View>
      </Modal>
      <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.filterSheet}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.filterContent}>
              <View style={s.sheetTop}><Pressable onPress={() => setFilterOpen(false)}><I name="back" size={25} /></Pressable><Text style={s.sheetTitle}>Filter {category.label}</Text><Pressable onPress={() => { setDraftMin(''); setDraftMax(''); setDraftSort('best_match'); setDraftCondition(''); setDraftCategoryOption(''); setDraftBuyingFormat('all'); setDraftDeliveryOption(''); }}><Text style={s.reset}>Reset</Text></Pressable></View>
              <FilterRow label="Sort" value={sortOptions.find(item => item[0] === draftSort)?.[1] || 'Recommended'} onPress={() => { setFilterOpen(false); setTimeout(openSort, 160); }} />
              {!isServices && <><Text style={s.sheetLabel}>Buying format</Text>
              <View style={s.optionWrap}><Pressable onPress={() => setDraftBuyingFormat('all')} style={[s.option, draftBuyingFormat === 'all' && s.optionOn]}><Text style={[s.optionText, draftBuyingFormat === 'all' && s.optionTextOn]}>All listings</Text></Pressable><Pressable onPress={() => setDraftBuyingFormat('buy_now')} style={[s.option, draftBuyingFormat === 'buy_now' && s.optionOn]}><Text style={[s.optionText, draftBuyingFormat === 'buy_now' && s.optionTextOn]}>Buy it now</Text></Pressable><Pressable onPress={() => setDraftBuyingFormat('auction')} style={[s.option, draftBuyingFormat === 'auction' && s.optionOn]}><Text style={[s.optionText, draftBuyingFormat === 'auction' && s.optionTextOn]}>Auction</Text></Pressable></View></>}
              <FilterRow label="Condition" value={draftCondition || 'Any'} />
              <View style={s.optionWrap}><Pressable onPress={() => setDraftCondition('')} style={[s.option, !draftCondition && s.optionOn]}><Text style={[s.optionText, !draftCondition && s.optionTextOn]}>Any</Text></Pressable>{['New', 'Used', 'Handmade'].map(value => <Pressable key={value} onPress={() => setDraftCondition(value)} style={[s.option, draftCondition === value && s.optionOn]}><Text style={[s.optionText, draftCondition === value && s.optionTextOn]}>{value}</Text></Pressable>)}</View>
              <FilterRow label="Price" value={draftMin || draftMax ? `${draftMin ? `GH₵${draftMin}+` : ''}${draftMax ? ` up to GH₵${draftMax}` : ''}` : 'Any price'} />
              <View style={s.priceRow}><TextInput value={draftMin} onChangeText={setDraftMin} keyboardType="numeric" placeholder="Minimum" style={s.priceInput} /><TextInput value={draftMax} onChangeText={setDraftMax} keyboardType="numeric" placeholder="Maximum" style={s.priceInput} /></View>
              <FilterRow label={isServices ? 'Service category' : 'Category'} value={draftCategoryOption || category.label} />
              <Text style={s.sheetLabel}>{category.label} options</Text>
              <View style={s.optionWrap}>{category.subcategories.map(value => <Pressable key={value} onPress={() => setDraftCategoryOption(value)} style={[s.option, draftCategoryOption === value && s.optionOn]}><Text style={[s.optionText, draftCategoryOption === value && s.optionTextOn]}>{value}</Text></Pressable>)}</View>
              <FilterRow label={isServices ? 'Delivery' : 'Shipping and pickup'} value={draftDeliveryOption || 'All options'} />
              <View style={s.optionWrap}>{['Local delivery', 'Pickup', 'Ships nationwide'].map(value => <Pressable key={value} onPress={() => setDraftDeliveryOption(draftDeliveryOption === value ? '' : value)} style={[s.option, draftDeliveryOption === value && s.optionOn]}><Text style={[s.optionText, draftDeliveryOption === value && s.optionTextOn]}>{value}</Text></Pressable>)}</View>
              <Pressable style={s.apply} onPress={applyFilters}><Text style={s.applyText}>Show results</Text></Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
  </SafeAreaView>;
}

function FilterRow({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  const content = <><Text style={s.filterRowLabel}>{label}</Text><View style={s.filterRowValue}><Text style={s.filterRowText}>{value}</Text>{onPress && <I name="forward" size={19} />}</View></>;
  return onPress ? <Pressable style={s.filterRow} onPress={onPress}>{content}</Pressable> : <View style={s.filterRow}>{content}</View>;
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
   subRail: { gap: 8, paddingVertical: 9 },
   subChip: { width: 88, height: 58, borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line },
   subImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  resultHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 10 },
  resultTitle: { fontSize: 18, fontWeight: '900' },
  resultMeta: { fontSize: 11, color: C.muted },
  controlRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
   controlButton: { flex: 1, minHeight: 44, paddingHorizontal: 12, borderRadius: 15, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.line },
  controlButtonOn: { borderColor: C.pink, backgroundColor: '#FFF7FA' },
   sortGlyph: { fontSize: 19, fontWeight: '900', lineHeight: 19 },
   controlText: { fontSize: 12, fontWeight: '900' },
  controlValue: { flex: 1, color: C.muted, fontSize: 10, textAlign: 'right' },
  filterCount: { minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center' },
  filterCountText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0007' },
  sortSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 28 },
  sortHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10 },
  sortTitle: { fontSize: 20, fontWeight: '900' },
  close: { fontSize: 28, lineHeight: 28 },
  sortOption: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.line },
  sortOptionText: { fontSize: 14, fontWeight: '700' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: C.ink },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.ink },
  filterSheet: { maxHeight: '92%', backgroundColor: C.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  filterContent: { padding: 18, paddingBottom: 32 },
  sheetTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.line },
  sheetTitle: { fontSize: 20, fontWeight: '900' },
  reset: { color: C.pink, fontWeight: '900' },
  sheetLabel: { fontSize: 12, fontWeight: '900', marginTop: 16, marginBottom: 8 },
  filterRow: { minHeight: 55, borderBottomWidth: 1, borderBottomColor: C.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filterRowLabel: { fontSize: 15 },
  filterRowValue: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterRowText: { color: C.muted, fontSize: 13 },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 18, backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line },
  optionOn: { backgroundColor: C.ink, borderColor: C.ink },
  optionText: { fontSize: 11, fontWeight: '800' },
  optionTextOn: { color: '#FFF' },
  priceRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  priceInput: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 13, borderWidth: 1, borderColor: C.line },
  apply: { marginTop: 20, borderRadius: 25, backgroundColor: C.pink, padding: 15, alignItems: 'center' },
  applyText: { color: '#FFF', fontWeight: '900' },
   grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
   serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
   serviceCard: { width: '48.5%', borderRadius: 18, overflow: 'hidden', backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line },
   serviceImage: { width: '100%', height: 142, resizeMode: 'cover' },
   serviceCopy: { padding: 10 },
   serviceName: { fontSize: 13, fontWeight: '900' },
   serviceMeta: { fontSize: 10, color: C.muted, marginTop: 4 },
   servicePrice: { fontSize: 13, color: C.pink, fontWeight: '900', marginTop: 6 },
  state: { padding: 28, alignItems: 'center', gap: 8 },
  stateEmoji: { fontSize: 30 },
  stateText: { color: C.muted, textAlign: 'center', fontSize: 12, lineHeight: 17 },
  emptyTitle: { fontSize: 18, fontWeight: '900' },
});