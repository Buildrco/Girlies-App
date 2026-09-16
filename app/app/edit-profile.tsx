import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { Avatar } from '../Avatar';
import { I } from '../components/Icons';
import { getAreas, getCountries, getCurrentProfile, getSessionUser, updateCurrentProfile, uploadMedia, type CountryOption, type MediaItem } from '../lib/social';
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
  const [location, setLocation] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [links, setLinks] = useState('');
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [areaPickerOpen, setAreaPickerOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const [areaQuery, setAreaQuery] = useState('');
  const [areasLoading, setAreasLoading] = useState(false);

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
      setLocation(profile.location || '');
      setDateOfBirth(profile.date_of_birth || '');
      setLinks((profile.links || []).join('\n'));
    }).catch(error => {
      if (active) Alert.alert('Could not load profile', error?.message || 'Please try again.');
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    getCountries().then(setCountries).catch(() => setCountries([]));
  }, []);

  useEffect(() => {
    if (!country) {
      setAreas([]);
      return;
    }
    let active = true;
    setAreasLoading(true);
    getAreas(country).then(nextAreas => active && setAreas(nextAreas)).catch(() => active && setAreas([])).finally(() => active && setAreasLoading(false));
    return () => { active = false; };
  }, [country]);

  async function chooseAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow Girlies to access your photos so you can choose a profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
    if (!result.canceled) setAvatar(result.assets[0]?.uri || '');
  }

  async function save() {
    if (!displayName.trim()) {
      Alert.alert('Add your name', 'Your profile needs a display name.');
      return;
    }
    const normalizedHandle = handle.trim().replace(/^@+/, '').toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(normalizedHandle)) {
      Alert.alert('Choose a username', 'Use 3–30 letters, numbers, dots, underscores or hyphens.');
      return;
    }
    try {
      setSaving(true);
      let avatarUrl = avatar;
      if (avatar && !avatar.startsWith('http')) {
        const user = await getSessionUser();
        if (!user) throw new Error('Please sign in again.');
        const media: MediaItem = { uri: avatar, type: 'image', name: 'avatar.jpg', mimeType: 'image/jpeg' };
        avatarUrl = (await uploadMedia(user.id, media, 'avatars')).url;
      }
      await updateCurrentProfile({
        display_name: displayName,
        handle: normalizedHandle,
        bio,
        country,
        area,
        location,
        date_of_birth: dateOfBirth.trim() || null,
        links: links.split(/\n|,/).map(link => link.trim()).filter(Boolean).slice(0, 5),
        avatar_url: avatarUrl || null,
      });
      router.back();
    } catch (error: any) {
      Alert.alert('Could not save profile', error?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator color={C.pink} /></View></SafeAreaView>;
  return <SafeAreaView style={s.safe}>
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.top}>
        <Pressable onPress={() => router.back()} style={s.icon}><I name="back" size={30} /></Pressable>
        <Text style={s.title}>Edit profile</Text>
        <Pressable disabled={saving} onPress={save}>{saving ? <ActivityIndicator color={C.pink} /> : <Text style={s.save}>Save</Text>}</Pressable>
      </View>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable onPress={chooseAvatar} style={s.avatarButton}>
          {avatar ? <Image source={{ uri: avatar }} style={s.avatar} /> : <Avatar size={92} />}
          <View style={s.camera}><I name="camera" size={17} color="#FFF" filled /></View>
        </Pressable>
        <Text style={s.helper}>Tap your photo to change it</Text>
        <Field label="Name" value={displayName} onChangeText={setDisplayName} placeholder="Your name" />
        <Field label="Username" value={handle} onChangeText={setHandle} placeholder="your_username" autoCapitalize="none" />
        <Field label="Bio" value={bio} onChangeText={setBio} placeholder="Tell the girls a little about you" multiline />
        <View style={s.row}>
          <View style={s.half}><Selector label="Country" value={country} placeholder="Select country" onPress={() => { setCountryQuery(''); setCountryPickerOpen(true); }} /></View>
          <View style={s.half}><Selector label="Area" value={area} placeholder={country ? 'Select area' : 'Choose country first'} disabled={!country || areasLoading} onPress={() => { setAreaQuery(''); setAreaPickerOpen(true); }} /></View>
        </View>
        <Field label="Location" value={location} onChangeText={setLocation} onEndEditing={async () => {
          if (!location.trim()) return;
          try {
            const [place] = await Location.geocodeAsync(location.trim());
            if (place?.country) setCountry(place.country);
            if (place?.region || place?.subregion || place?.city) setArea(place.region || place.subregion || place.city || '');
          } catch { /* Keep the user's typed location when geocoding is unavailable. */ }
        }} placeholder="Street, neighbourhood or city" />
        <Field label="Date of birth" value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="YYYY-MM-DD" autoCapitalize="none" />
        <Field label="Links" value={links} onChangeText={setLinks} placeholder="One link per line" multiline />
        <Text style={s.note}>Your links will appear on your public profile. Your date of birth is kept for account features and is not shown publicly.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
    <PickerModal visible={countryPickerOpen} title="Choose a country" query={countryQuery} onQueryChange={setCountryQuery} items={countries.map(item => item.name)} onClose={() => setCountryPickerOpen(false)} onSelect={value => { setCountry(value); setArea(''); setCountryPickerOpen(false); }} />
    <PickerModal visible={areaPickerOpen} title={`Choose an area in ${country}`} query={areaQuery} onQueryChange={setAreaQuery} items={areas} loading={areasLoading} onClose={() => setAreaPickerOpen(false)} onSelect={value => { setArea(value); setAreaPickerOpen(false); }} />
  </SafeAreaView>;
}

