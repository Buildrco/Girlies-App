import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { useChromeVisibility } from '../components/BottomNav';
import { MAIN_CATEGORIES } from '../constants/categories';
import { getCategoryDefinitions } from '../lib/social';

export default function Shop() {
  const router = useRouter();
  const { onScroll } = useChromeVisibility();
  const [categories, setCategories] = React.useState(MAIN_CATEGORIES);
  React.useEffect(() => { let active = true; getCategoryDefinitions('main').then(rows => { if (active && rows.length) setCategories(rows); }).catch(() => {}); return () => { active = false; }; }, []);
  const openCategory = (slug: string) => {
    if (slug === 'shop') {
      router.push('/shop/marketplace');
      return;
    }
    router.push({ pathname: '/shop/category/[slug]', params: { slug } });
  };

  return <SafeAreaView style={s.safe}>
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}>
      <View style={s.top}><Text style={s.k}>EXPLORE GIRLIES</Text><Text style={s.h}>Find your next move.</Text></View>
      <View style={s.sectionIntro}><View><Text style={s.eyebrow}>BROWSE THE COMMUNITY</Text><Text style={s.heading}>Start with a category</Text></View><Pressable style={s.seeAll} onPress={() => router.push('/shop/marketplace')}><Text style={s.seeAllText}>See all</Text><I name="forward" size={17} color={C.plum} /></Pressable></View>
      <View style={s.grid}>
        {categories.map((category, index) => <Pressable key={category.slug} onPress={() => openCategory(category.slug)} style={[s.card, index % 4 === 0 || index % 4 === 3 ? s.cardTall : s.cardShort, { backgroundColor: category.color }]}>
          <Image source={{ uri: category.image }} style={s.cardImage} resizeMode="cover" />
          <View style={s.cardShade} />
          <Text style={s.cardTitle}>{category.label}</Text>
        </Pressable>)}
      </View>
      <View style={s.footer}><Text style={s.footerTitle}>Buy, book, join and find your people.</Text><Text style={s.footerText}>Everything you need, arranged around real life.</Text></View>
    </ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 18, paddingBottom: 120 },
  top: { paddingTop: 6 },
  k: { fontSize: 10, fontWeight: '900', letterSpacing: 1.3, color: C.muted },
  h: { fontSize: 29, fontWeight: '900', marginTop: 5 },
  sectionIntro: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 28, marginBottom: 14 },
  eyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1.1, color: C.pink },
  heading: { fontSize: 21, fontWeight: '900', marginTop: 4 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingBottom: 2 },
  seeAllText: { fontSize: 12, fontWeight: '900', color: C.plum },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  card: { width: '48.5%', borderRadius: 28, overflow: 'hidden', position: 'relative', padding: 16, justifyContent: 'flex-end' },
  cardTall: { height: 224 },
  cardShort: { height: 168 },
  cardImage: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  cardShade: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: '#00000038' },
  cardTitle: { color: '#FFF', fontSize: 21, lineHeight: 24, fontWeight: '900', maxWidth: '92%' },
  footer: { marginTop: 18, padding: 20, borderRadius: 25, backgroundColor: C.ink },
  footerTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  footerText: { color: '#FFFFFFB8', fontSize: 12, lineHeight: 17, marginTop: 5 },
});