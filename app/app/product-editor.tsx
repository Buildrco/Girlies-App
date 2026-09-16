import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { createProduct, createStore, getCurrentProfile, getStore, type MediaItem } from '../lib/social';

const categories = ['Hair', 'Beauty', 'Fashion', 'Fragrance', 'Bags', 'Jewellery'];
const fulfillmentOptions = ['Local delivery', 'Pickup', 'Ships nationwide'];

export default function ProductEditor() {
  const router = useRouter();
  const [storeId, setStoreId] = useState('');
  const [shopName, setShopName] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [fulfillment, setFulfillment] = useState(fulfillmentOptions[0]);
  const [bidEnabled, setBidEnabled] = useState(false);
  const [bidPrice, setBidPrice] = useState('');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const store = await getStore('me');
        if (store) { setStoreId(store.id); setShopName(store.name); return; }
        const profile = await getCurrentProfile();
        const created = await createStore({ name: `${profile?.display_name || 'My'} Shop`, description: 'Beauty, fashion and finds for the girls.' });
        setStoreId(created.id);
        setShopName(created.name);
      } catch (error: any) {
        Alert.alert('Set up your shop first', error?.message || 'Open a shop before adding products.', [{ text: 'Open shop', onPress: () => router.replace('/shop-editor') }, { text: 'Cancel', onPress: () => router.back() }]);
      } finally { setLoading(false); }
    })();
  }, [router]);

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Permission needed', 'Allow Girlies to access your photos so you can add a product image.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.9 });
    if (result.canceled) return;
    setMedia(result.assets.slice(0, 6).map(asset => ({ uri: asset.uri, type: 'image', name: asset.fileName || 'product.jpg', mimeType: asset.mimeType || 'image/jpeg' })));
  }

  async function publish() {
    const numericPrice = Number(price.replace(/,/g, ''));
    const numericBid = Number(bidPrice.replace(/,/g, ''));
    if (!storeId) return;
    if (!name.trim() || !price.trim()) { Alert.alert('Complete your listing', 'Add a product name and price.'); return; }
    if (bidEnabled && (!bidPrice.trim() || numericBid <= 0)) { Alert.alert('Add a bid price', 'Set the minimum amount you will accept for bids.'); return; }
    try {
      setSaving(true);
      await createProduct({ storeId, name, description, category, price: numericPrice, stock: Number(stock) || 0, fulfillment, bidEnabled, bidPrice: bidEnabled ? numericBid : null, media });
      Alert.alert('Product published', `${name} is now live in ${shopName} and will be available in Fresh finds.`, [{ text: 'Done', onPress: () => router.replace('/seller/me') }]);
    } catch (error: any) { Alert.alert('Could not publish product', error?.message || 'Please try again.'); } finally { setSaving(false); }
  }

  if (loading) return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator color={C.pink} /></View></SafeAreaView>;
  return <SafeAreaView style={s.safe}><View style={s.flex}>
    <View style={s.top}><Pressable onPress={() => router.back()}><I name="back" size={30} /></Pressable><Text style={s.h}>Add product</Text><Pressable disabled={saving} onPress={publish}>{saving ? <ActivityIndicator color={C.pink} /> : <Text style={s.publish}>Publish</Text>}</Pressable></View>
    <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Pressable onPress={pickImage} style={s.mediaPicker}>
        {media.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false}>{media.map((item, index) => <Image key={`${item.uri}-${index}`} source={{ uri: item.uri }} style={s.preview} />)}</ScrollView> : <><View style={s.camera}><I name="camera" size={28} color={C.pink} /></View><Text style={s.mediaTitle}>Add product photos</Text><Text style={s.mediaText}>Clear photos help your product get noticed.</Text></>}
      </Pressable>
      <Text style={s.label}>Product name</Text><TextInput value={name} onChangeText={setName} placeholder="e.g. Body wave bundles" placeholderTextColor={C.muted} style={s.input} />
      <Text style={s.label}>Description</Text><TextInput value={description} onChangeText={setDescription} multiline placeholder="Tell shoppers what they are getting." placeholderTextColor={C.muted} style={[s.input, s.textarea]} />
      <Text style={s.label}>Category</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{categories.map(item => <Pressable key={item} onPress={() => setCategory(item)} style={[s.chip, category === item && s.chipOn]}><Text style={[s.chipText, category === item && s.chipTextOn]}>{item}</Text></Pressable>)}</ScrollView>
      <View style={s.row}><View style={s.half}><Text style={s.label}>Price · GH₵</Text><TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="480" placeholderTextColor={C.muted} style={s.input} /></View><View style={s.half}><Text style={s.label}>Stock</Text><TextInput value={stock} onChangeText={setStock} keyboardType="number-pad" placeholder="1" placeholderTextColor={C.muted} style={s.input} /></View></View>
      <Text style={s.label}>Fulfillment</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{fulfillmentOptions.map(item => <Pressable key={item} onPress={() => setFulfillment(item)} style={[s.chip, fulfillment === item && s.chipOn]}><Text style={[s.chipText, fulfillment === item && s.chipTextOn]}>{item}</Text></Pressable>)}</ScrollView>
      <View style={s.bidCard}><View style={s.bidCopy}><Text style={s.bidTitle}>Accept bids</Text><Text style={s.bidText}>Let shoppers offer a price for this item.</Text></View><Switch value={bidEnabled} onValueChange={setBidEnabled} trackColor={{ false: C.line, true: C.rose }} thumbColor={bidEnabled ? C.pink : '#FFF'} /></View>
      {bidEnabled && <><Text style={s.label}>Minimum bid · GH₵</Text><TextInput value={bidPrice} onChangeText={setBidPrice} keyboardType="decimal-pad" placeholder="350" placeholderTextColor={C.muted} style={s.input} /></>}
      <Pressable style={s.primary} onPress={publish} disabled={saving}><Text style={s.primaryText}>{saving ? 'Publishing…' : 'Publish product'}</Text><I name="arrow" size={19} color="#FFF" /></Pressable>
    </ScrollView>
  </View></SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, flex: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  top: { height: 65, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: C.line }, h: { fontSize: 20, fontWeight: '900' }, publish: { color: C.pink, fontWeight: '900' },
  scroll: { padding: 20, paddingBottom: 60 }, mediaPicker: { minHeight: 180, borderRadius: 28, backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', padding: 14, overflow: 'hidden' }, camera: { width: 58, height: 58, borderRadius: 29, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' }, mediaTitle: { fontSize: 16, fontWeight: '900', marginTop: 10 }, mediaText: { fontSize: 11, color: C.muted, marginTop: 4 }, preview: { width: 130, height: 160, borderRadius: 18, marginHorizontal: 4 },
  label: { fontSize: 12, fontWeight: '900', marginTop: 18, marginBottom: 8 }, input: { minHeight: 52, borderRadius: 18, backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line, padding: 15, fontSize: 15, color: C.ink }, textarea: { minHeight: 112, textAlignVertical: 'top' }, row: { flexDirection: 'row', gap: 10 }, half: { flex: 1 },
  chip: { paddingHorizontal: 15, paddingVertical: 11, borderRadius: 19, backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line, marginRight: 8 }, chipOn: { backgroundColor: C.ink, borderColor: C.ink }, chipText: { fontSize: 12, fontWeight: '900', color: C.ink }, chipTextOn: { color: '#FFF' },
  bidCard: { marginTop: 21, padding: 16, borderRadius: 22, backgroundColor: C.cream, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, bidCopy: { flex: 1 }, bidTitle: { fontSize: 14, fontWeight: '900' }, bidText: { color: C.muted, fontSize: 11, marginTop: 4 },
  primary: { minHeight: 54, borderRadius: 27, backgroundColor: C.pink, marginTop: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, primaryText: { color: '#FFF', fontWeight: '900', fontSize: 14 },
});