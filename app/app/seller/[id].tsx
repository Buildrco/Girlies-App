import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { C } from '../../constants/theme';
import { I } from '../../components/Icons';
import { Avatar, VerifiedMark } from '../../Avatar';
import { ProductCard } from '../../components/ProductCard';

export default function Seller() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const index = Number(id) || 0;
  const name = ['Nia Hair', 'Amara Beauty', 'Glow Room', 'The Bag Edit', 'Scent Lab'][index];
  const hero = ['https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1000&q=85', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1000&q=85'][index % 2];
  const [following, setFollowing] = useState(false);
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.scroll}><View style={s.top}><Pressable onPress={() => router.back()}><I name="back" size={34} /></Pressable><Pressable onPress={() => router.push('/chat')}><I name="chat" size={23} /></Pressable></View><View style={s.cover}><Image source={{ uri: hero }} style={s.coverImg} /></View><View style={s.profile}><Avatar size={82} index={index} /><Text style={s.name}>{name} <VerifiedMark size={16} /></Text><Text style={s.meta}>Verified seller · Accra · 8.3k followers</Text><Text style={s.bio}>Hair, beauty and pieces selected with the girlies in mind. New drops every week.</Text><View style={s.actions}><Pressable onPress={() => setFollowing(!following)} style={s.follow}><Text style={{ fontWeight: '900' }}>{following ? 'Following' : 'Follow'}</Text></Pressable><Pressable style={s.message} onPress={() => router.push('/chat')}><Text style={{ color: '#FFF', fontWeight: '900' }}>Message</Text></Pressable></View></View><View style={s.tabs}><Text style={s.active}>Shop</Text><Text>Posts</Text><Text>About</Text></View><View style={s.grid}>{['Silk press wig', 'Body wave', 'Satin closure', 'Curly bob'].map((item, itemIndex) => <ProductCard key={item} name={item} price={'GH₵ ' + [480, 620, 390, 350][itemIndex]} image={hero} seller={name} onPress={() => router.push({ pathname: '/product', params: { id: String(itemIndex) } })} />)}</View></ScrollView></SafeAreaView>;
}

const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.bg }, scroll: { padding: 18, paddingBottom: 30 }, top: { height: 55, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, cover: { height: 190, borderRadius: 31, overflow: 'hidden' }, coverImg: { width: '100%', height: '100%' }, profile: { marginTop: -32, backgroundColor: C.bg, borderTopLeftRadius: 34, borderTopRightRadius: 34, paddingTop: 14 }, name: { fontSize: 24, fontWeight: '900', marginTop: 7 }, meta: { fontSize: 11, color: C.muted, marginTop: 3 }, bio: { fontSize: 12, lineHeight: 18, fontWeight: '600', marginTop: 10 }, actions: { flexDirection: 'row', gap: 8, marginTop: 13 }, follow: { flex: 1, height: 42, borderRadius: 21, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' }, message: { flex: 1, height: 42, borderRadius: 21, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }, tabs: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: C.line, marginBottom: 12 }, active: { fontWeight: '900', color: C.pink }, grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' } });