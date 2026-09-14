import React, { useRef } from 'react';
import { Animated, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

export function MotionPressable({ children, style, contentStyle, onPressIn, onPressOut, ...props }: PressableProps & { children: React.ReactNode; style?: StyleProp<ViewStyle>; contentStyle?: StyleProp<ViewStyle> }) {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (toValue: number) => Animated.spring(scale, { toValue, useNativeDriver: true, damping: 18, stiffness: 280, mass: 0.7 }).start();
  return <Pressable {...props} android_ripple={{ color: 'rgba(242, 58, 132, 0.18)', borderless: false }} style={style} onPressIn={(event) => { animate(0.96); onPressIn?.(event); }} onPressOut={(event) => { animate(1); onPressOut?.(event); }}>
    <Animated.View style={[contentStyle, { transform: [{ scale }] }]}>{children}</Animated.View>
  </Pressable>;
}
