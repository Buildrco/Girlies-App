import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { Avatar } from '../Avatar';
import { I } from '../components/Icons';
import { getCurrentProfile, getSessionUser, updateCurrentProfile, uploadMedia, type MediaItem } from '../lib/social';

export default function EditProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('');
  const [area, setArea] = useState('');
  const [location, setLocation] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [links, setLinks] = useState('');

  useEffect(() => {
    let active = true;
    getCurrentProfile().then(profile => {
      if (!active || !profile) return;
      setAvatar(profile.avatar_url || '');
      setDisplayName(profile.display_name || '');
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
        <Field label="Bio" value={bio} onChangeText={setBio} placeholder="Tell the girls a little about you" multiline />
        <View style={s.row}>
          <View style={s.half}><Field label="Country" value={country} onChangeText={setCountry} placeholder="Ghana" /></View>
          <View style={s.half}><Field label="Area" value={area} onChangeText={setArea} placeholder="East Legon" /></View>
        </View>
        <Field label="Location" value={location} onChangeText={setLocation} placeholder="Accra, Ghana" />
        <Field label="Date of birth" value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="YYYY-MM-DD" autoCapitalize="none" />
        <Field label="Links" value={links} onChangeText={setLinks} placeholder="One link per line" multiline />
        <Text style={s.note}>Your links will appear on your public profile. Your date of birth is kept for account features and is not shown publicly.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

function Field({ label, value, onChangeText, placeholder, multiline = false, autoCapitalize = 'sentences' }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; multiline?: boolean; autoCapitalize?: 'none' | 'sentences' }) {
  return <View style={s.field}>
    <Text style={s.label}>{label}</Text>
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={C.muted} multiline={multiline} autoCapitalize={autoCapitalize} style={[s.input, multiline && s.textarea]} />
  </View>;
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
});