import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { Avatar } from '../Avatar';
import { I } from '../components/Icons';
import { getAreas, getCities, getCountries, getCurrentProfile, getSessionUser, updateCurrentProfile, uploadMedia, type CountryOption, type MediaItem } from '../lib/social';
import { MotionPressable } from '../components/MotionPressable';

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
  const [query, setQuery] = useState('');
  const [areasLoading, setAreasLoading] = useState(false);
  const sheetY = useRef(new Animated.Value(0)).current;
  const sheetResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderMove: (_, gesture) => sheetY.setValue(Math.max(-90, gesture.dy)),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy > 120 || gesture.vy > 1.2) {
        Animated.timing(sheetY, { toValue: 520, duration: 180, useNativeDriver: true }).start(() => setPicker(null));
      } else Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 260 }).start();
    },
  })).current;

  useEffect(() => {
    let active = true;
    getCurrentProfile().then(profile => {
      if (!active || !profile) return;
      setAvatar(profile.avatar_url || '');
      setDisplayName(profile.display_name || '');
      setHandle(profile.handle || '');
      setBio(profile.bio || '');
      setCountry(profile.country || '');
      setArea(profile.area || '');
      setTown(profile.location || '');
      setDateOfBirth(profile.date_of_birth || '');
      setLinks((profile.links || []).join('\n'));
    }).catch(error => active && Alert.alert('Could not load profile', error?.message || 'Please try again.')).finally(() => active && setLoading(false));
    getCountries().then(setCountries).catch(() => setCountries([{ name: 'Ghana', iso2: 'GH' }]));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!country) { setAreas([]); return; }
    let active = true;
    setAreasLoading(true);
    getAreas(country).then(value => active && setAreas(value)).catch(() => active && setAreas([])).finally(() => active && setAreasLoading(false));
    return () => { active = false; };
  }, [country]);

  useEffect(() => {
    if (!country || !area) { setTowns([]); return; }
    let active = true;
    getCities(country, area).then(value => active && setTowns(value)).catch(() => active && setTowns([]));
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
      setSaving(true);
      let avatarUrl = avatar;
      if (avatar && !avatar.startsWith('http')) {
        const user = await getSessionUser();
        if (!user) throw new Error('Please sign in again.');
        const media: MediaItem = { uri: avatar, type: 'image', name: 'avatar.jpg', mimeType: 'image/jpeg' };
        avatarUrl = (await uploadMedia(user.id, media, 'avatars')).url;
      }
      await updateCurrentProfile({ display_name: displayName, handle: normalizedHandle, bio, country, area, location: town, date_of_birth: dateOfBirth.trim() || null, links: links.split(/\n|,/).map(link => link.trim()).filter(Boolean).slice(0, 5), avatar_url: avatarUrl || null });
      router.back();
    } catch (error: any) { Alert.alert('Could not save profile', error?.message || 'Please try again.'); } finally { setSaving(false); }
  }

  const items = picker === 'country' ? countries.map(item => item.name) : picker === 'area' ? areas : towns;
  const title = picker === 'country' ? 'Choose a country' : picker === 'area' ? `Choose an area in ${country}` : `Choose a town or city in ${area}`;
  const select = (value: string) => {
    if (picker === 'country') { setCountry(value); setArea(''); setTown(''); }
    if (picker === 'area') { setArea(value); setTown(''); }
    if (picker === 'town') setTown(value);
    Animated.timing(sheetY, { toValue: 520, duration: 160, useNativeDriver: true }).start(() => {
      sheetY.setValue(0);
      setPicker(null);
    });
  };
  const closePicker = () => Animated.timing(sheetY, { toValue: 520, duration: 160, useNativeDriver: true }).start(() => {
    sheetY.setValue(0);
    setPicker(null);
  });

  if (loading) return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator color={C.pink} /></View></SafeAreaView>;
  return <SafeAreaView style={s.safe}><KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={s.top}><Pressable onPress={() => router.back()}><I name="back" size={30} /></Pressable><Text style={s.title}>Edit profile</Text><Pressable disabled={saving} onPress={save}>{saving ? <ActivityIndicator color={C.pink} /> : <Text style={s.save}>Save</Text>}</Pressable></View>
    <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
      <Pressable onPress={chooseAvatar} style={s.avatarButton}>{avatar ? <Image source={{ uri: avatar }} style={s.avatar} /> : <Avatar size={92} />}<View style={s.camera}><I name="camera" size={17} color="#FFF" filled /></View></Pressable>
      <Text style={s.helper}>Tap your photo to change it</Text>
      <Field label="Name" value={displayName} onChangeText={setDisplayName} placeholder="Your name" />
      <Field label="Username" value={handle} onChangeText={setHandle} placeholder="your_username" autoCapitalize="none" />
      <Field label="Bio" value={bio} onChangeText={setBio} placeholder="Tell the girls a little about you" multiline />
      <View style={s.row}><View style={s.half}><Selector label="Country" value={country} placeholder="Select country" onPress={() => { sheetY.setValue(0); setQuery(''); setPicker('country'); }} onClear={() => { setCountry(''); setArea(''); setTown(''); }} /></View><View style={s.half}><Selector label="Area" value={area} placeholder={country ? 'Select area' : 'Choose country first'} disabled={!country || areasLoading} onPress={() => { sheetY.setValue(0); setQuery(''); setPicker('area'); }} onClear={() => { setArea(''); setTown(''); }} /></View></View>
      <Selector label="Town / city" value={town} placeholder={area ? 'Select town or city' : 'Choose area first'} disabled={!area} onPress={() => { sheetY.setValue(0); setQuery(''); setPicker('town'); }} onClear={() => setTown('')} />
      <Field label="Date of birth" value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="YYYY-MM-DD" autoCapitalize="none" />
      <Field label="Links" value={links} onChangeText={setLinks} placeholder="One link per line" multiline />
      <Text style={s.note}>Your links appear on your public profile. Your date of birth stays private.</Text>
    </ScrollView>
  </KeyboardAvoidingView>
  <Modal visible={Boolean(picker)} transparent animationType="none" onRequestClose={closePicker}>
     <View style={s.modalBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={closePicker} /><Animated.View {...sheetResponder.panHandlers} style={[s.sheet, { transform: [{ translateY: sheetY }] }]}><View style={s.sheetHandle} /><View style={s.sheetTop}><Text style={s.sheetTitle}>{title}</Text><Pressable onPress={closePicker}><I name="back" size={24} /></Pressable></View><TextInput autoFocus value={query} onChangeText={setQuery} placeholder={picker === 'area' ? 'Type an area, e.g. Awoshie' : 'Search'} placeholderTextColor={C.muted} style={s.searchInput} />{picker === 'area' && areasLoading && country.trim().toLowerCase() !== 'ghana' ? <ActivityIndicator color={C.pink} style={{ margin: 24 }} /> : <ScrollView keyboardShouldPersistTaps="handled" style={s.options}>{items.filter(item => item.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 100).map(item => <MotionPressable key={item} onPress={() => select(item)} style={s.option}><Text style={s.optionText}>{item}</Text></MotionPressable>)}</ScrollView>}</Animated.View>
     </View>
  </Modal>
  </SafeAreaView>;
}

