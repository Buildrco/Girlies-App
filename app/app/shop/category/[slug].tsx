import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { C } from '../../../constants/theme';
import { I } from '../../../components/Icons';
import { ProductCard } from '../../../components/ProductCard';
import { getCategory, MAIN_CATEGORIES, MARKETPLACE_CATEGORIES } from '../../../constants/categories';
import { getProducts, getPublishedEvents, getServices, getStore, type ProductRecord, type SellerEvent, type ServiceRecord } from '../../../lib/social';
import { useCart } from '../../../lib/cart';
import { MotionPressable } from '../../../components/MotionPressable';
import { readOffline, writeOffline } from '../../../lib/offlineCache';

const sortOptions = [['best_match', 'Recommended'], ['newest', 'Recently added'], ['price_low', 'Price: Low to High'], ['price_high', 'Price: High to Low']] as const;
type SelectionKind = 'sort' | 'buying' | 'condition' | 'category' | 'price' | 'delivery';
const SERVICE_CATEGORY = getCategory('services');
const EVENT_ART = [
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1000&q=85',
];
function eventImage(event: SellerEvent, index: number) { return event.banner_url || EVENT_ART[index % EVENT_ART.length]; }
function eventDate(value: string) { return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); }
function eventDateTime(value: string) { return new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); }
const EVENT_CACHE_KEY = 'published-events-v1';
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
  Dresses: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=500&q=85',
  Tops: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=500&q=85',
  Shoes: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=500&q=85',
  Bags: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=500&q=85',
  Jewellery: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=500&q=85',
  Perfume: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=500&q=85',
  'Body mist': 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=500&q=85',
  Oils: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=500&q=85',
  'Gift sets': 'https://images.unsplash.com/photo-1547887538-e3a2f32cb1cc?auto=format&fit=crop&w=500&q=85',
  'Home scent': 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=500&q=85',
  Phones: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=500&q=85',
  Audio: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=85',
  'Smart watches': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=85',
  Gaming: 'https://images.unsplash.com/photo-1592840496694-26d035b52b48?auto=format&fit=crop&w=500&q=85',
  Accessories: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=500&q=85',
  'Living room': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=500&q=85',
  Bedroom: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=500&q=85',
  Dining: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=500&q=85',
  Office: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=500&q=85',
  Decor: 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=500&q=85',
  Lingerie: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=500&q=85',
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
  const { count } = useCart();
  const { slug, store: storeParam } = useLocalSearchParams<{ slug?: string; store?: string }>();
  const slugValue = Array.isArray(slug) ? slug[0] : slug || '';
  const isServices = slugValue === 'services';
  const isEvents = slugValue === 'events';
  const isMainCategory = MAIN_CATEGORIES.some(item => item.slug === slugValue && item.slug !== 'shop');
  const category = isServices ? SERVICE_CATEGORY : getCategory(slugValue);
  const storeSlug = Array.isArray(storeParam) ? storeParam[0] : storeParam;
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [events, setEvents] = useState<SellerEvent[]>([]);
  const [store, setStore] = useState<any | null>(null);
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
  const [categoryOption, setCategoryOption] = useState('');
  const [draftCategoryOption, setDraftCategoryOption] = useState('');
  const [buyingFormat, setBuyingFormat] = useState<'all' | 'buy_now' | 'auction'>('all');
  const [draftBuyingFormat, setDraftBuyingFormat] = useState<'all' | 'buy_now' | 'auction'>('all');
  const [deliveryOption, setDeliveryOption] = useState('');
  const [draftDeliveryOption, setDraftDeliveryOption] = useState('');
  const [selectionOpen, setSelectionOpen] = useState<SelectionKind | null>(null);
  const [returnToFilter, setReturnToFilter] = useState(false);
  const sheetY = useRef(new Animated.Value(0)).current;
  const sheetPan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 6,
    onPanResponderMove: (_, gesture) => { if (gesture.dy > 0) sheetY.setValue(gesture.dy); },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy > 120 || gesture.vy > 1.2) {
        Animated.timing(sheetY, { toValue: 700, duration: 180, useNativeDriver: true }).start(() => { sheetY.setValue(0); setFilterOpen(false); });
      } else {
        Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      }
    },
  })).current;

  useEffect(() => {
    let active = true;
    (async () => {
      if (isEvents) {
        const cachedEvents = await readOffline<SellerEvent[]>(EVENT_CACHE_KEY);
        if (!active) return;
        if (cachedEvents) { setEvents(cachedEvents); setError(''); setLoading(false); }
        try {
          const eventRows = await getPublishedEvents();
          if (active) { setEvents(eventRows); setError(''); void writeOffline(EVENT_CACHE_KEY, eventRows); }
        } catch (e: any) {
          if (active && !cachedEvents) setError(e?.message || 'Could not load events.');
        } finally {
          if (active) setLoading(false);
        }
        return;
      }
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
  }, [category.label, isEvents, isServices, storeSlug, minPrice, maxPrice, sort]);

  const routeToCategory = (nextSlug: string) => nextSlug === 'shop'
    ? router.replace('/shop/marketplace')
    : router.replace({ pathname: '/shop/category/[slug]', params: { slug: nextSlug, ...(storeSlug && !isMainCategory ? { store: storeSlug } : {}) } });
  const visibleCategories = useMemo(() => isMainCategory
    ? MAIN_CATEGORIES.filter(item => item.slug !== 'shop')
    : isServices ? []
    : store?.categories?.length
    ? MARKETPLACE_CATEGORIES.filter(item => store.categories.includes(item.slug))
    : MARKETPLACE_CATEGORIES, [isMainCategory, isServices, store]);
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
    setReturnToFilter(false);
    setSelectionOpen('sort');
  }

  function openSelection(kind: SelectionKind) {
    setReturnToFilter(true);
    setFilterOpen(false);
    setSelectionOpen(kind);
  }

  function closeSelection() {
    setSelectionOpen(null);
    if (returnToFilter) setTimeout(() => setFilterOpen(true), 120);
    setReturnToFilter(false);
  }

  function chooseSelection(value: string) {
    if (selectionOpen === 'sort') {
      setDraftSort(value as typeof sort);
      if (!returnToFilter) setSort(value as typeof sort);
    }
    if (selectionOpen === 'buying') setDraftBuyingFormat(value as typeof buyingFormat);
    if (selectionOpen === 'condition') setDraftCondition(value === 'Any' ? '' : value);
    if (selectionOpen === 'category') setDraftCategoryOption(value === 'Any category' ? '' : value);
    if (selectionOpen === 'delivery') setDraftDeliveryOption(value === 'All options' ? '' : value);
    closeSelection();
  }

  if (isEvents) return <EventsDiscoveryScreen events={events} loading={loading} error={error} />;

  return <SafeAreaView style={s.safe}>
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
       <View style={s.top}><Pressable onPress={() => router.back()} style={s.back}><I name="back" size={27} /></Pressable><View style={s.topCopy}><Text style={s.k}>{store ? store.name.toUpperCase() : isMainCategory ? 'GIRLIES' : 'MARKETPLACE'}</Text><Text style={s.h}>{category.label}</Text></View><Pressable style={s.cartCircle} onPress={() => router.push('/cart')}><I name="cart" size={19} color="#FFF" filled />{count > 0 && <View style={s.count}><Text style={s.countText}>{count > 99 ? '99+' : count}</Text></View>}</Pressable></View>
      <View style={[s.hero, { backgroundColor: category.color }]}><Image source={{ uri: category.image }} style={s.heroImage} /><View style={s.heroTint} /><View style={s.heroCopy}><View style={s.icon}><I name={category.icon} size={24} color={C.ink} filled /></View><Text style={s.heroTitle}>{category.subtitle}</Text><Text style={s.heroText}>{isServices ? 'Choose a provider and book your next appointment.' : store ? `Only ${store.name}'s ${category.label.toLowerCase()} picks.` : isMainCategory ? `Explore ${category.label.toLowerCase()} from people and businesses across the community.` : 'Discover products from shops across the marketplace.'}</Text></View></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categoryRail}><Pressable style={s.changeChip} onPress={() => router.replace(storeSlug ? { pathname: '/seller/[id]', params: { id: storeSlug } } : isMainCategory ? '/shop' : '/shop/marketplace')}><Text style={s.changeText}>{isServices || isMainCategory ? 'Explore categories' : 'All categories'}</Text></Pressable>{visibleCategories.map(item => <Pressable key={item.slug} onPress={() => routeToCategory(item.slug)} style={[s.categoryChip, item.slug === category.slug && s.categoryChipOn]}><I name={item.icon} size={15} color={item.slug === category.slug ? '#FFF' : C.ink} filled /><Text style={[s.categoryText, item.slug === category.slug && s.categoryTextOn]}>{item.label}</Text></Pressable>)}</ScrollView>
      <Text style={s.subheading}>{isServices ? 'Choose a service type' : `Explore ${category.label.toLowerCase()}`}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.subRail}>{category.subcategories.map(item => <Pressable key={item} accessibilityLabel={item} style={s.subChip} onPress={() => { setDraftCategoryOption(item); setCategoryOption(item); }}><Image source={{ uri: SUBCATEGORY_IMAGES[item] || category.image }} style={s.subImage} /><View style={s.subShade} /><Text style={s.subText}>{item}</Text></Pressable>)}</ScrollView>
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
      
      {!loading && error && <View style={s.state}><Text style={s.stateText}>{error}</Text></View>}
        {!loading && !error && !resultCount && <View style={s.state}><Text style={s.stateEmoji}>✦</Text><Text style={s.emptyTitle}>Nothing here yet</Text><Text style={s.stateText}>{isServices ? 'New services will appear here as providers publish them.' : store ? 'This seller has not added products in this category.' : 'New products will appear here as sellers list them.'}</Text></View>}
        {!isServices && <View style={s.grid}>{visibleProducts.map(product => <ProductCard key={product.id} gridWidth="48%" productId={product.id} images={product.image_urls} name={product.name} price={`${product.currency === 'GHS' ? 'GH₵' : product.currency} ${Number(product.price || 0).toFixed(0)}`} image={product.image_urls?.[0] || ''} seller={product.store?.name || store?.name || 'Seller'} onPress={() => router.push({ pathname: '/product', params: { id: product.id } })} />)}</View>}
        {isServices && <View style={s.serviceGrid}>{visibleServices.map(service => <Pressable key={service.id} style={s.serviceCard} onPress={() => router.push({ pathname: '/service/[id]', params: { id: service.id } })}><Image source={{ uri: service.image_urls?.[0] || category.image }} style={s.serviceImage} /><View style={s.serviceCopy}><Text style={s.serviceName} numberOfLines={1}>{service.name}</Text><Text style={s.serviceMeta} numberOfLines={1}>{service.category} · {service.duration_minutes} min</Text><Text style={s.servicePrice}>GH₵ {Number(service.price || 0).toFixed(0)}</Text></View></Pressable>)}</View>}
    </ScrollView>
      <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <View style={s.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setFilterOpen(false)} />
          <Animated.View style={[s.filterSheet, { transform: [{ translateY: sheetY }] }]}>
            <View {...sheetPan.panHandlers} style={s.sheetHandleArea}><View style={s.sheetHandle} /></View>
            <View style={s.sheetTop}><Pressable onPress={() => setFilterOpen(false)}><I name="back" size={25} /></Pressable><Text style={s.sheetTitle}>Filter {category.label}</Text><Pressable onPress={() => { setDraftMin(''); setDraftMax(''); setDraftSort('best_match'); setDraftCondition(''); setDraftCategoryOption(''); setDraftBuyingFormat('all'); setDraftDeliveryOption(''); }}><Text style={s.reset}>Reset</Text></Pressable></View>
            <ScrollView style={s.filterBody} showsVerticalScrollIndicator={false}>
              <FilterRow label="Sort" value={sortOptions.find(item => item[0] === draftSort)?.[1] || 'Recommended'} onPress={() => openSelection('sort')} />
              {!isServices && <FilterRow label="Buying format" value={draftBuyingFormat === 'all' ? 'All listings' : draftBuyingFormat === 'buy_now' ? 'Buy it now' : 'Auction'} onPress={() => openSelection('buying')} />}
              <FilterRow label="Condition" value={draftCondition || 'Any'} onPress={() => openSelection('condition')} />
              <FilterRow label="Price" value={draftMin || draftMax ? `${draftMin ? `GH₵${draftMin}+` : ''}${draftMax ? ` up to GH₵${draftMax}` : ''}` : 'Any price'} onPress={() => openSelection('price')} />
              <FilterRow label={isServices ? 'Service category' : 'Category'} value={draftCategoryOption || category.label} onPress={() => openSelection('category')} />
              <FilterRow label={isServices ? 'Delivery' : 'Shipping and pickup'} value={draftDeliveryOption || 'All options'} onPress={() => openSelection('delivery')} />
            </ScrollView>
            <Pressable style={s.apply} onPress={applyFilters}><Text style={s.applyText}>Show {resultCount} results</Text></Pressable>
          </Animated.View>
        </View>
      </Modal>
      <Modal visible={Boolean(selectionOpen)} transparent animationType="slide" onRequestClose={closeSelection}>
        <View style={s.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSelection} />
          <View style={s.selectionSheet}>
            <View style={s.sheetHandleArea}><View style={s.sheetHandle} /></View>
            <View style={s.selectionHeader}><Text style={s.selectionTitle}>{selectionOpen === 'price' ? 'Price range' : selectionOpen === 'buying' ? 'Buying format' : selectionOpen === 'condition' ? 'Condition' : selectionOpen === 'category' ? (isServices ? 'Service category' : 'Category') : selectionOpen === 'delivery' ? 'Shipping and pickup' : 'Sort by'}</Text><Pressable onPress={closeSelection}><Text style={s.close}>×</Text></Pressable></View>
            {selectionOpen === 'price' ? <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.selectionHint}>Choose a range or enter your own amount.</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pricePresets}>{[['', 'Any price'], ['0', 'Under GH₵50'], ['50', 'GH₵50–100'], ['100', 'GH₵100–250'], ['250', 'GH₵250+']].map(([min, label]) => <Pressable key={label} onPress={() => { setDraftMin(min); setDraftMax(min === '' ? '' : min === '0' ? '50' : min === '50' ? '100' : min === '100' ? '250' : ''); }} style={[s.preset, draftMin === min && s.presetOn]}><Text style={[s.presetText, draftMin === min && s.presetTextOn]}>{label}</Text></Pressable>)}</ScrollView>
              <View style={s.priceRow}><TextInput value={draftMin} onChangeText={setDraftMin} keyboardType="numeric" placeholder="Minimum" style={s.priceInput} /><TextInput value={draftMax} onChangeText={setDraftMax} keyboardType="numeric" placeholder="Maximum" style={s.priceInput} /></View>
              <Pressable style={s.apply} onPress={closeSelection}><Text style={s.applyText}>Use price range</Text></Pressable>
            </ScrollView> : <ScrollView showsVerticalScrollIndicator={false}>{(selectionOpen === 'sort' ? sortOptions.map(([value, label]) => [value, label] as [string, string]) : selectionOpen === 'buying' ? [['all', 'All listings'], ['buy_now', 'Buy it now'], ['auction', 'Auction']] : selectionOpen === 'condition' ? [['', 'Any'], ...['New', 'Used', 'Handmade'].map(value => [value, value])] : selectionOpen === 'category' ? [['Any category', 'Any category'], ...category.subcategories.map(value => [value, value])] : [['All options', 'All options'], ...['Local delivery', 'Pickup', 'Ships nationwide'].map(value => [value, value])]).map(([value, label]) => <Pressable key={value || label} style={s.selectionRow} onPress={() => chooseSelection(value)}><Text style={s.selectionText}>{label}</Text><View style={[s.radio, ((selectionOpen === 'sort' && draftSort === value) || (selectionOpen === 'buying' && draftBuyingFormat === value) || (selectionOpen === 'condition' && (draftCondition || '') === value) || (selectionOpen === 'category' && (draftCategoryOption || 'Any category') === value) || (selectionOpen === 'delivery' && (draftDeliveryOption || 'All options') === value)) && s.radioOn]}>{((selectionOpen === 'sort' && draftSort === value) || (selectionOpen === 'buying' && draftBuyingFormat === value) || (selectionOpen === 'condition' && (draftCondition || '') === value) || (selectionOpen === 'category' && (draftCategoryOption || 'Any category') === value) || (selectionOpen === 'delivery' && (draftDeliveryOption || 'All options') === value)) && <View style={s.radioDot} />}</View></Pressable>)}</ScrollView>}
          </View>
        </View>
      </Modal>
  </SafeAreaView>;
}

