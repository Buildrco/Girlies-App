import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import { C } from "../constants/theme";

type Props = { value: boolean; onValueChange: (value: boolean) => void; accessibilityLabel?: string };

/**
 * Native version of the settings toggle.
 *
 * The previous implementation rendered an HTML/SVG toggle in a WebView. That
 * made the control scale inconsistently on Android and meant every toggle had
 * a separate web runtime. Keeping the animation here gives the APK the same
 * springy behavior as the subscription screen without relying on a network
 * request or a WebView.
 */
export default function AppToggle({ value, onValueChange, accessibilityLabel }: Props) {
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: value ? 1 : 0,
      useNativeDriver: false,
      bounciness: 8,
      speed: 18,
    }).start();
  }, [progress, value]);

  const trackColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["#D3D3D6", C.pink],
  });
  const thumbScale = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.84, 1],
  });
  const offIconOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const onIconOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const thumbX = progress.interpolate({ inputRange: [0, 1], outputRange: [3, 45] });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      hitSlop={8}
      onPress={() => onValueChange(!value)}
      style={s.hitArea}
    >
      <Animated.View style={[s.track, { backgroundColor: trackColor }]}>
        <Animated.View pointerEvents="none" style={[s.thumb, { transform: [{ translateX: thumbX }, { scale: thumbScale }] }]}>
          <Animated.View style={[s.offIcon, { opacity: offIconOpacity }]} />
          <Animated.View style={[s.onIcon, { opacity: onIconOpacity }]} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  hitArea: { width: 82, height: 44, alignItems: "flex-end", justifyContent: "center" },
  track: { width: 82, height: 40, borderRadius: 21, overflow: "hidden", justifyContent: "center" },
  thumb: { position: "absolute", left: 0, top: 3, width: 34, height: 34, borderRadius: 17, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center" },
  offIcon: { width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: "#D3D3D6" },
  onIcon: { position: "absolute", width: 4, height: 16, borderRadius: 2, backgroundColor: C.pink },
});