import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { Avatar } from '../Avatar';
import { I } from '../components/Icons';
import { getAreas, getCities, getCountries, getCurrentProfile, getSessionUser, updateCurrentProfile, uploadMedia, type CountryOption, type MediaItem } from '../lib/social';

export default function EditProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('');
  const [area, setArea] = useState('');
  const [town, setTown] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [links, setLinks] = useState('');
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [towns, setTowns] = useState<string[]>([]);
  const [picker, setPicker] = useState<'country' | 'area' | 'town' | null>(null);
  const [areasLoading, setAreasLoading] = useState(false);

  useEffect(() => {
    let active = true;
    getCurrentProfile().then(profile => {
      if (!active || !profile) return;
      setAvatar(profile.avatar_url || ''); setDisplayName(profile.display_name || ''); setHandle(profile.handle || '');
      setBio(profile.bio || ''); setCountry(profile.country || ''); setArea(profile.area || ''); setTown(profile.location || '');
      setDateOfBirth(profile.date_of_birth || ''); setLinks((profile.links || []).join('\n'));
    }).catch(error => active && Alert.alert('Could not load profile', error?.message || 'Please try again.')).finally(() => active && setLoading(false));
    getCountries().then(setCountries).catch(() => setCountries([{ name: 'Ghana', iso2: 'GH' }]));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!country) { setAreas([]); return; }
    let active = true; setAreasLoading(true);
    getAreas(country).then(value => active && setAreas(value)).catch(() => active && setAreas([])).finally(() => active && setAreasLoading(false));
    return () => { active = false; };
  }, [country]);

  useEffect(() => {
    if (!country || !area) { setTowns([]); return; }
    let active = true; getCities(country, area).then(value => active && setTowns(value)).catch(() => active && setTowns([]));
    return () => { active = false; };
  }, [country, area]);

  async function chooseAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Permission needed', 'Allow Girlies to access your photos so you can choose a profile photo.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
    if (!result.canceled) setAvatar(result.assets[0]?.uri || '');
  }

  async function save() {
    const normalizedHandle = handle.trim().replace(/^@+/, '').toLowerCase();
    if (!displayName.trim()) { Alert.alert('Add your name', 'Your profile needs a display name.'); return; }
    if (!/^[a-z0-9._-]{3,30}$/.test(normalizedHandle)) { Alert.alert('Choose a username', 'Use 3–30 letters, numbers, dots, underscores or hyphens.'); return; }
    try {
      setSaving(true); let avatarUrl = avatar;
      if (avatar && !avatar.startsWith('http')) {
        const user = await getSessionUser(); if (!user) throw new Error('Please sign in again.');
        const media: MediaItem = { uri: avatar, type: 'image', name: 'avatar.jpg', mimeType: 'image/jpeg' };
        avatarUrl = (await uploadMedia(user.id, media, 'avatars')).url;
      }
      await updateCurrentProfile({ display_name: displayName, handle: normalizedHandle, bio, country, area, location: town, date_of_birth: dateOfBirth.trim() || null, links: links.split(/\n|,/).map(link => link.trim()).filter(Boolean).slice(0, 5), avatar_url: avatarUrl || null });
      router.back();
    } catch (error: any) { Alert.alert('Could not save profile', error?.message || 'Please try again.'); } finally { setSaving(false); }
  }

  function updateLocationText(kind: 'country' | 'area' | 'town', value: string) {
    if (kind === 'country') { setCountry(value); setArea(''); setTown(''); }
    if (kind === 'area') { setArea(value); setTown(''); }
    if (kind === 'town') setTown(value);
    setPicker(value.trim() ? kind : null);
  }
  function select(value: string) {
    if (picker === 'country') { setCountry(value); setArea(''); setTown(''); }
    if (picker === 'area') { setArea(value); setTown(''); }
    if (picker === 'town') setTown(value);
    setPicker(null);
  }

  if (loading) return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator color={C.pink} /></View></SafeAreaView>;
  return <SafeAreaView style={s.safe}><KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={s.top}><Pressable onPress={() => router.back()}><I name="back" size={30} /></Pressable><Text style={s.title}>Edit profile</Text><Pressable disabled={saving} onPress={save}>{saving ? <ActivityIndicator color={C.pink} /> : <Text style={s.save}>Save</Text>}</Pressable></View>
    <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
      <Pressable onPress={chooseAvatar} style={s.avatarButton}>{avatar ? <Image source={{ uri: avatar }} style={s.avatar} /> : <Avatar size={92} />}<View style={s.camera}><I name="camera" size={17} color="#FFF" filled /></View></Pressable>
      <Text style={s.helper}>Tap your photo to change it</Text>
      <Field label="Name" value={displayName} onChangeText={setDisplayName} placeholder="Your name" />
      <Field label="Username" value={handle} onChangeText={setHandle} placeholder="your_username" autoCapitalize="none" />
      <Field label="Bio" value={bio} onChangeText={setBio} placeholder="Tell the girls a little about you" multiline />
      <View style={s.row}><View style={s.half}><LocationField label="Country" value={country} placeholder="Type a country" onChangeText={value => updateLocationText('country', value)} /><SuggestionList visible={picker === 'country'} query={country} options={countries.map(item => item.name)} onSelect={select} /></View><View style={s.half}><LocationField label="Area" value={area} placeholder={country ? 'Type an area' : 'Choose country first'} disabled={!country || areasLoading} onChangeText={value => updateLocationText('area', value)} /><SuggestionList visible={picker === 'area'} query={area} options={areas} onSelect={select} loading={areasLoading} /></View></View>
      <LocationField label="Town / city" value={town} placeholder={area ? 'Type a town or city' : 'Choose area first'} disabled={!area} onChangeText={value => updateLocationText('town', value)} /><SuggestionList visible={picker === 'town'} query={town} options={towns} onSelect={select} />
      <Field label="Date of birth" value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="YYYY-MM-DD" autoCapitalize="none" />
      <Field label="Links" value={links} onChangeText={setLinks} placeholder="One link per line" multiline />
      <Text style={s.note}>Your links appear on your public profile. Your date of birth stays private.</Text>
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}

