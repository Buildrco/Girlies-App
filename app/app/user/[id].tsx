import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { C } from '../../constants/theme';
import { I } from '../../components/Icons';
import { Avatar, VerifiedMark } from '../../Avatar';
import { getProducts, type ProfileRecord, type ProductRecord } from '../../lib/social';
import { supabase } from '../../lib/supabase';

type Post = { id: string; media_urls: string[] | null };

export default function UserProfile() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const userId = Array.isArray(params.id) ? params.id[0] : params.id || '';
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [storeId, setStoreId] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [profileResult, postsResult, storeResult] = await Promise.all([
          supabase.from('profiles').select('id,display_name,handle,bio,avatar_url,verified,followers_count,following_count,created_at,country,area,location,date_of_birth,links').eq('id', userId).maybeSingle(),
          supabase.from('posts').select('id,media_urls').eq('author_id', userId).order('created_at', { ascending: false }),
          supabase.from('stores').select('id').eq('owner_id', userId).maybeSingle(),
        ]);
        if (profileResult.error) throw profileResult.error;
        if (postsResult.error) throw postsResult.error;
        if (!active) return;
        setProfile(profileResult.data as ProfileRecord | null);
        setPosts((postsResult.data || []) as Post[]);
        if (storeResult.data) { setStoreId(storeResult.data.id); setProducts(await getProducts(30, { storeId: storeResult.data.id })); }
      } catch { if (active) setProfile(null); } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [userId]);
  if (loading) return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator color={C.pink} /></View></SafeAreaView>;
  if (!profile) return <SafeAreaView style={s.safe}><View style={s.center}><Text style={s.title}>Profile unavailable</Text><Pressable style={s.primary} onPress={() => router.back()}><Text style={s.primaryText}>Go back</Text></Pressable></View></SafeAreaView>;
  const images = posts.flatMap(post => post.media_urls || []).filter(Boolean);
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
    <View style={s.top}><Pressable onPress={() => router.back()}><I name="back" size={31} /></Pressable><Text style={s.topTitle}>Profile</Text><View style={{ width: 31 }} /></View>
    <View style={s.cover}><View style={s.coverShape} /><View style={s.avatar}><Avatar size={86} uri={profile.avatar_url} /></View></View>
    <Text style={s.name}>{profile.display_name} {profile.verified && <VerifiedMark size={16} />}</Text><Text style={s.handle}>@{profile.handle}{profile.location ? ` · ${profile.location}` : ''}</Text>
    <Text style={s.bio}>{profile.bio || 'Sharing good finds and little moments with the girls.'}</Text>
    {(profile.country || profile.area) && <Text style={s.place}><I name="location" size={14} color={C.muted} /> {[profile.area, profile.country].filter(Boolean).join(', ')}</Text>}
    {profile.links?.length ? <View style={s.links}>{profile.links.map(link => <Text key={link} style={s.link}>{link}</Text>)}</View> : null}
    <View style={s.stats}><View><Text style={s.num}>{profile.followers_count}</Text><Text style={s.label}>Followers</Text></View><View><Text style={s.num}>{profile.following_count}</Text><Text style={s.label}>Following</Text></View><View><Text style={s.num}>{posts.length}</Text><Text style={s.label}>Posts</Text></View></View>
    {storeId ? <Pressable style={s.shopButton} onPress={() => router.push({ pathname: '/seller/[id]', params: { id: storeId } })}><I name="shop" size={19} color="#FFF" /><Text style={s.primaryText}>Visit {profile.display_name}’s shop</Text></Pressable> : null}
    <Text style={s.section}>Posts</Text><View style={s.grid}>{images.map(image => <Image key={image} source={{ uri: image }} style={s.tile} />)}{!images.length && <Text style={s.empty}>No posts yet.</Text>}</View>
    {products.length ? <><Text style={s.section}>Shop</Text><View style={s.productGrid}>{products.map(product => <Pressable key={product.id} style={s.product} onPress={() => router.push({ pathname: '/product', params: { id: product.id } })}>{product.image_urls?.[0] ? <Image source={{ uri: product.image_urls[0] }} style={s.productImage} /> : <View style={[s.productImage, s.placeholder]}><I name="shop" size={20} color={C.pink} /></View>}<Text style={s.productName} numberOfLines={1}>{product.name}</Text><Text style={s.price}>GH₵ {Number(product.price).toFixed(0)}</Text></Pressable>)}</View></> : null}
  </ScrollView></SafeAreaView>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 25 }, scroll: { padding: 18, paddingBottom: 45 }, top: { height: 55, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, topTitle: { fontSize: 20, fontWeight: '900' },
  cover: { height: 160, borderRadius: 31, backgroundColor: C.sun, overflow: 'hidden', position: 'relative' }, coverShape: { position: 'absolute', width: 240, height: 240, borderRadius: 120, right: -35, bottom: -100, backgroundColor: C.rose }, avatar: { position: 'absolute', left: 20, bottom: 15, borderWidth: 5, borderColor: '#FFF', borderRadius: 50 }, name: { fontSize: 24, fontWeight: '900', marginTop: 16 }, handle: { fontSize: 11, color: C.muted, marginTop: 2 }, bio: { fontSize: 13, lineHeight: 19, fontWeight: '600', marginTop: 10 }, place: { color: C.muted, fontSize: 11, marginTop: 7, flexDirection: 'row', alignItems: 'center' }, links: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 }, link: { color: C.pink, fontSize: 11, fontWeight: '800' }, stats: { flexDirection: 'row', gap: 35, marginTop: 16 }, num: { fontSize: 16, fontWeight: '900' }, label: { fontSize: 11, color: C.muted, marginTop: 2 }, shopButton: { height: 46, borderRadius: 23, backgroundColor: C.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 17 }, primaryText: { color: '#FFF', fontWeight: '900' }, section: { fontSize: 13, fontWeight: '900', marginTop: 25, marginBottom: 10 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 }, tile: { width: '32.3%', height: 135, borderRadius: 15 }, empty: { color: C.muted, fontSize: 12, padding: 20 }, productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, product: { width: '48%', backgroundColor: '#FFF', borderRadius: 20, padding: 9 }, productImage: { width: '100%', height: 130, borderRadius: 15 }, placeholder: { backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' }, productName: { fontSize: 13, fontWeight: '900', marginTop: 7 }, price: { color: C.pink, fontWeight: '900', marginTop: 3 }, title: { fontSize: 18, fontWeight: '900' }, primary: { backgroundColor: C.ink, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 22, marginTop: 16 },
});