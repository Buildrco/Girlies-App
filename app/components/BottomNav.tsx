import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from './Icons';
import { LumiFab } from './LumiFab';
import { MotionPressable } from './MotionPressable';

const items = [['home', 'Home', '/home'], ['shop', 'Shop', '/shop'], ['community', 'Feed', '/community'], ['profile', 'Profile', '/profile']] as const;
const labelWidths: Record<string, number> = { Home: 68, Shop: 64, Feed: 64, Profile: 78 };

export function useChromeVisibility() {
  const visibility = useRef(new Animated.Value(1)).current;
  const lastOffset = useRef(0);
  const onScroll = useCallback((event: any) => {
    const offset = Math.max(0, event.nativeEvent.contentOffset.y);
    const delta = offset - lastOffset.current;
    if (offset < 8 || delta < -3) Animated.timing(visibility, { toValue: 1, duration: 240, useNativeDriver: true }).start();
    else if (delta > 3) Animated.timing(visibility, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    lastOffset.current = offset;
  }, [visibility]);
  return { visibility, onScroll };
}

export function BottomNav({ active, visibility }: { active: string; visibility?: Animated.Value }) {
  const router = useRouter();
  const params = useLocalSearchParams<{ navExpanded?: string }>();
  const activeIndex = Math.max(0, items.findIndex(([, label]) => label === active));
  const [expanded, setExpanded] = useState(params.navExpanded === active ? active : null);
  const progress = useRef(new Animated.Value(expanded === active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: expanded === active ? 1 : 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [active, expanded, progress]);

  const goToTab = (label: string, path: string, index: number) => {
    setExpanded(label);
    if (index === activeIndex) return;
    const direction = index > activeIndex ? '1' : '-1';
    router.replace({ pathname: path as any, params: { tabDirection: direction, navExpanded: label } } as any);
  };

  const translateY = visibility?.interpolate({ inputRange: [0, 1], outputRange: [105, 0] }) || 0;
  return <Animated.View style={[styles.nav, { transform: [{ translateY }] }]}>
    <LumiFab onPress={() => router.push('/lumi')} visibility={visibility} />
    {items.map(([icon, label, path], index) => {
      const isActive = active === label;
      const isExpanded = expanded === label && isActive;
      const width = isExpanded ? progress.interpolate({ inputRange: [0, 1], outputRange: [38, labelWidths[label]] }) : 38;
      return <MotionPressable key={label} onPress={() => goToTab(label, path, index)} style={styles.slot}>
        <Animated.View style={[styles.item, { width, backgroundColor: isActive ? C.rose : 'transparent' }]}>
          <I name={icon} size={20} color={isActive ? C.pink : C.ink} filled={isActive} />
          {isExpanded && <Animated.Text style={[styles.label, { opacity: progress, transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-7, 0] }) }] }]}>{label}</Animated.Text>}
        </Animated.View>
      </MotionPressable>;
    })}
  </Animated.View>;
}

const styles = { nav: { position: 'absolute' as const, left: 14, right: 14, bottom: 12, height: 58, borderRadius: 25, backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-around' as const, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 18, elevation: 10, zIndex: 20 }, slot: { flex: 1, height: 48, alignItems: 'center' as const, justifyContent: 'center' as const }, item: { height: 36, minWidth: 38, paddingHorizontal: 7, borderRadius: 18, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 5, overflow: 'hidden' as const }, label: { color: C.ink, fontSize: 11, fontWeight: '800' as const } };
