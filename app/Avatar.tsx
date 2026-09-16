import React from 'react';
import { View, Image } from 'react-native';
import { C } from './constants/theme';
import { I } from './components/Icons';

const pics = ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=85', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=85', 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=300&q=85'];

export function VerifiedMark({ size = 18 }: { size?: number }) {
  return <I name="verified" size={size} color={C.pink} />;
}

export function Avatar({ size = 48, index = 0, uri, verified = false }: { size?: number; index?: number; uri?: string | null; verified?: boolean }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'visible' }}>
    <Image source={{ uri: uri || pics[index % pics.length] }} style={{ width: size, height: size, borderRadius: size / 2 }} />
    {verified && <View style={{ position: 'absolute', right: -2, bottom: -2, width: Math.max(16, size * 0.28), height: Math.max(16, size * 0.28), borderRadius: size, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}><VerifiedMark size={Math.max(12, size * 0.22)} /></View>}
  </View>;
}
