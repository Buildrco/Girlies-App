import React, { useCallback, useState } from 'react';
import { Alert, Animated, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
import { getCurrentProfile, getPostLikeState, getProducts, getSessionUser, setFollow, setPostLike, type ProductRecord, type ProfileRecord } from '../lib/social';
import { readOffline, writeOffline } from '../lib/offlineCache';

type HomePost = {
  id: string;
  author_id: string;
  body: string;
  media_urls: string[];
  created_at: string;
  profile?: { display_name: string; handle: string; avatar_url: string | null; verified: boolean };
  metadata?: any;
};

const VIDEO_URL_PATTERN = /\.(mp4|mov|m4v|webm|m3u8)(?:[?#]|$)/i;
function getMediaType(post: HomePost, url: string, index: number): 'image' | 'video' {
  const typed = post.metadata?.media_types?.[index] || post.metadata?.media?.[index]?.type;
  if (typed === 'video' || typed === 'image') return typed;
  return VIDEO_URL_PATTERN.test(url) ? 'video' : 'image';
}
type SellerProfile = {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  verified: boolean;
  followers_count: number;
  country?: string | null;
  area?: string | null;
  location?: string | null;
};

type HomeSnapshot = {
  sessionUserId: string | null;
  currentProfile: ProfileRecord | null;
  sellerIds: string[];
  sellerProfiles: SellerProfile[];
  products: ProductRecord[];
  homePost: HomePost | null;
  followedIndexes: number[];
  liked: boolean;
  homeLikeCount: number | null;
  homeCommentCount: number;
  homeShareCount: number;
};

const HOME_CACHE_KEY = 'home-v2';

const imgs = [
  'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1000&q=85',
];

const heroGirlImage = require('../assets/hero-girl.png');
const askGirlsImage = require('../assets/ask-girls.png');
const guideImage = require('../assets/girlie-guide.png');

export default function Home() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { onScroll } = useChromeVisibility();
  const [hero, setHero] = useState(0);
  const [followed, setFollowed] = useState<Set<number>>(new Set());
  const [sellerIds, setSellerIds] = useState<(string | null)[]>([]);
  const [sellerProfiles, setSellerProfiles] = useState<SellerProfile[]>([]);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [followingBusy, setFollowingBusy] = useState<Set<number>>(new Set());
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [currentProfile, setCurrentProfile] = useState<ProfileRecord | null>(null);
  const [homePostId, setHomePostId] = useState<string | null>(null);
  const [homePost, setHomePost] = useState<HomePost | null>(null);
  const [liked, setLiked] = useState(false);
  const [homeLikeCount, setHomeLikeCount] = useState<number | null>(null);
  const [homeCommentCount, setHomeCommentCount] = useState(0);
  const [homeShareCount, setHomeShareCount] = useState(0);
  const [likeBusy, setLikeBusy] = useState(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    const applySnapshot = (snapshot: HomeSnapshot) => {
      setSessionUserId(snapshot.sessionUserId || null);
      setCurrentProfile(snapshot.currentProfile || null);
      setSellerIds(snapshot.sellerIds || []);
      setSellerProfiles(snapshot.sellerProfiles || []);
      setProducts(snapshot.products || []);
      setHomePost(snapshot.homePost || null);
      setHomePostId(snapshot.homePost?.id || null);
      setFollowed(new Set(snapshot.followedIndexes || []));
      setLiked(Boolean(snapshot.liked));
      setHomeLikeCount(snapshot.homeLikeCount ?? null);
      setHomeCommentCount(snapshot.homeCommentCount || 0);
      setHomeShareCount(snapshot.homeShareCount || 0);
    };

    async function loadLiveState() {
      const cached = await readOffline<HomeSnapshot>(HOME_CACHE_KEY);
      if (!active) return;
      if (cached) applySnapshot(cached);
      const me = await getSessionUser().catch(() => null);
      if (!active) return;
      setSessionUserId(me?.id || null);
      const [currentResult, profilesResult, productsResult, postResult] = await Promise.all([
        getCurrentProfile().catch(() => null),
        supabase.from('profiles').select('id,display_name,handle,avatar_url,verified,followers_count,country,area,location').order('created_at', { ascending: true }).limit(5).then(result => result.data || [], () => []),
        getProducts(5).catch(() => []),
        supabase.from('posts').select('id,author_id,body,media_urls,metadata,created_at').eq('visibility', 'public').order('created_at', { ascending: false }).limit(1).then(result => result.data?.[0] || null, () => null),
      ]);
      if (!active) return;
      const liveSellers = (profilesResult.length ? profilesResult : (cached?.sellerProfiles || [])) as SellerProfile[];
      const liveProducts = productsResult.length ? productsResult : (cached?.products || []);
      const initialSnapshot: HomeSnapshot = {
        sessionUserId: me?.id || null,
        currentProfile: currentResult || cached?.currentProfile || null,
        sellerProfiles: liveSellers,
        sellerIds: liveSellers.map(row => row.id),
        products: liveProducts,
        homePost: null,
        followedIndexes: [],
        liked: false,
        homeLikeCount: null,
        homeCommentCount: 0,
        homeShareCount: 0,
      };
      setCurrentProfile(currentResult || cached?.currentProfile || null); setSellerProfiles(liveSellers); setSellerIds(liveSellers.map(row => row.id)); setProducts(liveProducts);
      void writeOffline(HOME_CACHE_KEY, initialSnapshot);
      const post = (postResult || cached?.homePost || null) as HomePost | null;
      if (!post) {
        if (active) applySnapshot(initialSnapshot);
        return;
      }
      const postId = post.id;
      const [profile, followedRows, postLiked, likeCount, commentCount, shareCount] = await Promise.all([
        supabase.from('profiles').select('display_name,handle,avatar_url,verified').eq('id', post.author_id).maybeSingle().then(result => result.data || undefined, () => undefined),
        me ? supabase.from('follows').select('following_id').eq('follower_id', me.id).then(result => result.data || [], () => []) : Promise.resolve([]),
        getPostLikeState(postId).catch(() => false),
        supabase.from('post_likes').select('post_id', { count: 'exact', head: true }).eq('post_id', postId).then(result => result.count || 0, () => 0),
        supabase.from('post_comments').select('id', { count: 'exact', head: true }).eq('post_id', postId).then(result => result.count || 0, () => 0),
        supabase.from('post_shares').select('id', { count: 'exact', head: true }).eq('post_id', postId).then(result => result.count || 0, () => 0),
      ]);
      if (!active) return;
      const resolvedPost = { ...post, media_urls: post.media_urls || [], profile };
      const followedIds = new Set((followedRows as { following_id: string }[]).map(row => row.following_id));
      const followedIndexes = liveSellers.map((row, index) => followedIds.has(row.id) ? index : -1).filter(index => index >= 0);
      setHomePost(resolvedPost); setHomePostId(postId); setLiked(postLiked);
      setFollowed(new Set(followedIndexes));
      setHomeLikeCount(likeCount); setHomeCommentCount(commentCount); setHomeShareCount(shareCount);
      void writeOffline(HOME_CACHE_KEY, { ...initialSnapshot, homePost: resolvedPost, followedIndexes, liked: postLiked, homeLikeCount: likeCount, homeCommentCount: commentCount, homeShareCount: shareCount });
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
  const bannerWidth = Math.max(280, width - 36);
  const banners = [
    { image: heroGirlImage, imageFit: 'contain' as const, title: 'Your next look is waiting.', subtitle: 'Discover women-led shops, real recommendations and new drops.', tag: 'NEW SEASON', color: C.rose },
    { image: imgs[1], imageFit: 'cover' as const, title: 'Fresh beauty, fresh energy.', subtitle: 'Find the little upgrades that make your everyday feel better.', tag: 'BEAUTY EDIT', color: C.sun },
    { image: imgs[2], imageFit: 'cover' as const, title: 'Made for your main-character era.', subtitle: 'Shop pieces picked for the life you actually live.', tag: 'THE GIRLIE DROP', color: C.lilac },
  ];

  return <SafeAreaView style={s.safe}>
    <Animated.ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll} onScroll={onScroll} scrollEventThrottle={16}>
      <View style={s.head}><View><Text style={s.kicker}>SATURDAY · 12 SEPTEMBER</Text><Text style={s.title}>Hey, girlie ✦</Text></View><View style={s.headIcons}><Pressable onPress={() => router.push('/notifications')}><I name="bell" size={25} /><View style={s.dot} /></Pressable><Pressable onPress={() => router.push('/profile')}><Avatar size={42} index={1} uri={currentProfile?.avatar_url} verified={currentProfile?.verified} /></Pressable></View></View>
      <Pressable style={s.search} onPress={() => router.push('/search')}><I name="search" size={22} color={C.muted} /><Text style={s.searchText}>What are you looking for?</Text><I name="filter" size={20} /></Pressable>
       <View><ScrollView horizontal pagingEnabled snapToInterval={bannerWidth + 12} decelerationRate="fast" showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 18 }} onMomentumScrollEnd={event => setHero(Math.round(event.nativeEvent.contentOffset.x / (bannerWidth + 12)))}>{banners.map((banner, index) => <View key={banner.title} style={{ width: bannerWidth, marginRight: index === banners.length - 1 ? 0 : 12 }}><CurvedBanner {...banner} onPress={() => router.push('/shop')} /></View>)}</ScrollView><View style={s.heroDots}>{banners.map((_, i) => <Pressable key={i} onPress={() => setHero(i)} style={[s.heroDot, i === hero && s.heroDotOn]} />)}</View></View>
      <View style={s.ribbon}><View style={s.ribbonCopy}><Text style={s.ribbonBig}>Ask the girls.</Text><Text style={s.ribbonSmall}>Real opinions before you spend.</Text><Pressable onPress={() => router.push('/community')}><Text style={s.ribbonGo}>Open community →</Text></Pressable></View><Image source={askGirlsImage} style={s.ribbonImage} resizeMode="contain" /></View>
       <SectionTitle title="Popular sellers" onPress={() => router.push('/shop')} />
         <ScrollView horizontal nestedScrollEnabled directionalLockEnabled decelerationRate="fast" showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 6 }}>{sellerProfiles.map((seller, index) => { const isMe = seller.id === sessionUserId; const place = [seller.area && seller.location ? `${seller.area} - ${seller.location}` : seller.area || seller.location, seller.country].filter(Boolean).join(', '); return <Pressable key={seller.id} onPress={() => router.push('/seller/' + seller.id)} style={s.seller}><Avatar size={54} index={index} uri={seller.avatar_url} /><View style={s.sellerNameRow}><Text style={s.sellerName} numberOfLines={1}>{seller.display_name}</Text>{seller.verified && <VerifiedMark size={17} />}</View><Text style={s.sellerHandle}>@{seller.handle}</Text><Text style={s.sellerMeta}>{place || 'Location not added'}</Text><Text style={s.sellerMeta}>{(seller.followers_count || 0).toLocaleString()} followers</Text>{!isMe && <Pressable onPress={event => { event.stopPropagation(); void toggleSeller(index); }} style={s.follow}><Text style={s.followText}>{followed.has(index) ? 'Following' : 'Follow'}</Text></Pressable>}</Pressable>; })}</ScrollView>
      <SectionTitle title="Popular products" onPress={() => router.push('/shop')} />
        <ScrollView horizontal nestedScrollEnabled directionalLockEnabled decelerationRate="fast" showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 6 }}>{products.map(product => <ProductCard key={product.id} productId={product.id} images={product.image_urls} name={product.name} price={`${product.currency === 'GHS' ? 'GH₵' : product.currency} ${Number(product.price || 0).toFixed(0)}`} image={product.image_urls?.[0] || ''} seller={product.store?.name || 'Seller'} onPress={() => router.push({ pathname: '/product', params: { id: product.id } })} />)}</ScrollView>
      <View style={[s.editorial, { backgroundColor: '#FFD861' }]}><Image source={guideImage} style={s.editorialImg} resizeMode="contain" /><View style={s.editorialText}><Text style={s.editorialK}>THE GIRLIE GUIDE</Text><Text style={s.editorialTitle}>Good taste is better when shared.</Text><Text style={s.editorialSub}>Save a look. Ask the community. Find the shop. Make it yours.</Text><Pressable onPress={() => router.push('/community')} style={s.darkBtn}><Text style={{ color: '#FFF', fontWeight: '900' }}>See what girls are saying</Text></Pressable></View></View>
      <SectionTitle title="Fresh on the feed" onPress={() => router.push('/community')} />
       {homePost && <Pressable onPress={() => router.push('/community')} style={s.post}><View style={s.postTop}><Avatar size={42} uri={homePost.profile?.avatar_url} index={2} /><View style={{ flex: 1 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><Text style={s.postUser}>{homePost.profile?.display_name || 'Girlie'}</Text>{homePost.profile?.verified && <VerifiedMark size={15} />}</View><Text style={s.postMeta}>@{homePost.profile?.handle || 'girlie'} · {new Date(homePost.created_at).toLocaleDateString()}</Text></View><I name="more" size={20} color={C.muted} /></View>{!!homePost.body && <Text style={s.postText}>{homePost.body}</Text>}{homePost.media_urls[0] && (getMediaType(homePost, homePost.media_urls[0], 0) === 'video' ? <View style={[s.postImg, { backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }]}><Text style={{ color: '#FFF', fontWeight: '900' }}>Video preview</Text></View> : <Image source={{ uri: homePost.media_urls[0] }} style={s.postImg} />)}<View style={s.postFoot}><View style={s.postAction}><LikeButton liked={liked} onPress={() => void toggleHomeLike()} size={21} /><Text>{homeLikeCount === null ? '' : ' ' + homeLikeCount}</Text></View><View style={s.postAction}><I name="chat" size={19} /><Text> {homeCommentCount}</Text></View><View style={s.postAction}><I name="share" size={19} /><Text> {homeShareCount}</Text></View></View></Pressable>}
      <View style={s.mini}><Text style={s.miniTitle}>Your next event starts here.</Text><Text style={s.miniText}>Host online or physical events, share the details and sell tickets.</Text><Pressable onPress={() => router.push('/seller-studio/events')}><Text style={s.miniLink}>View events →</Text></Pressable></View>
      <View style={{ marginTop: 18 }}><SectionTitle title="Your spaces" /><View style={{ flexDirection: 'row', gap: 8 }}><Pressable onPress={() => router.push('/live')} style={{ flex: 1, padding: 15, borderRadius: 24, backgroundColor: C.plum }}><Text style={{ fontSize: 10, fontWeight: '900', color: C.sun }}>LIVE NOW</Text><Text style={{ fontSize: 16, fontWeight: '900', color: '#FFF', marginTop: 5 }}>Watch girls live</Text><Text style={{ fontSize: 10, color: '#EADDE4', marginTop: 4 }}>Join the room →</Text></Pressable><Pressable onPress={() => router.push('/seller-onboarding')} style={{ flex: 1, padding: 15, borderRadius: 24, backgroundColor: C.rose }}><Text style={{ fontSize: 10, fontWeight: '900' }}>SELL WITH US</Text><Text style={{ fontSize: 16, fontWeight: '900', marginTop: 5 }}>Open your shop</Text><Text style={{ fontSize: 10, marginTop: 4, fontWeight: '800' }}>Start here →</Text></Pressable></View></View>
    </Animated.ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, scroll: { paddingHorizontal: 18, paddingBottom: 105 }, head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, paddingBottom: 16 }, kicker: { fontSize: 10, fontWeight: '900', letterSpacing: 1.1, color: C.muted }, title: { fontSize: 28, fontWeight: '900', marginTop: 4, color: C.ink }, headIcons: { flexDirection: 'row', alignItems: 'center', gap: 16 }, dot: { position: 'absolute', right: -2, top: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: C.pink, borderWidth: 2, borderColor: C.bg }, search: { height: 54, borderRadius: 27, backgroundColor: '#F4EDEF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 17, gap: 11, marginBottom: 18 }, searchText: { flex: 1, color: C.muted, fontWeight: '600', fontSize: 14 }, heroDots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 }, heroDot: { width: 6, height: 6, borderRadius: 4, backgroundColor: '#D8C6CC' }, heroDotOn: { width: 19, backgroundColor: C.ink }, ribbon: { marginTop: 19, minHeight: 142, borderRadius: 28, backgroundColor: C.plum, padding: 18, overflow: 'hidden', position: 'relative' }, ribbonCopy: { width: '66%', zIndex: 1 }, ribbonImage: { position: 'absolute', right: -8, bottom: -6, width: '43%', height: 158 }, ribbonBig: { color: '#FFF', fontSize: 23, fontWeight: '900' }, ribbonSmall: { color: '#F4DDE7', fontSize: 12, fontWeight: '600', marginTop: 3 }, ribbonGo: { color: C.sun, fontSize: 11, fontWeight: '900', marginTop: 14 }, seller: { width: 166, marginRight: 12, padding: 13, borderRadius: 28, backgroundColor: C.cream }, sellerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 8 }, sellerName: { fontSize: 13, fontWeight: '900', maxWidth: 120 }, sellerHandle: { fontSize: 11, color: C.muted, marginTop: 3 }, sellerMeta: { fontSize: 11, color: C.muted, marginTop: 4 }, follow: { alignSelf: 'flex-start', marginTop: 9, backgroundColor: C.white, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 }, followText: { fontSize: 10, fontWeight: '900' }, editorial: { marginTop: 27, borderRadius: 32, overflow: 'hidden', backgroundColor: C.sun, minHeight: 290 }, editorialImg: { width: '100%', height: 180 }, editorialText: { padding: 18 }, editorialK: { fontSize: 9, fontWeight: '900', letterSpacing: 1.3 }, editorialTitle: { fontSize: 24, lineHeight: 27, fontWeight: '900', marginTop: 6 }, editorialSub: { fontSize: 12, lineHeight: 17, fontWeight: '600', marginTop: 5 }, darkBtn: { alignSelf: 'flex-start', backgroundColor: C.ink, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, marginTop: 13 }, post: { backgroundColor: C.white, borderRadius: 30, padding: 15, borderWidth: 1, borderColor: C.line }, postTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, postUser: { fontSize: 14, fontWeight: '900' }, postMeta: { fontSize: 10, color: C.muted, marginTop: 2 }, postText: { fontSize: 14, lineHeight: 20, fontWeight: '600', marginVertical: 13 }, postImg: { height: 270, width: '100%', borderRadius: 24 }, postFoot: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 }, postAction: { flexDirection: 'row', alignItems: 'center', gap: 4 }, mini: { marginTop: 18, padding: 20, borderRadius: 28, backgroundColor: C.mint }, miniTitle: { fontSize: 19, fontWeight: '900' }, miniText: { fontSize: 12, fontWeight: '600', marginTop: 5 }, miniLink: { fontSize: 12, fontWeight: '900', marginTop: 12 },
});