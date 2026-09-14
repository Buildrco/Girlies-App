import React, { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { Animated, Easing, NativeScrollEvent, NativeSyntheticEvent, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { C } from '../constants/theme';
import { I } from './Icons';
import { LumiFab } from './LumiFab';
import { MotionPressable } from './MotionPressable';

const items = [['home', 'Home', '/home'], ['shop', 'Shop', '/shop'], ['community', 'Feed', '/community'], ['profile', 'Profile', '/profile']] as const;
const labelWidths: Record<string, number> = { Home: 68, Shop: 64, Feed: 64, Profile: 78 };
const HIDE_DISTANCE = 84;

type ChromeVisibility = {
  visibility: Animated.Value;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  reset: () => void;
};

const ChromeVisibilityContext = createContext<ChromeVisibility | null>(null);

export function ChromeVisibilityProvider({ children }: { children: React.ReactNode }) {
  const visibility = useRef(new Animated.Value(1)).current;
  const currentVisibility = useRef(1);
  const lastOffset = useRef(0);
  const onScroll = useCallback((event: any) => {
    const offset = Math.max(0, event.nativeEvent.contentOffset.y);
    const delta = offset - lastOffset.current;
    if (offset <= 1) visibility.setValue(1);
    else if (delta !== 0) {
      const next = Math.max(0, Math.min(1, currentVisibility.current - delta / HIDE_DISTANCE));
      currentVisibility.current = next;
      visibility.setValue(next);
    }
    if (offset <= 1) currentVisibility.current = 1;
    lastOffset.current = offset;
  }, [visibility]);
  const reset = useCallback(() => {
    lastOffset.current = 0;
    currentVisibility.current = 1;
    visibility.setValue(1);
  }, [visibility]);
  return <ChromeVisibilityContext.Provider value={{ visibility, onScroll, reset }}>{children}</ChromeVisibilityContext.Provider>;
}

export function useChromeVisibility() {
  const context = useContext(ChromeVisibilityContext);
  if (!context) throw new Error('useChromeVisibility must be used inside ChromeVisibilityProvider');
  return context;
}

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { visibility, reset } = useChromeVisibility();
  const activeItem = items.find(([, , path]) => path === pathname);
  const currentActive = activeItem?.[1] ?? '';
  const activeIndex = activeItem ? items.indexOf(activeItem) : -1;
  const positions = useRef<Record<string, { x: number; width: number }>>({});
  const highlightLeft = useRef(new Animated.Value(0)).current;
  const highlightWidth = useRef(new Animated.Value(38)).current;
  const initialized = useRef(false);
  const lastTarget = useRef<{ left: number; width: number } | null>(null);
  const animation = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    reset();
  }, [pathname, reset]);

  const targetFor = useCallback((label: string) => {
    const position = positions.current[label];
    if (!position) return null;
    const width = labelWidths[label];
    return { left: position.x + (position.width - width) / 2, width };
  }, []);

  const moveHighlight = useCallback((label: string) => {
    const target = targetFor(label);
    if (!target) return;
    if (!initialized.current) {
      highlightLeft.setValue(target.left);
      highlightWidth.setValue(target.width);
      lastTarget.current = target;
      initialized.current = true;
      return;
    }
    const previous = lastTarget.current;
    if (previous?.left === target.left && previous.width === target.width) return;
    const startCenter = (previous?.left ?? target.left) + (previous?.width ?? target.width) / 2;
    const targetCenter = target.left + target.width / 2;
    const stretchWidth = Math.min(132, Math.max(previous?.width ?? 38, target.width) + Math.abs(targetCenter - startCenter) * 0.34);
    animation.current?.stop();
    animation.current = Animated.sequence([
      Animated.parallel([
        Animated.timing(highlightLeft, { toValue: target.left, duration: 250, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
        Animated.timing(highlightWidth, { toValue: stretchWidth, duration: 250, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      ]),
      Animated.timing(highlightWidth, { toValue: target.width, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]);
    lastTarget.current = target;
    animation.current.start();
  }, [highlightLeft, highlightWidth, targetFor]);

  useEffect(() => {
    if (currentActive) moveHighlight(currentActive);
  }, [currentActive, moveHighlight]);

  const goToTab = (label: string, path: string, index: number) => {
    if (index === activeIndex) return;
    router.navigate({ pathname: path as any, params: { tabDirection: index > activeIndex ? '1' : '-1' } } as any);
  };

  if (!activeItem) return null;
  const translateY = visibility.interpolate({ inputRange: [0, 1], outputRange: [105, 0] });
  return <Animated.View style={[styles.nav, { transform: [{ translateY }] }]}>
    <LumiFab onPress={() => router.push('/lumi')} visibility={visibility} />
    <Animated.View pointerEvents="none" style={[styles.highlight, { left: highlightLeft, width: highlightWidth }]} />
    {items.map(([icon, label, path], index) => {
      const isActive = currentActive === label;
      return <MotionPressable key={label} onLayout={event => {
        positions.current[label] = { x: event.nativeEvent.layout.x, width: event.nativeEvent.layout.width };
        if (isActive) moveHighlight(label);
      }} onPress={() => goToTab(label, path, index)} style={styles.slot}>
         <View style={styles.item}>
           <I name={icon} size={23} color={isActive ? C.pink : C.ink} filled={isActive} />
          {isActive && <Text style={styles.label}>{label}</Text>}
        </View>
      </MotionPressable>;
    })}
  </Animated.View>;
}

const styles = {
  nav: { position: 'absolute' as const, left: 14, right: 14, bottom: 12, height: 58, borderRadius: 25, paddingHorizontal: 8, backgroundColor: '#FFF', borderWidth: 1, borderColor: C.line, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 18, elevation: 10, zIndex: 20 },
  highlight: { position: 'absolute' as const, top: 11, height: 36, borderRadius: 18, backgroundColor: C.rose, zIndex: 0 },
  slot: { minWidth: 50, height: 48, alignItems: 'center' as const, justifyContent: 'center' as const, zIndex: 1 },
  item: { height: 36, minWidth: 38, paddingHorizontal: 7, borderRadius: 18, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 5, overflow: 'hidden' as const },
  label: { color: C.ink, fontSize: 11, fontWeight: '800' as const },
};
