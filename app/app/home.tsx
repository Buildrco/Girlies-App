import React, { useCallback, useState } from 'react';
import { Alert, Animated, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { Avatar, VerifiedMark } from '../Avatar';
import { CurvedBanner } from '../components/CurvedBanner';
import { ProductCard } from '../components/ProductCard';
import { SectionTitle } from '../components/SectionTitle';
import { useChromeVisibility } from '../components/BottomNav';
import { LikeButton } from '../components/LikeButton';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { getPostLikeState, getProducts, getSessionUser, setFollow, setPostLike, type ProductRecord } from '../lib/social';

type HomePost = {
  id: string;
  author_id: string;
  body: string;
  media_urls: string[];
  created_at: string;
  profile?: { display_name: string; handle: string; avatar_url: string | null; verified: boolean };
};

type SellerProfile = {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  verified: boolean;
  followers_count: number;
};

const imgs = [
  'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1000&q=85',
];

export default function Home() {
  const router = useRouter();
  const { onScroll } = useChromeVisibility();
  const [hero, setHero] = useState(0);
  const [followed, setFollowed] = useState<Set<number>>(new Set());
  const [sellerIds, setSellerIds] = useState<(string | null)[]>([]);
  const [sellerProfiles, setSellerProfiles] = useState<SellerProfile[]>([]);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [followingBusy, setFollowingBusy] = useState<Set<number>>(new Set());
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [homePostId, setHomePostId] = useState<string | null>(null);
  const [homePost, setHomePost] = useState<HomePost | null>(null);
  const [liked, setLiked] = useState(false);
  const [homeLikeCount, setHomeLikeCount] = useState<number | null>(null);
  const [homeCommentCount, setHomeCommentCount] = useState(0);
  const [homeShareCount, setHomeShareCount] = useState(0);
  const [likeBusy, setLikeBusy] = useState(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    async function loadLiveState() {
      try {
        const me = await getSessionUser();
        if (!active) return;
        setSessionUserId(me?.id || null);
        const [profilesResult, productsResult, postResult] = await Promise.all([
          supabase.from('profiles').select('id,display_name,handle,avatar_url,verified,followers_count').order('created_at', { ascending: true }).limit(5),
          getProducts(5),
          supabase.from('posts').select('id,author_id,body,media_urls,created_at').eq('visibility', 'public').order('created_at', { ascending: false }).limit(1),
        ]);
        if (profilesResult.error) throw profilesResult.error;
        if (postResult.error) throw postResult.error;
        const liveSellers = (profilesResult.data || []) as SellerProfile[];
        const liveSellerIds = liveSellers.map(row => row.id);
        setSellerProfiles(liveSellers);
        setSellerIds(liveSellerIds);
        setProducts(productsResult);
        const post = postResult.data?.[0] || null;
        const postId = post?.id || null;
        setHomePostId(postId);
        if (!post) {
          setHomePost(null);
          setFollowed(new Set());
          setLiked(false);
          setHomeLikeCount(null);
          setHomeCommentCount(0);
          setHomeShareCount(0);
          return;
        }
        const [profileResult, followResult, likeResult, countResult, commentsResult, sharesResult] = await Promise.all([
          supabase.from('profiles').select('display_name,handle,avatar_url,verified').eq('id', post.author_id).maybeSingle(),
          me ? supabase.from('follows').select('following_id').eq('follower_id', me.id) : Promise.resolve({ data: [], error: null }),
          getPostLikeState(postId),
          supabase.from('post_likes').select('post_id', { count: 'exact', head: true }).eq('post_id', postId),
          supabase.from('post_comments').select('id', { count: 'exact', head: true }).eq('post_id', postId),
          supabase.from('post_shares').select('id', { count: 'exact', head: true }).eq('post_id', postId),
        ]);
        if (profileResult.error) throw profileResult.error;
        if (followResult.error) throw followResult.error;
        if (countResult.error) throw countResult.error;
        if (commentsResult.error) throw commentsResult.error;
        if (sharesResult.error) throw sharesResult.error;
        if (!active) return;
        setHomePost({ ...post, media_urls: post.media_urls || [], profile: profileResult.data || undefined });
        const followedIds = new Set((followResult.data || []).map(row => row.following_id));
        setFollowed(new Set(liveSellerIds.map((id, index) => followedIds.has(id) ? index : -1).filter(index => index >= 0)));
        setLiked(likeResult);
        setHomeLikeCount(countResult.count || 0);
        setHomeCommentCount(commentsResult.count || 0);
        setHomeShareCount(sharesResult.count || 0);
      } catch (error) {
        if (active) Alert.alert('Could not load live activity', error instanceof Error ? error.message : 'Please try again.');
      }
    }
    void loadLiveState();
    return () => { active = false; };
  }, []));

  async function toggleSeller(index: number) {
    const targetId = sellerIds[index];
    if (!targetId) { Alert.alert('Follow unavailable', 'This seller is not connected to a live profile yet.'); return; }
    if (!sessionUserId) { Alert.alert('Sign in required', 'Please sign in to follow sellers.'); return; }
    if (targetId === sessionUserId) { Alert.alert('Follow unavailable', 'You cannot follow your own profile.'); return; }
    if (followingBusy.has(index)) return;
    const next = !followed.has(index);
    setFollowingBusy(current => new Set(current).add(index));
    try {
      const verified = await setFollow(targetId, next);
      setFollowed(current => { const copy = new Set(current); if (verified) copy.add(index); else copy.delete(index); return copy; });
    } catch (error) {
      Alert.alert('Follow failed', error instanceof Error ? error.message : 'Could not save your follow.');
    } finally {
      setFollowingBusy(current => { const copy = new Set(current); copy.delete(index); return copy; });
    }
  }

  async function toggleHomeLike() {
    if (!homePostId) { Alert.alert('Like unavailable', 'There is no live post to like yet.'); return; }
    if (likeBusy) return;
    const next = !liked;
    setLiked(next);
    setLikeBusy(true);
    try {
      const verified = await setPostLike(homePostId, next);
      setLiked(verified);
      setHomeLikeCount(current => Math.max(0, (current || 0) + (verified === next ? (next ? 1 : -1) : 0)));
    } catch (error) {
      setLiked(!next);
      Alert.alert('Like failed', error instanceof Error ? error.message : 'Could not save your like.');
    } finally { setLikeBusy(false); }
  }
  return <SafeAreaView style={s.safe}>
    <Animated.ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll} onScroll={onScroll} scrollEventThrottle={16}>
      <View style={s.head}><View><Text style={s.kicker}>SATURDAY · 12 SEPTEMBER</Text><Text style={s.title}>Hey, girlie ✦</Text></View><View style={s.headIcons}><Pressable onPress={() => router.push('/notifications')}><I name="bell" size={25} /><View style={s.dot} /></Pressable><Pressable onPress={() => router.push('/profile')}><Avatar size={42} index={1} /></Pressable></View></View>
      <Pressable style={s.search} onPress={() => router.push('/search')}><I name="search" size={22} color={C.muted} /><Text style={s.searchText}>What are you looking for?</Text><I name="filter" size={20} /></Pressable>
      <View><CurvedBanner image={imgs[hero]} title={['Your next look is waiting.', 'Fresh beauty, fresh energy.', 'Made for your main-character era.'][hero]} subtitle="Discover women-led shops, real recommendations and new drops." tag={['NEW SEASON', 'BEAUTY EDIT', 'THE GIRLIE DROP'][hero]} color={[C.rose, C.sun, C.lilac][hero]} onPress={() => router.push('/shop')} /><View style={s.heroDots}>{[0, 1, 2].map(i => <Pressable key={i} onPress={() => setHero(i)} style={[s.heroDot, i === hero && s.heroDotOn]} />)}</View></View>
      <View style={s.ribbon}><Text style={s.ribbonBig}>Ask the girls.</Text><Text style={s.ribbonSmall}>Real opinions before you spend.</Text><Pressable onPress={() => router.push('/community')}><Text style={s.ribbonGo}>Open community →</Text></Pressable></View>
       <SectionTitle title="Popular sellers" />
       <ScrollView horizontal showsHorizontalScrollIndicator={false}>{sellerProfiles.map((seller, index) => <Pressable key={seller.id} onPress={() => router.push('/seller/' + seller.id)} style={s.seller}><Avatar size={54} index={index} uri={seller.avatar_url} /><View style={s.sellerNameRow}><Text style={s.sellerName} numberOfLines={1}>{seller.display_name}</Text>{seller.verified && <VerifiedMark size={17} />}</View><Text style={s.sellerMeta}>{seller.followers_count || 0} followers</Text><Pressable onPress={event => { event.stopPropagation(); void toggleSeller(index); }} style={s.follow}><Text style={s.followText}>{followed.has(index) ? 'Following' : 'Follow'}</Text></Pressable></Pressable>)}</ScrollView>
      <SectionTitle title="Popular products" />
       <ScrollView horizontal showsHorizontalScrollIndicator={false}>{products.map(product => <ProductCard key={product.id} productId={product.id} name={product.name} price={`${product.currency === 'GHS' ? 'GH₵' : product.currency} ${Number(product.price || 0).toFixed(0)}`} image={product.image_urls?.[0] || ''} seller={product.store?.name || 'Seller'} onPress={() => router.push({ pathname: '/product', params: { id: product.id } })} />)}</ScrollView>
      <View style={s.editorial}><Image source={{ uri: imgs[3] }} style={s.editorialImg} /><View style={s.editorialText}><Text style={s.editorialK}>THE GIRLIE GUIDE</Text><Text style={s.editorialTitle}>Good taste is better when shared.</Text><Text style={s.editorialSub}>Save a look. Ask the community. Find the shop. Make it yours.</Text><Pressable onPress={() => router.push('/community')} style={s.darkBtn}><Text style={{ color: '#FFF', fontWeight: '900' }}>See what girls are saying</Text></Pressable></View></View>
      <SectionTitle title="Fresh on the feed" />
       {homePost && <Pressable onPress={() => router.push('/community')} style={s.post}><View style={s.postTop}><Avatar size={42} uri={homePost.profile?.avatar_url} index={2} /><View style={{ flex: 1 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><Text style={s.postUser}>{homePost.profile?.display_name || 'Girlie'}</Text>{homePost.profile?.verified && <VerifiedMark size={15} />}</View><Text style={s.postMeta}>@{homePost.profile?.handle || 'girlie'} · {new Date(homePost.created_at).toLocaleDateString()}</Text></View><I name="more" size={20} color={C.muted} /></View>{!!homePost.body && <Text style={s.postText}>{homePost.body}</Text>}{homePost.media_urls[0] && <Image source={{ uri: homePost.media_urls[0] }} style={s.postImg} />}<View style={s.postFoot}><View style={s.postAction}><LikeButton liked={liked} onPress={() => void toggleHomeLike()} size={21} /><Text>{homeLikeCount === null ? '' : ' ' + homeLikeCount}</Text></View><View style={s.postAction}><I name="chat" size={19} /><Text> {homeCommentCount}</Text></View><View style={s.postAction}><I name="share" size={19} /><Text> {homeShareCount}</Text></View></View></Pressable>}
      <View style={s.mini}><Text style={s.miniTitle}>Delivered without the stress.</Text><Text style={s.miniText}>Pay once. We calculate delivery and keep you updated.</Text><Pressable onPress={() => router.push('/orders')}><Text style={s.miniLink}>Track an order →</Text></Pressable></View>
      <View style={{ marginTop: 18 }}><SectionTitle title="Your spaces" /><View style={{ flexDirection: 'row', gap: 8 }}><Pressable onPress={() => router.push('/live')} style={{ flex: 1, padding: 15, borderRadius: 24, backgroundColor: C.plum }}><Text style={{ fontSize: 10, fontWeight: '900', color: C.sun }}>LIVE NOW</Text><Text style={{ fontSize: 16, fontWeight: '900', color: '#FFF', marginTop: 5 }}>Watch girls live</Text><Text style={{ fontSize: 10, color: '#EADDE4', marginTop: 4 }}>Join the room →</Text></Pressable><Pressable onPress={() => router.push('/seller-onboarding')} style={{ flex: 1, padding: 15, borderRadius: 24, backgroundColor: C.rose }}><Text style={{ fontSize: 10, fontWeight: '900' }}>SELL WITH US</Text><Text style={{ fontSize: 16, fontWeight: '900', marginTop: 5 }}>Open your shop</Text><Text style={{ fontSize: 10, marginTop: 4, fontWeight: '800' }}>Start here →</Text></Pressable></View></View>
    </Animated.ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, scroll: { paddingHorizontal: 18, paddingBottom: 105 }, head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, paddingBottom: 16 }, kicker: { fontSize: 10, fontWeight: '900', letterSpacing: 1.1, color: C.muted }, title: { fontSize: 28, fontWeight: '900', marginTop: 4, color: C.ink }, headIcons: { flexDirection: 'row', alignItems: 'center', gap: 16 }, dot: { position: 'absolute', right: -2, top: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: C.pink, borderWidth: 2, borderColor: C.bg }, search: { height: 54, borderRadius: 27, backgroundColor: '#F4EDEF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 17, gap: 11, marginBottom: 18 }, searchText: { flex: 1, color: C.muted, fontWeight: '600', fontSize: 14 }, heroDots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 3 }, heroDot: { width: 6, height: 6, borderRadius: 4, backgroundColor: '#D8C6CC' }, heroDotOn: { width: 19, backgroundColor: C.ink }, ribbon: { marginTop: 19, borderRadius: 28, backgroundColor: C.plum, padding: 18, overflow: 'hidden' }, ribbonBig: { color: '#FFF', fontSize: 23, fontWeight: '900' }, ribbonSmall: { color: '#F4DDE7', fontSize: 12, fontWeight: '600', marginTop: 3 }, ribbonGo: { color: C.sun, fontSize: 11, fontWeight: '900', marginTop: 14 }, seller: { width: 128, marginRight: 12, padding: 13, borderRadius: 28, backgroundColor: C.cream }, sellerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 8 }, sellerName: { fontSize: 12, fontWeight: '900', maxWidth: 88 }, sellerMeta: { fontSize: 11, color: C.muted, marginTop: 4 }, follow: { alignSelf: 'flex-start', marginTop: 9, backgroundColor: C.white, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 }, followText: { fontSize: 10, fontWeight: '900' }, editorial: { marginTop: 27, borderRadius: 32, overflow: 'hidden', backgroundColor: C.sun, minHeight: 290 }, editorialImg: { width: '100%', height: 180 }, editorialText: { padding: 18 }, editorialK: { fontSize: 9, fontWeight: '900', letterSpacing: 1.3 }, editorialTitle: { fontSize: 24, lineHeight: 27, fontWeight: '900', marginTop: 6 }, editorialSub: { fontSize: 12, lineHeight: 17, fontWeight: '600', marginTop: 5 }, darkBtn: { alignSelf: 'flex-start', backgroundColor: C.ink, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, marginTop: 13 }, post: { backgroundColor: C.white, borderRadius: 30, padding: 15, borderWidth: 1, borderColor: C.line }, postTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, postUser: { fontSize: 14, fontWeight: '900' }, postMeta: { fontSize: 10, color: C.muted, marginTop: 2 }, postText: { fontSize: 14, lineHeight: 20, fontWeight: '600', marginVertical: 13 }, postImg: { height: 270, width: '100%', borderRadius: 24 }, postFoot: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 }, postAction: { flexDirection: 'row', alignItems: 'center', gap: 4 }, mini: { marginTop: 18, padding: 20, borderRadius: 28, backgroundColor: C.mint }, miniTitle: { fontSize: 19, fontWeight: '900' }, miniText: { fontSize: 12, fontWeight: '600', marginTop: 5 }, miniLink: { fontSize: 12, fontWeight: '900', marginTop: 12 },
});