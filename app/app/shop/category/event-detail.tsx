import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../../../constants/theme';
import { I } from '../../../components/Icons';
import { getPublishedEvents, purchaseSellerEventTicket, type SellerEvent } from '../../../lib/social';

const EVENT_ART = [
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=90',
  'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=90',
  'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=90',
];
const eventImage = (event: SellerEvent) => event.banner_url || EVENT_ART[0];
const eventDate = (value: string) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const eventDateTime = (value: string) => new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const eventId = Array.isArray(id) ? id[0] : id;
  const [event, setEvent] = useState<SellerEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = await getPublishedEvents();
        const match = rows.find(row => row.id === eventId) || null;
        if (active) { setEvent(match); setError(match ? '' : 'This event is no longer available.'); }
      } catch (e: any) {
        if (active) setError(e?.message || 'Could not load this event.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [eventId]);

  const buyTicket = async () => {
    if (!event) return;
    try {
      await purchaseSellerEventTicket(event.id);
      Alert.alert('Ticket reserved', 'Your ticket is ready in your Girlies account.');
    } catch (e: any) {
      Alert.alert('Could not reserve ticket', e?.message || 'Please sign in and try again.');
    }
  };

  return <SafeAreaView style={s.safe}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
      <LinearGradient colors={[C.rose, C.lilac, C.mint]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
        <Pressable style={s.back} onPress={() => router.back()}><I name="back" size={23} color={C.ink} /></Pressable>
        <Text style={s.headerLabel}>EVENT DETAILS</Text>
        <View style={s.headerSpacer} />
      </LinearGradient>
      {loading && <View style={s.state}><ActivityIndicator color={C.pink} /></View>}
      {!loading && !event && <View style={s.state}><Text style={s.errorTitle}>Event unavailable</Text><Text style={s.errorText}>{error}</Text></View>}
      {event && <View>
        <View style={s.bannerWrap}>
          <Image source={{ uri: eventImage(event) }} style={s.banner} resizeMode="cover" />
          <LinearGradient colors={['transparent', '#171318CC']} style={s.bannerShade} />
          <BlurView intensity={65} tint="light" style={s.glassCard}>
            <View style={s.glassTop}><Text style={s.glassDate}>{eventDate(event.starts_at)}</Text><Text style={s.glassPrice}>{Number(event.ticket_price || 0) > 0 ? 'GH₵ ' + Number(event.ticket_price).toFixed(0) : 'Free'}</Text></View>
            <Text style={s.glassTitle} numberOfLines={2}>{event.name}</Text>
            <Text style={s.glassMeta}>{event.event_mode === 'physical' ? event.location || 'Physical location' : 'Online in Girlies'} · {eventDateTime(event.starts_at)}</Text>
          </BlurView>
        </View>
        <View style={s.infoCard}>
          <Text style={s.sectionK}>ABOUT EVENT</Text>
          <Text style={s.description}>{event.description || 'Planning an event can be a daunting task, especially when you have a lot to manage.'}</Text>
          <View style={s.infoRow}><View style={s.infoIcon}><I name="location" size={18} color={C.pink} /></View><View><Text style={s.infoLabel}>Location</Text><Text style={s.infoValue}>{event.event_mode === 'physical' ? event.location || 'Physical location' : 'Online in Girlies'}</Text></View></View>
          <View style={s.infoRow}><View style={s.infoIcon}><I name="calendar" size={18} color={C.pink} /></View><View><Text style={s.infoLabel}>Date & time</Text><Text style={s.infoValue}>{eventDateTime(event.starts_at)}</Text></View></View>
          <View style={s.participants}><View style={s.avatarOne} /><View style={s.avatarTwo} /><View style={s.avatarThree} /><Text style={s.participantText}>+2k&nbsp;&nbsp; Participants</Text></View>
          <Pressable style={s.buyButton} onPress={() => void buyTicket}><Text style={s.buyText}>{Number(event.ticket_price || 0) > 0 ? 'Buy Ticket · GH₵ ' + Number(event.ticket_price).toFixed(0) : 'Get Free Ticket'}</Text><I name="forward" size={20} color="#FFF" /></Pressable>
        </View>
      </View>}
    </ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F1FA' },
  scroll: { paddingBottom: 30 },
  header: { height: 74, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFFAA', alignItems: 'center', justifyContent: 'center' },
  headerLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  headerSpacer: { width: 42 },
  bannerWrap: { marginHorizontal: 16, marginTop: 16, height: 354, borderRadius: 30, overflow: 'hidden', position: 'relative', backgroundColor: C.plum },
  banner: { ...StyleSheet.absoluteFillObject },
  bannerShade: { ...StyleSheet.absoluteFillObject },
  glassCard: { position: 'absolute', left: 14, right: 14, bottom: 14, minHeight: 126, borderRadius: 25, overflow: 'hidden', padding: 16, backgroundColor: '#FFFFFF66', borderWidth: 1, borderColor: '#FFFFFFAA' },
  glassTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  glassDate: { color: C.pink, fontSize: 11, fontWeight: '900' },
  glassPrice: { color: C.pink, fontSize: 16, fontWeight: '900' },
  glassTitle: { color: C.ink, fontSize: 24, lineHeight: 27, fontWeight: '900', marginTop: 7 },
  glassMeta: { color: '#51464E', fontSize: 10, fontWeight: '700', marginTop: 7 },
  infoCard: { margin: 16, marginTop: 14, padding: 18, borderRadius: 26, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EADFEF' },
  sectionK: { color: C.pink, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  description: { color: '#5C505A', fontSize: 12, lineHeight: 18, marginTop: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  infoIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF0F5', alignItems: 'center', justifyContent: 'center' },
  infoLabel: { color: C.muted, fontSize: 10, fontWeight: '700' },
  infoValue: { color: C.ink, fontSize: 12, fontWeight: '900', marginTop: 2 },
  participants: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  avatarOne: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F6A7D4', borderWidth: 2, borderColor: '#FFF' },
  avatarTwo: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#B89CFF', borderWidth: 2, borderColor: '#FFF', marginLeft: -8 },
  avatarThree: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFD45A', borderWidth: 2, borderColor: '#FFF', marginLeft: -8 },
  participantText: { color: C.muted, fontSize: 10, fontWeight: '800', marginLeft: 8 },
  buyButton: { height: 52, borderRadius: 26, backgroundColor: C.pink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20 },
  buyText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  state: { margin: 24, padding: 28, borderRadius: 24, backgroundColor: '#FFF', alignItems: 'center' },
  errorTitle: { fontSize: 17, fontWeight: '900' },
  errorText: { color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 6 },
});