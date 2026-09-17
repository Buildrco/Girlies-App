import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, Pressable, TextInput, StyleSheet, Image, Alert, ActivityIndicator, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { createPost, type MediaItem } from '../lib/social';

function VideoPreview({ url }: { url: string }) {
  const player = useVideoPlayer(url, currentPlayer => { currentPlayer.loop = true; currentPlayer.muted = true; });
  useEffect(() => { player.pause(); }, [player]);
  return <VideoView player={player} style={s.media} nativeControls contentFit="cover" />;
}

export default function Create() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [saving, setSaving] = useState(false);

  async function pickMedia(video: boolean) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow Girlies to access your photos and videos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: video ? ['videos'] : ['images'],
      allowsMultipleSelection: false,
      allowsEditing: !video,
      quality: 0.9,
      videoMaxDuration: 120,
    });
    if (result.canceled) return;
    const selected: MediaItem[] = result.assets.slice(0, 1).map((a: ImagePicker.ImagePickerAsset) => ({
      uri: a.uri,
      type: (a.type === 'video' ? 'video' : 'image') as 'image' | 'video',
      name: a.fileName || undefined,
      mimeType: a.mimeType || undefined,
    }));
    setMedia(current => [...current, ...selected].slice(0, 10));
  }

  async function publish() {
    if (!text.trim() && media.length === 0) {
      Alert.alert('Nothing to post', 'Write something or add a photo/video.');
      return;
    }
    try {
      setSaving(true);
      await createPost(text, media);
      router.back();
    } catch (e: any) {
      Alert.alert('Could not post', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.top}>
        <Pressable onPress={() => router.back()}><I name="back" size={30} /></Pressable>
        <Text style={s.h}>Create</Text>
        <Pressable disabled={saving} onPress={publish}>
          {saving ? <ActivityIndicator color={C.pink} /> : <Text style={s.post}>Post</Text>}
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <TextInput autoFocus multiline value={text} onChangeText={setText}
          placeholder="Share something with the girls…" placeholderTextColor={C.muted} style={s.input} />
        {media.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.mediaRow}>
            {media.map((m, i) => <View key={`${m.uri}-${i}`} style={s.mediaWrap}>
              {m.type === 'image' ? <Image source={{uri:m.uri}} style={s.media} /> :
                <VideoPreview url={m.uri} />}
              <Pressable onPress={() => setMedia(x => x.filter((_, n) => n !== i))} style={s.remove}><Text style={s.removeText}>×</Text></Pressable>
            </View>)}
          </ScrollView>
        )}
        <View style={s.tip}><Text style={{fontSize:42}}>✦</Text><Text style={s.tipTitle}>Make it yours.</Text>
          <Text style={s.tipText}>Add photos, videos, hashtags, mentions or products.</Text></View>
      </ScrollView>
      <View style={s.tools}>
        <Pressable onPress={() => pickMedia(false)} style={s.tool}><I name="camera" size={23} color={C.pink}/><Text>Photo</Text></Pressable>
        <Pressable onPress={() => pickMedia(true)} style={s.tool}><I name="camera" size={23} color={C.pink}/><Text>Video</Text></Pressable>
        <Pressable style={s.tool} onPress={() => setText(t => `${t}${t ? ' ' : ''}#`)}><Text style={s.hash}>#</Text><Text>Hashtag</Text></Pressable>
        <Pressable style={s.tool} onPress={() => setText(t => `${t}${t ? ' ' : ''}@`)}><Text style={s.at}>@</Text><Text>Mention</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:C.bg},top:{height:65,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:C.line},
 h:{fontSize:20,fontWeight:'900'},post:{fontWeight:'900',color:C.pink},body:{padding:20,paddingBottom:40},input:{fontSize:18,lineHeight:25,minHeight:130,textAlignVertical:'top'},
 tip:{padding:22,borderRadius:30,backgroundColor:C.sun,marginTop:20},tipTitle:{fontSize:23,fontWeight:'900',marginTop:5},tipText:{fontSize:12,fontWeight:'600',lineHeight:17,marginTop:5},
 mediaRow:{marginTop:12},mediaWrap:{marginRight:9,position:'relative'},media:{width:150,height:190,borderRadius:20},video:{backgroundColor:C.plum,alignItems:'center',justifyContent:'center'},videoText:{color:'#FFF',fontWeight:'900',fontSize:10,marginTop:5},
 remove:{position:'absolute',right:7,top:7,width:28,height:28,borderRadius:14,backgroundColor:'#0009',alignItems:'center',justifyContent:'center'},removeText:{color:'#FFF',fontSize:22,lineHeight:24},
 tools:{height:78,backgroundColor:'#FFF',borderTopWidth:1,borderTopColor:C.line,flexDirection:'row',justifyContent:'space-around',alignItems:'center'},tool:{alignItems:'center',gap:3},hash:{fontSize:25,fontWeight:'900'},at:{fontSize:21,fontWeight:'900'}
});
