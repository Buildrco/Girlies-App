import React, { useRef, useState } from 'react';
import { Animated, GestureResponderEvent, Pressable, PressableProps, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

export function MotionPressable({ children, style, contentStyle, onPressIn, onPressOut, ...props }: PressableProps & { children: React.ReactNode; style?: StyleProp<ViewStyle>; contentStyle?: StyleProp<ViewStyle> }) {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (toValue: number) => Animated.spring(scale, { toValue, useNativeDriver: true, damping: 18, stiffness: 280, mass: 0.7 }).start();
  return <Pressable {...props} android_ripple={{ color: 'rgba(242, 58, 132, 0.18)', borderless: false }} style={style} onPressIn={(event) => { animate(0.96); onPressIn?.(event); }} onPressOut={(event) => { animate(1); onPressOut?.(event); }}>
    <Animated.View style={[contentStyle, { transform: [{ scale }] }]}>{children}</Animated.View>
  </Pressable>;
}

export function TouchFeedbackRoot({ children }: { children: React.ReactNode }) {
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.65)).current;

  const pressIn = (event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;
    setPoint({ x: pageX, y: pageY });
    opacity.stopAnimation();
    scale.stopAnimation();
    opacity.setValue(0.9);
    scale.setValue(0.65);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 320, mass: 0.55 }).start();
  };
  const pressOut = () => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 190, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1.12, duration: 190, useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) setPoint(null); });
  };

  return <View style={styles.root} onTouchStart={pressIn} onTouchEnd={pressOut} onTouchCancel={pressOut}>
    {children}
    {point && <Animated.View pointerEvents="none" style={[styles.touch, { left: point.x - 28, top: point.y - 28, opacity, transform: [{ scale }] }]} />}
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  touch: { position: 'absolute', width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(242,58,132,0.16)', borderWidth: 1, borderColor: 'rgba(242,58,132,0.34)' },
});
