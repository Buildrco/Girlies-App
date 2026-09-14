import React, { useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { C } from '../constants/theme';
import { I } from './Icons';

export function LikeButton({ liked, onPress, size = 23 }: { liked: boolean; onPress: () => void; size?: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const tap = () => {
    onPress();
    scale.setValue(0.68);
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.3, duration: 150, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, damping: 8, stiffness: 220, mass: 0.5, useNativeDriver: true }),
    ]).start();
  };
  return <Pressable onPress={tap} hitSlop={10} accessibilityRole="button" accessibilityLabel={liked ? 'Unlike' : 'Like'}>
    <Animated.View style={{ transform: [{ scale }] }}>
      <I name="heart" size={size} color={liked ? C.pink : C.ink} filled={liked} />
    </Animated.View>
  </Pressable>;
}