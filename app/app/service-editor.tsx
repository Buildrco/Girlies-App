import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { createMarketplaceAnnouncement, createService, deleteService, getService, updateService, type MediaItem } from '../lib/social';
import { MARKETPLACE_CATEGORIES } from '../constants/categories';

const categories = MARKETPLACE_CATEGORIES.find(category => category.slug === 'services')?.subcategories || ['Beauty services', 'Photography', 'Delivery'];
const delivery = ['At my location', 'Mobile service', 'Online'];

export default function ServiceEditor() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editingId = Array.isArray(id) ? id[0] : id;
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(Boolean(editingId));
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('60');
  const [deliveryOptions, setDeliveryOptions] = useState<string[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (!editingId) return; let active = true; getService(editingId).then(service => { if (!active || !service) return; setName(service.name); setDescription(service.description || ''); setCategory(service.category || categories[0]); setPrice(String(service.price || '')); setDuration(String(service.duration_minutes || 60)); setDeliveryOptions(service.delivery_options || []); setExistingImages(service.image_urls || []); }).catch(error => Alert.alert('Could not load service', error?.message || 'Please try again.')).finally(() => active && setLoading(false)); return () => { active = false; }; }, [editingId]);
  const toggle = (item: string) => setDeliveryOptions(current => current.includes(item) ? current.filter(value => value !== item) : [...current, item]);
  async function pickImages() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Permission needed', 'Allow Girlies to access your photos so you can add service images.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: false, allowsEditing: true, quality: 0.9 });
    if (!result.canceled) setMedia(current => [...current, ...result.assets.slice(0, 1).map(asset => ({ uri: asset.uri, type: 'image' as const, name: asset.fileName || 'service.jpg', mimeType: asset.mimeType || 'image/jpeg' }))].slice(0, 4));
  }
  function confirmDelete() { if (!editingId) return; Alert.alert('Delete service?', `“${name || 'This service'}” will be permanently removed.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { try { setSaving(true); await deleteService(editingId); router.replace('/seller/me'); } catch (error: any) { Alert.alert('Could not delete service', error?.message || 'Please try again.'); } finally { setSaving(false); } } }]); }
  async function save() {
    if (!name.trim() || !price.trim()) { Alert.alert('Complete your service', 'Add a service name and price.'); return; }
    try {
      setSaving(true);
      const service = editingId ? await updateService(editingId, { name, description, category, price: Number(price), durationMinutes: Number(duration) || 60, deliveryOptions, filters: {}, media, existingImageUrls: existingImages }) : await createService({ name, description, category, price: Number(price), durationMinutes: Number(duration) || 60, deliveryOptions, filters: {}, media });
      if (editingId) { Alert.alert('Service updated', `${name} is now visible on your profile and in Shop.`, [{ text: 'Done', onPress: () => router.replace('/seller/me') }]); return; }
      Alert.alert('Service published', `${name} is now visible on your profile and in Shop.`, [
        { text: 'Announce to community', onPress: () => createMarketplaceAnnouncement({ serviceId: service.id, body: `${name} is now available from ${service.category.toLowerCase()} seller ${name}.`, imageUrls: service.image_urls, storeName: name }).then(() => router.replace('/seller/me')).catch((error: any) => Alert.alert('Could not announce', error?.message || 'The service was published.')) },
        { text: 'Done', onPress: () => router.replace('/seller/me') },
      ]);
    } catch (error: any) { Alert.alert('Could not publish service', error?.message || 'Please try again.'); } finally { setSaving(false); }
  }
  if (loading) return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator color={C.pink} /></View></SafeAreaView>;
  return <SafeAreaView style={s.safe}><View style={s.flex}><View style={s.top}><Pressable onPress={() => router.back()}><I name="back" size={30} /></Pressable><Text style={s.title}>{editingId ? 'Edit service' : 'Add service'}</Text><Pressable onPress={save} disabled={saving}><Text style={s.save}>{saving ? 'Saving…' : 'Save'}</Text></Pressable></View><ScrollView contentContainerStyle={s.scroll}>
    <Text style={s.label}>Service photos</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.mediaRow}>{existingImages.map((uri, index) => <View key={`existing-${uri}-${index}`} style={s.mediaWrap}><Image source={{ uri }} style={s.preview} /><Pressable onPress={() => setExistingImages(current => current.filter((_, imageIndex) => imageIndex !== index))} style={s.remove}><Text style={s.removeText}>×</Text></Pressable></View>)}{media.map((item, index) => <View key={`${item.uri}-${index}`} style={s.mediaWrap}><Image source={{ uri: item.uri }} style={s.preview} /><Pressable onPress={() => setMedia(current => current.filter((_, itemIndex) => itemIndex !== index))} style={s.remove}><Text style={s.removeText}>×</Text></Pressable></View>)}{existingImages.length + media.length < 4 && <Pressable onPress={pickImages} style={s.addPhoto}><I name="plus" size={25} color={C.pink} /><Text style={s.addText}>Add photo</Text></Pressable>}</ScrollView>
    <Field label="Service name" value={name} onChangeText={setName} placeholder="e.g. Soft glam makeup" /><Field label="Description" value={description} onChangeText={setDescription} placeholder="Tell clients what is included" multiline />
    <Text style={s.label}>Category</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{categories.map(item => <Chip key={item} label={item} active={category === item} onPress={() => setCategory(item)} />)}</ScrollView>
    <View style={s.row}><View style={s.half}><Field label="Price · GH₵" value={price} onChangeText={setPrice} placeholder="250" keyboardType="decimal-pad" /></View><View style={s.half}><Field label="Duration · minutes" value={duration} onChangeText={setDuration} placeholder="60" keyboardType="number-pad" /></View></View>
    <Text style={s.label}>How clients can book</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{delivery.map(item => <Chip key={item} label={item} active={deliveryOptions.includes(item)} onPress={() => toggle(item)} />)}</ScrollView>
    <Pressable style={s.primary} onPress={save}><Text style={s.primaryText}>{editingId ? 'Save service changes' : 'Publish service'}</Text><I name="arrow" size={18} color="#FFF" /></Pressable>{editingId && <Pressable style={s.dangerButton} onPress={confirmDelete} disabled={saving}><Text style={s.dangerText}>Delete service</Text></Pressable>}
  </ScrollView></View></SafeAreaView>;
}
function Field({ label, value, onChangeText, placeholder, multiline = false, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; multiline?: boolean; keyboardType?: 'decimal-pad' | 'number-pad' }) { return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={C.muted} multiline={multiline} keyboardType={keyboardType} style={[s.input, multiline && s.textarea]} /></View>; }
function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[s.chip, active && s.chipOn]}><Text style={[s.chipText, active && s.chipTextOn]}>{label}</Text></Pressable>; }
const s=StyleSheet.create({safe:{flex:1,backgroundColor:C.bg},flex:{flex:1},top:{height:65,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:C.line},title:{fontSize:20,fontWeight:'900'},save:{color:C.pink,fontWeight:'900'},scroll:{padding:20,paddingBottom:60},field:{marginTop:18},label:{fontSize:13,fontWeight:'900',marginBottom:8},mediaRow:{alignItems:'center',paddingBottom:4},mediaWrap:{marginRight:8,position:'relative'},preview:{width:125,height:145,borderRadius:18},addPhoto:{width:125,height:145,borderRadius:18,backgroundColor:C.cream,alignItems:'center',justifyContent:'center',marginRight:8},addText:{fontSize:12,fontWeight:'900',color:C.pink,marginTop:5},remove:{position:'absolute',right:7,top:7,width:27,height:27,borderRadius:14,backgroundColor:'#0009',alignItems:'center',justifyContent:'center'},removeText:{color:'#FFF',fontSize:21,lineHeight:24},input:{minHeight:52,borderRadius:18,backgroundColor:'#FFF',borderWidth:1,borderColor:C.line,padding:15,fontSize:15,color:C.ink},textarea:{minHeight:110,textAlignVertical:'top'},row:{flexDirection:'row',gap:10},half:{flex:1},chip:{paddingHorizontal:15,paddingVertical:11,borderRadius:19,backgroundColor:'#FFF',borderWidth:1,borderColor:C.line,marginRight:8},chipOn:{backgroundColor:C.ink,borderColor:C.ink},chipText:{fontSize:12,fontWeight:'900'},chipTextOn:{color:'#FFF'},primary:{height:54,borderRadius:27,backgroundColor:C.pink,marginTop:28,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:9},primaryText:{color:'#FFF',fontWeight:'900',fontSize:14},dangerButton:{height:52,borderRadius:26,borderWidth:1,borderColor:C.red,alignItems:'center',justifyContent:'center',marginTop:12},dangerText:{color:C.red,fontWeight:'900',fontSize:14},center:{flex:1,alignItems:'center',justifyContent:'center'}});