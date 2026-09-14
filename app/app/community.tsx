import React, { useRef, useState } from 'react';
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { Avatar, VerifiedMark } from '../Avatar';
import { useChromeVisibility } from '../components/BottomNav';
import { LikeButton } from '../components/LikeButton';

const pics = [
  'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=900&q=85',
];
const names = ['Ama’s Corner', 'Nana Glow', 'Esi Styles'];
const stories = ['Your story', 'Ama’s Corner', 'Nana Glow', 'Esi Styles', 'Hair girls'];
const copy = [
  'Girls, help me choose 😭 Which one would you wear to a garden wedding?',
  'What perfume are we wearing this weekend? Drop your best long-lasting picks.',
  'Found this look and I need the girls to tell me where I can recreate it.',
];

export default function Community() {
  const router = useRouter();
  const { visibility, onScroll } = useChromeVisibility();
  const [tab, setTab] = useState('For you');
  const [liked, setLiked] = useState<number[]>([]);
  const toggleLike = (index: number) => setLiked(current => current.includes(index) ? current.filter(item => item !== index) : [...current, index]);
  const tabs = ['For you', 'Following', 'Trending', 'Hair girls'];
  return <SafeAreaView style={s.safe}>
    <Animated.ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}>
      <View style={s.top}>
        <Pressable onPress={() => router.push('/notifications')} style={s.iconButton}><I name="bell" size={25} /><View style={s.badge}><Text style={s.badgeText}>4</Text></View></Pressable>
        <Text style={s.h}>Feed</Text>
        <Pressable onPress={() => router.push('/chat')} style={s.iconButton}><I name="chat" size={25} /></Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScroll}>{tabs.map(item =>
        <Pressable key={item} onPress={() => setTab(item)} style={[s.tab, item === tab && s.tabOn]}><Text style={[s.tabText, item === tab && s.tabTextOn]}>{item}</Text></Pressable>
      )}</ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.stories}>{stories.map((story, index) =>
        <Pressable key={story} onPress={() => index === 0 ? router.push('/create') : router.push('/profile')} style={s.story}>
          <View style={[s.storyRing, index === 0 && s.storyOwn]}><Avatar size={58} index={index} /></View>
          <Text style={s.storyName} numberOfLines={1}>{story}</Text>
        </Pressable>
      )}</ScrollView>
      <Pressable style={s.composer} onPress={() => router.push('/create')}>
        <Avatar size={42} /><View style={s.ask}><Text style={s.askText}>What’s on your mind, girlie?</Text></View><I name="camera" size={24} color={C.pink} />
      </Pressable>
      <View style={s.live}><View><Text style={s.liveK}>LIVE NOW</Text><Text style={s.liveTitle}>Girls are getting ready together</Text><Text style={s.liveText}>Join 184 viewers · Beauty Room</Text></View><Pressable style={s.liveBtn}><Text style={s.liveBtnText}>Watch</Text></Pressable></View>
      {[0, 1, 2].map(index => <View key={index} style={s.post}>
        <View style={s.postTop}><Avatar size={43} index={index} /><View style={{ flex: 1 }}><Text style={s.name}>{names[index]} <VerifiedMark size={16} /></Text><Text style={s.meta}>{index ? '38 min' : '12 min'} · Accra</Text></View><I name="more" size={21} color={C.muted} /></View>
        <Text style={s.postText}>{copy[index]}</Text>
        {index < 2 && <Image source={{ uri: pics[index] }} style={s.postImg} />}
        <View style={s.actions}>
          <View style={s.action}><LikeButton liked={liked.includes(index)} onPress={() => toggleLike(index)} size={22} /><Text style={s.actionText}>{284 - index * 71 + (liked.includes(index) ? 1 : 0)}</Text></View>
          <Pressable style={s.action}><I name="chat" size={20} /><Text style={s.actionText}>{48 + index * 9}</Text></Pressable>
          <Pressable style={s.action}><I name="share" size={20} /><Text style={s.actionText}>{16 + index * 4}</Text></Pressable>
          <Pressable style={s.action}><I name="bookmark" size={20} /></Pressable>
        </View>
      </View>)}
    </Animated.ScrollView>
    <Pressable style={[s.fab, { transform: [{ translateY: visibility.interpolate({ inputRange: [0, 1], outputRange: [90, 0] }) }] }]} onPress={() => router.push('/create')}><I name="plus" size={28} color="#FFF" /></Pressable>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, scroll: { padding: 18, paddingBottom: 105 }, top: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, h: { fontSize: 20, fontWeight: '900' }, iconButton: { padding: 5 }, badge: { position: 'absolute', top: -3, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.bg }, badgeText: { color: '#FFF', fontSize: 10, fontWeight: '900' }, tabScroll: { marginBottom: 12 }, tab: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, backgroundColor: '#FFF', marginRight: 7, borderWidth: 1, borderColor: C.line }, tabOn: { backgroundColor: C.ink }, tabText: { fontSize: 11, fontWeight: '900', color: C.ink }, tabTextOn: { color: '#FFF' }, stories: { marginBottom: 14 }, story: { width: 74, alignItems: 'center', marginRight: 8 }, storyRing: { padding: 3, borderRadius: 36, borderWidth: 2, borderColor: C.pink }, storyOwn: { borderColor: C.ink }, storyName: { fontSize: 10, color: C.ink, marginTop: 5 }, composer: { backgroundColor: '#FFF', borderRadius: 28, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.line }, ask: { flex: 1, paddingHorizontal: 12 }, askText: { color: C.muted, fontWeight: '600' }, live: { marginTop: 15, borderRadius: 28, padding: 18, backgroundColor: C.coral, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, liveK: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, liveTitle: { fontSize: 18, fontWeight: '900', marginTop: 5 }, liveText: { fontSize: 12, fontWeight: '600', marginTop: 4 }, liveBtn: { backgroundColor: C.ink, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 }, liveBtnText: { color: '#FFF', fontWeight: '900' }, post: { marginTop: 15, backgroundColor: '#FFF', borderRadius: 29, padding: 15, borderWidth: 1, borderColor: C.line }, postTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, name: { fontSize: 14, fontWeight: '900' }, meta: { fontSize: 11, color: C.muted, marginTop: 2 }, postText: { fontSize: 14, lineHeight: 20, fontWeight: '600', marginVertical: 12 }, postImg: { height: 285, borderRadius: 23, width: '100%' }, actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12 }, action: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 36 }, actionText: { fontSize: 12, color: C.ink }, fab: { position: 'absolute', right: 23, bottom: 92, width: 55, height: 55, borderRadius: 28, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center', zIndex: 18, elevation: 8 },
});