import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { signIn, signUp } from '../lib/auth';

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit() {
    if (!email.trim() || password.length < 6 || (mode === 'signup' && !name.trim())) { setMessage(mode === 'signup' ? 'Add your name, email and a password with at least 6 characters.' : 'Enter your email and password.'); return; }
    setBusy(true); setMessage('');
    try {
      if (mode === 'signup') { const result = await signUp(email.trim(), password, name.trim()); if (!result.session) { setMessage('Account created. Check your email to confirm, then sign in.'); setMode('signin'); } else router.replace('/home'); }
      else { await signIn(email.trim(), password); router.replace('/home'); }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Authentication failed.'); }
    finally { setBusy(false); }
  }

  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}><View style={styles.wrap}><Text style={styles.mark}>GIRLIES ✦</Text><Text style={styles.title}>{mode === 'signin' ? 'Welcome back, girlie.' : 'Come join the girls.'}</Text><Text style={styles.subtitle}>{mode === 'signin' ? 'Your community, your finds, your next look.' : 'Create your account and make the marketplace yours.'}</Text>{mode === 'signup' && <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={C.muted} style={styles.input} autoCapitalize="words" />}
    <TextInput value={email} onChangeText={setEmail} placeholder="Email address" placeholderTextColor={C.muted} style={styles.input} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} /><TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={C.muted} style={styles.input} secureTextEntry />
    {message ? <View style={styles.message}><Text style={styles.messageText}>{message}</Text></View> : null}<Pressable onPress={submit} disabled={busy} style={[styles.button, busy && { opacity: 0.55 }]}>{busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>{mode === 'signin' ? 'Sign in' : 'Create account'}</Text>}</Pressable><Pressable onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage(''); }}><Text style={styles.switch}>{mode === 'signin' ? 'New here? Create an account' : 'Already a girlie? Sign in'}</Text></Pressable></View></KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.bg }, keyboard: { flex: 1 }, wrap: { flex: 1, justifyContent: 'center', padding: 24 }, mark: { color: C.pink, fontWeight: '900', letterSpacing: 2, fontSize: 12 }, title: { fontSize: 32, fontWeight: '900', marginTop: 18, color: C.ink }, subtitle: { color: C.muted, fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 26 }, input: { height: 54, backgroundColor: '#FFF', borderRadius: 18, paddingHorizontal: 17, marginTop: 11, borderWidth: 1, borderColor: C.line, color: C.ink }, message: { padding: 14, borderRadius: 17, backgroundColor: C.rose, marginTop: 14 }, messageText: { color: C.plum, fontSize: 12, lineHeight: 17 }, button: { height: 54, borderRadius: 27, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', marginTop: 18 }, buttonText: { color: '#FFF', fontSize: 15, fontWeight: '900' }, switch: { textAlign: 'center', color: C.plum, fontWeight: '900', marginTop: 20 }
});
