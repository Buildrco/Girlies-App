import React from 'react';
import { Stack, usePathname } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { BottomNav, ChromeVisibilityProvider, useChromeVisibility } from '../components/BottomNav';

function tabAnimation(route: { params?: object }) {
  const direction = (route.params as { tabDirection?: string } | undefined)?.tabDirection;
  return direction === '-1' ? 'slide_from_left' as const : 'slide_from_right' as const;
}

function NavigationChrome() {
  const pathname = usePathname();
  const { reset } = useChromeVisibility();
  React.useEffect(() => reset(), [pathname, reset]);
  return <BottomNav />;
}

export default function Layout() {
  return <GestureHandlerRootView style={{ flex: 1 }}>
    <StatusBar style="dark" />
    <ChromeVisibilityProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          detachInactiveScreens: false,
          freezeOnBlur: false,
        }}
      >
        <Stack.Screen name="home" options={({ route }) => ({ animation: tabAnimation(route), animationDuration: 380 })} />
        <Stack.Screen name="shop" options={({ route }) => ({ animation: tabAnimation(route), animationDuration: 380 })} />
        <Stack.Screen name="community" options={({ route }) => ({ animation: tabAnimation(route), animationDuration: 380 })} />
        <Stack.Screen name="profile" options={({ route }) => ({ animation: tabAnimation(route), animationDuration: 380 })} />
      </Stack>
      <NavigationChrome />
    </ChromeVisibilityProvider>
  </GestureHandlerRootView>;
}