function Field({ label, value, onChangeText, placeholder, multiline = false, autoCapitalize = 'sentences', onEndEditing }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; multiline?: boolean; autoCapitalize?: 'none' | 'sentences'; onEndEditing?: () => void }) {
  return <View style={s.field}>
    <Text style={s.label}>{label}</Text>
    <TextInput value={value} onChangeText={onChangeText} onEndEditing={onEndEditing} placeholder={placeholder} placeholderTextColor={C.muted} multiline={multiline} autoCapitalize={autoCapitalize} style={[s.input, multiline && s.textarea]} />
  </View>;
}

function Selector({ label, value, placeholder, onPress, disabled = false }: { label: string; value: string; placeholder: string; onPress: () => void; disabled?: boolean }) {
  return <View style={s.field}>
    <Text style={s.label}>{label}</Text>
    <MotionPressable disabled={disabled} onPress={onPress} style={[s.selector, disabled && s.selectorDisabled]}>
      <Text style={[s.selectorText, !value && s.placeholder]} numberOfLines={1}>{value || placeholder}</Text>
      <I name="arrow" size={16} color={disabled ? C.muted : C.pink} />
    </MotionPressable>
  </View>;
}

function PickerModal({ visible, title, query, onQueryChange, items, onClose, onSelect, loading = false }: { visible: boolean; title: string; query: string; onQueryChange: (value: string) => void; items: string[]; onClose: () => void; onSelect: (value: string) => void; loading?: boolean }) {
  const filtered = items.filter(item => item.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 80);
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={s.modalBackdrop} onPress={onClose}>
      <Pressable style={s.sheet} onPress={event => event.stopPropagation()}>
        <View style={s.sheetHandle} />
        <View style={s.sheetTop}><Text style={s.sheetTitle}>{title}</Text><Pressable onPress={onClose}><I name="back" size={24} /></Pressable></View>
        <TextInput autoFocus value={query} onChangeText={onQueryChange} placeholder="Type to search" placeholderTextColor={C.muted} style={s.searchInput} />
        {loading ? <ActivityIndicator color={C.pink} style={{ margin: 24 }} /> : <ScrollView keyboardShouldPersistTaps="handled" style={s.options}>{filtered.map(item => <MotionPressable key={item} onPress={() => onSelect(item)} style={s.option}><Text style={s.optionText}>{item}</Text><I name="arrow" size={16} color={C.muted} /></MotionPressable>)}{!filtered.length && <Text style={s.noOptions}>No matching areas yet. Try a nearby city or region.</Text>}</ScrollView>}
      </Pressable>
    </Pressable>
  </Modal>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, flex: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  top: { height: 65, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: C.line },
  icon: { width: 60 }, title: { fontSize: 20, fontWeight: '900' }, save: { color: C.pink, fontSize: 14, fontWeight: '900' },
  scroll: { padding: 20, paddingBottom: 50 }, avatarButton: { alignSelf: 'center', position: 'relative', marginTop: 5 }, avatar: { width: 92, height: 92, borderRadius: 46 },
  camera: { position: 'absolute', right: 0, bottom: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.bg },
  helper: { textAlign: 'center', color: C.muted, fontSize: 11, marginTop: 9 }, field: { marginTop: 18 }, label: { fontSize: 12, fontWeight: '900', marginBottom: 7 },
  input: { minHeight: 52, borderRadius: 18, backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: C.line, fontSize: 15, color: C.ink },
  textarea: { minHeight: 100, textAlignVertical: 'top' }, row: { flexDirection: 'row', gap: 10 }, half: { flex: 1 }, note: { fontSize: 11, lineHeight: 17, color: C.muted, marginTop: 18 },
  selector: { minHeight: 52, borderRadius: 18, backgroundColor: '#FFF', paddingHorizontal: 14, borderWidth: 1, borderColor: C.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  selectorDisabled: { opacity: 0.55 }, selectorText: { flex: 1, fontSize: 13, color: C.ink, fontWeight: '700' }, placeholder: { color: C.muted, fontWeight: '500' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(23,19,24,0.32)' }, sheet: { maxHeight: '82%', backgroundColor: C.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 18 }, sheetHandle: { alignSelf: 'center', width: 42, height: 5, borderRadius: 3, backgroundColor: C.line, marginBottom: 12 }, sheetTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sheetTitle: { fontSize: 20, fontWeight: '900' }, searchInput: { marginTop: 14, minHeight: 50, borderRadius: 18, backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line, paddingHorizontal: 15, fontSize: 15 }, options: { marginTop: 10 }, option: { minHeight: 50, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: C.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, optionText: { fontSize: 14, fontWeight: '700' }, noOptions: { padding: 25, textAlign: 'center', color: C.muted, fontSize: 12 },
});