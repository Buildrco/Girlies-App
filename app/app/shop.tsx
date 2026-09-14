import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { ProductCard } from '../components/ProductCard';
import { useChromeVisibility } from '../components/BottomNav';
import { SectionTitle } from '../components/SectionTitle';
const cat=[['HAIR','Wigs, braids & bundles',C.rose,'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1000&q=85'],['BEAUTY','Makeup, skincare & glow',C.sun,'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1000&q=85'],['FASHION','Looks for every plan',C.lilac,'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=85'],['FRAGRANCE','Scents that stay',C.mint,'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1000&q=85']];
export default function Shop() {
  const router = useRouter();
  const { onScroll } = useChromeVisibility();
  const [categoryIndex, setCategoryIndex] = useState(0);
  const products = [
    'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=700&q=85',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=700&q=85',
    'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=700&q=85',
    'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=700&q=85',
  ];
  return <SafeAreaView style={s.safe}>
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}>
      <View style={s.top}><View><Text style={s.k}>SHOP</Text><Text style={s.h}>Find your next thing.</Text></View><Pressable style={s.circle}><I name="bag" /></Pressable></View>
      <View style={s.hero}><Image source={{ uri: cat[categoryIndex][3] }} style={s.heroImg} /><View style={[s.heroColor, { backgroundColor: cat[categoryIndex][2] }]} /><View style={s.heroCopy}><Text style={s.heroCat}>{cat[categoryIndex][0]}</Text><Text style={s.heroTitle}>{cat[categoryIndex][1]}</Text><Text style={s.heroSmall}>Swipe categories →</Text></View></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>{cat.map((category, index) => <Pressable key={category[0]} onPress={() => setCategoryIndex(index)} style={[s.catChip, index === categoryIndex && { backgroundColor: C.ink }]}><Text style={{ fontWeight: '900', fontSize: 11, color: index === categoryIndex ? '#FFF' : C.ink }}>{category[0]}</Text></Pressable>)}</ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 15 }}>{['Trending', 'Nearby', 'New drops', 'Under GH₵500', 'Top rated', 'Imported'].map((filter, index) => <Pressable key={filter} style={[s.filter, index === 0 && s.filterOn]}><Text style={{ fontWeight: '800', fontSize: 11, color: index === 0 ? '#FFF' : C.muted }}>{filter}</Text></Pressable>)}</ScrollView>
      <SectionTitle title="Fresh finds" />
      <View style={s.grid}>{['Silk press wig', 'Soft glam set', 'Satin mini bag', 'Rose oud', 'Linen co-ord', 'Glow kit'].map((name, index) => <ProductCard key={name} name={name} price={'GH₵ ' + [480, 260, 340, 320, 410, 190][index]} image={products[index % products.length]} seller={['Nia Hair', 'Glow Room', 'Amara Store', 'Scent Lab', 'Nia Closet', 'Glow Room'][index]} onPress={() => router.push({ pathname: '/product', params: { id: String(index) } })} />)}</View>
      <View style={s.import}><Text style={s.importK}>SHOP BEYOND GHANA</Text><Text style={s.importTitle}>International finds, clearly marked.</Text><Text style={s.importText}>See estimated arrival before you pay. Your order stays trackable from source to doorstep.</Text><Pressable onPress={() => router.push({ pathname: '/product', params: { id: 'international' } })} style={s.importBtn}><Text style={{ fontWeight: '900' }}>Explore imports →</Text></Pressable></View>
    </ScrollView>
  </SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:C.bg},scroll:{padding:18,paddingBottom:120},top:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},k:{fontSize:10,fontWeight:'900',letterSpacing:1.3,color:C.muted},h:{fontSize:27,fontWeight:'900',marginTop:4},circle:{width:45,height:45,borderRadius:23,backgroundColor:C.cream,alignItems:'center',justifyContent:'center'},hero:{height:235,borderRadius:34,overflow:'hidden',marginTop:17,position:'relative',backgroundColor:C.rose},heroImg:{position:'absolute',right:-10,bottom:0,width:'62%',height:'100%',resizeMode:'cover'},heroColor:{position:'absolute',left:0,top:0,bottom:0,width:'59%',opacity:.95},heroCopy:{position:'absolute',left:20,top:20,width:'50%'},heroCat:{fontSize:11,fontWeight:'900',letterSpacing:1.4},heroTitle:{fontSize:27,lineHeight:29,fontWeight:'900',marginTop:8},heroSmall:{fontSize:11,fontWeight:'800',marginTop:15},catChip:{paddingHorizontal:17,paddingVertical:10,borderRadius:19,backgroundColor:'#FFF',marginRight:8,borderWidth:1,borderColor:C.line},filter:{paddingHorizontal:14,paddingVertical:10,borderRadius:18,backgroundColor:'#FFF',marginRight:8},filterOn:{backgroundColor:C.ink},grid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between'},import:{marginTop:28,padding:22,borderRadius:32,backgroundColor:C.plum,overflow:'hidden'},importK:{fontSize:10,letterSpacing:1.2,fontWeight:'900',color:C.sun},importTitle:{fontSize:25,lineHeight:28,fontWeight:'900',color:'#FFF',marginTop:8},importText:{fontSize:12,lineHeight:17,color:'#F3E8EE',fontWeight:'600',marginTop:8},importBtn:{alignSelf:'flex-start',backgroundColor:C.sun,paddingHorizontal:15,paddingVertical:10,borderRadius:19,marginTop:15}})
