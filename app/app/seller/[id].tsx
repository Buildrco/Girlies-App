import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { C } from '../../constants/theme';
import { I } from '../../components/Icons';
import { Avatar, VerifiedMark } from '../../Avatar';
import { ProductCard } from '../../components/ProductCard';
import { LikeButton } from '../../components/LikeButton';
import { getStore, setFollow, getSessionUser, getProducts, setPostLike } from '../../lib/social';
import { supabase } from '../../lib/supabase';

type SellerMedia = { url: string; type: 'image' | 'video'; postId: string; body: string; likeCount: number };
type Viewer = SellerMedia;
const VIDEO_URL_PATTERN = /\.(mp4|mov|m4v|webm|m3u8)(?:[?#]|$)/i;

function getMediaType(post: any, url: string, index: number): 'image' | 'video' {
  const typed = post.metadata?.media_types?.[index] || post.metadata?.media?.[index]?.type;
  if (typed === 'video' || typed === 'image') return typed;
  return VIDEO_URL_PATTERN.test(url) ? 'video' : 'image';
}

function SellerVideo({ url, autoplay }: { url: string; autoplay: boolean }) {
  const player = useVideoPlayer(url, currentPlayer => {
    currentPlayer.loop = true;
    currentPlayer.muted = false;
    if (autoplay) currentPlayer.play();
  });
  useEffect(() => {
    if (autoplay) player.play();
    else player.pause();
  }, [autoplay, player]);
  return <VideoView player={player} style={s.mediaImage} nativeControls={false} contentFit="cover" />;
}

function FullscreenVideo({ url }: { url: string }) {
  const player = useVideoPlayer(url, currentPlayer => {
    currentPlayer.loop = false;
    currentPlayer.muted = false;
    currentPlayer.play();
  });
  return <VideoView player={player} style={s.viewerVideo} nativeControls contentFit="contain" />;
}

export default function Seller() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const storeId = Array.isArray(id) ? id[0] : id || '';
  const [store, setStore] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [sellerMedia, setSellerMedia] = useState<SellerMedia[]>([]);
  const [following, setFollowing] = useState(false);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const lastTap = useRef<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        if (!storeId) throw new Error('Seller could not be loaded.');
        const st = await getStore(storeId);
        if (!st) throw new Error('Seller not found.');
        const [ps, me, postsResult] = await Promise.all([
          getProducts(50, { storeId: st.id }),
          getSessionUser(),
          supabase.from('posts').select('id,author_id,body,media_urls,metadata,created_at').eq('author_id', st.owner_id).eq('visibility', 'public').order('created_at', { ascending: false }).limit(30),
        ]);
        if (postsResult.error) throw postsResult.error;
        if (!active) return;
        const posts = postsResult.data || [];
        const postIds = posts.map((post: any) => post.id);
        const likesResult = postIds.length ? await supabase.from('post_likes').select('post_id,user_id').in('post_id', postIds) : { data: [], error: null };
        if (!active) return;
        const likeCounts: Record<string, number> = {};
        const likedByMe = new Set<string>();
        (likesResult.data || []).forEach((row: any) => {
          likeCounts[row.post_id] = (likeCounts[row.post_id] || 0) + 1;
          if (me?.id === row.user_id) likedByMe.add(row.post_id);
        });
        const media = posts.flatMap((post: any) => (Array.isArray(post.media_urls) ? post.media_urls : []).map((url: string, index: number) => ({
          url,
          type: getMediaType(post, url, index),
          postId: post.id,
          body: post.body || '',
          likeCount: likeCounts[post.id] || 0,
        }))).sort((a, b) => Number(b.type === 'video') - Number(a.type === 'video'));
        setStore(st);
        setProducts(ps);
        setSellerMedia(media);
        setLiked(likedByMe);
        if (me && me.id !== st.owner_id) {
          const { data } = await supabase.from('follows').select('following_id').eq('follower_id', me.id).eq('following_id', st.owner_id).maybeSingle();
          if (active) setFollowing(Boolean(data));
        }
      } catch (e: any) {
        if (active) setError(e?.message || 'Seller could not be loaded.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [storeId]);

  async function toggleFollow() {
    if (!store) return;
    const next = !following;
    setFollowing(next);
    try { await setFollow(store.owner_id, next); }
    catch (e: any) { setFollowing(!next); Alert.alert('Follow failed', e?.message || 'Could not save your follow.'); }
  }

  async function toggleLike(postId: string) {
    const next = !liked.has(postId);
    setLiked(current => { const copy = new Set(current); next ? copy.add(postId) : copy.delete(postId); return copy; });
    try {
      await setPostLike(postId, next);
      setSellerMedia(current => current.map(media => media.postId === postId ? { ...media, likeCount: Math.max(0, media.likeCount + (next ? 1 : -1)) } : media));
    } catch (e: any) {
      setLiked(current => { const copy = new Set(current); next ? copy.delete(postId) : copy.add(postId); return copy; });
      Alert.alert('Could not save like', e?.message || 'Please try again.');
    }
  }

  function openMedia(media: SellerMedia) {
    const now = Date.now();
    if (now - (lastTap.current[media.postId] || 0) < 280) void toggleLike(media.postId);
    lastTap.current[media.postId] = now;
    setViewer(media);
  }

  if (loading) return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator color={C.pink} /></View></SafeAreaView>;
  if (!store) return <SafeAreaView style={s.safe}><View style={s.center}><Text style={s.name}>Seller unavailable</Text><Text style={s.meta}>{error}</Text><Pressable onPress={() => router.back()} style={s.message}><Text style={s.messageText}>Go back</Text></Pressable></View></SafeAreaView>;
  const owner = store.owner;
  const location = [owner?.area && owner?.location ? `${owner.area} - ${owner.location}` : owner?.area || owner?.location, owner?.country].filter(Boolean).join(', ');
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.scroll}><View style={s.top}><Pressable onPress={() => router.back()}><I name="back" size={34} /></Pressable><Pressable onPress={() => router.push('/chat')}><I name="chat" size={23} /></Pressable></View><View style={s.cover}>{products[0]?.image_urls?.[0] ? <Image source={{ uri: products[0].image_urls[0] }} style={s.coverImg} /> : <View style={s.coverEmpty} />}</View><View style={s.profile}><Avatar size={82} uri={owner?.avatar_url} /><Text style={s.name}>{owner?.display_name || store.name} {owner?.verified && <VerifiedMark size={16} />}</Text><Text style={s.handle}>@{owner?.handle || 'seller'}</Text><Text style={s.meta}>{store.verification_status === 'verified' ? 'Verified seller · ' : ''}{Number(owner?.followers_count || 0).toLocaleString()} followers</Text>{location ? <Text style={s.meta}>{location}</Text> : null}<Text style={s.bio}>{store.description || owner?.bio || ''}</Text><View style={s.actions}><Pressable onPress={toggleFollow} style={s.follow}><Text style={s.buttonText}>{following ? 'Following' : 'Follow'}</Text></Pressable><Pressable style={s.message} onPress={() => router.push('/chat')}><Text style={s.messageText}>Message</Text></Pressable></View></View>{sellerMedia.length > 0 && <><View style={s.sectionHeader}><Text style={s.sectionTitle}>Seller media</Text><Text style={s.sectionMeta}>{sellerMedia.filter(media => media.type === 'video').length} videos</Text></View><View style={s.mediaGrid}>{sellerMedia.map((media, index) => <Pressable key={`${media.postId}-${media.url}-${index}`} style={s.mediaCard} onPress={() => openMedia(media)}>{media.type === 'video' ? <SellerVideo url={media.url} autoplay={owner?.video_autoplay !== false} /> : <Image source={{ uri: media.url }} style={s.mediaImage} />}{media.type === 'video' && <View style={s.videoBadge}><I name="play" size={13} color="#FFF" /></View>}</Pressable>)}</View></>}<View style={s.tabs}><Text style={s.active}>Shop</Text><Text>Posts</Text><Text>About</Text></View><View style={s.grid}>{products.map((product: any) => <ProductCard key={product.id} gridWidth="48%" productId={product.id} name={product.name} price={'GH₵ ' + Number(product.price).toFixed(0)} image={product.image_urls?.[0] || ''} seller={owner?.display_name || store.name} verified={Boolean(owner?.verified || store.verification_status === 'verified')} onPress={() => router.push({ pathname: '/product', params: { id: product.id } })} />)}</View>{!products.length && <View style={s.empty}><Text style={{ fontSize: 30 }}>✦</Text><Text style={s.emptyTitle}>No products yet</Text><Text style={s.meta}>This seller has not published a live product.</Text></View>}</ScrollView><Modal visible={Boolean(viewer)} transparent animationType="fade" onRequestClose={() => setViewer(null)}><View style={s.viewer}><Pressable style={s.viewerClose} onPress={() => setViewer(null)}><Text style={s.viewerCloseText}>×</Text></Pressable>{viewer && <>{viewer.type === 'video' ? <FullscreenVideo url={viewer.url} /> : <Image source={{ uri: viewer.url }} style={s.viewerImage} />}<View style={s.viewerInfo}><View style={s.viewerHeader}><Avatar size={40} uri={owner?.avatar_url} verified={owner?.verified} /><View style={s.viewerAuthor}><Text style={s.viewerName}>{owner?.display_name || store.name}</Text><Text style={s.viewerMeta}>{following ? 'Following' : 'Follow'} · {viewer.likeCount} likes</Text></View><Pressable onPress={() => toggleLike(viewer.postId)}><LikeButton liked={liked.has(viewer.postId)} /></Pressable></View>{viewer.body ? <Text style={s.viewerCaption}>{viewer.body}</Text> : null></View>}</>}</View></Modal></SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }, scroll: { padding: 18, paddingBottom: 30 }, top: { height: 55, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, cover: { height: 190, borderRadius: 31, overflow: 'hidden', backgroundColor: C.rose }, coverImg: { width: '100%', height: '100%' }, coverEmpty: { flex: 1, backgroundColor: C.rose }, profile: { marginTop: -32, backgroundColor: C.bg, borderTopLeftRadius: 34, borderTopRightRadius: 34, paddingTop: 14 }, name: { fontSize: 24, fontWeight: '900', marginTop: 7 }, handle: { fontSize: 12, color: C.muted, marginTop: 2 }, meta: { fontSize: 11, color: C.muted, marginTop: 3 }, bio: { fontSize: 12, lineHeight: 18, fontWeight: '600', marginTop: 10 }, actions: { flexDirection: 'row', gap: 8, marginTop: 13 }, follow: { flex: 1, height: 42, borderRadius: 21, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' }, message: { flex: 1, height: 42, borderRadius: 21, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }, buttonText: { fontWeight: '900' }, messageText: { color: '#FFF', fontWeight: '900' }, sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 }, sectionTitle: { fontSize: 18, fontWeight: '900' }, sectionMeta: { fontSize: 11, color: C.muted }, mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }, mediaCard: { width: '48.5%', height: 180, borderRadius: 20, overflow: 'hidden', backgroundColor: C.rose }, mediaImage: { width: '100%', height: '100%' }, videoBadge: { position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 13, backgroundColor: '#0009', alignItems: 'center', justifyContent: 'center' }, tabs: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: C.line, marginBottom: 12, marginTop: 18 }, active: { fontWeight: '900', color: C.pink }, grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }, empty: { padding: 40, alignItems: 'center' }, emptyTitle: { fontSize: 18, fontWeight: '900', marginTop: 8 }, viewer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', padding: 18 }, viewerImage: { width: '100%', height: '72%', resizeMode: 'contain' }, viewerVideo: { width: '100%', height: '72%' }, viewerClose: { position: 'absolute', top: 55, right: 22, zIndex: 2, width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFF3', alignItems: 'center', justifyContent: 'center' }, viewerCloseText: { color: '#FFF', fontSize: 31, lineHeight: 35 }, viewerInfo: { backgroundColor: '#000C', padding: 14, borderRadius: 18 }, viewerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 }, viewerAuthor: { flex: 1 }, viewerName: { color: '#FFF', fontSize: 15, fontWeight: '900' }, viewerMeta: { color: '#CCC', fontSize: 11, marginTop: 2 }, viewerCaption: { color: '#FFF', fontWeight: '800', marginTop: 10 },
});