function EventGlassOverlay({ event, compact = false }: { event: SellerEvent; compact?: boolean }) {
  const paid = Number(event.ticket_price || 0) > 0;
  return <BlurView intensity={85} tint="light" experimentalBlurMethod="dimezisBlurView" style={compact ? s.upcomingGlass : s.featuredGlass}>
    <View style={compact ? s.upcomingGlassTop : s.featuredDateRow}><Text style={compact ? s.upcomingDate : s.featuredDate}>{eventDate(event.starts_at)}</Text><Text style={compact ? s.upcomingPrice : s.featuredPrice}>{paid ? 'GH₵ ' + Number(event.ticket_price).toFixed(0) : 'Free'}</Text></View>
    <Text style={compact ? s.upcomingName : s.featuredName} numberOfLines={2}>{event.name}</Text>
    <Text style={compact ? s.upcomingMeta : s.featuredMeta} numberOfLines={2}>{event.event_mode === 'physical' ? event.location || 'Physical event' : 'Online in Girlies'} · {eventDateTime(event.starts_at)}</Text>
    {!compact && <View style={s.featuredBottom}><Text style={s.featuredHost}>Girlies community</Text><Text style={s.featuredArrow}>View details  ›</Text></View>}
  </BlurView>;
}

function EventsDiscoveryScreen({ events, loading, error }: { events: SellerEvent[]; loading: boolean; error: string }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [eventFilter, setEventFilter] = useState('All events');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchProgress = useRef(new Animated.Value(0)).current;
  const heroEnter = useRef(new Animated.Value(18)).current;
  const filterEnter = useRef(new Animated.Value(20)).current;
  const listEnter = useRef(new Animated.Value(24)).current;
  const enterOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.stagger(120, [
      Animated.parallel([Animated.timing(heroEnter, { toValue: 0, duration: 520, useNativeDriver: true }), Animated.timing(enterOpacity, { toValue: 1, duration: 420, useNativeDriver: true })]),
      Animated.timing(filterEnter, { toValue: 0, duration: 520, useNativeDriver: true }),
      Animated.timing(listEnter, { toValue: 0, duration: 520, useNativeDriver: true }),
    ]).start();
  }, []);
  const filterPages = [
    { label: 'All events', copy: 'Everything happening around you', options: ['Upcoming', 'All locations', 'Recommended'] },
    { label: 'Concerts', copy: 'Music, live shows and good energy', options: ['Music', 'This month', 'Near me'] },
    { label: 'Community', copy: 'Meet people who get your vibe', options: ['Community', 'Free events', 'Near me'] },
    { label: 'Workshops', copy: 'Learn something useful together', options: ['Learning', 'Weekend', 'Online'] },
    { label: 'Beauty', copy: 'Beauty, fashion and self-care plans', options: ['Beauty', 'This month', 'Near me'] },
  ];
  const query = searchQuery.trim().toLowerCase();
  const searchedEvents = query ? events.filter(event => [event.name, event.description, event.location || ''].join(' ').toLowerCase().includes(query)) : events;
  const visibleEvents = eventFilter === 'All events' ? searchedEvents : (() => {
    const needle = eventFilter.toLowerCase().replace(/s$/, '');
    return searchedEvents.filter(event => [event.name, event.description, event.location || ''].join(' ').toLowerCase().includes(needle));
  })();
  const openEvent = (event: SellerEvent) => router.push({ pathname: '/shop/category/event-detail', params: { id: event.id } });
  const toggleSearch = () => {
    const next = !searchOpen;
    setSearchOpen(next);
    Animated.timing(searchProgress, { toValue: next ? 1 : 0, duration: 360, useNativeDriver: false }).start();
    if (!next) setSearchQuery('');
  };
  return <SafeAreaView style={s.eventsSafe}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.eventsScroll}>
      <Animated.View style={{ opacity: enterOpacity, transform: [{ translateY: heroEnter }] }}><LinearGradient colors={[C.rose, C.lilac, C.mint]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.eventsHero}>
         <View style={s.eventsHeroTop}><View><Text style={s.eventsEyebrow}>EVENTS NEAR YOU</Text><Text style={s.eventsLocation}>Accra, Ghana</Text></View><Pressable style={s.eventsIcon}><I name="bell" size={20} color={C.ink} /></Pressable></View>
         <Animated.View style={[s.eventsSearch, { width: searchProgress.interpolate({ inputRange: [0, 1], outputRange: [48, width - 36] }), paddingHorizontal: searchOpen ? 15 : 1 }]}><Pressable onPress={toggleSearch} style={s.eventsSearchTrigger}><I name="search" size={19} color={C.muted} /></Pressable>{searchOpen && <TextInput autoFocus value={searchQuery} onChangeText={setSearchQuery} placeholder="Search events" placeholderTextColor={C.muted} style={s.eventsSearchInput} returnKeyType="search" />}{searchOpen && <Pressable onPress={() => setEventFilter('All events')} style={s.eventsSearchFilter}><I name="filter" size={18} color={C.muted} /></Pressable>}</Animated.View>
       </LinearGradient></Animated.View>
      <Animated.View style={{ opacity: enterOpacity, transform: [{ translateY: filterEnter }] }}><View style={s.eventsHeadingRow}><Text style={s.eventsSectionTitle}>Upcoming Events</Text><Text style={s.eventsViewAll}>View all</Text></View>
      {loading ? <View style={s.eventsLoading}><ActivityIndicator color={C.pink} /></View> : error ? <View style={s.eventsEmpty}><Text style={s.eventsEmptyTitle}>Events are taking a moment</Text><Text style={s.eventsEmptyText}>{error}</Text></View> : events.length === 0 ? <View style={s.eventsEmpty}><Text style={s.eventsEmptyTitle}>No upcoming events yet</Text><Text style={s.eventsEmptyText}>New events from the community will appear here.</Text></View> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.eventsRail}>{visibleEvents.slice(0, 6).map((event, index) => <MotionPressable key={event.id} style={s.upcomingCard} contentStyle={s.eventCardContent} onPress={() => openEvent(event)}><Image source={{ uri: eventImage(event, index) }} style={s.upcomingImage} resizeMode="cover" /><LinearGradient colors={['transparent', '#17131818', '#17131888']} style={s.eventImageShade} /><EventGlassOverlay event={event} compact /><BlurView intensity={70} tint="dark" experimentalBlurMethod="dimezisBlurView" style={s.upcomingArrow}><I name="forward" size={16} color="#FFF" /></BlurView></MotionPressable>)}</ScrollView>}</Animated.View>
       <Animated.View style={{ opacity: enterOpacity, transform: [{ translateX: filterEnter }] }}><View style={s.eventsHeadingRow}><Text style={s.eventsSectionTitle}>Browse event filters</Text></View>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ width }} onMomentumScrollEnd={event => { const page = Math.round(event.nativeEvent.contentOffset.x / width); setEventFilter(filterPages[page]?.label || 'All events'); }}>
        {filterPages.map((page, index) => <Pressable key={page.label} onPress={() => setEventFilter(page.label)} style={[s.eventsFilterPage, { width }]}><View style={[s.eventsFilterPanel, eventFilter === page.label && s.eventsFilterPanelOn]}><View><Text style={s.eventsFilterK}>{index + 1} / {filterPages.length}</Text><Text style={s.eventsFilterTitle}>{page.label}</Text><Text style={s.eventsFilterCopy}>{page.copy}</Text></View><View style={s.eventsFilterOptions}>{page.options.map(option => <View key={option} style={s.eventsFilterOption}><Text style={s.eventsFilterOptionText}>{option}</Text></View>)}</View></View></Pressable>)}
      </ScrollView>
      <View style={s.eventsPagerDots}>{filterPages.map(page => <View key={page.label} style={[s.eventsPagerDot, eventFilter === page.label && s.eventsPagerDotOn]} />)}</View></Animated.View>
       <Animated.View style={{ opacity: enterOpacity, transform: [{ translateY: listEnter }] }}><View style={s.eventsHeadingRow}><Text style={s.eventsSectionTitle}>{eventFilter}</Text><Text style={s.eventsViewAll}>{visibleEvents.length} events</Text></View>
      <View style={s.featuredStack}>{visibleEvents.map((event, index) => <MotionPressable key={event.id} style={s.featuredEvent} contentStyle={s.eventCardContent} onPress={() => openEvent(event)}><Image source={{ uri: eventImage(event, index + 1) }} style={s.featuredImage} resizeMode="cover" /><LinearGradient colors={['transparent', '#17131820', '#171318A8']} style={s.eventImageShade} /><EventGlassOverlay event={event} /><BlurView intensity={75} tint="dark" experimentalBlurMethod="dimezisBlurView" style={s.featuredArrowCircle}><I name="forward" size={17} color="#FFF" /></BlurView></MotionPressable>)}</View></Animated.View>
    </ScrollView>

  </SafeAreaView>;
}

