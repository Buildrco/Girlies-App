import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { createMarketplaceAnnouncement, createProduct, createStore, deleteProduct, getCurrentProfile, getProducts, getStore, updateProduct, type MediaItem } from '../lib/social';
import { MARKETPLACE_CATEGORIES } from '../constants/categories';

const categories = MARKETPLACE_CATEGORIES.map(category => category.label);
const fulfillmentOptions = ['Local delivery', 'Pickup', 'Ships nationwide'];
const genderOptions = ['All', 'Women only', 'Men only'];
const filterOptions = ['New', 'Handmade', 'Imported', 'Plus size', 'Vegan', 'Giftable'];

export default function ProductEditor() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editingId = Array.isArray(id) ? id[0] : id;
  const [storeId, setStoreId] = useState('');
  const [shopName, setShopName] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [stockStatus, setStockStatus] = useState<'in_stock' | 'out_of_stock'>('in_stock');
  const [fulfillment, setFulfillment] = useState(fulfillmentOptions[0]);
  const [deliveryOptions, setDeliveryOptions] = useState<string[]>([]);
  const [gender, setGender] = useState('all');
  const [filters, setFilters] = useState<string[]>([]);
  const [bidEnabled, setBidEnabled] = useState(false);
  const [bidPrice, setBidPrice] = useState('');
  const [bidEndsAt, setBidEndsAt] = useState('');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const store = await getStore('me');
        if (store) { setStoreId(store.id); setShopName(store.name); }
        else {
          const profile = await getCurrentProfile();
          const created = await createStore({ name: `${profile?.display_name || 'My'} Shop`, description: 'Beauty, fashion and finds for the girls.' });
          setStoreId(created.id); setShopName(created.name);
        }
        if (editingId) {
          const product = (await getProducts(1, { productId: editingId, includeOutOfStock: true }))[0];
          if (!product) throw new Error('This product is no longer available.');
          setName(product.name); setDescription(product.description || ''); setCategory(product.category); setPrice(String(product.price)); setStock(String(product.stock || 0));
          setStockStatus(product.stock_status || (product.stock > 0 ? 'in_stock' : 'out_of_stock')); setFulfillment(product.fulfillment || fulfillmentOptions[0]);
          setExistingImages(product.image_urls || []); setGender(product.gender || 'all');
          setFilters(Object.keys(product.filters || {}).filter(key => Boolean(product.filters?.[key])));
          setDeliveryOptions(product.delivery_options || []);
          const enabled = Boolean(product.attributes?.bid_enabled || product.bid_min_price);
          setBidEnabled(enabled); setBidPrice(String(product.bid_min_price || product.attributes?.bid_price || '')); setBidEndsAt(product.bid_ends_at ? product.bid_ends_at.slice(0, 16).replace('T', ' ') : '');
        }
      } catch (error: any) {
        Alert.alert('Set up your shop first', error?.message || 'Open a shop before adding products.', [{ text: 'Open shop', onPress: () => router.replace('/shop-editor') }, { text: 'Cancel', onPress: () => router.back() }]);
      } finally { setLoading(false); }
    })();
  }, [editingId, router]);

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Permission needed', 'Allow Girlies to access your photos so you can add product images.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: false, allowsEditing: true, quality: 0.9 });
    if (!result.canceled) setMedia(current => [...current, ...result.assets.slice(0, 1).map(asset => ({ uri: asset.uri, type: 'image' as const, name: asset.fileName || 'product.jpg', mimeType: asset.mimeType || 'image/jpeg' }))]);
  }

  const toggle = (value: string, values: string[], setValues: (next: string[]) => void) => setValues(values.includes(value) ? values.filter(item => item !== value) : [...values, value]);

  function confirmDelete() {
    if (!editingId) return;
    Alert.alert('Delete product?', `“${name || 'This product'}” will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { setSaving(true); await deleteProduct(editingId); router.replace('/seller/me'); } catch (error: any) { Alert.alert('Could not delete product', error?.message || 'Please try again.'); } finally { setSaving(false); } } },
    ]);
  }

  async function save() {
    const numericPrice = Number(price.replace(/,/g, ''));
    const numericBid = Number(bidPrice.replace(/,/g, ''));
    if (!name.trim() || !price.trim() || !Number.isFinite(numericPrice)) { Alert.alert('Complete your listing', 'Add a product name and price.'); return; }
    if (bidEnabled && (!bidPrice.trim() || numericBid <= 0)) { Alert.alert('Add a bid price', 'Set the minimum amount you will accept for bids.'); return; }
    try {
      setSaving(true);
      const filterMap = Object.fromEntries(filters.map(item => [item, true]));
      const payload = { name, description, category, price: numericPrice, stock: Number(stock) || 0, stockStatus, fulfillment, bidEnabled, bidPrice: bidEnabled ? numericBid : null, bidEndsAt: bidEnabled && bidEndsAt ? bidEndsAt.replace(' ', 'T') : null, gender, filters: filterMap, deliveryOptions, media };
      const product = editingId
        ? await updateProduct(editingId, { ...payload, existingImageUrls: existingImages })
        : await createProduct({ ...payload, storeId, media });
      if (!editingId) {
        Alert.alert('Product published', `${name} is now live in ${shopName}.`, [
          { text: 'Announce to community', onPress: () => createMarketplaceAnnouncement({ productId: product.id, body: `${name} is now available at ${shopName}.`, imageUrls: product.image_urls, storeName: shopName }).then(() => router.replace('/seller/me')).catch((error: any) => Alert.alert('Could not announce', error?.message || 'The product was published.')) },
          { text: 'Done', onPress: () => router.replace('/seller/me') },
        ]);
      } else {
        Alert.alert('Product updated', `${name} is now live in ${shopName}.`, [{ text: 'Done', onPress: () => router.replace('/seller/me') }]);
      }
    } catch (error: any) { Alert.alert(editingId ? 'Could not update product' : 'Could not publish product', error?.message || 'Please try again.'); } finally { setSaving(false); }
  }
  return <SafeAreaView style={s.safe}><View style={s.flex}>
    <View style={s.top}><Pressable onPress={() => router.back()}><I name="back" size={30} /></Pressable><Text style={s.h}>{editingId ? 'Edit product' : 'Add product'}</Text><Pressable disabled={saving} onPress={save}>{saving ? <ActivityIndicator color={C.pink} /> : <Text style={s.publish}>Save</Text>}</Pressable></View>
    <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={s.mediaPicker}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.mediaRow}>{existingImages.map((uri, index) => <View key={`existing-${uri}-${index}`} style={s.mediaWrap}><Image source={{ uri }} style={s.preview} /><Pressable accessibilityLabel="Remove product image" onPress={() => setExistingImages(current => current.filter((_, imageIndex) => imageIndex !== index))} style={s.removePhoto}><Text style={s.removeText}>×</Text></Pressable></View>)}{media.map((item, index) => <View key={`${item.uri}-${index}`} style={s.mediaWrap}><Image source={{ uri: item.uri }} style={s.preview} /><Pressable accessibilityLabel="Remove selected image" onPress={() => setMedia(current => current.filter((_, mediaIndex) => mediaIndex !== index))} style={s.removePhoto}><Text style={s.removeText}>×</Text></Pressable></View>)}{existingImages.length + media.length < 4 && <Pressable onPress={pickImage} style={s.addPhoto}><I name="plus" size={28} color={C.pink} /><Text style={s.addPhotoText}>Add photo</Text></Pressable>}</ScrollView>{!existingImages.length && !media.length && <Text style={s.mediaText}>Add up to 4 product photos. You can upload one or fill all four.</Text>}</View>
      <Text style={s.label}>Product name</Text><TextInput value={name} onChangeText={setName} placeholder="e.g. Body wave bundles" placeholderTextColor={C.muted} style={s.input} />
      <Text style={s.label}>Description</Text><TextInput value={description} onChangeText={setDescription} multiline placeholder="Tell shoppers what they are getting." placeholderTextColor={C.muted} style={[s.input, s.textarea]} />
      <Text style={s.label}>Category</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{categories.map(item => <Chip key={item} label={item} active={category === item} onPress={() => setCategory(item)} />)}</ScrollView>
      <View style={s.row}><View style={s.half}><Text style={s.label}>Price · GH₵</Text><TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="480" placeholderTextColor={C.muted} style={s.input} /></View><View style={s.half}><Text style={s.label}>Stock</Text><TextInput value={stock} onChangeText={setStock} keyboardType="number-pad" placeholder="1" placeholderTextColor={C.muted} style={s.input} /></View></View>
      <Text style={s.label}>Availability</Text><View style={s.row}><Chip label="In stock" active={stockStatus === 'in_stock'} onPress={() => setStockStatus('in_stock')} /><Chip label="Out of stock" active={stockStatus === 'out_of_stock'} onPress={() => setStockStatus('out_of_stock')} /></View>
      <Text style={s.label}>Audience</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{genderOptions.map(item => <Chip key={item} label={item} active={gender === item.toLowerCase()} onPress={() => setGender(item.toLowerCase())} />)}</ScrollView>
      <Text style={s.label}>Product filters</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{filterOptions.map(item => <Chip key={item} label={item} active={filters.includes(item)} onPress={() => toggle(item, filters, setFilters)} />)}</ScrollView>
      <Text style={s.label}>Delivery options</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{fulfillmentOptions.map(item => <Chip key={item} label={item} active={deliveryOptions.includes(item)} onPress={() => toggle(item, deliveryOptions, setDeliveryOptions)} />)}</ScrollView>
      <View style={s.bidCard}><View style={s.bidCopy}><Text style={s.bidTitle}>Accept manual bids</Text><Text style={s.bidText}>Buyers can enter their preferred price. The highest live bid is shown first.</Text></View><Switch value={bidEnabled} onValueChange={setBidEnabled} trackColor={{ false: C.line, true: C.rose }} thumbColor={bidEnabled ? C.pink : '#FFF'} /></View>
      {bidEnabled && <><Text style={s.label}>Minimum bid · GH₵</Text><TextInput value={bidPrice} onChangeText={setBidPrice} keyboardType="decimal-pad" placeholder="350" placeholderTextColor={C.muted} style={s.input} /><Text style={s.label}>Bid ends · YYYY-MM-DD HH:mm</Text><TextInput value={bidEndsAt} onChangeText={setBidEndsAt} placeholder="2026-09-30 18:00" placeholderTextColor={C.muted} style={s.input} /></>}
      <Pressable style={s.primary} onPress={save} disabled={saving}><Text style={s.primaryText}>{saving ? 'Saving…' : editingId ? 'Save product changes' : 'Publish product'}</Text><I name="arrow" size={19} color="#FFF" /></Pressable>{editingId && <Pressable style={s.dangerButton} onPress={confirmDelete} disabled={saving}><Text style={s.dangerText}>Delete product</Text></Pressable>}
    </ScrollView>
  </View></SafeAreaView>;
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[s.chip, active && s.chipOn]}><Text style={[s.chipText, active && s.chipTextOn]}>{label}</Text></Pressable>; }
const s = StyleSheet.create({ safe:{flex:1,backgroundColor:C.bg},flex:{flex:1},center:{flex:1,alignItems:'center',justifyContent:'center'},top:{height:65,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:C.line},h:{fontSize:20,fontWeight:'900'},publish:{color:C.pink,fontWeight:'900'},scroll:{padding:20,paddingBottom:60},mediaPicker:{minHeight:180,borderRadius:28,backgroundColor:'#FFF',borderWidth:1,borderColor:C.line,borderStyle:'dashed',justifyContent:'center',padding:14,overflow:'hidden'},mediaRow:{alignItems:'center'},mediaWrap:{position:'relative',marginHorizontal:4},removePhoto:{position:'absolute',right:6,top:6,width:28,height:28,borderRadius:14,backgroundColor:'#0009',alignItems:'center',justifyContent:'center'},removeText:{color:'#FFF',fontSize:21,lineHeight:24},addPhoto:{width:130,height:160,borderRadius:18,marginHorizontal:4,backgroundColor:C.cream,alignItems:'center',justifyContent:'center'},addPhotoText:{fontSize:12,fontWeight:'900',color:C.pink,marginTop:5},camera:{width:58,height:58,borderRadius:29,backgroundColor:C.cream,alignItems:'center',justifyContent:'center'},mediaTitle:{fontSize:16,fontWeight:'900',marginTop:10},mediaText:{fontSize:12,color:C.muted,marginTop:4,textAlign:'center'},preview:{width:130,height:160,borderRadius:18,marginHorizontal:4},label:{fontSize:13,fontWeight:'900',marginTop:18,marginBottom:8},input:{minHeight:52,borderRadius:18,backgroundColor:'#FFF',borderWidth:1,borderColor:C.line,padding:15,fontSize:15,color:C.ink},textarea:{minHeight:112,textAlignVertical:'top'},row:{flexDirection:'row',gap:10,alignItems:'center'},half:{flex:1},chip:{paddingHorizontal:15,paddingVertical:11,borderRadius:19,backgroundColor:'#FFF',borderWidth:1,borderColor:C.line,marginRight:8},chipOn:{backgroundColor:C.ink,borderColor:C.ink},chipText:{fontSize:12,fontWeight:'900',color:C.ink},chipTextOn:{color:'#FFF'},bidCard:{marginTop:21,padding:16,borderRadius:22,backgroundColor:C.cream,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},bidCopy:{flex:1},bidTitle:{fontSize:14,fontWeight:'900'},bidText:{color:C.muted,fontSize:12,lineHeight:17,marginTop:4},primary:{minHeight:54,borderRadius:27,backgroundColor:C.pink,marginTop:25,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10},primaryText:{color:'#FFF',fontWeight:'900',fontSize:14},dangerButton:{height:52,borderRadius:26,borderWidth:1,borderColor:C.red,alignItems:'center',justifyContent:'center',marginTop:12},dangerText:{color:C.red,fontWeight:'900',fontSize:14}});