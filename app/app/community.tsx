import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { Avatar, VerifiedMark } from '../Avatar';
import { useChromeVisibility } from '../components/BottomNav';
import { LikeButton } from '../components/LikeButton';
import { supabase } from '../lib/supabase';
import { addComment, addShare, getCurrentProfile, getSessionUser, setBookmark, setFollow, setPostLike } from '../lib/social';

type Post = { id: string; author_id: string; body: string; media_urls: string[]; visibility: string; created_at: string; profile?: any; like_count?: number };
type Story = { id: string; user_id: string; media_url: string; media_type: 'image' | 'video'; profile?: any };

const waitFor = <T,>(promise: PromiseLike<T>, ms = 8000) => new Promise<T>((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Feed request timed out.')), ms);
  Promise.resolve(promise).then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
});

export default function Community() {
  const router = useRouter();
  const { visibility, onScroll, reset } = useChromeVisibility();
  const [tab, setTab] = useState('For you');
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [commenting, setCommenting] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [currentProfile, setCurrentProfile] = useState<any>(null);

  const load = useCallback(async () => {
    let active = true;
    try {
      setLoading(true); setError('');
      const [postResult, me] = await Promise.all([
        waitFor(supabase.from('posts').select('id,author_id,body,media_urls,visibility,created_at').eq('visibility', 'public').order('created_at', { ascending: false }).limit(20)),
        getCurrentProfile().catch(() => null),
      ]);
      if (postResult.error) throw postResult.error;
      setCurrentProfile(me);
      const rows: Post[] = (postResult.data || []).map((post: any) => ({ ...post, media_urls: Array.isArray(post.media_urls) ? post.media_urls : [] }));
      const authorIds = [...new Set(rows.map(post => post.author_id))];
      const postIds = rows.map(post => post.id);
      setPosts(rows);
      setLikeCounts({});
      setLoading(false);
      setRefreshing(false);
      const [profilesResult, storiesResult, likesResult] = await Promise.allSettled([
        authorIds.length ? waitFor(supabase.from('profiles').select('id,display_name,handle,avatar_url,verified').in('id', authorIds)) : Promise.resolve({ data: [], error: null }),
        waitFor(supabase.from('stories').select('id,user_id,media_url,media_type').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(20)),
        postIds.length ? waitFor(supabase.from('post_likes').select('post_id').in('post_id', postIds)) : Promise.resolve({ data: [], error: null }),
      ]);
      if (!active) return;
      const profileRows = profilesResult.status === 'fulfilled' && !profilesResult.value.error ? profilesResult.value.data || [] : [];
      const storyRows = storiesResult.status === 'fulfilled' && !storiesResult.value.error ? storiesResult.value.data || [] : [];
      const likeRows = likesResult.status === 'fulfilled' && !likesResult.value.error ? likesResult.value.data || [] : [];
      const profileMap = new Map(profileRows.map((profile: any) => [profile.id, profile]));
      const counts: Record<string, number> = {};
      likeRows.forEach((row: any) => { counts[row.post_id] = (counts[row.post_id] || 0) + 1; });
      setPosts(rows.map(post => ({ ...post, profile: profileMap.get(post.author_id), like_count: counts[post.id] || 0 })));
      setLikeCounts(counts);
      setStories(storyRows.map((story: any) => ({ ...story, profile: profileMap.get(story.user_id) })));
    } catch (e: any) {
      if (active) setError(e?.message || 'Could not load your feed.');
    } finally {
      if (active) { setLoading(false); setRefreshing(false); }
    }
    return () => { active = false; };
  }, []);

  useFocusEffect(useCallback(() => {
    reset();
    let active = true;
    void load();
    return () => { active = false; };
  }, [load, reset]));

  useEffect(() => {
    let active = true;
    getSessionUser().then(async user => {
      if (!active || !user || !posts.length) return;
      const [likes, bookmarks, follows] = await Promise.all([
        supabase.from('post_likes').select('post_id').eq('user_id', user.id).in('post_id', posts.map(post => post.id)),
        supabase.from('bookmarks').select('post_id').eq('user_id', user.id).in('post_id', posts.map(post => post.id)),
        supabase.from('follows').select('following_id').eq('follower_id', user.id).in('following_id', [...new Set(posts.map(post => post.author_id))]),
      ]);
      if (active) { setLiked(new Set((likes.data || []).map((row: any) => row.post_id))); setBookmarked(new Set((bookmarks.data || []).map((row: any) => row.post_id))); setFollowing(new Set((follows.data || []).map((row: any) => row.following_id))); }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [posts]);

  const toggle = async (kind: 'like' | 'bookmark' | 'follow', id: string) => {
    const setters: any = { like: [liked, setLiked, setPostLike], bookmark: [bookmarked, setBookmarked, setBookmark], follow: [following, setFollowing, setFollow] };
    const [current, setter, action] = setters[kind];
    const next = !current.has(id);
    const optimistic = new Set(current); next ? optimistic.add(id) : optimistic.delete(id); setter(optimistic);
    try { await action(id, next); } catch (e: any) { setter(current); Alert.alert('Could not save', e?.message || 'Please try again.'); }
  };

  const visiblePosts = tab === 'Following' ? posts.filter(post => following.has(post.author_id)) : posts;
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}>
    <View style={s.top}><Pressable onPress={() => router.push('/notifications')}><I name="bell" size={25} /></Pressable><Text style={s.h}>Feed</Text><Pressable onPress={() => router.push('/chat')}><I name="chat" size={25} /></Pressable></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabs}>{['For you', 'Following', 'Trending', 'Hair girls'].map(item => <Pressable key={item} onPress={() => setTab(item)} style={[s.tab, tab === item && s.tabOn]}><Text style={[s.tabText, tab === item && s.tabTextOn]}>{item}</Text></Pressable>)}</ScrollView>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.stories}><Pressable style={s.story} onPress={() => router.push('/story?mode=create')}><View style={[s.storyRing, s.storyOwn]}><Avatar size={58} uri={currentProfile?.avatar_url} verified={currentProfile?.verified} /><View style={s.add}><Text style={s.addText}>+</Text></View></View><Text style={s.storyName}>Your story</Text></Pressable>{stories.map(story => <Pressable key={story.id} style={s.story} onPress={() => router.push({ pathname: '/story', params: { id: story.id, url: story.media_url, type: story.media_type, name: story.profile?.display_name || 'Girlie' } })}><View style={s.storyRing}><Avatar size={58} uri={story.profile?.avatar_url} verified={story.profile?.verified} /></View><Text style={s.storyName} numberOfLines={1}>{story.profile?.display_name || 'Girlie'}</Text></Pressable>)}</ScrollView>
    <Pressable style={s.composer} onPress={() => router.push('/create')}><Avatar size={42} uri={currentProfile?.avatar_url} verified={currentProfile?.verified} /><Text style={s.ask}>What’s on your mind, girlie?</Text><I name="camera" size={24} color={C.pink} /></Pressable>
    {loading && <View style={s.state}><ActivityIndicator color={C.pink} /><Text style={s.stateText}>Loading your girls…</Text></View>}
    {!loading && error && <View style={s.state}><Text style={s.stateTitle}>Feed couldn’t load</Text><Text style={s.stateText}>{error}</Text><Pressable onPress={() => void load()} style={s.retry}><Text style={s.retryText}>Try again</Text></Pressable></View>}
    {!loading && !error && !visiblePosts.length && <View style={s.state}><Text style={s.spark}>✦</Text><Text style={s.stateTitle}>{tab === 'Following' ? 'Follow some girlies' : 'Your feed is ready'}</Text><Text style={s.stateText}>{tab === 'Following' ? 'Follow people to see their posts here.' : 'Be the first to share something with the girls.'}</Text></View>}
    {visiblePosts.map(post => <View style={s.post} key={post.id}><View style={s.postTop}><Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: post.author_id } })}><Avatar size={43} uri={post.profile?.avatar_url} verified={post.profile?.verified} /></Pressable><Pressable style={s.postAuthor} onPress={() => router.push({ pathname: '/user/[id]', params: { id: post.author_id } })}><Text style={s.name}>{post.profile?.display_name || 'Girlie'} {post.profile?.verified && <VerifiedMark size={15} />}</Text><Text style={s.meta}>@{post.profile?.handle || 'girlie'} · {new Date(post.created_at).toLocaleDateString()}</Text></Pressable>{post.author_id && <Pressable onPress={() => toggle('follow', post.author_id)}><Text style={s.follow}>{following.has(post.author_id) ? 'Following' : 'Follow'}</Text></Pressable>}</View>{post.body ? <Text style={s.postText}>{post.body}</Text> : null}{post.media_urls.map((url, index) => <Image key={`${url}-${index}`} source={{ uri: url }} style={s.postImg} />)}<View style={s.actions}><View style={s.action}><LikeButton liked={liked.has(post.id)} onPress={() => toggle('like', post.id)} size={22} /><Text style={s.actionText}>{likeCounts[post.id] ? `${likeCounts[post.id]} · ` : ''}{liked.has(post.id) ? 'Liked' : 'Like'}</Text></View><Pressable style={s.action} onPress={() => setCommenting(commenting === post.id ? null : post.id)}><I name="chat" size={20} /><Text style={s.actionText}>Comment</Text></Pressable><Pressable style={s.action} onPress={() => addShare(post.id).catch(e => Alert.alert('Share failed', e?.message))}><I name="share" size={20} /><Text style={s.actionText}>Share</Text></Pressable><Pressable onPress={() => toggle('bookmark', post.id)}><I name="bookmark" size={20} filled={bookmarked.has(post.id)} /></Pressable></View>{commenting === post.id && <View style={s.commentBox}><TextInput value={comment} onChangeText={setComment} placeholder="Write a comment…" placeholderTextColor={C.muted} style={s.commentInput} /><Pressable onPress={() => { if (comment.trim()) addComment(post.id, comment).then(() => { setComment(''); setCommenting(null); }).catch(e => Alert.alert('Comment failed', e?.message)); }}><I name="send" size={22} color={C.pink} /></Pressable></View>}</View>)}
  </ScrollView><Pressable style={[s.fab, { transform: [{ translateY: visibility.interpolate({ inputRange: [0, 1], outputRange: [90, 0] }) }] }]} onPress={() => router.push('/create')}><I name="plus" size={28} color="#FFF" /></Pressable></SafeAreaView>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, scroll: { padding: 18, paddingBottom: 110 }, top: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, h: { fontSize: 20, fontWeight: '900' }, tabs: { marginBottom: 12 }, tab: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, backgroundColor: '#FFF', marginRight: 7, borderWidth: 1, borderColor: C.line }, tabOn: { backgroundColor: C.ink }, tabText: { fontSize: 11, fontWeight: '900' }, tabTextOn: { color: '#FFF' }, stories: { marginBottom: 14 }, story: { width: 76, alignItems: 'center', marginRight: 8 }, storyRing: { padding: 3, borderRadius: 36, borderWidth: 2, borderColor: C.pink, position: 'relative' }, storyOwn: { borderColor: C.ink }, storyName: { fontSize: 10, marginTop: 5 }, add: { position: 'absolute', right: -1, bottom: 0, width: 20, height: 20, borderRadius: 10, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' }, addText: { color: '#FFF', fontWeight: '900' }, composer: { backgroundColor: '#FFF', borderRadius: 28, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.line }, ask: { flex: 1, color: C.muted, fontWeight: '600' }, state: { marginTop: 18, padding: 28, borderRadius: 28, backgroundColor: '#FFF', alignItems: 'center', borderWidth: 1, borderColor: C.line }, stateTitle: { fontSize: 18, fontWeight: '900', marginTop: 6 }, stateText: { fontSize: 12, color: C.muted, textAlign: 'center', lineHeight: 17, marginTop: 5 }, spark: { fontSize: 40 }, retry: { marginTop: 14, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, backgroundColor: C.pink }, retryText: { color: '#FFF', fontWeight: '900' }, post: { marginTop: 15, backgroundColor: '#FFF', borderRadius: 29, padding: 15, borderWidth: 1, borderColor: C.line }, postTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, postAuthor: { flex: 1 }, name: { fontSize: 14, fontWeight: '900' }, meta: { fontSize: 11, color: C.muted, marginTop: 2 }, follow: { color: C.pink, fontSize: 12, fontWeight: '900' }, postText: { fontSize: 14, lineHeight: 20, fontWeight: '600', marginVertical: 12 }, postImg: { height: 285, borderRadius: 23, width: '100%', marginTop: 5 }, actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12 }, action: { flexDirection: 'row', alignItems: 'center', gap: 5 }, actionText: { fontSize: 12 }, commentBox: { marginTop: 10, padding: 8, borderRadius: 22, backgroundColor: C.bg, flexDirection: 'row', alignItems: 'center' }, commentInput: { flex: 1, paddingHorizontal: 10, paddingVertical: 8 }, fab: { position: 'absolute', right: 23, bottom: 92, width: 55, height: 55, borderRadius: 28, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center', zIndex: 18, elevation: 8 },
});