import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { Avatar, VerifiedMark } from '../Avatar';
import { useChromeVisibility } from '../components/BottomNav';
import { LikeButton } from '../components/LikeButton';
import { supabase } from '../lib/supabase';
import { addComment, addShare, getSessionUser, setBookmark, setFollow, setPostLike } from '../lib/social';

type Post = {
  id:string; author_id:string; body:string; media_urls:string[]; visibility:string; repost_of:string|null; created_at:string;
  profile?: {display_name:string;handle:string;avatar_url:string|null;verified:boolean};
  like_count?: number;
};

type Story = {id:string;user_id:string;media_url:string;media_type:'image'|'video';caption:string;created_at:string;expires_at:string;profile?:{display_name:string;avatar_url:string|null}};

export default function Community() {
  const router = useRouter();
  const { visibility, onScroll, reset } = useChromeVisibility();
  const [tab,setTab]=useState('For you');
  const [posts,setPosts]=useState<Post[]>([]);
  const [stories,setStories]=useState<Story[]>([]);
  const [liked,setLiked]=useState<Set<string>>(new Set());
  const [bookmarked,setBookmarked]=useState<Set<string>>(new Set());
  const [following,setFollowing]=useState<Set<string>>(new Set());
  const [likeCounts,setLikeCounts]=useState<Record<string,number>>({});
  const [commenting,setCommenting]=useState<string|null>(null);
  const [comment,setComment]=useState('');
  const [refreshing,setRefreshing]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const loadingRef=useRef(false);
  const mountedRef=useRef(false);
  const focusedRef=useRef(false);
  const focusGenerationRef=useRef(0);
  const likedRef=useRef(new Set<string>());
  const bookmarkedRef=useRef(new Set<string>());
  const followingRef=useRef(new Set<string>());
  const likeDesiredRef=useRef(new Map<string,boolean>());
  const followDesiredRef=useRef(new Map<string,boolean>());
  const bookmarkDesiredRef=useRef(new Map<string,boolean>());
  const mutationQueuesRef=useRef(new Map<string,Promise<void>>());

  const withTimeout = useCallback(<T,>(promise: Promise<T>, ms=8000) => new Promise<T>((resolve,reject) => {
    const timer=setTimeout(()=>reject(new Error('Feed request timed out. Check your connection and try again.')),ms);
    promise.then(value=>{clearTimeout(timer);resolve(value);},reason=>{clearTimeout(timer);reject(reason);});
  }),[]);

  const isCurrentFocus = useCallback((generation:number) => (
    mountedRef.current && focusedRef.current && focusGenerationRef.current === generation
  ),[]);

  const loadPostProfiles = useCallback(async (postRows:any[], generation:number) => {
    const authorIds=[...new Set(postRows.map(p=>p.author_id))];
    if (!authorIds.length) return;
    try {
      const {data,error}=await withTimeout(Promise.resolve(supabase.from('profiles').select('id,display_name,handle,avatar_url,verified').in('id',authorIds)));
      if (error) throw error;
      if (!isCurrentFocus(generation)) return;
      const map=new Map((data||[]).map((p:any)=>[p.id,p]));
      setPosts(current=>current.map(post=>({...post,profile:map.get(post.author_id)||post.profile})));
    } catch(e) {
      console.warn('[Community] post profiles unavailable',e);
    }
  },[isCurrentFocus,withTimeout]);

  const loadStories = useCallback(async (generation:number) => {
    try {
      const {data,error}=await withTimeout(Promise.resolve(supabase.from('stories').select('id,user_id,media_url,media_type,caption,created_at,expires_at').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(20)));
      if (error) throw error;
      if (!isCurrentFocus(generation)) return;
      const storyRows=data||[];
      setStories(storyRows.map((story:any)=>({...story,profile:undefined})));
      const storyUsers=[...new Set(storyRows.map((story:any)=>story.user_id))];
      if (!storyUsers.length) return;
      const profileResult=await withTimeout(Promise.resolve(supabase.from('profiles').select('id,display_name,avatar_url').in('id',storyUsers)));
      if (profileResult.error) throw profileResult.error;
      if (!isCurrentFocus(generation)) return;
      const map=new Map((profileResult.data||[]).map((profile:any)=>[profile.id,profile]));
      setStories(current=>current.map(story=>({...story,profile:map.get(story.user_id)||story.profile})));
    } catch(e) {
      console.warn('[Community] stories unavailable',e);
    }
  },[isCurrentFocus,withTimeout]);

  const loadLikeCounts = useCallback(async (postRows:any[], generation:number) => {
    const postIds=postRows.map(post=>post.id);
    if (!postIds.length) return;
    try {
      const {data,error}=await withTimeout(Promise.resolve(supabase.from('post_likes').select('post_id').in('post_id',postIds)));
      if (error) throw error;
      if (!isCurrentFocus(generation)) return;
      const counts=(data||[]).reduce((result:any,row:any)=>{
        result[row.post_id]=(result[row.post_id]||0)+1;
        return result;
      },{} as Record<string,number>);
      setLikeCounts(counts);
      setPosts(current=>current.map(post=>({...post,like_count:counts[post.id]||0})));
    } catch(e) {
      console.warn('[Community] like counts unavailable',e);
    }
  },[isCurrentFocus,withTimeout]);

  const loadUserState = useCallback(async (generation:number) => {
    try {
      const me=await getSessionUser();
      if (!me) {
        // Keep the current optimistic state if auth is still restoring on refocus.
        // A successful Supabase query below replaces it with the source of truth.
        return;
      }
      const [likeResult,bookmarkResult,followResult]=await withTimeout(Promise.all([
        supabase.from('post_likes').select('post_id').eq('user_id',me.id),
        supabase.from('bookmarks').select('post_id').eq('user_id',me.id),
        supabase.from('follows').select('following_id').eq('follower_id',me.id),
      ]));
      if (likeResult.error) throw likeResult.error;
      if (bookmarkResult.error) throw bookmarkResult.error;
      if (followResult.error) throw followResult.error;
      if (!isCurrentFocus(generation)) return;
      const fetchedLiked=new Set((likeResult.data||[]).map((row:any)=>row.post_id));
      const fetchedBookmarked=new Set((bookmarkResult.data||[]).map((row:any)=>row.post_id));
      const fetchedFollowing=new Set((followResult.data||[]).map((row:any)=>row.following_id));
      likeDesiredRef.current.forEach((value,id)=>value?fetchedLiked.add(id):fetchedLiked.delete(id));
      bookmarkDesiredRef.current.forEach((value,id)=>value?fetchedBookmarked.add(id):fetchedBookmarked.delete(id));
      followDesiredRef.current.forEach((value,id)=>value?fetchedFollowing.add(id):fetchedFollowing.delete(id));
      likedRef.current=fetchedLiked;
      bookmarkedRef.current=fetchedBookmarked;
      followingRef.current=fetchedFollowing;
      setLiked(new Set(fetchedLiked));
      setBookmarked(new Set(fetchedBookmarked));
      setFollowing(new Set(fetchedFollowing));
    } catch(e) {
      console.warn('[Community] user interaction state unavailable',e);
    }
  },[isCurrentFocus,withTimeout]);

  const hydrateCommunity = useCallback((postRows:any[], generation:number) => {
    void loadPostProfiles(postRows,generation);
    void loadStories(generation);
    void loadLikeCounts(postRows,generation);
    void loadUserState(generation);
  },[loadLikeCounts,loadPostProfiles,loadStories,loadUserState]);

  const load = useCallback(async () => {
    if (loadingRef.current || !focusedRef.current) return;
    const generation=focusGenerationRef.current;
    loadingRef.current=true;
    setLoading(true);
    setError('');
    try {
      const {data,error:postError}=await withTimeout(Promise.resolve(
        supabase.from('posts').select('id,author_id,body,media_urls,visibility,repost_of,created_at').eq('visibility','public').order('created_at',{ascending:false}).limit(20)
      ));
      if (postError) throw postError;
      if (!isCurrentFocus(generation)) return;
      const nextPosts=(data||[]).map((post:any)=>({...post,media_urls:post.media_urls||[]}));
      setPosts(nextPosts);
      setLoading(false);
      if (isCurrentFocus(generation)) void hydrateCommunity(nextPosts,generation);
    } catch(e:any) {
      if (isCurrentFocus(generation)) setError(e?.message||'Could not load your feed.');
    } finally {
      if (focusGenerationRef.current===generation) loadingRef.current=false;
      if (isCurrentFocus(generation)) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  },[hydrateCommunity,isCurrentFocus,withTimeout]);

  useFocusEffect(useCallback(() => {
    mountedRef.current=true;
    focusedRef.current=true;
    reset();
    focusGenerationRef.current+=1;
    void load();
    return () => {
      reset();
      focusedRef.current=false;
      mountedRef.current=false;
      focusGenerationRef.current+=1;
      loadingRef.current=false;
    };
  },[load,reset]));

  const enqueueMutation=useCallback((key:string, mutation:()=>Promise<void>)=>{
    const previous=mutationQueuesRef.current.get(key)||Promise.resolve();
    const next=previous.catch(()=>undefined).then(mutation).finally(()=>{
      if(mutationQueuesRef.current.get(key)===next) mutationQueuesRef.current.delete(key);
    });
    mutationQueuesRef.current.set(key,next);
  },[]);

  const refreshLikeCount=useCallback(async(id:string)=>{
    const {count,error}=await supabase.from('post_likes').select('post_id',{count:'exact',head:true}).eq('post_id',id);
    if(error) throw error;
    if(typeof count==='number') setLikeCounts(current=>({...current,[id]:count}));
  },[]);

  const onLike=useCallback((id:string)=>{
    const shouldLike=!likedRef.current.has(id);
    likeDesiredRef.current.set(id,shouldLike);
    if(shouldLike) likedRef.current.add(id); else likedRef.current.delete(id);
    setLiked(new Set(likedRef.current));
    enqueueMutation(`like:${id}`,async()=>{
      try {
        const verified=await setPostLike(id,shouldLike);
        try { await refreshLikeCount(id); }
        catch(e:any) { if(mountedRef.current) Alert.alert('Like count unavailable',e?.message||'The like was saved, but its count could not be refreshed.'); }
        if(likeDesiredRef.current.get(id)===shouldLike) {
          likeDesiredRef.current.delete(id);
          if(verified) likedRef.current.add(id); else likedRef.current.delete(id);
          setLiked(new Set(likedRef.current));
        }
      } catch(e:any) {
        if(likeDesiredRef.current.get(id)===shouldLike) {
          likeDesiredRef.current.delete(id);
          if(shouldLike) likedRef.current.delete(id); else likedRef.current.add(id);
          setLiked(new Set(likedRef.current));
        }
        if(mountedRef.current) Alert.alert('Like failed',e?.message||'Could not save your like.');
      }
    });
  },[enqueueMutation,refreshLikeCount]);

  const onFollow=useCallback((id:string)=>{
    const shouldFollow=!followingRef.current.has(id);
    followDesiredRef.current.set(id,shouldFollow);
    if(shouldFollow) followingRef.current.add(id); else followingRef.current.delete(id);
    setFollowing(new Set(followingRef.current));
    enqueueMutation(`follow:${id}`,async()=>{
      try {
        const verified=await setFollow(id,shouldFollow);
        if(followDesiredRef.current.get(id)===shouldFollow) {
          followDesiredRef.current.delete(id);
          if(verified) followingRef.current.add(id); else followingRef.current.delete(id);
          setFollowing(new Set(followingRef.current));
        }
      } catch(e:any) {
        if(followDesiredRef.current.get(id)===shouldFollow) {
          followDesiredRef.current.delete(id);
          if(shouldFollow) followingRef.current.delete(id); else followingRef.current.add(id);
          setFollowing(new Set(followingRef.current));
        }
        if(mountedRef.current) Alert.alert('Follow failed',e?.message||'Could not save your follow.');
      }
    });
  },[enqueueMutation]);

  const onBookmark=useCallback((id:string)=>{
    const shouldBookmark=!bookmarkedRef.current.has(id);
    bookmarkDesiredRef.current.set(id,shouldBookmark);
    if(shouldBookmark) bookmarkedRef.current.add(id); else bookmarkedRef.current.delete(id);
    setBookmarked(new Set(bookmarkedRef.current));
    enqueueMutation(`bookmark:${id}`,async()=>{
      try {
        const verified=await setBookmark(id,shouldBookmark);
        if(bookmarkDesiredRef.current.get(id)===shouldBookmark) {
          bookmarkDesiredRef.current.delete(id);
          if(verified) bookmarkedRef.current.add(id); else bookmarkedRef.current.delete(id);
          setBookmarked(new Set(bookmarkedRef.current));
        }
      } catch(e:any) {
        if(bookmarkDesiredRef.current.get(id)===shouldBookmark) {
          bookmarkDesiredRef.current.delete(id);
          if(shouldBookmark) bookmarkedRef.current.delete(id); else bookmarkedRef.current.add(id);
          setBookmarked(new Set(bookmarkedRef.current));
        }
        if(mountedRef.current) Alert.alert('Bookmark failed',e?.message||'Could not save your bookmark.');
      }
    });
  },[enqueueMutation]);

  const onShare=useCallback(async(id:string)=>{
    try { await addShare(id); Alert.alert('Shared','Your share was saved.'); }
    catch(e:any) { Alert.alert('Share failed',e?.message||'Could not save your share.'); }
  },[]);
  const sendComment=async(id:string)=>{
    if(!comment.trim())return;
    try{await addComment(id,comment);setComment('');setCommenting(null);}catch(e:any){Alert.alert('Comment failed',e.message);}
  };

  const visiblePosts=useMemo(()=>tab==='Following'?posts.filter(p=>following.has(p.author_id)):posts, [posts,tab,following]);

  const header = <>
      <View style={s.top}>
        <Pressable onPress={()=>router.push('/notifications')} style={s.iconButton}><I name="bell" size={25}/></Pressable>
        <Text style={s.h}>Feed</Text>
        <Pressable onPress={()=>router.push('/chat')} style={s.iconButton}><I name="chat" size={25}/></Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScroll}>{['For you','Following','Trending','Hair girls'].map(x=><Pressable key={x} onPress={()=>setTab(x)} style={[s.tab,x===tab&&s.tabOn]}><Text style={[s.tabText,x===tab&&s.tabTextOn]}>{x}</Text></Pressable>)}</ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.stories}>
        <Pressable style={s.story} onPress={()=>router.push('/story?mode=create')}><View style={[s.storyRing,s.storyOwn]}><Avatar size={58}/><View style={s.add}><Text style={s.addText}>+</Text></View></View><Text style={s.storyName}>Your story</Text></Pressable>
         {stories.map(st=><Pressable key={st.id} style={s.story} onPress={()=>router.push({pathname:'/story',params:{id:st.id,url:st.media_url,type:st.media_type,name:st.profile?.display_name||'Girlie'}})}>
           <View style={s.storyRing}><Avatar size={58} uri={st.profile?.avatar_url} /></View><Text style={s.storyName} numberOfLines={1}>{st.profile?.display_name||'Girlie'}</Text>
        </Pressable>)}
      </ScrollView>
      <Pressable style={s.composer} onPress={()=>router.push('/create')}><Avatar size={42}/><View style={s.ask}><Text style={s.askText}>What’s on your mind, girlie?</Text></View><I name="camera" size={24} color={C.pink}/></Pressable>

      {loading && <View style={s.state}><ActivityIndicator color={C.pink}/><Text style={s.stateText}>Loading your girls…</Text></View>}
      {!loading && error && <View style={s.state}><Text style={s.stateTitle}>Feed couldn't load</Text><Text style={s.stateText}>{error}</Text><Pressable onPress={load} style={s.retry}><Text style={{color:'#FFF',fontWeight:'900'}}>Try again</Text></Pressable></View>}
  </>;
  const renderPost = ({item:p}:{item:Post}) => <View style={s.post}>
         <View style={s.postTop}><Avatar size={43} uri={p.profile?.avatar_url}/><View style={{flex:1}}><Text style={s.name}>{p.profile?.display_name||'Girlie'} {p.profile?.verified&&<VerifiedMark size={16}/>}</Text><Text style={s.meta}>@{p.profile?.handle||'girlie'} · {new Date(p.created_at).toLocaleDateString()}</Text></View>
          {p.author_id!=='' && <Pressable onPress={()=>onFollow(p.author_id)}><Text style={s.follow}>{following.has(p.author_id)?'Following': 'Follow'}</Text></Pressable>}
          <I name="more" size={21} color={C.muted}/>
        </View>
        {!!p.body && <Text style={s.postText}>{p.body}</Text>}
        {p.media_urls?.map((url,i)=><View key={url+i} style={s.mediaBox}>
          {url.match(/\.(mp4|mov|m4v|webm)(\?|$)/i) ? <View style={s.video}><I name="camera" size={36} color="#FFF"/><Text style={s.videoText}>VIDEO</Text></View> : <Image source={{uri:url}} style={s.postImg}/>}
        </View>)}
        <View style={s.actions}>
           <View style={s.action}><LikeButton liked={liked.has(p.id)} onPress={()=>onLike(p.id)} size={22}/><Text style={s.actionText}>{likeCounts[p.id] ? `${likeCounts[p.id]} · ` : ''}{liked.has(p.id)?'Liked':'Like'}</Text></View>
          <Pressable style={s.action} onPress={()=>setCommenting(commenting===p.id?null:p.id)}><I name="chat" size={20}/><Text style={s.actionText}>Comment</Text></Pressable>
           <Pressable style={s.action} onPress={()=>onShare(p.id)}><I name="share" size={20}/><Text style={s.actionText}>Share</Text></Pressable>
          <Pressable style={s.action} onPress={()=>onBookmark(p.id)}><I name="bookmark" size={20} filled={bookmarked.has(p.id)}/></Pressable>
        </View>
        {commenting===p.id&&<View style={s.commentBox}><TextInput value={comment} onChangeText={setComment} placeholder="Write a comment…" placeholderTextColor={C.muted} style={s.commentInput}/><Pressable onPress={()=>sendComment(p.id)}><I name="send" size={22} color={C.pink}/></Pressable></View>}
      </View>;
  return <SafeAreaView style={s.safe}>
    <FlatList
      data={visiblePosts}
      renderItem={renderPost}
      keyExtractor={item=>item.id}
      ListHeaderComponent={header}
      ListEmptyComponent={!loading&&!error ? <View style={s.state}><Text style={{fontSize:40}}>✦</Text><Text style={s.stateTitle}>{tab==='Following'?'Follow some girlies':'Your feed is ready'}</Text><Text style={s.stateText}>{tab==='Following'?'Follow people to see their posts here.':'Be the first to share something with the girls.'}</Text></View> : null}
      contentContainerStyle={s.scroll}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
       refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{if(focusedRef.current&&!loadingRef.current){setRefreshing(true);void load();}}}/>}
      initialNumToRender={5}
      maxToRenderPerBatch={5}
      windowSize={5}
      removeClippedSubviews={false}
    />
    <Pressable style={[s.fab,{transform:[{translateY:visibility.interpolate({inputRange:[0,1],outputRange:[90,0]})}]}]} onPress={()=>router.push('/create')}><I name="plus" size={28} color="#FFF"/></Pressable>
  </SafeAreaView>;
}

