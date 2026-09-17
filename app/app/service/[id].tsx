import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { C } from '../../constants/theme';
import { I } from '../../components/Icons';
import { Avatar, VerifiedMark } from '../../Avatar';
import { getProfile, getService, type ProfileRecord, type ServiceRecord } from '../../lib/social';

export default function ServicePage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const serviceId = Array.isArray(id) ? id[0] : id || '';
  const [service, setService] = useState<ServiceRecord | null>(null);
  const [owner, setOwner] = useState<ProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const next = await getService(serviceId);
        if (!next) throw new Error('This service is no longer available.');
        const profile = await getProfile(next.owner_id);
        if (active) { setService(next); setOwner(profile); }
      } catch (e: any) {
        if (active) setError(e?.message || 'Service could not be loaded.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [serviceId]);

  if (loading) return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator color={C.pink} /></View></SafeAreaView>;
  if (!service) return <SafeAreaView style={s.safe}><View style={s.center}><Text style={s.title}>Service unavailable</Text><Text style={s.muted}>{error}</Text></View></SafeAreaView>;
  const location = [owner?.area && owner.location ? `${owner.area} - ${owner.location}` : owner?.area || owner?.location, owner?.country].filter(Boolean).join(', ');
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.scroll}><Pressable onPress={() => router.back()}><I name="back" size={30} /></Pressable>{service.image_urls?.length ? <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={s.heroScroll}>{service.image_urls.map((uri, index) => <Image key={uri + index} source={{ uri }} style={s.hero} />)}</ScrollView> : <View style={s.heroEmpty}><I name="spark" size={48} color={C.pink} /></View>}<Text style={s.category}>{service.category}</Text><Text style={s.title}>{service.name}</Text><Text style={s.price}>GH₵ {Number(service.price).toFixed(0)} · {service.duration_minutes} min</Text><View style={s.seller}><Avatar size={48} uri={owner?.avatar_url || undefined} verified={owner?.verified} /><View style={{ flex: 1 }}><Text style={s.sellerName}>{owner?.display_name || 'Seller'} {owner?.verified && <VerifiedMark size={15} />}</Text><Text style={s.muted}>@{owner?.handle || 'seller'}{location ? ` · ${location}` : ''}</Text></View></View><Text style={s.body}>{service.description || 'Service details from this seller.'}</Text><Pressable style={s.primary} onPress={() => router.push('/chat')}><Text style={s.primaryText}>Message seller</Text></Pressable></ScrollView></SafeAreaView>;
}

const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.bg }, scroll: { padding: 18, paddingBottom: 35 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }, heroScroll: { width: '100%', height: 290, marginTop: 18, borderRadius: 28 }, hero: { width: 350, height: 290, borderRadius: 28, marginRight: 10 }, heroEmpty: { height: 290, borderRadius: 28, marginTop: 18, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' }, category: { color: C.pink, fontWeight: '900', fontSize: 11, marginTop: 18, textTransform: 'uppercase' }, title: { fontSize: 28, fontWeight: '900', marginTop: 7 }, price: { fontSize: 18, fontWeight: '900', marginTop: 8 }, seller: { marginTop: 20, padding: 14, borderRadius: 23, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', gap: 10 }, sellerName: { fontWeight: '900' }, muted: { color: C.muted, fontSize: 11, marginTop: 4, lineHeight: 16 }, body: { color: C.muted, lineHeight: 19, marginTop: 20 }, primary: { height: 54, borderRadius: 27, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', marginTop: 24 }, primaryText: { color: '#FFF', fontWeight: '900', fontSize: 15 } });