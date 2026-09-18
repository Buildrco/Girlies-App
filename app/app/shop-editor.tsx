import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { createStore, getStore, updateStore } from '../lib/social';
import { MARKETPLACE_CATEGORIES } from '../constants/categories';

export default function ShopEditor() {
  const router = useRouter();
  const [storeId, setStoreId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(MARKETPLACE_CATEGORIES.map(category => category.slug));
  const [bannerUrl, setBannerUrl] = useState('');
  const [bannerEnabled, setBannerEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getStore('me').then(store => {
      if (store) {
        setStoreId(store.id);
        setName(store.name);
        setDescription(store.description || '');
        if (Array.isArray(store.categories) && store.categories.length) setSelectedCategories(store.categories);
        if (Array.isArray(store.banner_urls) && store.banner_urls[0]) setBannerUrl(store.banner_urls[0]);
      }
    }).catch(error => Alert.alert('Could not load shop', error?.message || 'Please try again.')).finally(() => setLoading(false));
  }, []);

  function toggleCategory(slug: string) {
    setSelectedCategories(current => current.includes(slug) ? current.filter(item => item !== slug) : [...current, slug]);
  }

  async function save() {
    if (!name.trim()) { Alert.alert('Add a shop name', 'Your storefront needs a name.'); return; }
    if (!selectedCategories.length) { Alert.alert('Choose categories', 'Select at least one category your shop sells.'); return; }
    try {
      setSaving(true);
      const payload = { name, description, categories: selectedCategories, bannerUrls: bannerEnabled && bannerUrl.trim() ? [bannerUrl.trim()] : [] };
      if (storeId) await updateStore(storeId, payload);
      else { const created = await createStore(payload); setStoreId(created.id); }
      router.replace('/seller/me');
    } catch (error: any) { Alert.alert('Could not save shop', error?.message || 'Please try again.'); } finally { setSaving(false); }
  }
  return <SafeAreaView style={s.safe}><KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={s.top}><Pressable onPress={() => router.back()}><I name="back" size={30} /></Pressable><Text style={s.h}>{storeId ? 'Edit shop' : 'Open your shop'}</Text><Pressable disabled={saving} onPress={save}>{saving ? <ActivityIndicator color={C.pink} /> : <Text style={s.save}>Save</Text>}</Pressable></View>
    <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={s.hero}><Text style={s.k}>YOUR STOREFRONT</Text><Text style={s.heroTitle}>{storeId ? 'Keep your shop current.' : 'Give your shop a home.'}</Text><Text style={s.heroText}>Choose exactly what shoppers see first, then let every product live inside the right category.</Text></View>
      <Text style={s.label}>Shop name</Text><TextInput value={name} onChangeText={setName} placeholder="Nia Hair Studio" placeholderTextColor={C.muted} style={s.input} />
      <Text style={s.label}>Shop description</Text><TextInput value={description} onChangeText={setDescription} multiline placeholder="What do you sell? What makes your shop special?" placeholderTextColor={C.muted} style={[s.input, s.textarea]} />
      <View style={s.sectionRow}><View><Text style={s.sectionTitle}>Shop categories</Text><Text style={s.sectionText}>Only these cards appear on your storefront.</Text></View><Text style={s.selected}>{selectedCategories.length} selected</Text></View>
      <View style={s.categoryGrid}>{MARKETPLACE_CATEGORIES.map(category => <Pressable key={category.slug} onPress={() => toggleCategory(category.slug)} style={[s.categoryCard, selectedCategories.includes(category.slug) && s.categoryCardOn]}><View style={[s.categoryIcon, { backgroundColor: category.color }]}><I name={category.icon} size={20} color={C.ink} filled /></View><Text style={s.categoryName}>{category.label}</Text><View style={[s.check, selectedCategories.includes(category.slug) && s.checkOn]}>{selectedCategories.includes(category.slug) && <I name="check" size={13} color="#FFF" />}</View></Pressable>)}</View>
      <View style={s.bannerRow}><View style={s.bannerCopy}><Text style={s.sectionTitle}>Store banner</Text><Text style={s.sectionText}>Use a default storefront look or add one image URL.</Text></View><Switch value={bannerEnabled} onValueChange={setBannerEnabled} trackColor={{ false: C.line, true: C.rose }} thumbColor={bannerEnabled ? C.pink : '#FFF'} /></View>
      {bannerEnabled && <TextInput value={bannerUrl} onChangeText={setBannerUrl} placeholder="https://… your banner image URL" placeholderTextColor={C.muted} style={s.input} autoCapitalize="none" />}
      <Pressable style={s.primary} onPress={save} disabled={saving}><Text style={s.primaryText}>{storeId ? 'Save shop details' : 'Create my shop'}</Text><I name="arrow" size={19} color="#FFF" /></Pressable>
      {storeId && <Pressable style={s.secondary} onPress={() => router.push('/product-editor')}><I name="plus" size={19} color={C.pink} /><Text style={s.secondaryText}>Add a product</Text></Pressable>}
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, flex: { flex: 1 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  top: { height: 65, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: C.line }, h: { fontSize: 20, fontWeight: '900' }, save: { color: C.pink, fontWeight: '900' },
  scroll: { padding: 20, paddingBottom: 50 }, hero: { padding: 22, borderRadius: 30, backgroundColor: C.plum, marginBottom: 24 }, k: { color: C.sun, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, heroTitle: { color: '#FFF', fontSize: 25, fontWeight: '900', marginTop: 8 }, heroText: { color: '#F4E7EF', fontSize: 13, lineHeight: 19, marginTop: 6 },
  label: { fontSize: 12, fontWeight: '900', marginTop: 17, marginBottom: 8 }, input: { minHeight: 52, borderRadius: 18, backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line, padding: 15, fontSize: 15, color: C.ink }, textarea: { minHeight: 125, textAlignVertical: 'top' },
  sectionRow: { marginTop: 24, marginBottom: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }, sectionTitle: { fontSize: 15, fontWeight: '900' }, sectionText: { color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 3, maxWidth: 220 }, selected: { color: C.pink, fontSize: 11, fontWeight: '900' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 }, categoryCard: { width: '48.5%', minHeight: 67, borderRadius: 19, backgroundColor: '#FFF', padding: 9, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.line }, categoryCardOn: { borderColor: C.pink, backgroundColor: '#FFF7FA' }, categoryIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, categoryName: { flex: 1, fontSize: 11, fontWeight: '900' }, check: { width: 19, height: 19, borderRadius: 10, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }, checkOn: { backgroundColor: C.pink, borderColor: C.pink },
  bannerRow: { marginTop: 24, marginBottom: 10, padding: 15, borderRadius: 20, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, bannerCopy: { flex: 1 },
  primary: { height: 54, borderRadius: 27, backgroundColor: C.ink, marginTop: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, primaryText: { color: '#FFF', fontWeight: '900', fontSize: 14 }, secondary: { height: 50, borderRadius: 25, backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line, marginTop: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, secondaryText: { color: C.pink, fontWeight: '900' },
});