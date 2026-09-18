import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { Avatar } from '../Avatar';
import { getProducts, type ProductRecord } from '../lib/social';

const filters = ['All', 'Hair', 'Beauty', 'Fashion', 'Fragrance', 'Women only', 'Men only', 'In stock', 'Under GH₵500'];

export default function Search() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('All');
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getProducts(80, { search: q }).then(rows => active && setProducts(rows)).catch(() => active && setProducts([])).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [q]);

  const visible = useMemo(() => products.filter(product => {
    if (filter === 'All') return true;
    if (['Hair', 'Beauty', 'Fashion', 'Fragrance'].includes(filter)) return product.category.toLowerCase() === filter.toLowerCase();
    if (filter === 'Women only' || filter === 'Men only') return product.gender === filter.toLowerCase();
    if (filter === 'In stock') return product.stock_status !== 'out_of_stock';
    return Number(product.price) < 500;
  }), [filter, products]);

  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
    <View style={s.top}><Pressable onPress={() => router.back()}><I name="back" size={34} /></Pressable><View style={s.search}><I name="search" size={20} color={C.muted} /><TextInput autoFocus value={q} onChangeText={setQ} placeholder="Search products and shops…" placeholderTextColor={C.muted} style={s.input} /></View></View>
    <Text style={s.k}>FILTERS</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{filters.map(item => <Pressable key={item} onPress={() => setFilter(item)} style={[s.filter, filter === item && s.filterOn]}><Text style={[s.filterText, filter === item && s.filterTextOn]}>{item}</Text></Pressable>)}</ScrollView>
    <Text style={s.k}>PRODUCTS</Text>{loading && <ActivityIndicator color={C.pink} style={{ margin: 20 }} />}{!loading && !visible.length && <View style={s.empty}><Text style={s.emptyTitle}>No matching products</Text><Text style={s.meta}>Try another filter or search term.</Text></View>}
    <View style={s.grid}>{visible.map(product => <Pressable key={product.id} style={s.card} onPress={() => router.push({ pathname: '/product', params: { id: product.id } })}><View style={s.cardImage}><Text style={s.cardEmoji}>✦</Text></View><Text style={s.name} numberOfLines={1}>{product.name}</Text><Text style={s.meta}>{product.category} · {product.store?.name || 'Seller'}</Text><Text style={s.price}>GH₵ {Number(product.price).toFixed(0)}</Text></Pressable>)}</View>
  </ScrollView></SafeAreaView>;
}

const s = StyleSheet.create({ safe:{flex:1,backgroundColor:C.bg},scroll:{padding:18,paddingBottom:110},top:{flexDirection:'row',alignItems:'center',gap:10},search:{flex:1,height:50,borderRadius:25,backgroundColor:'#FFF',borderWidth:1,borderColor:C.line,flexDirection:'row',alignItems:'center',paddingHorizontal:14,gap:8},input:{flex:1,fontSize:14},k:{fontSize:10,fontWeight:'900',letterSpacing:1.2,color:C.muted,marginTop:25,marginBottom:10},filter:{paddingHorizontal:14,paddingVertical:10,borderRadius:18,backgroundColor:'#FFF',marginRight:8,borderWidth:1,borderColor:C.line},filterOn:{backgroundColor:C.ink,borderColor:C.ink},filterText:{fontSize:11,fontWeight:'800',color:C.muted},filterTextOn:{color:'#FFF'},grid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:10},card:{width:'48%',backgroundColor:'#FFF',borderRadius:22,padding:10},cardImage:{height:135,borderRadius:16,backgroundColor:C.rose,alignItems:'center',justifyContent:'center'},cardEmoji:{fontSize:32},name:{fontSize:13,fontWeight:'900',marginTop:8},meta:{fontSize:11,color:C.muted,marginTop:3},price:{fontSize:13,fontWeight:'900',color:C.pink,marginTop:6},empty:{padding:35,alignItems:'center'},emptyTitle:{fontSize:18,fontWeight:'900'}});