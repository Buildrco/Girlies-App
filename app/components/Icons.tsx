import React from 'react';
import { Text } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const glyphs: Record<string, string> = { chat:'◌', search:'⌕', bell:'♢', plus:'＋', send:'➤', bag:'▢', heart:'♡', more:'•••', back:'‹', share:'↗', settings:'⚙', spark:'✦', check:'✓', camera:'◉', mic:'●', location:'⌖', filter:'≡', arrow:'→', lock:'⌑', gift:'♧', chart:'⌁', shield:'◇' };
const navIcons: Record<string, { outline: string; filled: string }> = {
  home: { outline: 'home-outline', filled: 'home' },
  shop: { outline: 'storefront-outline', filled: 'storefront' },
  community: { outline: 'people-outline', filled: 'people' },
  profile: { outline: 'person-circle-outline', filled: 'person-circle' },
};

export function I({ name, size = 23, color = '#171318', filled = false }: { name: string; size?: number; color?: string; filled?: boolean }) {
  if (navIcons[name]) return <Ionicons name={(filled ? navIcons[name].filled : navIcons[name].outline) as any} size={size} color={color} />;
  if (name === 'verified') return <MaterialCommunityIcons name="check-decagram" size={size} color={color} />;
  return <Text style={{ fontSize: size, color, fontWeight: '700' }}>{glyphs[name] || '•'}</Text>;
}