const s=StyleSheet.create({
safe:{flex:1,backgroundColor:C.bg},scroll:{padding:18,paddingBottom:105},top:{height:54,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},h:{fontSize:20,fontWeight:'900'},iconButton:{padding:5},
tabScroll:{marginBottom:12},tab:{paddingHorizontal:14,paddingVertical:9,borderRadius:18,backgroundColor:'#FFF',marginRight:7,borderWidth:1,borderColor:C.line},tabOn:{backgroundColor:C.ink},tabText:{fontSize:11,fontWeight:'900',color:C.ink},tabTextOn:{color:'#FFF'},
stories:{marginBottom:14},story:{width:76,alignItems:'center',marginRight:8},storyRing:{padding:3,borderRadius:36,borderWidth:2,borderColor:C.pink,position:'relative'},storyOwn:{borderColor:C.ink},storyName:{fontSize:10,color:C.ink,marginTop:5},add:{position:'absolute',right:-1,bottom:0,width:20,height:20,borderRadius:10,backgroundColor:C.pink,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:'#FFF'},addText:{color:'#FFF',fontWeight:'900'},
composer:{backgroundColor:'#FFF',borderRadius:28,padding:13,flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderColor:C.line},ask:{flex:1,paddingHorizontal:12},askText:{color:C.muted,fontWeight:'600'},
state:{marginTop:18,padding:28,borderRadius:28,backgroundColor:'#FFF',alignItems:'center',borderWidth:1,borderColor:C.line},stateTitle:{fontSize:18,fontWeight:'900',marginTop:6},stateText:{fontSize:12,color:C.muted,textAlign:'center',lineHeight:17,marginTop:5},retry:{marginTop:14,paddingHorizontal:18,paddingVertical:10,borderRadius:20,backgroundColor:C.pink},
post:{marginTop:15,backgroundColor:'#FFF',borderRadius:29,padding:15,borderWidth:1,borderColor:C.line},postTop:{flexDirection:'row',alignItems:'center',gap:10},name:{fontSize:14,fontWeight:'900'},meta:{fontSize:11,color:C.muted,marginTop:2},follow:{color:C.pink,fontSize:12,fontWeight:'900',marginRight:5},postText:{fontSize:14,lineHeight:20,fontWeight:'600',marginVertical:12},mediaBox:{marginTop:5},postImg:{height:285,borderRadius:23,width:'100%'},video:{height:285,borderRadius:23,backgroundColor:C.plum,alignItems:'center',justifyContent:'center'},videoText:{color:'#FFF',fontWeight:'900',marginTop:6},
actions:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:12},action:{flexDirection:'row',alignItems:'center',gap:5,minWidth:36},actionText:{fontSize:12,color:C.ink},commentBox:{marginTop:10,padding:8,borderRadius:22,backgroundColor:C.bg,flexDirection:'row',alignItems:'center'},commentInput:{flex:1,paddingHorizontal:10,paddingVertical:8},fab:{position:'absolute',right:23,bottom:92,width:55,height:55,borderRadius:28,backgroundColor:C.pink,alignItems:'center',justifyContent:'center',zIndex:18,elevation:8}
});
