import React from 'react';
import { View, Image } from 'react-native';
import { C } from './constants/theme';
import { I } from './components/Icons';

export function VerifiedMark({ size = 18 }: { size?: number }) {
  return <I name="verified" size={size} color={C.pink} />;
}

export function Avatar({ size = 48, uri, verified: _verified }: { size?: number; uri?: string | null; verified?: boolean }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'visible' }}>
    {uri ? <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} /> : <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' }}><I name="profile" size={size * 0.58} color={C.plum} /></View>}
  </View>;
}
