import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { Avatar, VerifiedMark } from '../Avatar';
import { useChromeVisibility } from '../components/BottomNav';
import { LikeButton } from '../components/LikeButton';
import { supabase } from '../lib/supabase';
import { addComment, getSessionUser, toggleFollow, togglePostLike, toggleBookmark } from '../lib/social';

type Post = {
  id:string; author_id:string; body:string; media_urls:string[]; visibility:string; repost_of:string|null; created_at:string;
  profile?: {display_name:string;handle:string;avatar_url:string|null;verified:boolean};
};

type Story = {id:string;user_id:string;media_url:string;media_type:'image'|'video';caption:string;created_at:string;expires_at:string;profile?:{display_name:string;avatar_url:string|null}};

export default function Community() {
  const router = useRouter();
  const { visibility, onScroll } = useChromeVisibility();
  const [tab,setTab]=useState('For you');
  const [posts,setPosts]=useState<Post[]>([]);
  const [stories,setStories]=useState<Story[]>([]);
  const [liked,setLiked]=useState<Set<string>>(new Set());
  const [bookmarked,setBookmarked]=useState<Set<string>>(new Set());
  const [following,setFollowing]=useState<Set<string>>(new Set());
  const [commenting,setCommenting]=useState<string|null>(null);
  const [comment,setComment]=useState('');
  const [refreshing,setRefreshing]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const [{data: rows,error: postError},{data: storyRows,error: storyError}] = await Promise.all([
        supabase.from('posts').select('id,author_id,body,media_urls,visibility,repost_of,created_at').eq('visibility','public').order('created_at',{ascending:false}).limit(50),
        supabase.from('stories').select('id,user_id,media_url,media_type,caption,created_at,expires_at').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(50),
      ]);
      if (postError) throw postError;
      if (storyError) throw storyError;
      const authorIds=[...new Set((rows||[]).map((p:any)=>p.author_id))];
      const storyUsers=[...new Set((storyRows||[]).map((x:any)=>x.user_id))];
      const ids=[...new Set([...authorIds,...storyUsers])];
      const {data: profiles,error: profileError}=ids.length ? await supabase.from('profiles').select('id,display_name,handle,avatar_url,verified').in('id',ids) : {data:[],error:null};
      if (profileError) throw profileError;
      const map=new Map((profiles||[]).map((p:any)=>[p.id,p]));
      setPosts((rows||[]).map((p:any)=>({...p,profile:map.get(p.author_id)})));
      setStories((storyRows||[]).map((x:any)=>({...x,profile:map.get(x.user_id)})));
      const me=await getSessionUser();
      if (me) {
        const [ls,bs,fs]=await Promise.all([
          supabase.from('post_likes').select('post_id').eq('user_id',me.id),
          supabase.from('bookmarks').select('post_id').eq('user_id',me.id),
          supabase.from('follows').select('following_id').eq('follower_id',me.id),
        ]);
        setLiked(new Set((ls.data||[]).map((x:any)=>x.post_id)));
        setBookmarked(new Set((bs.data||[]).map((x:any)=>x.post_id)));
        setFollowing(new Set((fs.data||[]).map((x:any)=>x.following_id)));
      }
    } catch(e:any) { setError(e?.message || 'Could not load your feed.'); }
    finally { setLoading(false); setRefreshing(false); }
  },[]);

  useEffect(()=>{ load(); const channel=supabase.channel('girlies-feed').on('postgres_changes',{event:'*',schema:'public',table:'posts'},()=>load()).on('postgres_changes',{event:'*',schema:'public',table:'stories'},()=>load()).on('postgres_changes',{event:'*',schema:'public',table:'post_likes'},()=>{}).subscribe(); return ()=>{supabase.removeChannel(channel);}; },[load]);

  const onLike=async(id:string)=>{
    const was=liked.has(id); setLiked(x=>{const n=new Set(x); was?n.delete(id):n.add(id);return n;});
    try{await togglePostLike(id);}catch(e:any){setLiked(x=>{const n=new Set(x);was?n.add(id):n.delete(id);return n;});Alert.alert('Like failed',e.message);}
  };
  const onFollow=async(id:string)=>{
    const was=following.has(id); setFollowing(x=>{const n=new Set(x);was?n.delete(id):n.add(id);return n;});
    try{await toggleFollow(id);}catch(e:any){setFollowing(x=>{const n=new Set(x);was?n.add(id):n.delete(id);return n;});Alert.alert('Follow failed',e.message);}
  };
  const onBookmark=async(id:string)=>{
    const was=bookmarked.has(id); setBookmarked(x=>{const n=new Set(x);was?n.delete(id):n.add(id);return n;});
    try{await toggleBookmark(id);}catch(e:any){setBookmarked(x=>{const n=new Set(x);was?n.add(id):n.delete(id);return n;});}
  };
  const sendComment=async(id:string)=>{
    if(!comment.trim())return;
    try{await addComment(id,comment);setComment('');setCommenting(null);}catch(e:any){Alert.alert('Comment failed',e.message);}
  };

  const visiblePosts=useMemo(()=>tab==='Following'?posts.filter(p=>following.has(p.author_id)):posts, [posts,tab,following]);

  return <SafeAreaView style={s.safe}>
    <Animated.ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load();}}/>}>
      <View style={s.top}>
        <Pressable onPress={()=>router.push('/notifications')} style={s.iconButton}><I name="bell" size={25}/></Pressable>
        <Text style={s.h}>Feed</Text>
        <Pressable onPress={()=>router.push('/chat')} style={s.iconButton}><I name="chat" size={25}/></Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScroll}>{['For you','Following','Trending','Hair girls'].map(x=><Pressable key={x} onPress={()=>setTab(x)} style={[s.tab,x===tab&&s.tabOn]}><Text style={[s.tabText,x===tab&&s.tabTextOn]}>{x}</Text></Pressable>)}</ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.stories}>
        <Pressable style={s.story} onPress={()=>router.push('/story?mode=create')}><View style={[s.storyRing,s.storyOwn]}><Avatar size={58}/><View style={s.add}><Text style={s.addText}>+</Text></View></View><Text style={s.storyName}>Your story</Text></Pressable>
        {stories.map(st=><Pressable key={st.id} style={s.story} onPress={()=>router.push({pathname:'/story',params:{id:st.id,url:st.media_url,type:st.media_type,name:st.profile?.display_name||'Girlie'}})}>
          <View style={s.storyRing}><Avatar size={58} /></View><Text style={s.storyName} numberOfLines={1}>{st.profile?.display_name||'Girlie'}</Text>
        </Pressable>)}
      </ScrollView>
      <Pressable style={s.composer} onPress={()=>router.push('/create')}><Avatar size={42}/><View style={s.ask}><Text style={s.askText}>What’s on your mind, girlie?</Text></View><I name="camera" size={24} color={C.pink}/></Pressable>

      {loading && <View style={s.state}><ActivityIndicator color={C.pink}/><Text style={s.stateText}>Loading your girls…</Text></View>}
      {!loading && error && <View style={s.state}><Text style={s.stateTitle}>Feed couldn't load</Text><Text style={s.stateText}>{error}</Text><Pressable onPress={load} style={s.retry}><Text style={{color:'#FFF',fontWeight:'900'}}>Try again</Text></Pressable></View>}
      {!loading && !error && visiblePosts.length===0 && <View style={s.state}><Text style={{fontSize:40}}>✦</Text><Text style={s.stateTitle}>{tab==='Following'?'Follow some girlies':'Your feed is ready'}</Text><Text style={s.stateText}>{tab==='Following'?'Follow people to see their posts here.':'Be the first to share something with the girls.'}</Text></View>}

      {visiblePosts.map(p=><View key={p.id} style={s.post}>
        <View style={s.postTop}><Avatar size={43}/><View style={{flex:1}}><Text style={s.name}>{p.profile?.display_name||'Girlie'} {p.profile?.verified&&<VerifiedMark size={16}/>}</Text><Text style={s.meta}>@{p.profile?.handle||'girlie'} · {new Date(p.created_at).toLocaleDateString()}</Text></View>
          {p.author_id!=='' && <Pressable onPress={()=>onFollow(p.author_id)}><Text style={s.follow}>{following.has(p.author_id)?'Following': 'Follow'}</Text></Pressable>}
          <I name="more" size={21} color={C.muted}/>
        </View>
        {!!p.body && <Text style={s.postText}>{p.body}</Text>}
        {p.media_urls?.map((url,i)=><View key={url+i} style={s.mediaBox}>
          {url.match(/\.(mp4|mov|m4v|webm)(\?|$)/i) ? <View style={s.video}><I name="camera" size={36} color="#FFF"/><Text style={s.videoText}>VIDEO</Text></View> : <Image source={{uri:url}} style={s.postImg}/>}
        </View>)}
        <View style={s.actions}>
          <View style={s.action}><LikeButton liked={liked.has(p.id)} onPress={()=>onLike(p.id)} size={22}/><Text style={s.actionText}>{liked.has(p.id)?'Liked':'Like'}</Text></View>
          <Pressable style={s.action} onPress={()=>setCommenting(commenting===p.id?null:p.id)}><I name="chat" size={20}/><Text style={s.actionText}>Comment</Text></Pressable>
          <Pressable style={s.action}><I name="share" size={20}/><Text style={s.actionText}>Share</Text></Pressable>
          <Pressable style={s.action} onPress={()=>onBookmark(p.id)}><I name="bookmark" size={20} filled={bookmarked.has(p.id)}/></Pressable>
        </View>
        {commenting===p.id&&<View style={s.commentBox}><TextInput value={comment} onChangeText={setComment} placeholder="Write a comment…" placeholderTextColor={C.muted} style={s.commentInput}/><Pressable onPress={()=>sendComment(p.id)}><I name="send" size={22} color={C.pink}/></Pressable></View>}
      </View>)}
    </Animated.ScrollView>
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
