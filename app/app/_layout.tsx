import React from 'react';
import { Stack, usePathname } from 'expo-router';
import { Platform, UIManager } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { BottomNav, ChromeVisibilityProvider, useChromeVisibility } from '../components/BottomNav';
import { ScreenEntrance } from '../components/MotionPressable';
import { CartProvider } from '../lib/cart';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

function NavigationChrome() {
  const pathname = usePathname();
  const { reset } = useChromeVisibility();
  React.useEffect(() => reset(), [pathname, reset]);
  return <BottomNav />;
}

export default function Layout() {
  const pathname = usePathname();
  return <GestureHandlerRootView style={{ flex: 1 }}>
    <StatusBar style="dark" />
    <ChromeVisibilityProvider>
      <CartProvider>
        <ScreenEntrance resetKey={pathname} style={{ flex: 1 }}>
          <Stack
            screenOptions={{
            headerShown: false,
            freezeOnBlur: true,
          }}
        >
            <Stack.Screen name="home" options={{ animation: 'none' }} />
          <Stack.Screen name="shop" options={{ animation: 'none' }} />
          <Stack.Screen name="community" options={{ animation: 'none' }} />
          <Stack.Screen name="profile" options={{ animation: 'none' }} />
          </Stack>
        </ScreenEntrance>
        <NavigationChrome />
      </CartProvider>
    </ChromeVisibilityProvider>
  </GestureHandlerRootView>;
}
