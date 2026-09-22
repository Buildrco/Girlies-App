import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, PressableProps, StyleProp, StyleSheet, ViewStyle } from 'react-native';

type MotionPressableProps = PressableProps & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

export function MotionPressable({ children, style, contentStyle, onPressIn, onPressOut, ...props }: MotionPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (toValue: number) => Animated.spring(scale, { toValue, useNativeDriver: true, damping: 18, stiffness: 280, mass: 0.7 }).start();
  return <Pressable
    {...props}
    android_ripple={{ color: 'rgba(242, 58, 132, 0.18)', borderless: false }}
    style={[style, styles.rippleClip]}
    onPressIn={(event) => { animate(0.96); onPressIn?.(event); }}
    onPressOut={(event) => { animate(1); onPressOut?.(event); }}
  >
    <Animated.View style={[contentStyle, { transform: [{ scale }] }]}>{children}</Animated.View>
  </Pressable>;
}

type ScreenEntranceProps = {
  children: React.ReactNode;
  resetKey?: string;
  direction?: 'up' | 'left' | 'fade';
  distance?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
};

export function ScreenEntrance({ children, resetKey, direction = 'up', distance = 18, delay = 0, style }: ScreenEntranceProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const offset = useRef(new Animated.Value(direction === 'fade' ? 0 : distance)).current;
  useEffect(() => {
    opacity.setValue(0);
    offset.setValue(direction === 'fade' ? 0 : distance);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 420, delay, useNativeDriver: true }),
      Animated.timing(offset, { toValue: 0, duration: 520, delay, useNativeDriver: true }),
    ]).start();
  }, [resetKey, direction, distance, delay, opacity, offset]);
  const transform = direction === 'left' ? [{ translateX: offset }] : direction === 'fade' ? [] : [{ translateY: offset }];
  return <Animated.View style={[style, { opacity, transform }]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({ rippleClip: { overflow: 'hidden' } });
