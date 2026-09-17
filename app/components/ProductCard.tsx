import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, DimensionValue, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { MotionPressable } from './MotionPressable';
import { C } from '../constants/theme';
import { LikeButton } from './LikeButton';
import { I } from './Icons';
import { getProductLikeState, setProductLike } from '../lib/social';
import { useCart } from '../lib/cart';

export function ProductCard({ name, price, image, images, seller, verified = true, productId, onPress, gridWidth }: { name: string; price: string; image: string; images?: string[]; seller: string; verified?: boolean; productId: string; onPress?: () => void; gridWidth?: DimensionValue }) {
  const [liked, setLiked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const addScale = useRef(new Animated.Value(1)).current;
  const { addItem } = useCart();
  const cardWidth = gridWidth ? 170 : 190;
  useEffect(() => { let active = true; getProductLikeState(productId).then(value => { if (active) setLiked(value); }).catch(() => {}); return () => { active = false; }; }, [productId]);
  async function toggleLike() {
    if (saving) return;
    const next = !liked; setLiked(next); setSaving(true);
    try { await setProductLike(productId, next); } catch (error: any) { setLiked(!next); Alert.alert('Like failed', error?.message || 'Could not save your like.'); } finally { setSaving(false); }
  }
  async function addToCart(event?: { stopPropagation?: () => void }) {
    event?.stopPropagation?.();
    if (adding) return;
    setAdding(true);
    await addItem({ id: productId, name, price: Number(price.replace(/[^0-9.]/g, '')) || 0, image: images?.[0] || image, seller });
    Animated.sequence([
      Animated.timing(addScale, { toValue: 0.84, duration: 100, useNativeDriver: true }),
      Animated.spring(addScale, { toValue: 1, useNativeDriver: true, damping: 10, stiffness: 260 }),
    ]).start();
    setTimeout(() => setAdding(false), 350);
  }
  return <MotionPressable onPress={onPress} style={{ width: gridWidth || 174, marginRight: gridWidth ? '0%' : 12, marginBottom: gridWidth ? 14 : 0 }}>
    <View style={{ height: gridWidth ? 170 : 190, borderRadius: 28, overflow: 'hidden', backgroundColor: '#F1E9EC', position: 'relative' }}>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} nestedScrollEnabled>{(images?.filter(Boolean).length ? images.filter(Boolean) : [image]).map((uri, index) => <Image key={uri + '-' + index} source={{ uri }} style={{ width: cardWidth, height: '100%' }} resizeMode="cover" />)}</ScrollView>
      <View style={{ position: 'absolute', top: 10, right: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}><LikeButton liked={liked} onPress={() => void toggleLike()} size={19} /></View>
      <Animated.View style={[cardStyles.cartButton, { transform: [{ scale: addScale }] }]}><Pressable onPress={addToCart} style={cardStyles.cartPress}><I name={adding ? 'check' : 'cart'} size={18} color="#FFF" filled={!adding} /></Pressable></Animated.View>
    </View>
    <Text style={{ fontSize: 14, fontWeight: '900', marginTop: 9 }} numberOfLines={1}>{name}</Text>
    <Text style={{ fontSize: 13, color: C.muted, marginTop: 2 }} numberOfLines={1}>{seller}{verified ? '  ✓' : ''}</Text>
    <Text style={{ fontSize: 15, fontWeight: '900', marginTop: 5 }}>{price}</Text>
  </MotionPressable>;
}

const cardStyles = {
  cartButton: { position: 'absolute' as const, right: 10, bottom: 10, width: 42, height: 42, borderRadius: 21, backgroundColor: C.ink, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, elevation: 5 },
  cartPress: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
};