function FilterRow({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  const content = <><Text style={s.filterRowLabel}>{label}</Text><View style={s.filterRowValue}><Text style={s.filterRowText}>{value}</Text>{onPress && <I name="forward" size={19} />}</View></>;
  return onPress ? <Pressable style={s.filterRow} onPress={onPress}>{content}</Pressable> : <View style={s.filterRow}>{content}</View>;
}

const s = StyleSheet.create({
  eventsSafe: { flex: 1, backgroundColor: C.bg },
  eventsScroll: { paddingBottom: 110 },
  eventsHero: { minHeight: 190, padding: 18, paddingTop: 18, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  eventsHeroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventsEyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1.1, color: '#6F4D78' },
  eventsLocation: { fontSize: 21, fontWeight: '900', marginTop: 4 },
  eventsHeroActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eventsIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFFAA', alignItems: 'center', justifyContent: 'center' },

  eventsFilterPage: { paddingHorizontal: 18 },
  eventsFilterPanel: { minHeight: 124, borderRadius: 28, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, padding: 16, justifyContent: 'space-between' },
  eventsFilterPanelOn: { borderColor: C.pink, backgroundColor: '#FFF8FA' },
  eventsFilterK: { color: C.pink, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  eventsFilterTitle: { fontSize: 20, fontWeight: '900', marginTop: 3 },
  eventsFilterCopy: { color: C.muted, fontSize: 10, marginTop: 3 },
  eventsFilterOptions: { flexDirection: 'row', gap: 6, marginTop: 12 },
  eventsFilterOption: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 12, backgroundColor: C.bg },
  eventsFilterOptionText: { color: C.muted, fontSize: 9, fontWeight: '800' },
  eventsPagerDots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 9 },
  eventsPagerDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.line },
  eventsPagerDotOn: { width: 16, backgroundColor: C.pink },
  eventsCount: { position: 'absolute', right: -3, top: -3, width: 16, height: 16, borderRadius: 8, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center' },
  eventsCountText: { color: '#FFF', fontSize: 8, fontWeight: '900' },
  eventsSearch: { height: 48, borderRadius: 24, backgroundColor: '#FFFFFFE8', flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 15, marginTop: 30 },
  eventsSearchTrigger: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  eventsSearchInput: { flex: 1, color: C.ink, fontSize: 12, fontWeight: '700', paddingVertical: 0 },
  eventsSearchFilter: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  eventsHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, marginTop: 22, marginBottom: 11 },
  eventsSectionTitle: { fontSize: 19, fontWeight: '900' },
  eventsViewAll: { color: C.pink, fontSize: 11, fontWeight: '900' },
  eventsRail: { gap: 12, paddingHorizontal: 18 },
  upcomingCard: { width: 174, height: 188, borderRadius: 22, backgroundColor: C.plum, overflow: 'hidden', borderWidth: 1, borderColor: '#FFFFFF66' },
  eventCardContent: { flex: 1 },
  upcomingImage: { ...StyleSheet.absoluteFillObject },
  eventImageShade: { ...StyleSheet.absoluteFillObject },
  upcomingArrow: { position: 'absolute', right: 10, bottom: 12, width: 34, height: 34, borderRadius: 17, overflow: 'hidden', backgroundColor: '#17131866', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF88' },
  upcomingGlass: { position: 'absolute', left: 8, right: 8, bottom: 8, minHeight: 82, borderRadius: 17, overflow: 'hidden', padding: 10, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#FFFFFF88' },
  upcomingGlassTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  upcomingPrice: { color: C.pink, fontSize: 10, fontWeight: '900' },
  upcomingDate: { color: C.pink, fontSize: 10, fontWeight: '900' },
  upcomingName: { fontSize: 13, lineHeight: 16, fontWeight: '900', marginTop: 4 },
  upcomingMeta: { color: C.muted, fontSize: 9, marginTop: 5 },
  eventsPills: { gap: 8, paddingHorizontal: 18 },
  eventsPill: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 18, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EADFEF' },
  eventsPillOn: { backgroundColor: C.ink, borderColor: C.ink },
  eventsPillText: { fontSize: 10, fontWeight: '900', color: C.muted },
  eventsPillTextOn: { color: '#FFF' },
  featuredStack: { gap: 14, paddingHorizontal: 18, paddingTop: 15 },
  featuredEvent: { height: 312, backgroundColor: C.plum, borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: '#FFFFFF66' },
  featuredImage: { ...StyleSheet.absoluteFillObject },
  featuredGlass: { position: 'absolute', left: 10, right: 10, bottom: 10, minHeight: 126, borderRadius: 22, overflow: 'hidden', padding: 14, backgroundColor: '#FFFFFF55', borderWidth: 1, borderColor: '#FFFFFF88' },
  featuredArrowCircle: { position: 'absolute', right: 14, bottom: 18, width: 42, height: 42, borderRadius: 21, overflow: 'hidden', backgroundColor: '#17131866', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF88' },
  featuredDateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  featuredDate: { color: C.pink, fontSize: 10, fontWeight: '900' },
  featuredPrice: { color: C.pink, fontSize: 13, fontWeight: '900' },
  featuredName: { fontSize: 20, lineHeight: 23, fontWeight: '900', marginTop: 6 },
  featuredMeta: { color: C.muted, fontSize: 10, lineHeight: 15, marginTop: 6 },
  featuredBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  featuredHost: { color: C.muted, fontSize: 10, fontWeight: '700' },
  featuredArrow: { color: C.pink, fontSize: 10, fontWeight: '900' },
  eventsLoading: { padding: 34, alignItems: 'center' },
  eventsEmpty: { marginHorizontal: 18, padding: 24, borderRadius: 22, backgroundColor: '#FFF', alignItems: 'center' },
  eventsEmptyTitle: { fontSize: 16, fontWeight: '900' },
  eventsEmptyText: { color: C.muted, fontSize: 11, textAlign: 'center', marginTop: 6 },
  eventModalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#17131888' },
  eventPeek: { height: 166, margin: 18, borderRadius: 30, overflow: 'hidden', backgroundColor: C.plum, position: 'relative' },
  eventPeekImage: { ...StyleSheet.absoluteFillObject, opacity: 0.8 },
  eventPeekShade: { ...StyleSheet.absoluteFillObject, backgroundColor: '#17131866' },
  eventPeekGlass: { position: 'absolute', left: 10, right: 10, top: 10, bottom: 10, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#FFFFFF66' },
  eventPeekCopy: { position: 'absolute', left: 20, right: 78, bottom: 20 },
  eventPeekTitle: { color: '#FFF', fontSize: 24, lineHeight: 27, fontWeight: '900', marginTop: 5 },
  eventPeekMeta: { color: '#FFFFFFCC', fontSize: 10, fontWeight: '700', marginTop: 7 },
  eventPeekArrow: { position: 'absolute', right: 17, bottom: 17, width: 56, height: 56, borderRadius: 28, overflow: 'hidden', backgroundColor: '#FFFFFF44', borderWidth: 1, borderColor: '#FFFFFF88', alignItems: 'center', justifyContent: 'center' },
  eventDetail: { maxHeight: '92%', marginHorizontal: 14, marginBottom: 16, backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
  eventDetailImage: { width: '100%', height: 204 },
  eventDetailCopy: { padding: 18, paddingBottom: 28 },
  eventDetailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventDetailK: { color: C.pink, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  eventDetailPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  eventDetailDate: { color: C.pink, fontSize: 11, fontWeight: '900' },
  eventDetailPrice: { color: C.pink, fontSize: 15, fontWeight: '900' },
  eventDetailTitle: { fontSize: 24, lineHeight: 28, fontWeight: '900', marginTop: 7 },
  eventDetailMeta: { color: C.muted, fontSize: 11, marginTop: 8 },
  eventDetailDescription: { fontSize: 12, lineHeight: 18, marginTop: 14, color: '#4D424A' },
  buyTicket: { backgroundColor: C.pink, borderRadius: 24, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  buyTicketText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
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
   subShade: { ...StyleSheet.absoluteFillObject, backgroundColor: '#17131855' },
   subText: { position: 'absolute', left: 8, right: 8, bottom: 7, color: '#FFF', fontSize: 10, fontWeight: '900' },
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
  cartCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center' },
  count: { position: 'absolute', right: -3, top: -4, minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: 10, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.bg },
  countText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  filterSheet: { height: '88%', backgroundColor: C.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingBottom: 14 },
  sheetHandleArea: { height: 26, alignItems: 'center', justifyContent: 'center' },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#C9C1C6' },
  filterContent: { padding: 18, paddingBottom: 32 },
  filterBody: { flex: 1, paddingHorizontal: 18 },
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
  apply: { marginTop: 16, marginHorizontal: 18, borderRadius: 25, backgroundColor: C.pink, padding: 15, alignItems: 'center' },
  applyText: { color: '#FFF', fontWeight: '900' },
  selectionSheet: { maxHeight: '72%', backgroundColor: C.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingBottom: 22 },
  selectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  selectionTitle: { fontSize: 20, fontWeight: '900' },
  selectionHint: { color: C.muted, fontSize: 13, paddingHorizontal: 20, marginBottom: 14 },
  selectionRow: { minHeight: 58, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: C.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectionText: { fontSize: 15, fontWeight: '700' },
  pricePresets: { gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
  preset: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line },
  presetOn: { backgroundColor: C.ink, borderColor: C.ink },
  presetText: { fontSize: 11, fontWeight: '800' },
  presetTextOn: { color: '#FFF' },
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