function Field({ label, value, onChangeText, placeholder, multiline = false, autoCapitalize = 'sentences' }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; multiline?: boolean; autoCapitalize?: 'none' | 'sentences' }) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={C.muted} multiline={multiline} autoCapitalize={autoCapitalize} style={[s.input, multiline && s.textarea]} /></View>;
}

function Selector({ label, value, placeholder, onPress, onClear, disabled = false }: { label: string; value: string; placeholder: string; onPress: () => void; onClear?: () => void; disabled?: boolean }) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><View style={s.selectorRow}><MotionPressable disabled={disabled} onPress={onPress} style={[s.selector, s.selectorFlex, disabled && s.selectorDisabled]}><Text style={[s.selectorText, !value && s.placeholder]} numberOfLines={1}>{value || placeholder}</Text></MotionPressable>{value && onClear ? <Pressable accessibilityLabel={`Clear ${label}`} onPress={onClear} style={s.clear}><Text style={s.clearText}>×</Text></Pressable> : null}</View></View>;
}

const s = StyleSheet.create({
   safe:{flex:1,backgroundColor:C.bg},flex:{flex:1},center:{flex:1,alignItems:'center',justifyContent:'center'},top:{height:65,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:C.line},title:{fontSize:20,fontWeight:'900'},save:{color:C.pink,fontSize:14,fontWeight:'900'},scroll:{padding:20,paddingBottom:50},avatarButton:{alignSelf:'center',position:'relative',marginTop:5},avatar:{width:92,height:92,borderRadius:46},camera:{position:'absolute',right:0,bottom:0,width:30,height:30,borderRadius:15,backgroundColor:C.pink,alignItems:'center',justifyContent:'center',borderWidth:3,borderColor:C.bg},helper:{textAlign:'center',color:C.muted,fontSize:12,marginTop:9},field:{marginTop:18},label:{fontSize:13,fontWeight:'900',marginBottom:7},input:{minHeight:52,borderRadius:18,backgroundColor:'#FFF',paddingHorizontal:16,paddingVertical:14,borderWidth:1,borderColor:C.line,fontSize:15,color:C.ink},textarea:{minHeight:100,textAlignVertical:'top'},row:{flexDirection:'row',gap:10},half:{flex:1},note:{fontSize:12,lineHeight:17,color:C.muted,marginTop:18},selectorRow:{flexDirection:'row',alignItems:'center',gap:7},selectorFlex:{flex:1},selector:{minHeight:52,borderRadius:18,backgroundColor:'#FFF',paddingHorizontal:14,borderWidth:1,borderColor:C.line,justifyContent:'center'},clear:{width:34,height:34,borderRadius:17,backgroundColor:C.rose,alignItems:'center',justifyContent:'center'},clearText:{fontSize:24,lineHeight:26,color:C.pink},selectorDisabled:{opacity:.55},selectorText:{fontSize:14,color:C.ink,fontWeight:'700'},placeholder:{color:C.muted,fontWeight:'500'},modalBackdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(23,19,24,.32)'},sheet:{maxHeight:'82%',backgroundColor:C.bg,borderTopLeftRadius:30,borderTopRightRadius:30,padding:18},sheetHandle:{alignSelf:'center',width:42,height:5,borderRadius:3,backgroundColor:C.line,marginBottom:12},sheetTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},sheetTitle:{fontSize:20,fontWeight:'900'},searchInput:{marginTop:14,minHeight:50,borderRadius:18,backgroundColor:'#FFF',borderWidth:1,borderColor:C.line,paddingHorizontal:15,fontSize:15},options:{marginTop:10},option:{minHeight:50,paddingHorizontal:12,borderBottomWidth:1,borderBottomColor:C.line,justifyContent:'center'},optionText:{fontSize:14,fontWeight:'700'}
});