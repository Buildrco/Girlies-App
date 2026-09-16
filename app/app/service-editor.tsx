import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from '../components/Icons';
import { createService } from '../lib/social';

const categories = ['Beauty', 'Hair', 'Fashion', 'Photography', 'Events', 'Consulting'];
const delivery = ['At my location', 'Mobile service', 'Online'];

export default function ServiceEditor() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('60');
  const [deliveryOptions, setDeliveryOptions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const toggle = (item: string) => setDeliveryOptions(current => current.includes(item) ? current.filter(value => value !== item) : [...current, item]);
  async function save() {
    if (!name.trim() || !price.trim()) { Alert.alert('Complete your service', 'Add a service name and price.'); return; }
    try {
      setSaving(true);
      await createService({ name, description, category, price: Number(price), durationMinutes: Number(duration) || 60, deliveryOptions, filters: {} });
      Alert.alert('Service published', `${name} is now visible on your profile and in Shop.`, [{ text: 'Done', onPress: () => router.replace('/seller/me') }]);
    } catch (error: any) { Alert.alert('Could not publish service', error?.message || 'Please try again.'); } finally { setSaving(false); }
  }
  return <SafeAreaView style={s.safe}><View style={s.flex}><View style={s.top}><Pressable onPress={() => router.back()}><I name="back" size={30} /></Pressable><Text style={s.title}>Add service</Text><Pressable onPress={save} disabled={saving}><Text style={s.save}>{saving ? 'Saving…' : 'Save'}</Text></Pressable></View><ScrollView contentContainerStyle={s.scroll}>
    <Field label="Service name" value={name} onChangeText={setName} placeholder="e.g. Soft glam makeup" /><Field label="Description" value={description} onChangeText={setDescription} placeholder="Tell clients what is included" multiline />
    <Text style={s.label}>Category</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{categories.map(item => <Chip key={item} label={item} active={category === item} onPress={() => setCategory(item)} />)}</ScrollView>
    <View style={s.row}><View style={s.half}><Field label="Price · GH₵" value={price} onChangeText={setPrice} placeholder="250" keyboardType="decimal-pad" /></View><View style={s.half}><Field label="Duration · minutes" value={duration} onChangeText={setDuration} placeholder="60" keyboardType="number-pad" /></View></View>
    <Text style={s.label}>How clients can book</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{delivery.map(item => <Chip key={item} label={item} active={deliveryOptions.includes(item)} onPress={() => toggle(item)} />)}</ScrollView>
    <Pressable style={s.primary} onPress={save}><Text style={s.primaryText}>Publish service</Text><I name="arrow" size={18} color="#FFF" /></Pressable>
  </ScrollView></View></SafeAreaView>;
}
function Field({ label, value, onChangeText, placeholder, multiline = false, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; multiline?: boolean; keyboardType?: 'decimal-pad' | 'number-pad' }) { return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={C.muted} multiline={multiline} keyboardType={keyboardType} style={[s.input, multiline && s.textarea]} /></View>; }
function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[s.chip, active && s.chipOn]}><Text style={[s.chipText, active && s.chipTextOn]}>{label}</Text></Pressable>; }
const s=StyleSheet.create({safe:{flex:1,backgroundColor:C.bg},flex:{flex:1},top:{height:65,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:C.line},title:{fontSize:20,fontWeight:'900'},save:{color:C.pink,fontWeight:'900'},scroll:{padding:20,paddingBottom:60},field:{marginTop:18},label:{fontSize:13,fontWeight:'900',marginBottom:8},input:{minHeight:52,borderRadius:18,backgroundColor:'#FFF',borderWidth:1,borderColor:C.line,padding:15,fontSize:15,color:C.ink},textarea:{minHeight:110,textAlignVertical:'top'},row:{flexDirection:'row',gap:10},half:{flex:1},chip:{paddingHorizontal:15,paddingVertical:11,borderRadius:19,backgroundColor:'#FFF',borderWidth:1,borderColor:C.line,marginRight:8},chipOn:{backgroundColor:C.ink,borderColor:C.ink},chipText:{fontSize:12,fontWeight:'900'},chipTextOn:{color:'#FFF'},primary:{height:54,borderRadius:27,backgroundColor:C.pink,marginTop:28,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:9},primaryText:{color:'#FFF',fontWeight:'900',fontSize:14}});