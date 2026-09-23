import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { MotionPressable } from '../components/MotionPressable';
import { useChromeVisibility } from '../components/BottomNav';
import { MAIN_CATEGORIES } from '../constants/categories';
import { getCategoryDefinitions } from '../lib/social';
const LOCAL_CATEGORY_LABELS: Record<string, string> = { property: 'PROPERTIES' };

const LOCAL_CATEGORY_IMAGES: Record<string, ImageSourcePropType> = {
  shop: require('../assets/category-shop.png'),
  services: require('../assets/category-services.png'),
  events: require('../assets/category-events.png'),
  'jobs-careers': require('../assets/category-jobs.png'),
  property: require('../assets/category-property.png'),
  vehicles: require('../assets/category-vehicles.png'),
};

const applyLocalCategoryImages = (rows: typeof MAIN_CATEGORIES) => rows.map(category => ({ ...category, label: LOCAL_CATEGORY_LABELS[category.slug] || category.label, image: LOCAL_CATEGORY_IMAGES[category.slug] || category.image }));

const categoryImageStyle = (slug: string) => [s.cardImage, slug === 'shop' && s.cardImageShop, slug === 'services' && s.cardImageServices, slug === 'events' && s.cardImageEvents, slug === 'jobs-careers' && s.cardImageJobs, slug === 'property' && s.cardImageProperty, slug === 'vehicles' && s.cardImageVehicles];
const categoryTitleStyle = (slug: string) => [s.cardTitle, slug === 'events' && s.cardTitleEvents, slug === 'services' && s.cardTitleServices, slug === 'jobs-careers' && s.cardTitleJobs, slug === 'property' && s.cardTitleProperty];


export default function Shop() {
  const router = useRouter();
  const { onScroll } = useChromeVisibility();
  const [categories, setCategories] = React.useState(applyLocalCategoryImages(MAIN_CATEGORIES));
  React.useEffect(() => { let active = true; getCategoryDefinitions('main').then(rows => { if (active && rows.length) setCategories(applyLocalCategoryImages(rows)); }).catch(() => {}); return () => { active = false; }; }, []);
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
      <View style={s.sectionIntro}><View><Text style={s.eyebrow}>BROWSE THE COMMUNITY</Text><Text style={s.heading}>Start with a category</Text></View><MotionPressable style={s.seeAll} onPress={() => router.push('/shop/marketplace')}><Text style={s.seeAllText}>See all</Text><I name="forward" size={17} color={C.plum} /></MotionPressable></View>
      <View style={s.grid}>
        <View style={s.column}>
          {[categories[0], categories[1], categories[2]].filter(Boolean).map((category, index) => <MotionPressable key={category.slug} onPress={() => openCategory(category.slug)} style={[s.card, index === 0 ? s.cardVertical : index === 1 ? s.cardMini : s.cardHorizontal, { backgroundColor: category.color }]}>
            <Image source={typeof category.image === 'string' ? { uri: category.image } : category.image} style={categoryImageStyle(category.slug)} resizeMode="contain" />
            <Text style={categoryTitleStyle(category.slug)}>{category.slug === 'jobs-careers' ? <>JOBS{'\n'}&amp; CAREERS</> : category.label}</Text>
          </MotionPressable>)}
        </View>
        <View style={s.column}>
          {[categories[3], categories[4], categories[5]].filter(Boolean).map((category, index) => <MotionPressable key={category.slug} onPress={() => openCategory(category.slug)} style={[s.card, index === 0 ? s.cardHorizontal : index === 1 ? s.cardMini : s.cardVertical, { backgroundColor: category.color }]}>
            <Image source={typeof category.image === 'string' ? { uri: category.image } : category.image} style={categoryImageStyle(category.slug)} resizeMode="contain" />
            <Text style={categoryTitleStyle(category.slug)}>{category.label}</Text>
          </MotionPressable>)}
        </View>
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
  grid: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  column: { width: '48.5%', gap: 10 },
  card: { width: '100%', borderRadius: 34, overflow: 'hidden', padding: 10, justifyContent: 'flex-start', position: 'relative' },
  cardVertical: { height: 168 },
  cardMini: { height: 92 },
  cardHorizontal: { height: 112 },
  cardImage: { position: 'absolute', right: -14, bottom: -4, width: '108%', height: '105%', borderRadius: 18, zIndex: 0 },
  cardImageShop: { right: -25, bottom: -34, width: '132%', height: '150%' },
  cardImageServices: { right: -48, bottom: -22, width: '134%', height: '140%' },
  cardImageEvents: { right: -42, bottom: -26, width: '136%', height: '142%' },
  cardImageJobs: { right: -34, bottom: -20, width: '132%', height: '138%' },
  cardImageProperty: { right: -46, bottom: -26, width: '140%', height: '145%' },
  cardImageVehicles: { right: -32, bottom: -42, width: '140%', height: '150%' },
  cardTitle: { position: 'absolute', left: 14, top: 14, color: C.ink, fontSize: 12, lineHeight: 15, fontWeight: '900', maxWidth: '64%', zIndex: 2 },
  cardTitleEvents: { left: '35%', top: 9, maxWidth: '52%', textAlign: 'center' },
  cardTitleServices: { maxWidth: '42%', fontSize: 11.5 },
  cardTitleJobs: { maxWidth: '30%', top: 11, fontSize: 11.5, lineHeight: 14 },
  cardTitleProperty: { maxWidth: '60%', top: 9 },
  cardSpacer: { flex: 1 },
  footer: { marginTop: 18, padding: 20, borderRadius: 25, backgroundColor: C.ink },
  footerTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  footerText: { color: '#FFFFFFB8', fontSize: 12, lineHeight: 17, marginTop: 5 },
});