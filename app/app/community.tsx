import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { Avatar, VerifiedMark } from '../Avatar';
import { useChromeVisibility } from '../components/BottomNav';
import { LikeButton } from '../components/LikeButton';
import { supabase } from '../lib/supabase';
import { addComment, addShare, deletePost, getCurrentProfile, getSessionUser, reportPost, setBookmark, setFollow, setPostLike, setPostPreference } from '../lib/social';

type Post = { id: string; author_id: string; body: string; media_urls: string[]; visibility: string; created_at: string; product_id?: string | null; service_id?: string | null; metadata?: any; profile?: any; like_count?: number };
type Story = { id: string; user_id: string; media_url: string; media_type: 'image' | 'video'; profile?: any };
type Viewer = { url: string; postId: string; type: 'image' | 'video' };

const VIDEO_URL_PATTERN = /\.(mp4|mov|m4v|webm|m3u8)(?:[?#]|$)/i;

function getPostMediaType(post: Post, url: string, index: number): 'image' | 'video' {
  const typed = post.metadata?.media_types?.[index] || post.metadata?.media?.[index]?.type;
  if (typed === 'video' || typed === 'image') return typed;
  return VIDEO_URL_PATTERN.test(url) ? 'video' : 'image';
}

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
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [notInterested, setNotInterested] = useState<Set<string>>(new Set());
  const [commenting, setCommenting] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [viewerInfoVisible, setViewerInfoVisible] = useState(true);
  const lastTap = useRef<Record<string, number>>({});
  const viewerTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastViewerTap = useRef(0);

  const load = useCallback(async () => {
    let active = true;
    try {
      setLoading(true); setError('');
      const [postResult, me] = await Promise.all([
        waitFor(supabase.from('posts').select('id,author_id,body,media_urls,visibility,created_at,product_id,service_id,metadata').eq('visibility', 'public').order('created_at', { ascending: false }).limit(20)),
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
    const [profilesResult, storiesResult, likesResult, commentsResult] = await Promise.allSettled([
        authorIds.length ? waitFor(supabase.from('profiles').select('id,display_name,handle,avatar_url,verified,video_autoplay').in('id', authorIds)) : Promise.resolve({ data: [], error: null }),
        waitFor(supabase.from('stories').select('id,user_id,media_url,media_type').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(20)),
        postIds.length ? waitFor(supabase.from('post_likes').select('post_id').in('post_id', postIds)) : Promise.resolve({ data: [], error: null }),
        postIds.length ? waitFor(supabase.from('post_comments').select('post_id').in('post_id', postIds)) : Promise.resolve({ data: [], error: null }),
      ]);
      if (!active) return;
      const profileRows = profilesResult.status === 'fulfilled' && !profilesResult.value.error ? profilesResult.value.data || [] : [];
      const storyRows = storiesResult.status === 'fulfilled' && !storiesResult.value.error ? storiesResult.value.data || [] : [];
      const likeRows = likesResult.status === 'fulfilled' && !likesResult.value.error ? likesResult.value.data || [] : [];
      const commentRows = commentsResult.status === 'fulfilled' && !commentsResult.value.error ? commentsResult.value.data || [] : [];
      const profileMap = new Map(profileRows.map((profile: any) => [profile.id, profile]));
      const counts: Record<string, number> = {};
      likeRows.forEach((row: any) => { counts[row.post_id] = (counts[row.post_id] || 0) + 1; });
      const commentCounts: Record<string, number> = {};
      commentRows.forEach((row: any) => { commentCounts[row.post_id] = (commentCounts[row.post_id] || 0) + 1; });
      setPosts(rows.map(post => ({ ...post, profile: profileMap.get(post.author_id), like_count: counts[post.id] || 0 })));
      setLikeCounts(counts);
      setCommentCounts(commentCounts);
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
      const [likes, bookmarks, follows, preferences] = await Promise.all([
        supabase.from('post_likes').select('post_id').eq('user_id', user.id).in('post_id', posts.map(post => post.id)),
        supabase.from('bookmarks').select('post_id').eq('user_id', user.id).in('post_id', posts.map(post => post.id)),
        supabase.from('follows').select('following_id').eq('follower_id', user.id).in('following_id', [...new Set(posts.map(post => post.author_id))]),
        supabase.from('post_preferences').select('post_id').eq('user_id', user.id).eq('preference', 'not_interested').in('post_id', posts.map(post => post.id)),
      ]);
      if (active) {
        setLiked(new Set((likes.data || []).map((row: any) => row.post_id)));
        setBookmarked(new Set((bookmarks.data || []).map((row: any) => row.post_id)));
        setFollowing(new Set((follows.data || []).map((row: any) => row.following_id)));
        setNotInterested(new Set((preferences.data || []).map((row: any) => row.post_id)));
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [posts]);

  const toggle = async (kind: 'like' | 'bookmark' | 'follow', id: string) => {
    const setters: any = { like: [liked, setLiked, setPostLike], bookmark: [bookmarked, setBookmarked, setBookmark], follow: [following, setFollowing, setFollow] };
    const [current, setter, action] = setters[kind];
    const next = !current.has(id);
    const optimistic = new Set(current); next ? optimistic.add(id) : optimistic.delete(id); setter(optimistic);
    try {
      await action(id, next);
      if (kind === 'like') setLikeCounts(counts => ({ ...counts, [id]: Math.max(0, (counts[id] || 0) + (next ? 1 : -1)) }));
    } catch (e: any) { setter(current); Alert.alert('Could not save', e?.message || 'Please try again.'); }
  };

  const visiblePosts = (tab === 'Following' ? posts.filter(post => following.has(post.author_id)) : posts)
    .filter(post => !notInterested.has(post.id));
  const viewerPost = viewer ? posts.find(post => post.id === viewer.postId) : null;
  const handleViewerMediaTap = () => {
    if (!viewer) return;
    const now = Date.now();
    if (now - lastViewerTap.current < 280) {
      if (viewerTapTimer.current) clearTimeout(viewerTapTimer.current);
      lastViewerTap.current = 0;
      void toggle('like', viewer.postId);
      return;
    }
    lastViewerTap.current = now;
    viewerTapTimer.current = setTimeout(() => {
      setViewerInfoVisible(value => !value);
      lastViewerTap.current = 0;
    }, 280);
  };
  const openViewerMenu = () => {
    if (!viewer || !viewerPost) return;
    if (viewerPost.author_id === currentProfile?.id) {
      Alert.alert('Your post', 'Choose an action for this post.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deletePost(viewerPost.id);
            setPosts(current => current.filter(post => post.id !== viewerPost.id));
            setViewer(null);
          } catch (error: any) {
            Alert.alert('Could not delete post', error?.message || 'Please try again.');
          }
        } },
      ]);
      return;
    }
    Alert.alert('Post options', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Report', onPress: async () => {
        try { await reportPost(viewerPost.id); Alert.alert('Thanks', 'Your report was submitted.'); }
        catch (error: any) { Alert.alert('Could not report post', error?.message || 'Please try again.'); }
      } },
      { text: 'Not interested', onPress: async () => {
        try {
          await setPostPreference(viewerPost.id, 'not_interested', true);
          setNotInterested(current => new Set(current).add(viewerPost.id));
          setViewer(null);
        } catch (error: any) { Alert.alert('Could not save preference', error?.message || 'Please try again.'); }
      } },
    ]);
  };
  const openAnnouncement = (post: Post) => {
    if (post.product_id) router.push({ pathname: '/product', params: { id: post.product_id } });
    else if (post.service_id) router.push({ pathname: '/service/[id]', params: { id: post.service_id } });
  };
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}>
    <View style={s.top}><Pressable onPress={() => router.push('/notifications')}><I name="bell" size={25} /></Pressable><Text style={s.h}>Feed</Text><Pressable onPress={() => router.push('/chat')}><I name="chat" size={25} /></Pressable></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabs}>{['For you', 'Following', 'Trending', 'Hair girls'].map(item => <Pressable key={item} onPress={() => setTab(item)} style={[s.tab, tab === item && s.tabOn]}><Text style={[s.tabText, tab === item && s.tabTextOn]}>{item}</Text></Pressable>)}</ScrollView>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.stories}><Pressable style={s.story} onPress={() => router.push('/story?mode=create')}><View style={[s.storyRing, s.storyOwn]}><Avatar size={58} uri={currentProfile?.avatar_url} verified={currentProfile?.verified} /><View style={s.add}><Text style={s.addText}>+</Text></View></View><Text style={s.storyName}>Your story</Text></Pressable>{stories.map(story => <Pressable key={story.id} style={s.story} onPress={() => router.push({ pathname: '/story', params: { id: story.id, url: story.media_url, type: story.media_type, name: story.profile?.display_name || 'Girlie' } })}><View style={s.storyRing}><Avatar size={58} uri={story.profile?.avatar_url} verified={story.profile?.verified} /></View><Text style={s.storyName} numberOfLines={1}>{story.profile?.display_name || 'Girlie'}</Text></Pressable>)}</ScrollView>
    <Pressable style={s.composer} onPress={() => router.push('/create')}><Avatar size={42} uri={currentProfile?.avatar_url} verified={currentProfile?.verified} /><Text style={s.ask}>What’s on your mind, girlie?</Text><I name="camera" size={24} color={C.pink} /></Pressable>
    {loading && <View style={s.state}><ActivityIndicator color={C.pink} /><Text style={s.stateText}>Loading your girls…</Text></View>}
    {!loading && error && <View style={s.state}><Text style={s.stateTitle}>Feed couldn’t load</Text><Text style={s.stateText}>{error}</Text><Pressable onPress={() => void load()} style={s.retry}><Text style={s.retryText}>Try again</Text></Pressable></View>}
    {!loading && !error && !visiblePosts.length && <View style={s.state}><Text style={s.spark}>✦</Text><Text style={s.stateTitle}>{tab === 'Following' ? 'Follow some girlies' : 'Your feed is ready'}</Text><Text style={s.stateText}>{tab === 'Following' ? 'Follow people to see their posts here.' : 'Be the first to share something with the girls.'}</Text></View>}
   {visiblePosts.map(post => <View style={s.post} key={post.id}><View style={s.postTop}><Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: post.author_id } })}><Avatar size={43} uri={post.profile?.avatar_url} verified={post.profile?.verified} /></Pressable><Pressable style={s.postAuthor} onPress={() => router.push({ pathname: '/user/[id]', params: { id: post.author_id } })}><Text style={s.name}>{post.profile?.display_name || 'Girlie'} {post.profile?.verified && <VerifiedMark size={15} />}</Text><Text style={s.meta}>@{post.profile?.handle || 'girlie'} · {new Date(post.created_at).toLocaleDateString()}</Text></Pressable>{post.author_id && <Pressable onPress={() => toggle('follow', post.author_id)}><Text style={s.follow}>{following.has(post.author_id) ? 'Following' : 'Follow'}</Text></Pressable>}{post.author_id === currentProfile?.id && <Pressable onPress={() => Alert.alert('Delete post?', 'This post will be removed for everyone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { try { await deletePost(post.id); setPosts(current => current.filter(item => item.id !== post.id)); } catch (error: any) { Alert.alert('Could not delete post', error?.message || 'Please try again.'); } } }])}><I name="more" size={21} /></Pressable>}</View>{post.body ? <Text style={s.postText}>{post.body}</Text> : null}{post.media_urls.filter(url => typeof url === 'string' && url.trim()).map((url, index) => { const type = getPostMediaType(post, url, index); return <Pressable key={url + '-' + index} onPress={() => { const now = Date.now(); if (now - (lastTap.current[post.id] || 0) < 280) void toggle('like', post.id); lastTap.current[post.id] = now; setViewerInfoVisible(true); setViewer({ url, type, postId: post.id }); }}><View style={s.mediaFrame}>{type === 'video' ? <View style={[s.postImg, { backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }]}><Text style={{ color: '#FFF', fontWeight: '900' }}>Video preview</Text></View> : <Image source={{ uri: url }} style={s.postImg} />}</View></Pressable>; })}{(post.product_id || post.service_id) && <Pressable onPress={() => openAnnouncement(post)}><Text style={s.announcementHint}>Open listing →</Text></Pressable>}<View style={s.actions}><View style={s.action}><LikeButton liked={liked.has(post.id)} onPress={() => toggle('like', post.id)} size={22} /><Text style={s.actionText}>{likeCounts[post.id] ? `${likeCounts[post.id]} · ` : ''}{liked.has(post.id) ? 'Liked' : 'Like'}</Text></View><Pressable style={s.action} onPress={() => setCommenting(commenting === post.id ? null : post.id)}><I name="chat" size={20} /><Text style={s.actionText}>Comment</Text></Pressable><Pressable style={s.action} onPress={() => addShare(post.id).catch(e => Alert.alert('Share failed', e?.message))}><I name="share" size={20} /><Text style={s.actionText}>Share</Text></Pressable><Pressable onPress={() => toggle('bookmark', post.id)}><I name="bookmark" size={20} filled={bookmarked.has(post.id)} /></Pressable></View>{commenting === post.id && <View style={s.commentBox}><TextInput value={comment} onChangeText={setComment} placeholder="Write a comment…" placeholderTextColor={C.muted} style={s.commentInput} /><Pressable onPress={() => { if (comment.trim()) addComment(post.id, comment).then(() => { setComment(''); setCommenting(null); setCommentCounts(current => ({ ...current, [post.id]: (current[post.id] || 0) + 1 })); }).catch(e => Alert.alert('Comment failed', e?.message)); }}><I name="send" size={22} color={C.pink} /></Pressable></View>}</View>)}
   </ScrollView><Modal visible={Boolean(viewer)} transparent animationType="fade" onRequestClose={() => setViewer(null)}><View style={s.viewer}><Pressable style={s.viewerClose} onPress={() => setViewer(null)}><Text style={s.viewerCloseText}>×</Text></Pressable>{viewer && viewerPost && <><Pressable style={s.viewerMedia} onPress={handleViewerMediaTap}>{viewer.type === 'video' ? <View style={{ width: '100%', height: '75%', backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFF', fontWeight: '900' }}>Video playback is unavailable in this build</Text></View> : <Image source={{ uri: viewer.url }} style={s.viewerImage} />}</Pressable>{viewerInfoVisible && <View style={s.viewerInfo}><View style={s.viewerHeader}><Pressable onPress={() => { setViewer(null); router.push({ pathname: '/user/[id]', params: { id: viewerPost.author_id } }); }}><Avatar size={42} uri={viewerPost.profile?.avatar_url} verified={viewerPost.profile?.verified} /></Pressable><Pressable style={s.viewerAuthor} onPress={() => { setViewer(null); router.push({ pathname: '/user/[id]', params: { id: viewerPost.author_id } }); }}><Text style={s.viewerName}>{viewerPost.profile?.display_name || 'Girlie'} {viewerPost.profile?.verified && <VerifiedMark size={14} />}</Text><Text style={s.viewerMeta}>@{viewerPost.profile?.handle || 'girlie'}</Text></Pressable>{viewerPost.author_id !== currentProfile?.id && <Pressable onPress={() => toggle('follow', viewerPost.author_id)}><Text style={s.follow}>{following.has(viewerPost.author_id) ? 'Following' : 'Follow'}</Text></Pressable>}<Pressable onPress={openViewerMenu}><I name="more" size={22} color="#FFF" /></Pressable></View>{viewerPost.body ? <Text style={s.viewerCaption}>{viewerPost.body}</Text> : null}<View style={s.viewerActions}><Pressable style={s.viewerAction} onPress={() => toggle('like', viewerPost.id)}><LikeButton liked={liked.has(viewerPost.id)} onPress={() => toggle('like', viewerPost.id)} size={28} /><Text style={s.viewerCaption}>{likeCounts[viewerPost.id] || 0}</Text></Pressable><Pressable style={s.viewerAction} onPress={() => setCommenting(commenting === viewerPost.id ? null : viewerPost.id)}><I name="chat" size={24} color="#FFF" /><Text style={s.viewerCaption}>{commentCounts[viewerPost.id] || 0}</Text></Pressable><Pressable style={s.viewerAction} onPress={() => toggle('bookmark', viewerPost.id)}><I name="bookmark" size={24} color="#FFF" filled={bookmarked.has(viewerPost.id)} /><Text style={s.viewerCaption}>{bookmarked.has(viewerPost.id) ? 'Saved' : 'Save'}</Text></Pressable></View>{commenting === viewerPost.id && <View style={s.viewerCommentBox}><TextInput value={comment} onChangeText={setComment} placeholder="Write a comment…" placeholderTextColor="#D9D9D9" style={s.viewerCommentInput} /><Pressable onPress={() => { if (comment.trim()) addComment(viewerPost.id, comment).then(() => { setComment(''); setCommenting(null); setCommentCounts(current => ({ ...current, [viewerPost.id]: (current[viewerPost.id] || 0) + 1 })); }).catch(error => Alert.alert('Comment failed', error?.message || 'Please try again.')); }}><I name="send" size={22} color={C.pink} /></Pressable></View>}</View>}</>}</View></Modal><Pressable style={[s.fab, { transform: [{ translateY: visibility.interpolate({ inputRange: [0, 1], outputRange: [90, 0] }) }] }]} onPress={() => router.push('/create')}><I name="plus" size={28} color="#FFF" /></Pressable></SafeAreaView>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, scroll: { padding: 18, paddingBottom: 110 }, top: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, h: { fontSize: 20, fontWeight: '900' }, tabs: { marginBottom: 12 }, tab: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, backgroundColor: '#FFF', marginRight: 7, borderWidth: 1, borderColor: C.line }, tabOn: { backgroundColor: C.ink }, tabText: { fontSize: 11, fontWeight: '900' }, tabTextOn: { color: '#FFF' }, stories: { marginBottom: 14 }, story: { width: 76, alignItems: 'center', marginRight: 8 }, storyRing: { padding: 3, borderRadius: 36, borderWidth: 2, borderColor: C.pink, position: 'relative' }, storyOwn: { borderColor: C.ink }, storyName: { fontSize: 10, marginTop: 5 }, add: { position: 'absolute', right: -1, bottom: 0, width: 20, height: 20, borderRadius: 10, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' }, addText: { color: '#FFF', fontWeight: '900' }, composer: { backgroundColor: '#FFF', borderRadius: 28, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.line }, ask: { flex: 1, color: C.muted, fontWeight: '600' }, state: { marginTop: 18, padding: 28, borderRadius: 28, backgroundColor: '#FFF', alignItems: 'center', borderWidth: 1, borderColor: C.line }, stateTitle: { fontSize: 18, fontWeight: '900', marginTop: 6 }, stateText: { fontSize: 12, color: C.muted, textAlign: 'center', lineHeight: 17, marginTop: 5 }, spark: { fontSize: 40 }, retry: { marginTop: 14, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, backgroundColor: C.pink }, retryText: { color: '#FFF', fontWeight: '900' }, post: { marginTop: 15, backgroundColor: '#FFF', borderRadius: 29, padding: 15, borderWidth: 1, borderColor: C.line }, postTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, postAuthor: { flex: 1 }, name: { fontSize: 14, fontWeight: '900' }, meta: { fontSize: 11, color: C.muted, marginTop: 2 }, follow: { color: C.pink, fontSize: 12, fontWeight: '900' }, postText: { fontSize: 14, lineHeight: 20, fontWeight: '600', marginVertical: 12 }, postImg: { height: 285, borderRadius: 23, width: '100%', marginTop: 5 }, mediaFrame: { overflow: 'hidden', borderRadius: 23 }, announcementHint: { color: C.pink, fontSize: 12, fontWeight: '900', marginTop: 10 }, actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12 }, action: { flexDirection: 'row', alignItems: 'center', gap: 5 }, actionText: { fontSize: 12 }, commentBox: { marginTop: 10, padding: 8, borderRadius: 22, backgroundColor: C.bg, flexDirection: 'row', alignItems: 'center' }, commentInput: { flex: 1, paddingHorizontal: 10, paddingVertical: 8 }, viewer:{flex:1,backgroundColor:'#000',justifyContent:'center',padding:18},viewerMedia:{flex:1,justifyContent:'center'},viewerImage:{width:'100%',height:'75%',resizeMode:'contain'},viewerVideo:{width:'100%',height:'75%'},viewerClose:{position:'absolute',top:55,right:22,zIndex:2,width:42,height:42,borderRadius:21,backgroundColor:'#FFF3',alignItems:'center',justifyContent:'center'},viewerCloseText:{color:'#FFF',fontSize:31,lineHeight:35},viewerInfo:{backgroundColor:'#000C',padding:14,borderRadius:18},viewerHeader:{flexDirection:'row',alignItems:'center',gap:10},viewerAuthor:{flex:1},viewerName:{color:'#FFF',fontSize:15,fontWeight:'900'},viewerMeta:{color:'#CCC',fontSize:11,marginTop:2},viewerAction:{flexDirection:'row',alignItems:'center',gap:6},viewerActions:{flexDirection:'row',alignItems:'center',gap:22,paddingTop:14},viewerCaption:{color:'#FFF',fontWeight:'800'},viewerCommentBox:{marginTop:10,padding:8,borderRadius:22,backgroundColor:'#FFF',flexDirection:'row',alignItems:'center'},viewerCommentInput:{flex:1,paddingHorizontal:10,paddingVertical:8,color:C.ink},fab: { position: 'absolute', right: 23, bottom: 92, width: 55, height: 55, borderRadius: 28, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center', zIndex: 18, elevation: 8 },
});