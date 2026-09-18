import React,{useCallback,useEffect,useMemo,useState}from'react';
import{SafeAreaView}from'react-native-safe-area-context';
import{ScrollView,View,Text,Pressable,StyleSheet,TextInput,ActivityIndicator}from'react-native';
import{useRouter}from'expo-router';
import{C}from'../constants/theme';
import{I}from'../components/Icons';
import{Avatar}from'../Avatar';
import{getSessionUser,createDirectConversation}from'../lib/social';
import{supabase}from'../lib/supabase';

type Person={id:string;display_name:string;avatar_url:string|null;verified:boolean;handle?:string};
export default function NewChat(){
 const r=useRouter();const[q,setQ]=useState('');const[people,setPeople]=useState<Person[]>([]);const[loading,setLoading]=useState(true);const[busy,setBusy]=useState('');
 const load=useCallback(async()=>{try{const me=await getSessionUser();if(!me)throw new Error('Please sign in to start a conversation.');const{data,error}=await supabase.from('profiles').select('id,display_name,avatar_url,verified,handle').neq('id',me.id).order('display_name').limit(50);if(error)throw error;setPeople((data||[]) as Person[]);}catch(e:any){setPeople([]);}finally{setLoading(false);}},[]);
 useEffect(()=>{void load();},[load]);
 const visible=useMemo(()=>{const t=q.trim().toLowerCase();return t?people.filter(p=>p.display_name.toLowerCase().includes(t)||(p.handle||'').toLowerCase().includes(t)):people;},[people,q]);
 const open=async(id:string)=>{setBusy(id);try{const conversationId=await createDirectConversation(id);r.push('/conversation/'+conversationId);}catch(e:any){}finally{setBusy('');}};
 return <SafeAreaView style={s.safe}><View style={s.top}><Pressable onPress={()=>r.back()}><I name="back" size={34}/></Pressable><Text style={s.h}>New message</Text><View/></View><ScrollView contentContainerStyle={s.scroll}>
 <View style={s.search}><I name="search" size={20} color={C.muted}/><TextInput value={q} onChangeText={setQ} placeholder="Search people or shops" placeholderTextColor={C.muted} style={s.input}/></View>
 {visible.map((p,i)=><Pressable key={p.id} onPress={()=>open(p.id)} style={s.row}><Avatar size={48} uri={p.avatar_url} index={i} verified={p.verified}/><View style={{flex:1}}><Text style={{fontWeight:'900'}}>{p.display_name}{p.verified?' ✓':''}</Text><Text style={s.meta}>{busy===p.id?'Opening conversation…':'Tap to start a conversation'}</Text></View><I name="arrow" color={C.muted}/></Pressable>)}
 </ScrollView></SafeAreaView>
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:C.bg},top:{height:65,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},h:{fontSize:20,fontWeight:'900'},scroll:{padding:18},search:{height:50,borderRadius:25,backgroundColor:'#FFF',paddingHorizontal:15,flexDirection:'row',alignItems:'center',gap:8,borderWidth:1,borderColor:C.line,marginBottom:12},input:{flex:1,fontSize:14},row:{paddingVertical:15,flexDirection:'row',alignItems:'center',gap:11,borderBottomWidth:1,borderBottomColor:C.line},meta:{fontSize:10,color:C.muted,marginTop:3}})