function SuggestionList({ visible, query, options, onSelect, loading = false }: { visible: boolean; query: string; options: string[]; onSelect: (value: string) => void; loading?: boolean }) {
  if (!visible) return null;
  const filtered = options.filter(item => item.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8);
  return <View style={s.suggestions}>{loading ? <ActivityIndicator color={C.pink} style={{ padding: 12 }} /> : filtered.map(item => <Pressable key={item} onPress={() => onSelect(item)} style={s.suggestion}><Text style={s.suggestionText}>{item}</Text></Pressable>)}{!loading && !filtered.length ? <Text style={s.noSuggestions}>No matches</Text> : null}</View>;
}
function Field({ label, value, onChangeText, placeholder, multiline = false, autoCapitalize = 'sentences' }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; multiline?: boolean; autoCapitalize?: 'none' | 'sentences' }) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={C.muted} multiline={multiline} autoCapitalize={autoCapitalize} style={[s.input, multiline && s.textarea]} /> </View>;
}
function LocationField({ label, value, placeholder, onChangeText, disabled = false }: { label: string; value: string; placeholder: string; onChangeText: (value: string) => void; disabled?: boolean }) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><View style={[s.inputRow, disabled && s.selectorDisabled]}><TextInput value={value} editable={!disabled} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={C.muted} style={s.locationInput} autoCapitalize="words" /></View></View>;
}
const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:C.bg},flex:{flex:1},center:{flex:1,alignItems:'center',justifyContent:'center'},top:{height:65,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:C.line},title:{fontSize:20,fontWeight:'900'},save:{color:C.pink,fontSize:14,fontWeight:'900'},scroll:{padding:20,paddingBottom:50},avatarButton:{alignSelf:'center',position:'relative',marginTop:5},avatar:{width:92,height:92,borderRadius:46},camera:{position:'absolute',right:0,bottom:0,width:30,height:30,borderRadius:15,backgroundColor:C.pink,alignItems:'center',justifyContent:'center',borderWidth:3,borderColor:C.bg},helper:{textAlign:'center',color:C.muted,fontSize:12,marginTop:9},field:{marginTop:18},label:{fontSize:13,fontWeight:'900',marginBottom:7},input:{minHeight:52,borderRadius:18,backgroundColor:'#FFF',paddingHorizontal:16,paddingVertical:14,borderWidth:1,borderColor:C.line,fontSize:15,color:C.ink},textarea:{minHeight:100,textAlignVertical:'top'},row:{flexDirection:'row',gap:10},half:{flex:1},note:{fontSize:12,lineHeight:17,color:C.muted,marginTop:18},inputRow:{minHeight:52,borderRadius:18,backgroundColor:'#FFF',borderWidth:1,borderColor:C.line,flexDirection:'row',alignItems:'center'},locationInput:{flex:1,minHeight:52,paddingHorizontal:14,fontSize:14,color:C.ink},selectorDisabled:{opacity:.55},suggestions:{marginTop:5,borderRadius:16,backgroundColor:'#FFF',borderWidth:1,borderColor:C.line,overflow:'hidden',maxHeight:210},suggestion:{paddingHorizontal:14,paddingVertical:12,borderBottomWidth:1,borderBottomColor:C.line},suggestionText:{fontSize:13,fontWeight:'700'},noSuggestions:{padding:12,color:C.muted,fontSize:12}
});
