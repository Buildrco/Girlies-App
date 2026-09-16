import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { Avatar, VerifiedMark } from '../Avatar';
import { I } from '../components/Icons';
import { useChromeVisibility } from '../components/BottomNav';
import { getCurrentProfile } from '../lib/social';
import { supabase } from '../lib/supabase';

type ProfilePost = { id: string; media_urls: string[] };

export default function Profile() {
  const router = useRouter();
  const { onScroll } = useChromeVisibility();
  const [tab, setTab] = useState('Posts');
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const current = await getCurrentProfile();
        if (!current) {
          if (active) setError('Sign in to view your profile.');
          return;
        }
        const { data, error: postsError } = await supabase.from('posts').select('id,media_urls').eq('author_id', current.id).order('created_at', { ascending: false });
        if (postsError) throw postsError;
        if (active) {
          setProfile(current);
          setPosts((data || []).map((post: any) => ({ id: post.id, media_urls: Array.isArray(post.media_urls) ? post.media_urls : [] })));
        }
      } catch (loadError: any) {
        if (active) setError(loadError?.message || 'Could not load your profile.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return <SafeAreaView style={s.safe}>
    <ScrollView contentContainerStyle={s.scroll} onScroll={onScroll} scrollEventThrottle={16}>
      <View style={s.top}><Text style={s.h}>Profile</Text><Pressable onPress={() => router.push('/settings')}><I name="settings" size={24} /></Pressable></View>
      {loading ? <View style={s.state}><ActivityIndicator color={C.pink} /></View> : error ? <View style={s.state}><Text style={s.title}>{error}</Text><Pressable onPress={() => router.push('/login')} style={s.button}><Text style={s.buttonText}>Sign in</Text></Pressable></View> : profile ? <>
        <View style={s.cover}><View style={s.coverShape} /><View style={s.avatarWrap}><Avatar size={92} uri={profile.avatar_url} /></View></View>
        <View style={s.info}><Text style={s.name}>{profile.display_name} {profile.verified && <VerifiedMark size={16} />}</Text><Text style={s.handle}>@{profile.handle}</Text><Text style={s.bio}>{profile.bio || 'Share a little about yourself with the community.'}</Text><Text style={s.join}>Joined {new Date(profile.created_at || Date.now()).toLocaleDateString()}</Text><View style={s.stats}><View><Text style={s.num}>{Number(profile.followers_count || 0).toLocaleString()}</Text><Text style={s.label}>Followers</Text></View><View><Text style={s.num}>{Number(profile.following_count || 0).toLocaleString()}</Text><Text style={s.label}>Following</Text></View><View><Text style={s.num}>{posts.length}</Text><Text style={s.label}>Posts</Text></View></View><View style={s.actions}><Pressable style={s.edit}><Text style={{ fontWeight: '900' }}>Edit profile</Text></Pressable><Pressable style={s.shopBtn} onPress={() => router.push('/seller/me')}><I name="shop" size={18} color="#FFF" /><Text style={{ color: '#FFF', fontWeight: '900' }}>My shop</Text></Pressable></View></View>
        <View style={s.tabs}>{['Posts', 'Shop', 'Services'].map(item => <Pressable key={item} onPress={() => setTab(item)} style={[s.tab, item === tab && s.tabOn]}><Text style={{ fontWeight: '900', fontSize: 12 }}>{item}</Text></Pressable>)}</View>
        {tab === 'Posts' ? posts.flatMap(post => post.media_urls.map(url => <Image key={`${post.id}:${url}`} source={{ uri: url }} style={s.tile} />)) : <View style={s.empty}><Text style={{ fontSize: 30 }}>✦</Text><Text style={s.emptyTitle}>{tab === 'Shop' ? 'Your shop' : 'Your services'}</Text><Text style={s.emptyText}>Published {tab.toLowerCase()} will appear here.</Text></View>}
      </> : null}
    </ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.bg }, scroll: { padding: 18, paddingBottom: 120 }, top: { height: 55, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, h: { fontSize: 21, fontWeight: '900' }, cover: { height: 175, borderRadius: 34, backgroundColor: C.sun, overflow: 'hidden', position: 'relative' }, coverShape: { position: 'absolute', width: 250, height: 250, borderRadius: 130, right: -40, bottom: -100, backgroundColor: C.rose }, avatarWrap: { position: 'absolute', left: 20, bottom: 17, borderWidth: 5, borderColor: '#FFF', borderRadius: 50 }, info: { paddingTop: 15 }, name: { fontSize: 24, fontWeight: '900' }, handle: { fontSize: 11, color: C.muted, marginTop: 2 }, bio: { fontSize: 13, fontWeight: '600', marginTop: 9 }, join: { fontSize: 11, color: C.muted, marginTop: 5 }, stats: { flexDirection: 'row', gap: 35, marginTop: 16 }, num: { fontSize: 16, fontWeight: '900' }, label: { fontSize: 11, color: C.muted, marginTop: 2 }, actions: { flexDirection: 'row', gap: 9, marginTop: 15 }, edit: { flex: 1, height: 43, borderRadius: 22, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line }, shopBtn: { flex: 1, height: 43, borderRadius: 22, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 }, tabs: { flexDirection: 'row', marginTop: 20, borderBottomWidth: 1, borderBottomColor: C.line }, tab: { flex: 1, alignItems: 'center', paddingVertical: 13 }, tabOn: { borderBottomWidth: 3, borderBottomColor: C.pink }, tile: { width: '32.3%', height: 145, borderRadius: 15, marginTop: 12, marginRight: '1%' }, state: { marginTop: 50, padding: 26, borderRadius: 28, backgroundColor: '#FFF', alignItems: 'center' }, title: { fontSize: 17, fontWeight: '900', textAlign: 'center' }, button: { marginTop: 15, backgroundColor: C.ink, paddingHorizontal: 22, paddingVertical: 11, borderRadius: 22 }, buttonText: { color: '#FFF', fontWeight: '900' }, empty: { padding: 50, alignItems: 'center' }, emptyTitle: { fontSize: 18, fontWeight: '900', marginTop: 8 }, emptyText: { fontSize: 12, color: C.muted, marginTop: 4 } });