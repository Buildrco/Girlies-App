import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, View, Text, Pressable, Image, StyleSheet, TextInput } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { Avatar, VerifiedMark } from '../Avatar';
import { I } from '../components/Icons';
import { useChromeVisibility } from '../components/BottomNav';
import type { ProfileRecord, ProductRecord } from '../lib/social';
import { addComment, addShare, getCurrentProfile, getProducts, getServices, getStore, getSessionUser, setPostLike } from '../lib/social';
import { supabase } from '../lib/supabase';
import { LikeButton } from '../components/LikeButton';

type Post = { id: string; author_id: string; body: string; media_urls: string[] | null; created_at: string };

export default function Profile() {
  const router = useRouter();
  const { onScroll } = useChromeVisibility();
  const [tab, setTab] = useState('Posts');
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [commenting, setCommenting] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  const load = useCallback(async (userId: string | null) => {
    if (!userId) {
      setProfile(null);
      setPosts([]);
      return;
    }
    const [currentProfile, postsResult, store] = await Promise.all([
      getCurrentProfile(),
       supabase.from('posts').select('id,author_id,body,media_urls,created_at').eq('author_id', userId).order('created_at', { ascending: false }),
      getStore(userId).catch(() => null),
    ]);
    if (postsResult.error) throw postsResult.error;
    setProfile(currentProfile);
    setPosts((postsResult.data || []) as Post[]);
    const postIds = (postsResult.data || []).map((post: any) => post.id);
    if (postIds.length) {
      const [likesResult, me] = await Promise.all([
        supabase.from('post_likes').select('post_id').in('post_id', postIds),
        getSessionUser(),
      ]);
      const counts: Record<string, number> = {};
      (likesResult.data || []).forEach((row: any) => { counts[row.post_id] = (counts[row.post_id] || 0) + 1; });
      setLikeCounts(counts);
      if (me) {
        const mine = await supabase.from('post_likes').select('post_id').eq('user_id', me.id).in('post_id', postIds);
        setLiked(new Set((mine.data || []).map((row: any) => row.post_id)));
      }
    }
    setProducts(store ? await getProducts(30, { storeId: store.id }) : []);
    setServices(await getServices(userId).catch(() => []));
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
  async function toggleLike(postId: string) {
    const next = !liked.has(postId);
    setLiked(current => { const value = new Set(current); next ? value.add(postId) : value.delete(postId); return value; });
    setLikeCounts(current => ({ ...current, [postId]: Math.max(0, (current[postId] || 0) + (next ? 1 : -1)) }));
    try { await setPostLike(postId, next); } catch (e: any) { setLiked(current => { const value = new Set(current); next ? value.delete(postId) : value.add(postId); return value; }); setLikeCounts(current => ({ ...current, [postId]: Math.max(0, (current[postId] || 0) + (next ? -1 : 1)) })); Alert.alert('Like failed', e?.message || 'Could not save your like.'); }
  }
  async function publishComment(postId: string) {
    if (!comment.trim()) return;
    try { await addComment(postId, comment); setComment(''); setCommenting(null); } catch (e: any) { Alert.alert('Comment failed', e?.message || 'Could not save your comment.'); }
  }
  if (!ready) return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator color={C.pink} /></View></SafeAreaView>;
  if (!profile) return <SafeAreaView style={s.safe}><View style={s.center}><Text style={s.emptyTitle}>Sign in to view your profile</Text><Text style={s.emptyText}>{error || 'Your posts and shop will appear here after authentication.'}</Text><Pressable style={s.shopBtn} onPress={() => router.push('/login')}><Text style={{ color: '#FFF', fontWeight: '900' }}>Sign in</Text></Pressable></View></SafeAreaView>;

  const publicPlace = [profile.area && profile.location ? `${profile.area} - ${profile.location}` : profile.area || profile.location, profile.country].filter(Boolean).join(', ');
  return <SafeAreaView style={s.safe}>
    <ScrollView contentContainerStyle={s.scroll} onScroll={onScroll} scrollEventThrottle={16}>
      <View style={s.top}><Text style={s.h}>Profile</Text><Pressable onPress={() => router.push('/edit-profile')}><I name="settings" size={24} /></Pressable></View>
      <View style={s.cover}><View style={s.coverShape} /><View style={s.avatarWrap}><Avatar size={92} uri={profile.avatar_url} verified={profile.verified} /></View></View>
      <View style={s.info}><Text style={s.name}>{profile.display_name} {profile.verified && <VerifiedMark size={16} />}</Text><Text style={s.handle}>@{profile.handle}</Text><Text style={s.bio}>{profile.bio || 'Share your latest moments with the girls.'}</Text>{publicPlace && <Text style={s.place}><I name="location" size={14} color={C.muted} /> {publicPlace}</Text>}{profile.links?.length ? <View style={s.links}>{profile.links.map(link => <Text key={link} style={s.link}>{link}</Text>)}</View> : null}<Text style={s.join}>Joined {new Date(profile.created_at).toLocaleDateString()}</Text><View style={s.stats}><View><Text style={s.num}>{profile.followers_count}</Text><Text style={s.label}>Followers</Text></View><View><Text style={s.num}>{profile.following_count}</Text><Text style={s.label}>Following</Text></View></View><View style={s.actions}><Pressable style={s.edit} onPress={() => router.push('/edit-profile')}><Text style={{ fontWeight: '900' }}>Edit profile</Text></Pressable><Pressable style={s.shopBtn} onPress={() => router.push('/seller/me')}><I name="shop" size={18} color="#FFF" /><Text style={{ color: '#FFF', fontWeight: '900' }}>My shop</Text></Pressable></View></View>
      <View style={s.tabs}>{['Posts', 'Shop', 'Services'].map(item => <Pressable key={item} onPress={() => setTab(item)} style={[s.tab, item === tab && s.tabOn]}><Text style={{ fontWeight: '900', fontSize: 12 }}>{item}</Text></Pressable>)}</View>
       {tab === 'Posts' ? <View style={s.posts}>{posts.map(post => <View key={post.id} style={s.post}>{post.body ? <Text style={s.postBody}>{post.body}</Text> : null}{(post.media_urls || []).map((image, index) => <Image key={`${image}-${index}`} source={{ uri: image }} style={s.postImage} />)}<View style={s.postActions}><View style={s.action}><LikeButton liked={liked.has(post.id)} onPress={() => void toggleLike(post.id)} size={21} /><Text style={s.actionText}>{likeCounts[post.id] || 0} · Like</Text></View><Pressable style={s.action} onPress={() => setCommenting(commenting === post.id ? null : post.id)}><I name="chat" size={20} /><Text style={s.actionText}>Comment</Text></Pressable><Pressable style={s.action} onPress={() => addShare(post.id).catch((e: any) => Alert.alert('Share failed', e?.message || 'Could not share this post.'))}><I name="share" size={20} /><Text style={s.actionText}>Share</Text></Pressable></View>{commenting === post.id && <View style={s.commentBox}><TextInput value={comment} onChangeText={setComment} placeholder="Write a comment…" placeholderTextColor={C.muted} style={s.commentInput} /><Pressable onPress={() => void publishComment(post.id)}><I name="send" size={22} color={C.pink} /></Pressable></View>}</View>)}{!posts.length && <View style={s.empty}><Text style={{ fontSize: 30 }}>✦</Text><Text style={s.emptyTitle}>No posts yet</Text><Text style={s.emptyText}>Your real posts will appear here.</Text></View>}</View> : tab === 'Shop' ? <View style={s.shopGrid}>{products.map(product => <Pressable key={product.id} style={s.product} onPress={() => router.push({ pathname: '/product', params: { id: product.id } })}>{product.image_urls?.[0] ? <Image source={{ uri: product.image_urls[0] }} style={s.productImage} /> : <View style={[s.productImage, s.productPlaceholder]}><I name="shop" size={20} color={C.pink} /></View>}<Text style={s.productName} numberOfLines={1}>{product.name}</Text><Text style={s.productPrice}>GH₵ {Number(product.price).toFixed(0)}</Text></Pressable>)}{!products.length && <View style={s.empty}><Text style={{ fontSize: 30 }}>✦</Text><Text style={s.emptyTitle}>Your shop is empty</Text><Text style={s.emptyText}>Add products from My shop.</Text></View>}</View> : <View style={s.serviceList}>{services.map(service => <View key={service.id} style={s.service}><Text style={s.productName}>{service.name}</Text><Text style={s.emptyText}>{service.category} · {service.duration_minutes} min</Text><Text style={s.productPrice}>GH₵ {Number(service.price).toFixed(0)}</Text></View>)}{!services.length && <View style={s.empty}><Text style={{ fontSize: 30 }}>✦</Text><Text style={s.emptyTitle}>Your services</Text><Text style={s.emptyText}>Add a service from Seller Studio.</Text></View>}</View>}
      <Pressable style={s.refer} onPress={() => router.push('/rewards')}><Text style={s.referK}>GIRLIE REWARDS</Text><Text style={s.referTitle}>Invite your people. Earn together.</Text><Text style={s.referLink}>Refer & earn →</Text></Pressable>
     </ScrollView>{tab === 'Posts' && <Pressable style={s.fab} onPress={() => router.push('/create')}><I name="plus" size={28} color="#FFF" /></Pressable>}
  </SafeAreaView>;
}
 const s=StyleSheet.create({safe:{flex:1,backgroundColor:C.bg},center:{flex:1,alignItems:'center',justifyContent:'center',padding:24},scroll:{padding:18,paddingBottom:120},top:{height:55,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},h:{fontSize:21,fontWeight:'900'},cover:{height:175,borderRadius:34,backgroundColor:C.sun,overflow:'hidden',position:'relative'},coverShape:{position:'absolute',width:250,height:250,borderRadius:130,right:-40,bottom:-100,backgroundColor:C.rose},avatarWrap:{position:'absolute',left:20,bottom:17,borderWidth:5,borderColor:'#FFF',borderRadius:50},info:{paddingTop:15},name:{fontSize:24,fontWeight:'900'},handle:{fontSize:13,color:C.muted,marginTop:3},bio:{fontSize:14,fontWeight:'600',marginTop:9},place:{fontSize:13,color:C.muted,marginTop:7,flexDirection:'row',alignItems:'center'},links:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:8},link:{fontSize:13,color:C.pink,fontWeight:'800'},join:{fontSize:12,color:C.muted,marginTop:5},stats:{flexDirection:'row',gap:35,marginTop:16},num:{fontSize:17,fontWeight:'900'},label:{fontSize:12,color:C.muted,marginTop:2},actions:{flexDirection:'row',gap:9,marginTop:15},edit:{flex:1,height:43,borderRadius:22,backgroundColor:'#FFF',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line},shopBtn:{flex:1,height:43,borderRadius:22,backgroundColor:C.ink,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:7,paddingHorizontal:18},tabs:{flexDirection:'row',marginTop:20,borderBottomWidth:1,borderBottomColor:C.line},tab:{flex:1,alignItems:'center',paddingVertical:13},tabOn:{borderBottomWidth:3,borderBottomColor:C.pink},posts:{gap:12,marginTop:12},post:{backgroundColor:'#FFF',borderRadius:24,padding:14,borderWidth:1,borderColor:C.line},postBody:{fontSize:14,lineHeight:20,fontWeight:'600',marginBottom:10},postImage:{width:'100%',height:230,borderRadius:18,marginTop:6},postActions:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:12},action:{flexDirection:'row',alignItems:'center',gap:5},actionText:{fontSize:12},commentBox:{marginTop:10,padding:8,borderRadius:20,backgroundColor:C.bg,flexDirection:'row',alignItems:'center'},commentInput:{flex:1,paddingHorizontal:10,paddingVertical:8},fab:{position:'absolute',right:23,bottom:88,width:55,height:55,borderRadius:28,backgroundColor:C.pink,alignItems:'center',justifyContent:'center',elevation:8},grid:{flexDirection:'row',flexWrap:'wrap',gap:5,marginTop:12},tile:{width:'32.3%',height:145,borderRadius:15},shopGrid:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:12},product:{width:'48%',backgroundColor:'#FFF',borderRadius:20,padding:9},productImage:{height:135,width:'100%',borderRadius:15},productPlaceholder:{backgroundColor:C.cream,alignItems:'center',justifyContent:'center'},productName:{fontSize:13,fontWeight:'900',marginTop:8},productPrice:{fontSize:12,color:C.pink,fontWeight:'900',marginTop:4},serviceList:{gap:8,marginTop:12},service:{padding:16,borderRadius:20,backgroundColor:'#FFF'},empty:{padding:50,alignItems:'center'},emptyTitle:{fontSize:19,fontWeight:'900',marginTop:8},emptyText:{fontSize:13,color:C.muted,marginTop:4,textAlign:'center'},refer:{marginTop:12,padding:20,borderRadius:28,backgroundColor:C.lilac},referK:{fontSize:10,fontWeight:'900',letterSpacing:1.2},referTitle:{fontSize:22,fontWeight:'900'},referLink:{fontSize:12,fontWeight:'900',marginTop:12}})
