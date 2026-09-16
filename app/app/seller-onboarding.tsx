import React, { useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { getSessionUser } from '../lib/social';
import { supabase } from '../lib/supabase';

export default function SellerOnboarding() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function createStore() {
    if (!name.trim() || !slug.trim()) { setError('Add a store name and store link.'); return; }
    setSaving(true); setError('');
    try {
      const user = await getSessionUser();
      if (!user) throw new Error('Sign in before creating a store.');
      const normalizedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
      const { error: insertError } = await supabase.from('stores').insert({ owner_id: user.id, name: name.trim(), slug: normalizedSlug, description: description.trim() });
      if (insertError) throw insertError;
      router.replace('/seller-studio');
    } catch (saveError: any) { setError(saveError?.message || 'Could not create your store.'); }
    finally { setSaving(false); }
  }
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.scroll}><Pressable onPress={() => router.back()}><I name="back" size={34} /></Pressable><Text style={s.h}>Open your shop ✦</Text><Text style={s.sub}>Create a real store record connected to your profile.</Text><Text style={s.label}>Store name</Text><TextInput value={name} onChangeText={setName} placeholder="Your store name" placeholderTextColor={C.muted} style={s.input} /><Text style={s.label}>Store link</Text><TextInput value={slug} onChangeText={setSlug} autoCapitalize="none" placeholder="your-shop" placeholderTextColor={C.muted} style={s.input} /><Text style={s.label}>Description</Text><TextInput value={description} onChangeText={setDescription} multiline placeholder="What do you sell?" placeholderTextColor={C.muted} style={[s.input, { minHeight: 100, paddingTop: 14 }]} />{error ? <Text style={s.error}>{error}</Text> : null}<Pressable disabled={saving} onPress={createStore} style={[s.btn, saving && { opacity: 0.5 }]}>{saving ? <ActivityIndicator color="#FFF" /> : <Text style={s.btnText}>Create my shop</Text>}</Pressable></ScrollView></SafeAreaView>;
}
const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.bg }, scroll: { padding: 20 }, h: { fontSize: 30, fontWeight: '900', marginTop: 25 }, sub: { fontSize: 13, color: C.muted, lineHeight: 18, marginTop: 5, marginBottom: 25 }, label: { fontSize: 11, fontWeight: '900', marginTop: 16 }, input: { minHeight: 52, borderRadius: 18, backgroundColor: '#FFF', paddingHorizontal: 15, marginTop: 7, borderWidth: 1, borderColor: C.line, color: C.ink }, error: { color: C.red, fontSize: 12, marginTop: 14 }, btn: { height: 54, borderRadius: 27, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', marginTop: 22 }, btnText: { color: '#FFF', fontWeight: '900' } });