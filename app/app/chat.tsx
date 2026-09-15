import React,{useCallback,useEffect,useMemo,useState}from'react';
import{SafeAreaView}from'react-native-safe-area-context';
import{ScrollView,View,Text,Pressable,TextInput,StyleSheet,ActivityIndicator}from'react-native';
import{useRouter,useFocusEffect}from'expo-router';
import{C}from'../constants/theme';
import{Avatar}from'../Avatar';
import{I}from'../components/Icons';
import{getChatSummaries,ChatSummary}from'../lib/social';

export default function Chat(){
  const r=useRouter();
  const[q,setQ]=useState('');
  const[items,setItems]=useState<ChatSummary[]>([]);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState('');
  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try{setItems(await getChatSummaries());}
    catch(e:any){setError(e?.message||'Could not load your conversations.');}
    finally{setLoading(false);}
  },[]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  const visible=useMemo(()=>{const term=q.trim().toLowerCase();return term?items.filter(x=>x.name.toLowerCase().includes(term)||x.preview.toLowerCase().includes(term)):items;},[items,q]);
  return <SafeAreaView style={s.safe}>
    <ScrollView contentContainerStyle={s.scroll}>
      <View style={s.top}><View><Text style={s.k}>MESSAGES</Text><Text style={s.h}>Your conversations</Text></View><Pressable><I name="settings" size={23}/></Pressable></View>
      <View style={s.search}><I name="search" size={21} color={C.muted}/><TextInput value={q} onChangeText={setQ} placeholder="Search chats" placeholderTextColor={C.muted} style={s.input}/></View>
      <Pressable onPress={()=>r.push('/lumi')} style={s.lumi}><View style={s.magic}><Text>🪄</Text></View><View style={{flex:1}}><Text style={s.lumiName}>Lumi</Text><Text style={s.lumiText}>Ask me about anything in Herlo.</Text></View><Text style={{fontWeight:'900'}}>›</Text></Pressable>
      {loading&&<View style={s.state}><ActivityIndicator color={C.pink}/></View>}
      {!loading&&error&&<View style={s.state}><Text style={s.stateText}>{error}</Text><Pressable onPress={load}><Text style={s.retry}>Try again</Text></Pressable></View>}
      {!loading&&!error&&visible.map((x,i)=><Pressable key={x.id} onPress={()=>r.push('/conversation/'+x.id)} style={s.row}>
        <Avatar size={51} uri={x.avatar_url} index={i} verified={x.verified}/>
        <View style={{flex:1}}><View style={s.nameLine}><Text style={s.name}>{x.name}</Text><Text style={s.time}>{x.time}</Text></View><Text style={s.preview} numberOfLines={1}>{x.preview}</Text></View>
        {x.unread>0&&<View style={s.unread}><Text>{x.unread}</Text></View>}
      </Pressable>)}
    </ScrollView>
    <Pressable style={s.fab} onPress={()=>r.push('/new-chat')}><Text style={{fontSize:28,color:'#FFF'}}>＋</Text></Pressable>
  </SafeAreaView>
}
const s=StyleSheet.create({
safe:{flex:1,backgroundColor:C.bg},scroll:{padding:18,paddingBottom:120},top:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingTop:7,paddingBottom:16},k:{fontSize:10,fontWeight:'900',letterSpacing:1.3,color:C.muted},h:{fontSize:25,fontWeight:'900',marginTop:4},search:{height:50,borderRadius:25,backgroundColor:'#F2ECEF',flexDirection:'row',alignItems:'center',paddingHorizontal:15,gap:8},input:{flex:1,fontSize:14},lumi:{marginTop:16,padding:14,borderRadius:25,backgroundColor:C.plum,flexDirection:'row',alignItems:'center',gap:12},magic:{width:44,height:44,borderRadius:22,backgroundColor:C.sun,alignItems:'center',justifyContent:'center'},lumiName:{color:'#FFF',fontWeight:'900',fontSize:14},lumiText:{color:'#EBDDE5',fontSize:11,marginTop:2},row:{paddingVertical:15,flexDirection:'row',alignItems:'center',gap:12,borderBottomWidth:1,borderBottomColor:C.line},nameLine:{flexDirection:'row',justifyContent:'space-between'},name:{fontSize:14,fontWeight:'900'},time:{fontSize:10,color:C.muted},preview:{fontSize:12,color:C.muted,marginTop:4},unread:{width:21,height:21,borderRadius:11,backgroundColor:C.pink,alignItems:'center',justifyContent:'center'},state:{padding:20,alignItems:'center'},stateText:{fontSize:12,color:C.muted,textAlign:'center'},retry:{marginTop:8,color:C.pink,fontWeight:'900'},fab:{position:'absolute',right:23,bottom:104,width:56,height:56,borderRadius:28,backgroundColor:C.pink,alignItems:'center',justifyContent:'center',elevation:8}
})
