import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, Pressable, StyleSheet, Image, Alert, TextInput, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { createStory, markStoryViewed, type MediaItem } from '../lib/social';

export default function Story() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; url?: string; type?: string; id?: string; name?: string }>();
  const isCreate = params.mode === 'create';
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [caption, setCaption] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (!isCreate && params.id) markStoryViewed(params.id);
  }, [isCreate, params.id]);

  async function pick() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Permission needed', 'Allow Girlies to access photos and videos.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images','videos'], allowsEditing: true, quality: 0.9,
    });
    if (result.canceled) return;
    const a: ImagePicker.ImagePickerAsset = result.assets[0];
    setMedia({
      uri: a.uri,
      type: a.type === 'video' ? 'video' : 'image',
      name: a.fileName || undefined,
      mimeType: a.mimeType || undefined,
    });
  }

  async function publish() {
    if (!media) return;
    try {
      setSaving(true);
      await createStory(media, caption);
      router.back();
    } catch (e:any) { Alert.alert('Could not update story', e?.message || 'Please try again.'); }
    finally { setSaving(false); }
  }

  if (isCreate) return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}><Pressable onPress={()=>router.back()}><I name="back" size={30} color="#FFF"/></Pressable>
        <Text style={s.headerTitle}>Your story</Text><Pressable onPress={publish} disabled={!media || saving}>
          {saving ? <ActivityIndicator color="#FFF"/> : <Text style={s.share}>Share</Text>}
        </Pressable></View>
      <View style={s.create}>
        {media ? (media.type==='image' ? <Image source={{uri:media.uri}} style={s.preview}/> :
          <View style={[s.preview,s.video]}><I name="camera" size={50} color="#FFF"/><Text style={s.videoText}>VIDEO STORY</Text></View>) :
          <Pressable onPress={pick} style={s.pick}><Text style={{fontSize:55}}>＋</Text><Text style={s.pickTitle}>Add to your story</Text><Text style={s.pickText}>Photo or video · visible for 24 hours</Text></Pressable>}
        {media && <Pressable onPress={pick} style={s.change}><Text style={{fontWeight:'900'}}>Choose another</Text></Pressable>}
        {media && <TextInput value={caption} onChangeText={setCaption} placeholder="Add a caption…" placeholderTextColor={C.muted} style={s.caption}/>}
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.viewer}>
      <Pressable style={s.close} onPress={()=>router.back()}><I name="back" size={30} color="#FFF"/></Pressable>
      {params.url ? (params.type==='video' ? <View style={s.video}><I name="camera" size={60} color="#FFF"/><Text style={s.videoText}>VIDEO</Text></View> :
        <Image source={{uri:params.url}} style={s.full}/>) : null}
      <View style={s.viewerBottom}><Text style={s.viewerName}>{params.name || 'Girlies story'}</Text><Text style={s.viewerCaption}>Tap back when you're done</Text></View>
    </SafeAreaView>
  );
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:C.bg},header:{height:62,paddingHorizontal:18,backgroundColor:C.ink,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},headerTitle:{color:'#FFF',fontSize:20,fontWeight:'900'},share:{color:'#FFF',fontWeight:'900'},
 create:{flex:1,padding:20},preview:{width:'100%',height:'68%',borderRadius:30,resizeMode:'cover'},video:{backgroundColor:C.plum,alignItems:'center',justifyContent:'center'},videoText:{color:'#FFF',fontWeight:'900',marginTop:8},
 pick:{flex:1,borderRadius:30,backgroundColor:C.sun,alignItems:'center',justifyContent:'center'},pickTitle:{fontSize:24,fontWeight:'900'},pickText:{fontSize:12,color:C.muted,marginTop:5},change:{alignSelf:'center',padding:14},caption:{backgroundColor:'#FFF',borderRadius:20,padding:14,fontSize:15},
 viewer:{flex:1,backgroundColor:'#000'},close:{position:'absolute',top:45,left:18,zIndex:4,width:42,height:42,borderRadius:21,backgroundColor:'#0008',alignItems:'center',justifyContent:'center'},full:{flex:1,resizeMode:'contain'},viewerBottom:{position:'absolute',bottom:35,left:20},viewerName:{color:'#FFF',fontSize:18,fontWeight:'900'},viewerCaption:{color:'#DDD',fontSize:11,marginTop:4}
});
