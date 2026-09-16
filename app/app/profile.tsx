import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { Avatar, VerifiedMark } from '../Avatar';
import { I } from '../components/Icons';
import { useChromeVisibility } from '../components/BottomNav';
import type { ProfileRecord, ProductRecord } from '../lib/social';
import { getCurrentProfile, getProducts, getStore } from '../lib/social';
import { supabase } from '../lib/supabase';

type Post = { id: string; media_urls: string[] | null };

export default function Profile() {
  const router = useRouter();
  const { onScroll } = useChromeVisibility();
  const [tab, setTab] = useState('Posts');
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (userId: string | null) => {
    if (!userId) {
      setProfile(null);
      setPosts([]);
      return;
    }
    const [currentProfile, postsResult, store] = await Promise.all([
      getCurrentProfile(),
      supabase.from('posts').select('id,media_urls').eq('author_id', userId).order('created_at', { ascending: false }),
      getStore(userId).catch(() => null),
    ]);
    if (postsResult.error) throw postsResult.error;
    setProfile(currentProfile);
    setPosts((postsResult.data || []) as Post[]);
    setProducts(store ? await getProducts(30, { storeId: store.id }) : []);
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    const restore = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (active) await load(data.session?.user.id || null);
      } catch (e: any) {
        if (active) setError(e?.message || 'Could not load your profile.');
      } finally {
        if (active) setReady(true);
      }
    };
    void restore();
    return () => { active = false; };
  }, [load]));

  useEffect(() => {
    let active = true;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setError('');
      void load(session?.user.id || null).catch((e: any) => setError(e?.message || 'Could not load your profile.'));
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [load]);

  const images = posts.flatMap(post => post.media_urls || []).filter(Boolean);
  if (!ready) return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator color={C.pink} /></View></SafeAreaView>;
  if (!profile) return <SafeAreaView style={s.safe}><View style={s.center}><Text style={s.emptyTitle}>Sign in to view your profile</Text><Text style={s.emptyText}>{error || 'Your posts and shop will appear here after authentication.'}</Text><Pressable style={s.shopBtn} onPress={() => router.push('/login')}><Text style={{ color: '#FFF', fontWeight: '900' }}>Sign in</Text></Pressable></View></SafeAreaView>;

  return <SafeAreaView style={s.safe}>
    <ScrollView contentContainerStyle={s.scroll} onScroll={onScroll} scrollEventThrottle={16}>
      <View style={s.top}><Text style={s.h}>Profile</Text><Pressable onPress={() => router.push('/edit-profile')}><I name="settings" size={24} /></Pressable></View>
      <View style={s.cover}><View style={s.coverShape} /><View style={s.avatarWrap}><Avatar size={92} uri={profile.avatar_url} /></View></View>
      <View style={s.info}><Text style={s.name}>{profile.display_name} {profile.verified && <VerifiedMark size={16} />}</Text><Text style={s.handle}>@{profile.handle}{profile.location ? ` · ${profile.location}` : ''}</Text><Text style={s.bio}>{profile.bio || 'Share your latest moments with the girls.'}</Text>{(profile.country || profile.area) && <Text style={s.place}><I name="location" size={14} color={C.muted} /> {[profile.area, profile.country].filter(Boolean).join(', ')}</Text>}{profile.links?.length ? <View style={s.links}>{profile.links.map(link => <Text key={link} style={s.link}>{link}</Text>)}</View> : null}<Text style={s.join}>Joined {new Date(profile.created_at).toLocaleDateString()}</Text><View style={s.stats}><View><Text style={s.num}>{profile.followers_count}</Text><Text style={s.label}>Followers</Text></View><View><Text style={s.num}>{profile.following_count}</Text><Text style={s.label}>Following</Text></View><View><Text style={s.num}>{posts.length}</Text><Text style={s.label}>Posts</Text></View></View><View style={s.actions}><Pressable style={s.edit} onPress={() => router.push('/edit-profile')}><Text style={{ fontWeight: '900' }}>Edit profile</Text></Pressable><Pressable style={s.shopBtn} onPress={() => router.push('/seller/me')}><I name="shop" size={18} color="#FFF" /><Text style={{ color: '#FFF', fontWeight: '900' }}>My shop</Text></Pressable></View></View>
      <View style={s.tabs}>{['Posts', 'Shop', 'Services'].map(item => <Pressable key={item} onPress={() => setTab(item)} style={[s.tab, item === tab && s.tabOn]}><Text style={{ fontWeight: '900', fontSize: 12 }}>{item}</Text></Pressable>)}</View>
      {tab === 'Posts' ? <View style={s.grid}>{images.map(image => <Image key={image} source={{ uri: image }} style={s.tile} />)}{!images.length && <View style={s.empty}><Text style={{ fontSize: 30 }}>✦</Text><Text style={s.emptyTitle}>No posts yet</Text><Text style={s.emptyText}>Your real posts will appear here.</Text></View>}</View> : tab === 'Shop' ? <View style={s.shopGrid}>{products.map(product => <Pressable key={product.id} style={s.product} onPress={() => router.push({ pathname: '/product', params: { id: product.id } })}>{product.image_urls?.[0] ? <Image source={{ uri: product.image_urls[0] }} style={s.productImage} /> : <View style={[s.productImage, s.productPlaceholder]}><I name="shop" size={20} color={C.pink} /></View>}<Text style={s.productName} numberOfLines={1}>{product.name}</Text><Text style={s.productPrice}>GH₵ {Number(product.price).toFixed(0)}</Text></Pressable>)}{!products.length && <View style={s.empty}><Text style={{ fontSize: 30 }}>✦</Text><Text style={s.emptyTitle}>Your shop is empty</Text><Text style={s.emptyText}>Add products from My shop.</Text></View>}</View> : <View style={s.empty}><Text style={{ fontSize: 30 }}>✦</Text><Text style={s.emptyTitle}>Your services</Text><Text style={s.emptyText}>Your services will appear here.</Text></View>}
      <Pressable style={s.refer} onPress={() => router.push('/rewards')}><Text style={s.referK}>GIRLIE REWARDS</Text><Text style={s.referTitle}>Invite your people. Earn together.</Text><Text style={s.referLink}>Refer & earn →</Text></Pressable>
    </ScrollView>
  </SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:C.bg},center:{flex:1,alignItems:'center',justifyContent:'center',padding:24},scroll:{padding:18,paddingBottom:120},top:{height:55,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},h:{fontSize:21,fontWeight:'900'},cover:{height:175,borderRadius:34,backgroundColor:C.sun,overflow:'hidden',position:'relative'},coverShape:{position:'absolute',width:250,height:250,borderRadius:130,right:-40,bottom:-100,backgroundColor:C.rose},avatarWrap:{position:'absolute',left:20,bottom:17,borderWidth:5,borderColor:'#FFF',borderRadius:50},info:{paddingTop:15},name:{fontSize:24,fontWeight:'900'},handle:{fontSize:11,color:C.muted,marginTop:2},bio:{fontSize:13,fontWeight:'600',marginTop:9},place:{fontSize:11,color:C.muted,marginTop:7,flexDirection:'row',alignItems:'center'},links:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:8},link:{fontSize:11,color:C.pink,fontWeight:'800'},join:{fontSize:11,color:C.muted,marginTop:5},stats:{flexDirection:'row',gap:35,marginTop:16},num:{fontSize:16,fontWeight:'900'},label:{fontSize:11,color:C.muted,marginTop:2},actions:{flexDirection:'row',gap:9,marginTop:15},edit:{flex:1,height:43,borderRadius:22,backgroundColor:'#FFF',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line},shopBtn:{flex:1,height:43,borderRadius:22,backgroundColor:C.ink,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:7,paddingHorizontal:18},tabs:{flexDirection:'row',marginTop:20,borderBottomWidth:1,borderBottomColor:C.line},tab:{flex:1,alignItems:'center',paddingVertical:13},tabOn:{borderBottomWidth:3,borderBottomColor:C.pink},grid:{flexDirection:'row',flexWrap:'wrap',gap:5,marginTop:12},tile:{width:'32.3%',height:145,borderRadius:15},shopGrid:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:12},product:{width:'48%',backgroundColor:'#FFF',borderRadius:20,padding:9},productImage:{height:135,width:'100%',borderRadius:15},productPlaceholder:{backgroundColor:C.cream,alignItems:'center',justifyContent:'center'},productName:{fontSize:13,fontWeight:'900',marginTop:8},productPrice:{fontSize:12,color:C.pink,fontWeight:'900',marginTop:4},empty:{padding:50,alignItems:'center'},emptyTitle:{fontSize:18,fontWeight:'900',marginTop:8},emptyText:{fontSize:12,color:C.muted,marginTop:4,textAlign:'center'},refer:{marginTop:12,padding:20,borderRadius:28,backgroundColor:C.lilac},referK:{fontSize:9,fontWeight:'900',letterSpacing:1.2},referTitle:{fontSize:21,fontWeight:'900',marginTop:6},referLink:{fontSize:11,fontWeight:'900',marginTop:12}})
