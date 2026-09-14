import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { C } from '../constants/theme';

export function TabMotion({ children }: { children: React.ReactNode }) {
  const { tabDirection } = useLocalSearchParams<{ tabDirection?: string }>();
  const direction = tabDirection === '-1' ? -1 : 1;
  const translateX = useRef(new Animated.Value(direction * Dimensions.get('window').width)).current;
  useEffect(() => { Animated.spring(translateX, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220, mass: 0.8 }).start(); }, [direction, translateX]);
  return <Animated.View style={{ flex: 1, backgroundColor: C.bg, transform: [{ translateX }] }}>{children}</Animated.View>;
}
