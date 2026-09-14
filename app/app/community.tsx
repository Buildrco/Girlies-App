import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { Avatar, VerifiedMark } from '../Avatar';
import { useChromeVisibility } from '../components/BottomNav';
import { LikeButton } from '../components/LikeButton';
import { supabase } from '../lib/supabase';

type Profile = { id: string; display_name: string; handle: string; bio: string; avatar_url: string | null; verified: boolean; followers_count: number; following_count: number; created_at: string };
type FeedPost = { id: string; author_id: string; body: string; media_urls: string[]; product_id: string | null; visibility: string; repost_of: string | null; created_at: string; author?: Profile };

const stories = ['Your story', 'Ama’s Corner', 'Nana Glow', 'Esi Styles', 'Hair girls'];
const tabs = ['For you', 'Following', 'Trending', 'Hair girls'];

function formatAge(value: string) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function Community() {
  const router = useRouter();
  const { visibility, onScroll } = useChromeVisibility();
  const mounted = useRef(true);
  const [tab, setTab] = useState('For you');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [liked, setLiked] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = useCallback(async (kind: 'initial' | 'refresh' = 'initial') => {
    if (kind === 'initial') setLoading(true); else setRefreshing(true);
    try {
      setError(null);
      const { data: session } = await supabase.auth.getSession();
      const user = session.session?.user ?? null;

      const { data: rows, error: postsError } = await supabase
        .from('posts')
        .select('id, author_id, body, media_urls, product_id, visibility, repost_of, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (postsError) throw postsError;

      const rawPosts = (rows ?? []) as FeedPost[];
      const authorIds = [...new Set(rawPosts.map(p => p.author_id).filter(Boolean))];
      let profiles: Profile[] = [];
      if (authorIds.length) {
        const { data, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, handle, bio, avatar_url, verified, followers_count, following_count, created_at')
          .in('id', authorIds);
        if (profilesError) throw profilesError;
        profiles = (data ?? []) as Profile[];
      }

      let follows: string[] = [];
      if (user) {
        const { data } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
        follows = (data ?? []).map(row => row.following_id);
      }

      if (!mounted.current) return;
      const profileMap = new Map(profiles.map(p => [p.id, p]));
      setPosts(rawPosts.map(post => ({ ...post, author: profileMap.get(post.author_id) })));
      setFollowingIds(follows);
    } catch (e) {
      if (!mounted.current) return;
      setError(e instanceof Error ? e.message : 'Unable to load the feed.');
      if (kind === 'initial') setPosts([]);
    } finally {
      if (!mounted.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void loadFeed('initial');
    const channel = supabase.channel('girlies-community-posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => void loadFeed('refresh'))
      .subscribe();
    return () => {
      mounted.current = false;
      void supabase.removeChannel(channel);
    };
  }, [loadFeed]);

  const visiblePosts = useMemo(() => {
    if (tab === 'Following') return posts.filter(p => followingIds.includes(p.author_id));
    if (tab === 'Trending') return [...posts].sort((a, b) => b.created_at.localeCompare(a.created_at));
    return posts;
  }, [posts, followingIds, tab]);

  const toggleLike = (id: string) => setLiked(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id]);

  return (
    <SafeAreaView style={s.safe}>
      <Animated.ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshing={refreshing}
        onRefresh={() => void loadFeed('refresh')}
      >
        <View style={s.top}>
          <Pressable onPress={() => router.push('/notifications')} style={s.iconButton} hitSlop={8}>
            <I name="bell" size={25} /><View style={s.badge}><Text style={s.badgeText}>4</Text></View>
          </Pressable>
          <Text style={s.h}>Feed</Text>
          <Pressable onPress={() => router.push('/chat')} style={s.iconButton} hitSlop={8}><I name="chat" size={25} /></Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScroll}>
          {tabs.map(item => <Pressable key={item} onPress={() => setTab(item)} style={[s.tab, item === tab && s.tabOn]}><Text style={[s.tabText, item === tab && s.tabTextOn]}>{item}</Text></Pressable>)}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.stories}>
          {stories.map((story, index) => <Pressable key={story} onPress={() => index === 0 ? router.push('/create') : router.push('/profile')} style={s.story}>
            <View style={[s.storyRing, index === 0 && s.storyOwn]}><Avatar size={58} index={index} /></View><Text style={s.storyName} numberOfLines={1}>{story}</Text>
          </Pressable>)}
        </ScrollView>

        <Pressable style={s.composer} onPress={() => router.push('/create')}>
          <Avatar size={42}/><View style={s.ask}><Text style={s.askText}>What’s on your mind, girlie?</Text></View><I name="camera" size={24} color={C.pink}/>
        </Pressable>

        <View style={s.live}>
          <View style={{ flex: 1, paddingRight: 10 }}><Text style={s.liveK}>LIVE NOW</Text><Text style={s.liveTitle}>Girls are getting ready together</Text><Text style={s.liveText}>Join the community · Beauty Room</Text></View>
          <Pressable style={s.liveBtn}><Text style={s.liveBtnText}>Watch</Text></Pressable>
        </View>

        {error ? <View style={s.errorBox}><Text style={s.errorTitle}>We couldn’t load new posts</Text><Text style={s.errorText}>{error}</Text><Pressable style={s.retry} onPress={() => void loadFeed('refresh')}><Text style={s.retryText}>Try again</Text></Pressable></View> : null}

        {loading ? <View style={s.loadingBox}><ActivityIndicator color={C.pink}/><Text style={s.loadingText}>Loading the girls’ feed…</Text></View> : visiblePosts.length ? visiblePosts.map((post, index) => {
          const author = post.author;
          const media = Array.isArray(post.media_urls) ? post.media_urls.filter(url => /^https?:\/\//i.test(url)) : [];
          const isLiked = liked.includes(post.id);
          return <View key={post.id} style={s.post}>
            <View style={s.postTop}><Avatar size={43}/><View style={s.authorBlock}><View style={s.nameRow}><Text style={s.name} numberOfLines={1}>{author?.display_name || 'Girlies member'}</Text>{author?.verified ? <VerifiedMark size={16}/> : null}</View><Text style={s.meta}>{author?.handle ? `@${author.handle} · ` : ''}{formatAge(post.created_at)}</Text></View><I name="more" size={21} color={C.muted}/></View>
            {!!post.body && <Text style={s.postText}>{post.body}</Text>}
            {media.length ? <Image source={{uri: media[0]}} style={s.postImg}/> : <View style={[s.textPost, index % 3 === 1 && {backgroundColor: C.lilac}, index % 3 === 2 && {backgroundColor: C.sun}]}><Text style={s.textPostLabel}>GIRLIES COMMUNITY</Text><Text style={s.textPostCopy}>{post.body || 'New post from the community.'}</Text></View>}
            <View style={s.actions}><View style={s.action}><LikeButton liked={isLiked} onPress={() => toggleLike(post.id)} size={22}/><Text style={s.actionText}>{isLiked ? 1 : 0}</Text></View><Pressable style={s.action}><I name="chat" size={20}/><Text style={s.actionText}>Comment</Text></Pressable><Pressable style={s.action}><I name="share" size={20}/><Text style={s.actionText}>Share</Text></Pressable><Pressable style={s.action}><I name="bookmark" size={20}/></Pressable></View>
          </View>;
        }) : <View style={s.empty}><View style={s.emptyIcon}><I name="spark" size={28} color={C.pink}/></View><Text style={s.emptyTitle}>{tab === 'Following' ? 'Nothing from your girls yet' : 'The feed is ready for you'}</Text><Text style={s.emptyText}>{tab === 'Following' ? 'Follow a few girlies and their posts will appear here.' : 'Be the first to start a conversation with the community.'}</Text><Pressable style={s.emptyButton} onPress={() => router.push('/create')}><I name="plus" size={19} color="#FFF"/><Text style={s.emptyButtonText}>Create a post</Text></Pressable></View>}
        <View style={{height: 18}}/>
      </Animated.ScrollView>

      <Animated.View pointerEvents="box-none" style={[s.fabWrap, { transform: [{ translateY: visibility.interpolate({ inputRange: [0,1], outputRange: [90,0] }) }] }]}>
        <Pressable style={s.fab} onPress={() => router.push('/create')}><I name="plus" size={28} color="#FFF"/></Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <SafeAreaView style={s.safe}><View style={s.routeError}><View style={s.emptyIcon}><I name="spark" size={28} color={C.pink}/></View><Text style={s.emptyTitle}>Feed hit a snag</Text><Text style={s.errorText}>{error.message}</Text><Pressable style={s.emptyButton} onPress={retry}><Text style={s.emptyButtonText}>Retry Feed</Text></Pressable></View></SafeAreaView>;
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:C.bg}, scroll:{padding:18,paddingBottom:120}, top:{height:54,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}, h:{fontSize:20,fontWeight:'900',color:C.ink}, iconButton:{padding:5}, badge:{position:'absolute',top:-3,right:-4,width:18,height:18,borderRadius:9,backgroundColor:C.pink,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:C.bg}, badgeText:{color:'#FFF',fontSize:10,fontWeight:'900'}, tabScroll:{marginBottom:12}, tab:{paddingHorizontal:14,paddingVertical:9,borderRadius:18,backgroundColor:'#FFF',marginRight:7,borderWidth:1,borderColor:C.line}, tabOn:{backgroundColor:C.ink}, tabText:{fontSize:11,fontWeight:'900',color:C.ink}, tabTextOn:{color:'#FFF'}, stories:{marginBottom:14}, story:{width:74,alignItems:'center',marginRight:8}, storyRing:{padding:3,borderRadius:36,borderWidth:2,borderColor:C.pink}, storyOwn:{borderColor:C.ink}, storyName:{fontSize:10,color:C.ink,marginTop:5}, composer:{backgroundColor:'#FFF',borderRadius:28,padding:13,flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderColor:C.line}, ask:{flex:1,paddingHorizontal:12}, askText:{color:C.muted,fontWeight:'600'}, live:{marginTop:15,borderRadius:28,padding:18,backgroundColor:C.coral,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}, liveK:{fontSize:9,fontWeight:'900',letterSpacing:1.2,color:C.ink}, liveTitle:{fontSize:18,fontWeight:'900',marginTop:5,color:C.ink}, liveText:{fontSize:12,fontWeight:'600',marginTop:4,color:C.ink}, liveBtn:{backgroundColor:C.ink,paddingHorizontal:14,paddingVertical:10,borderRadius:18}, liveBtnText:{color:'#FFF',fontWeight:'900'}, errorBox:{marginTop:15,backgroundColor:'#FFF',borderRadius:22,padding:16,borderWidth:1,borderColor:C.line}, errorTitle:{fontSize:14,fontWeight:'900',color:C.ink,textAlign:'center'}, errorText:{fontSize:12,lineHeight:18,color:C.muted,textAlign:'center',marginTop:6}, retry:{alignSelf:'center',marginTop:12,backgroundColor:C.ink,paddingHorizontal:16,paddingVertical:9,borderRadius:17}, retryText:{color:'#FFF',fontWeight:'900',fontSize:12}, loadingBox:{minHeight:150,alignItems:'center',justifyContent:'center',gap:10}, loadingText:{fontSize:12,color:C.muted,fontWeight:'700'}, empty:{marginTop:15,backgroundColor:'#FFF',borderRadius:30,padding:25,alignItems:'center',borderWidth:1,borderColor:C.line}, emptyIcon:{width:58,height:58,borderRadius:29,backgroundColor:C.rose,alignItems:'center',justifyContent:'center',marginBottom:13}, emptyTitle:{fontSize:18,fontWeight:'900',color:C.ink,textAlign:'center'}, emptyText:{fontSize:12,lineHeight:18,color:C.muted,textAlign:'center',marginTop:7,maxWidth:290}, emptyButton:{marginTop:17,backgroundColor:C.pink,borderRadius:21,paddingHorizontal:17,paddingVertical:11,flexDirection:'row',alignItems:'center',gap:7}, emptyButtonText:{color:'#FFF',fontSize:12,fontWeight:'900'}, textPost:{minHeight:190,borderRadius:23,backgroundColor:C.mint,padding:22,justifyContent:'flex-end'}, textPostLabel:{fontSize:9,letterSpacing:1.3,fontWeight:'900',color:C.ink}, textPostCopy:{fontSize:17,lineHeight:23,fontWeight:'900',color:C.ink,marginTop:8}, post:{marginTop:15,backgroundColor:'#FFF',borderRadius:29,padding:15,borderWidth:1,borderColor:C.line}, postTop:{flexDirection:'row',alignItems:'center',gap:10}, authorBlock:{flex:1}, nameRow:{flexDirection:'row',alignItems:'center',gap:5,minWidth:0}, name:{fontSize:14,fontWeight:'900',color:C.ink,flexShrink:1}, meta:{fontSize:11,color:C.muted,marginTop:2}, postText:{fontSize:14,lineHeight:20,fontWeight:'600',color:C.ink,marginVertical:12}, postImg:{height:285,borderRadius:23,width:'100%',backgroundColor:C.line}, actions:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:12}, action:{flexDirection:'row',alignItems:'center',gap:5,minWidth:36}, actionText:{fontSize:11,color:C.ink}, fabWrap:{position:'absolute',right:23,bottom:92,zIndex:18}, fab:{width:55,height:55,borderRadius:28,backgroundColor:C.pink,alignItems:'center',justifyContent:'center',elevation:8}, routeError:{flex:1,alignItems:'center',justifyContent:'center',padding:28}
});
