import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { getSellerStudioMetrics, getStore, type SellerStudioMetrics } from '../lib/social';

const money = (value: number) => 'GH₵ ' + Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const primarySections = [
  ['analytics', 'Analytics', 'Real orders, customers and shop activity', 'chart'],
  ['balance', 'Balance', 'Available earnings and withdrawals', 'wallet'],
  ['catalog', 'Catalog', 'Products and services', 'bag'],
  ['orders', 'Orders', 'Review and fulfil every order', 'receipt'],
  ['customers', 'Customers', 'Paid buyers and returning customers', 'people'],
  ['product-analytics', 'Product activity', 'Views, clicks and purchases by item', 'chart'],
] as const;
const secondarySections = [
  ['referrals', 'Referrals'], ['messages', 'Messages'], ['settings', 'Seller settings'],
] as const;

export default function SellerStudio() {
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [metrics, setMetrics] = useState<SellerStudioMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { setLoading(true); setError(''); const nextStore = await getStore('me'); setStore(nextStore); if (nextStore) setMetrics(await getSellerStudioMetrics(nextStore.id)); }
    catch (e: any) { setError(e?.message || 'Could not load Seller Studio.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (loading) return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator color={C.ink} /></View></SafeAreaView>;
  if (!store) return <SafeAreaView style={s.safe}><View style={s.center}><Text style={s.emptyTitle}>Your shop is waiting.</Text><Text style={s.emptyText}>Open a storefront to unlock Seller Studio.</Text><Pressable style={s.primary} onPress={() => router.push('/shop-editor')}><Text style={s.primaryText}>Open my shop</Text></Pressable></View></SafeAreaView>;
  const live = metrics || { products: 0, services: 0, orders: 0, paid_orders: 0, gross_revenue: 0, pending_revenue: 0, visitors: 0, views: 0, engagement: 0, clicks: 0, carts: 0, checkouts: 0, purchases: 0, customers: 0, withdrawn: 0, transactions: [] };
  const quick = [['Orders', String(live.orders), 'receipt'], ['Visitors', String(live.visitors), 'people'], ['Purchases', String(live.purchases), 'bag'], ['Available', money(live.gross_revenue - live.withdrawn), 'wallet']] as const;
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
    <View style={s.top}><Pressable onPress={() => router.back()}><I name="back" size={30} /></Pressable><View style={s.heading}><Text style={s.h}>Seller Studio</Text><Text style={s.storeName}>{store.name}</Text></View><Pressable onPress={() => router.push('/seller-studio/settings')}><I name="settings" size={23} /></Pressable></View>
    <View style={s.sectionHead}><View><Text style={s.eyebrow}>SHOP OVERVIEW</Text><Text style={s.sectionTitle}>Your business at a glance</Text></View><Pressable onPress={() => router.push('/seller-studio/analytics')}><Text style={s.linkText}>Analytics →</Text></Pressable></View>
    {error && <View style={s.error}><Text style={s.errorText}>{error}</Text><Pressable onPress={load}><Text style={s.retry}>Retry</Text></Pressable></View>}
    <View style={s.quickGrid}>{quick.map(([label, value, icon]) => <Pressable key={label} style={s.quickCard} onPress={() => router.push(label === 'Available' ? '/seller-studio/balance' : '/seller-studio/analytics')}><View style={s.icon}><I name={icon} size={19} color="#FFF" filled /></View><Text style={s.quickValue}>{value}</Text><Text style={s.quickLabel}>{label}</Text></Pressable>)}</View>
    <Text style={s.sectionTitle}>Run the business</Text><View style={s.sectionGrid}>{primarySections.map(([slug, title, subtitle, icon]) => <Pressable key={slug} style={s.sectionCard} onPress={() => router.push('/seller-studio/' + slug)}><View style={s.sectionIcon}><I name={icon} size={21} color="#FFF" filled /></View><View style={s.sectionCopy}><Text style={s.sectionCardTitle}>{title}</Text><Text style={s.sectionCardText}>{subtitle}</Text></View><I name="forward" size={19} color={C.ink} /></Pressable>)}</View>
    <Text style={[s.sectionTitle, { marginTop: 24 }]}>More seller tools</Text><View style={s.toolGrid}>{secondarySections.map(([slug, title]) => <Pressable key={slug} style={s.tool} onPress={() => router.push('/seller-studio/' + slug)}><Text style={s.toolTitle}>{title}</Text><I name="arrow" size={16} color={C.ink} /></Pressable>)}</View>
  </ScrollView></SafeAreaView>;
}
const s = StyleSheet.create({ safe:{flex:1,backgroundColor:'#F8F8F8'}, scroll:{padding:18,paddingBottom:55}, center:{flex:1,alignItems:'center',justifyContent:'center',padding:24}, top:{height:60,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}, heading:{alignItems:'center'}, h:{fontSize:20,fontWeight:'900',color:C.ink}, storeName:{fontSize:10,color:C.muted,marginTop:2}, sectionHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-end',marginTop:22,marginBottom:12}, eyebrow:{fontSize:9,fontWeight:'900',letterSpacing:1.1,color:C.muted}, sectionTitle:{fontSize:18,fontWeight:'900',marginTop:4,color:C.ink}, linkText:{color:C.ink,fontWeight:'900',fontSize:11}, quickGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:9,marginBottom:24}, quickCard:{width:'48%',minHeight:106,borderRadius:20,backgroundColor:'#FFF',padding:14}, icon:{width:36,height:36,borderRadius:12,backgroundColor:C.ink,alignItems:'center',justifyContent:'center',marginBottom:10}, quickValue:{fontSize:18,fontWeight:'900',color:C.ink}, quickLabel:{fontSize:11,color:C.muted,marginTop:4}, sectionGrid:{gap:9,marginTop:12}, sectionCard:{minHeight:76,borderRadius:20,backgroundColor:'#FFF',padding:12,flexDirection:'row',alignItems:'center',gap:11}, sectionIcon:{width:44,height:44,borderRadius:14,backgroundColor:C.ink,alignItems:'center',justifyContent:'center'}, sectionCopy:{flex:1}, sectionCardTitle:{fontSize:14,fontWeight:'900',color:C.ink}, sectionCardText:{fontSize:11,color:C.muted,marginTop:3}, toolGrid:{flexDirection:'row',flexWrap:'wrap',gap:9,marginTop:12}, tool:{width:'48%',minHeight:56,borderRadius:18,backgroundColor:'#FFF',padding:13,flexDirection:'row',justifyContent:'space-between',alignItems:'center'}, toolTitle:{fontSize:12,fontWeight:'900',color:C.ink,maxWidth:'80%'}, error:{padding:14,borderRadius:18,backgroundColor:'#FFF',marginBottom:11}, errorText:{fontSize:12,color:C.red}, retry:{color:C.ink,fontWeight:'900',marginTop:7}, emptyTitle:{fontSize:18,fontWeight:'900'}, emptyText:{fontSize:12,color:C.muted,marginTop:5}, primary:{height:46,paddingHorizontal:18,borderRadius:23,backgroundColor:C.ink,alignItems:'center',justifyContent:'center',marginTop:16}, primaryText:{color:'#FFF',fontWeight:'900'} });
