import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { C } from '../constants/theme';
import { I } from '../components/Icons';

export type CartItem = {
  id: string;
  name: string;
  price: number;
  image?: string;
  seller?: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
};

const CART_KEY = 'girlies:cart:v1';
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(CART_KEY).then(value => {
      if (value) {
        try { setItems(JSON.parse(value)); } catch { setItems([]); }
      }
    }).finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) void AsyncStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items, ready]);

  const addItem = useCallback(async (item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    setItems(current => {
      const existing = current.find(row => row.id === item.id);
      if (existing) return current.map(row => row.id === item.id ? { ...row, quantity: row.quantity + quantity } : row);
      return [...current, { ...item, quantity }];
    });
    setNotice(item.name);
    await new Promise(resolve => setTimeout(resolve, 1400));
    setNotice(current => current === item.name ? '' : current);
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems(current => quantity <= 0 ? current.filter(item => item.id !== id) : current.map(item => item.id === id ? { ...item, quantity } : item));
  }, []);

  const removeItem = useCallback((id: string) => setItems(current => current.filter(item => item.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);
  const value = useMemo(() => ({
    items,
    count: items.reduce((total, item) => total + item.quantity, 0),
    subtotal: items.reduce((total, item) => total + item.price * item.quantity, 0),
    addItem,
    updateQuantity,
    removeItem,
    clear,
  }), [items, addItem, updateQuantity, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}<CartNotice name={notice} /></CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used inside CartProvider');
  return value;
}

function CartNotice({ name }: { name: string }) {
  const translateY = useRef(new Animated.Value(20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!name) return;
    translateY.setValue(20);
    opacity.setValue(0);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]),
      Animated.delay(900),
      Animated.parallel([
        Animated.timing(translateY, { toValue: 14, duration: 220, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]),
    ]).start();
  }, [name, opacity, translateY]);
  if (!name) return null;
  return <Animated.View pointerEvents="none" style={[cartStyles.notice, { opacity, transform: [{ translateY }] }]}>
    <View style={cartStyles.noticeIcon}><I name="cart" size={17} color="#FFF" filled /></View>
    <View><Text style={cartStyles.noticeTitle}>Added to your bag</Text><Text style={cartStyles.noticeCopy} numberOfLines={1}>{name}</Text></View>
  </Animated.View>;
}

const cartStyles = StyleSheet.create({
  notice: { position: 'absolute', left: 18, right: 18, bottom: 88, zIndex: 50, borderRadius: 20, backgroundColor: C.ink, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 14, elevation: 9 },
  noticeIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center' },
  noticeTitle: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  noticeCopy: { color: '#EADDE4', fontSize: 10, marginTop: 2, maxWidth: 260 },
});