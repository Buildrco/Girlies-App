import React from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const icons: Record<string, { outline: keyof typeof Ionicons.glyphMap; filled?: keyof typeof Ionicons.glyphMap }> = {
  chat: { outline: 'chatbubble-ellipses-outline', filled: 'chatbubble-ellipses' },
  search: { outline: 'search-outline' },
  bell: { outline: 'notifications-outline', filled: 'notifications' },
  plus: { outline: 'add' },
  send: { outline: 'paper-plane-outline', filled: 'paper-plane' },
  bag: { outline: 'bag-outline', filled: 'bag' },
  cart: { outline: 'cart-outline', filled: 'cart' },
  heart: { outline: 'heart-outline', filled: 'heart' },
  more: { outline: 'ellipsis-horizontal' },
  bookmark: { outline: 'bookmark-outline', filled: 'bookmark' },
  back: { outline: 'chevron-back' },
  share: { outline: 'paper-plane-outline' },
  settings: { outline: 'settings-outline' },
  spark: { outline: 'sparkles' },
  check: { outline: 'checkmark' },
  camera: { outline: 'camera-outline', filled: 'camera' },
  mic: { outline: 'mic-outline', filled: 'mic' },
  location: { outline: 'location-outline', filled: 'location' },
  filter: { outline: 'options-outline' },
  arrow: { outline: 'arrow-forward' },
  forward: { outline: 'chevron-forward' },
  lock: { outline: 'lock-closed-outline', filled: 'lock-closed' },
  gift: { outline: 'gift-outline', filled: 'gift' },
  chart: { outline: 'stats-chart-outline', filled: 'stats-chart' },
  shield: { outline: 'shield-checkmark-outline', filled: 'shield-checkmark' },
  hair: { outline: 'cut-outline' },
  beauty: { outline: 'sparkles-outline', filled: 'sparkles' },
  fashion: { outline: 'shirt-outline', filled: 'shirt' },
  fragrance: { outline: 'flower-outline', filled: 'flower' },
  gadgets: { outline: 'phone-portrait-outline', filled: 'phone-portrait' },
  appliances: { outline: 'flash-outline', filled: 'flash' },
  furniture: { outline: 'bed-outline', filled: 'bed' },
  intimates: { outline: 'heart-circle-outline', filled: 'heart-circle' },
  vehicles: { outline: 'car-sport-outline', filled: 'car-sport' },
  property: { outline: 'home-outline', filled: 'home' },
  kids: { outline: 'happy-outline', filled: 'happy' },
  services: { outline: 'construct-outline', filled: 'construct' },
  groceries: { outline: 'cart-outline', filled: 'cart' },
  jewelry: { outline: 'diamond-outline', filled: 'diamond' },
  sports: { outline: 'barbell-outline', filled: 'barbell' },
  books: { outline: 'book-outline', filled: 'book' },
  pets: { outline: 'paw-outline', filled: 'paw' },
  agriculture: { outline: 'leaf-outline', filled: 'leaf' },
  tools: { outline: 'hammer-outline', filled: 'hammer' },
  business: { outline: 'briefcase-outline', filled: 'briefcase' },
  digital: { outline: 'cloud-download-outline', filled: 'cloud-download' },
  wallet: { outline: 'wallet-outline', filled: 'wallet' },
  receipt: { outline: 'receipt-outline', filled: 'receipt' },
  people: { outline: 'people-outline', filled: 'people' },
};
const navIcons: Record<string, { outline: string; filled: string }> = {
  home: { outline: 'home-outline', filled: 'home' },
  shop: { outline: 'storefront-outline', filled: 'storefront' },
  community: { outline: 'people-outline', filled: 'people' },
  profile: { outline: 'person-circle-outline', filled: 'person-circle' },
};

export function I({ name, size = 23, color = '#171318', filled = false }: { name: string; size?: number; color?: string; filled?: boolean }) {
  if (navIcons[name]) return <Ionicons name={(filled ? navIcons[name].filled : navIcons[name].outline) as any} size={size} color={color} />;
  if (name === 'verified') return <MaterialCommunityIcons name="check-decagram" size={size} color={color} />;
  const icon = icons[name] || icons.spark;
  return <Ionicons name={(filled && icon.filled ? icon.filled : icon.outline) as any} size={size} color={color} />;
}
