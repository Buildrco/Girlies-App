import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { createStore, getStore, updateStore } from '../lib/social';

export default function ShopEditor() {
  const router = useRouter();
  const [storeId, setStoreId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    getStore('me').then(store => {
      if (store) { setStoreId(store.id); setName(store.name); setDescription(store.description || ''); }
    }).catch(error => Alert.alert('Could not load shop', error?.message || 'Please try again.')).finally(() => setLoading(false));
  }, []);
  async function save() {
    try {
      setSaving(true);
      if (storeId) await updateStore(storeId, { name, description });
      else { const created = await createStore({ name, description }); setStoreId(created.id); }
      router.replace('/seller/me');
    } catch (error: any) { Alert.alert('Could not save shop', error?.message || 'Please try again.'); } finally { setSaving(false); }
  }
  if (loading) return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator color={C.pink} /></View></SafeAreaView>;
  return <SafeAreaView style={s.safe}><KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={s.top}><Pressable onPress={() => router.back()}><I name="back" size={30} /></Pressable><Text style={s.h}>{storeId ? 'Edit shop' : 'Open your shop'}</Text><Pressable disabled={saving} onPress={save}>{saving ? <ActivityIndicator color={C.pink} /> : <Text style={s.save}>Save</Text>}</Pressable></View>
    <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
      <View style={s.hero}><Text style={s.k}>YOUR STOREFRONT</Text><Text style={s.heroTitle}>{storeId ? 'Keep your shop current.' : 'Give your shop a home.'}</Text><Text style={s.heroText}>Add a clear name and story so customers know what to expect.</Text></View>
      <Text style={s.label}>Shop name</Text><TextInput value={name} onChangeText={setName} placeholder="Nia Hair Studio" placeholderTextColor={C.muted} style={s.input} />
      <Text style={s.label}>Shop description</Text><TextInput value={description} onChangeText={setDescription} multiline placeholder="What do you sell? What makes your shop special?" placeholderTextColor={C.muted} style={[s.input, s.textarea]} />
      <Pressable style={s.primary} onPress={save}><Text style={s.primaryText}>{storeId ? 'Save shop details' : 'Create my shop'}</Text><I name="arrow" size={19} color="#FFF" /></Pressable>
      {storeId && <Pressable style={s.secondary} onPress={() => router.push('/product-editor')}><I name="plus" size={19} color={C.pink} /><Text style={s.secondaryText}>Add a product</Text></Pressable>}
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, flex: { flex: 1 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  top: { height: 65, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: C.line }, h: { fontSize: 20, fontWeight: '900' }, save: { color: C.pink, fontWeight: '900' },
  scroll: { padding: 20, paddingBottom: 50 }, hero: { padding: 22, borderRadius: 30, backgroundColor: C.plum, marginBottom: 24 }, k: { color: C.sun, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, heroTitle: { color: '#FFF', fontSize: 25, fontWeight: '900', marginTop: 8 }, heroText: { color: '#F4E7EF', fontSize: 13, lineHeight: 19, marginTop: 6 },
  label: { fontSize: 12, fontWeight: '900', marginTop: 17, marginBottom: 8 }, input: { minHeight: 52, borderRadius: 18, backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line, padding: 15, fontSize: 15 }, textarea: { minHeight: 125, textAlignVertical: 'top' },
  primary: { height: 54, borderRadius: 27, backgroundColor: C.ink, marginTop: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, primaryText: { color: '#FFF', fontWeight: '900', fontSize: 14 }, secondary: { height: 50, borderRadius: 25, backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line, marginTop: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, secondaryText: { color: C.pink, fontWeight: '900' },
});