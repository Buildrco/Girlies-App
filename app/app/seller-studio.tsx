import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { deleteProduct, deleteService, getProducts, getServices, getStore, type ProductRecord, type ServiceRecord } from '../lib/social';

export default function SellerStudio() {
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const nextStore = await getStore('me');
      setStore(nextStore);
       if (nextStore) {
         setProducts(await getProducts(50, { storeId: nextStore.id }));
         setServices(await getServices(nextStore.owner_id));
       }
    } catch (e: any) { setError(e?.message || 'Could not load your shop.'); } finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  function confirmDeleteProduct(product: ProductRecord) {
    Alert.alert('Delete product?', `“${product.name}” will be removed from your store.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await deleteProduct(product.id); await load(); } catch (e: any) { Alert.alert('Could not delete product', e?.message || 'Please try again.'); } } },
    ]);
  }
  function confirmDeleteService(service: ServiceRecord) {
    Alert.alert('Delete service?', `“${service.name}” will be removed from your store.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await deleteService(service.id); await load(); } catch (e: any) { Alert.alert('Could not delete service', e?.message || 'Please try again.'); } } },
    ]);
  }

  if (loading) return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator color={C.pink} /></View></SafeAreaView>;
  if (!store) return <SafeAreaView style={s.safe}><View style={s.center}><Text style={s.emptyTitle}>Your shop is waiting.</Text><Text style={s.emptyText}>Open a storefront, then start adding products.</Text><Pressable style={s.primary} onPress={() => router.push('/shop-editor')}><Text style={s.primaryText}>Open my shop</Text></Pressable></View></SafeAreaView>;
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
    <View style={s.top}><Pressable onPress={() => router.back()}><I name="back" size={30} /></Pressable><Text style={s.h}>Seller Studio</Text><Pressable onPress={() => router.push('/shop-editor')}><I name="settings" size={23} /></Pressable></View>
    <View style={s.hero}><Text style={s.k}>YOUR STORE</Text><Text style={s.heroTitle}>{store.name}</Text><Text style={s.link}>herlo.app/{store.slug}</Text><Text style={s.heroText}>{store.description || 'Add a description so shoppers know what you sell.'}</Text><Pressable style={s.view} onPress={() => router.push({ pathname: '/seller/[id]', params: { id: store.slug } })}><Text style={s.viewText}>View store</Text><I name="arrow" size={16} /></Pressable></View>
     <View style={s.actions}><Pressable style={s.actionPrimary} onPress={() => router.push('/product-editor')}><I name="plus" size={20} color="#FFF" /><Text style={s.actionPrimaryText}>Add product</Text></Pressable><Pressable style={s.actionSecondary} onPress={() => router.push('/service-editor')}><I name="plus" size={19} color={C.ink} /><Text style={s.actionSecondaryText}>Add service</Text></Pressable></View><Pressable style={s.editShop} onPress={() => router.push('/shop-editor')}><I name="settings" size={18} color={C.ink} /><Text style={s.actionSecondaryText}>Edit shop</Text></Pressable>
     <View style={s.stats}><View style={s.stat}><Text style={s.num}>{products.length}</Text><Text style={s.label}>Products</Text></View><View style={s.stat}><Text style={s.num}>{services.length}</Text><Text style={s.label}>Services</Text></View><View style={s.stat}><Text style={s.num}>Live</Text><Text style={s.label}>Shop status</Text></View></View>
    <View style={s.sectionRow}><Text style={s.section}>Your products</Text><Text style={s.muted}>{products.length} listed</Text></View>
    {error && <View style={s.error}><Text style={s.errorText}>{error}</Text><Pressable onPress={load}><Text style={s.retry}>Retry</Text></Pressable></View>}
    {!products.length && !error && <View style={s.emptyCard}><Text style={s.spark}>✦</Text><Text style={s.emptyTitle}>Your first product belongs here.</Text><Text style={s.emptyText}>Add a photo, description, price and optional bid price. Published products appear in Shop and Fresh finds.</Text><Pressable style={s.primary} onPress={() => router.push('/product-editor')}><Text style={s.primaryText}>Add your first product</Text></Pressable></View>}
     <View style={s.productList}>{products.map(product => <View key={product.id} style={s.product}><Pressable style={s.productMain} onPress={() => router.push({ pathname: '/product-editor', params: { id: product.id } })}>{product.image_urls?.[0] ? <Image source={{ uri: product.image_urls[0] }} style={s.productImage} /> : <View style={[s.productImage, s.placeholder]}><I name="shop" size={24} color={C.pink} /></View>}<View style={s.productCopy}><Text style={s.productName} numberOfLines={1}>{product.name}</Text><Text style={s.productMeta}>{product.category} · {product.stock_status === 'out_of_stock' ? 'Out of stock' : `${product.stock} in stock`}</Text><Text style={s.productPrice}>GH₵ {Number(product.price).toFixed(0)}</Text></View></Pressable><View style={s.itemActions}><Pressable onPress={() => router.push({ pathname: '/product-editor', params: { id: product.id } })}><Text style={s.editLabel}>Edit</Text></Pressable><Pressable onPress={() => confirmDeleteProduct(product)}><Text style={s.deleteLabel}>Delete</Text></Pressable></View></View>)}</View>
     <View style={s.sectionRow}><Text style={s.section}>Your services</Text><Text style={s.muted}>{services.length} listed</Text></View>
     <View style={s.productList}>{services.map(service => <View key={service.id} style={s.product}><Pressable style={s.productMain} onPress={() => router.push({ pathname: '/service-editor', params: { id: service.id } })}><View style={s.serviceImage}>{service.image_urls?.[0] ? <Image source={{ uri: service.image_urls[0] }} style={s.serviceImage} /> : <I name="spark" size={22} color={C.pink} />}</View><View style={s.productCopy}><Text style={s.productName} numberOfLines={1}>{service.name}</Text><Text style={s.productMeta}>{service.category} · {service.duration_minutes} min</Text><Text style={s.productPrice}>GH₵ {Number(service.price).toFixed(0)}</Text></View></Pressable><View style={s.itemActions}><Pressable onPress={() => router.push({ pathname: '/service-editor', params: { id: service.id } })}><Text style={s.editLabel}>Edit</Text></Pressable><Pressable onPress={() => confirmDeleteService(service)}><Text style={s.deleteLabel}>Delete</Text></Pressable></View></View>)}</View>
  </ScrollView></SafeAreaView>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 25 }, scroll: { padding: 18, paddingBottom: 45 }, top: { height: 55, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, h: { fontSize: 20, fontWeight: '900' },
  hero: { marginTop: 12, padding: 22, borderRadius: 32, backgroundColor: C.plum }, k: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2, color: C.sun }, heroTitle: { fontSize: 27, fontWeight: '900', color: '#FFF', marginTop: 7 }, link: { fontSize: 11, color: '#EADDE4', marginTop: 3 }, heroText: { color: '#F4E7EF', fontSize: 12, lineHeight: 18, marginTop: 12 }, view: { alignSelf: 'flex-start', backgroundColor: C.sun, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 7 }, viewText: { fontWeight: '900' },
  actions: { flexDirection: 'row', gap: 9, marginTop: 12 }, actionPrimary: { flex: 1, height: 48, borderRadius: 24, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 }, actionPrimaryText: { color: '#FFF', fontWeight: '900' }, actionSecondary: { flex: 1, height: 48, borderRadius: 24, backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 }, actionSecondaryText: { fontWeight: '900' }, editShop: { height: 44, borderRadius: 22, marginTop: 9, backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 12 }, stat: { flex: 1, padding: 15, borderRadius: 22, backgroundColor: '#FFF' }, num: { fontSize: 16, fontWeight: '900' }, label: { fontSize: 10, color: C.muted, marginTop: 3 }, sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 26, marginBottom: 9 }, section: { fontSize: 13, fontWeight: '900' }, muted: { color: C.muted, fontSize: 11 }, error: { padding: 15, borderRadius: 20, backgroundColor: '#FFF0F1' }, errorText: { color: C.red, fontSize: 12 }, retry: { color: C.pink, fontWeight: '900', marginTop: 8 }, emptyCard: { padding: 24, borderRadius: 28, backgroundColor: '#FFF', alignItems: 'center' }, spark: { fontSize: 34 }, emptyTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center', marginTop: 7 }, emptyText: { fontSize: 12, color: C.muted, textAlign: 'center', lineHeight: 18, marginTop: 5 }, primary: { height: 45, paddingHorizontal: 18, borderRadius: 23, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', marginTop: 16 }, primaryText: { color: '#FFF', fontWeight: '900' },
   productList: { gap: 8 }, product: { minHeight: 82, padding: 10, borderRadius: 23, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', gap: 11 }, productMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11 }, productImage: { width: 62, height: 62, borderRadius: 17 }, serviceImage: { width: 62, height: 62, borderRadius: 17, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' }, placeholder: { backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' }, productCopy: { flex: 1 }, itemActions: { alignItems: 'flex-end', gap: 10 }, productName: { fontSize: 14, fontWeight: '900' }, productMeta: { color: C.muted, fontSize: 11, marginTop: 4 }, productPrice: { color: C.pink, fontSize: 13, fontWeight: '900', marginTop: 4 }, editLabel: { color: C.pink, fontWeight: '900', fontSize: 12 }, deleteLabel: { color: C.red, fontWeight: '900', fontSize: 12 },
});