import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from './Icons';
import { LumiFab } from './LumiFab';
import { MotionPressable } from './MotionPressable';

const items = [['home', 'Home', '/home'], ['shop', 'Shop', '/shop'], ['community', 'Community', '/community'], ['profile', 'Profile', '/profile']] as const;

export function BottomNav({ active }: { active: string }) {
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

  return <View style={styles.nav}>
    <LumiFab onPress={() => router.push('/lumi')} />
    {items.map(([icon, label, path], index) => {
      const isActive = active === label;
      const isExpanded = expanded === label && isActive;
      const width = isExpanded ? progress.interpolate({ inputRange: [0, 1], outputRange: [38, 94] }) : 38;
      return <MotionPressable key={label} onPress={() => goToTab(label, path, index)} style={styles.slot}>
        <Animated.View style={[styles.item, { width, backgroundColor: isActive ? C.rose : 'transparent' }]}>
          <I name={icon} size={20} color={isActive ? C.pink : C.ink} filled={isActive} />
          {isExpanded && <Animated.Text style={[styles.label, { opacity: progress, transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-7, 0] }) }] }]}>{label}</Animated.Text>}
        </Animated.View>
      </MotionPressable>;
    })}
  </View>;
}

const styles = { nav: { position: 'absolute' as const, left: 14, right: 14, bottom: 12, height: 68, borderRadius: 28, backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-around' as const, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 18, elevation: 10, zIndex: 20 }, slot: { flex: 1, height: 52, alignItems: 'center' as const, justifyContent: 'center' as const }, item: { height: 40, minWidth: 38, paddingHorizontal: 8, borderRadius: 20, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 5, overflow: 'hidden' as const }, label: { color: C.ink, fontSize: 11, fontWeight: '800' as const } };
