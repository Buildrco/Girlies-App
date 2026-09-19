import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { SellerEvent } from "../lib/social";
import { C } from "../constants/theme";

type Props = { event: SellerEvent; onBuy: () => void };

const perforations = [6, 30, 54, 78, 102, 126, 150];
const barcode = [1, 5, 2, 4, 6, 2, 5, 3, 1, 4, 2, 6, 3, 2, 5, 1, 4, 3, 6, 2, 4];

export default function EventTicketCard({ event, onBuy }: Props) {
  const float = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const floating = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(float, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(shimmer, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(float, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(shimmer, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ]),
    );
    floating.start();
    return () => floating.stop();
  }, [float, shimmer]);

  const remaining = Math.max(0, Number(event.ticket_quantity || 0) - Number(event.tickets_sold || 0));
  const paid = Number(event.ticket_price || 0) > 0;
  const price = paid
    ? `GH₵ ${Number(event.ticket_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "Free";
  const ticketTransform = {
    transform: [
      { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) },
      { scale: float.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }) },
    ],
  };
  const shimmerTransform = {
    transform: [{ translateY: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0, 250] }) }],
  };

  return (
    <View style={s.shell}>
      <Animated.View style={[s.card, ticketTransform]}>
        <LinearGradient
          pointerEvents="none"
          colors={["#d7d7d7", "#ff6bfe", "#00f9f8", "#eef0bc", "#0081fd", "#ff6bfe", "#01fefb", "#ccc"]}
          start={{ x: 0.05, y: 0 }}
          end={{ x: 0.95, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View pointerEvents="none" style={[s.shimmer, shimmerTransform]}>
          <LinearGradient
            colors={["#ffffff00", "#ff000044", "#00ff0044", "#ffffff00"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <View pointerEvents="none" style={s.tint} />
        <View pointerEvents="none" style={s.holesTop}>
          {perforations.map((left) => <View key={`top-${left}`} style={[s.hole, { left }]} />)}
        </View>
        <View pointerEvents="none" style={s.holesBottom}>
          {perforations.map((left) => <View key={`bottom-${left}`} style={[s.hole, { left }]} />)}
        </View>
        <View pointerEvents="none" style={[s.sideHole, s.sideHoleLeft]} />
        <View pointerEvents="none" style={[s.sideHole, s.sideHoleRight]} />

        <Text style={s.header}>GIRLIES</Text>
        <View style={s.body}>
          <Text style={s.name} numberOfLines={3}>{event.name}</Text>
          <Text style={s.copy} numberOfLines={4}>{event.description || "Join this event from Girlies."}</Text>
          <Text style={s.meta} numberOfLines={3}>
            {event.event_mode === "physical" ? event.location || "Physical location" : "Online in the app"}
            {"\n"}{new Date(event.starts_at).toLocaleString()}
          </Text>
        </View>
        <View style={s.footer}>
          <Text style={s.number}>{price} · {remaining} left</Text>
          <View style={s.barcode}>{barcode.map((width, index) => <View key={index} style={[s.bar, { width }]} />)}</View>
          <Pressable style={s.button} onPress={onBuy}>
            <Text style={s.buttonText}>{paid ? "Buy a ticket" : "Get a ticket"}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  shell: { alignItems: "center", paddingVertical: 14, paddingBottom: 22 },
  card: {
    width: 180,
    height: 320,
    paddingVertical: 12,
    overflow: "hidden",
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 9,
  },
  shimmer: { position: "absolute", left: 0, right: 0, top: -250, height: 500 },
  tint: { ...StyleSheet.absoluteFillObject, backgroundColor: "#ffffff33" },
  holesTop: { position: "absolute", left: 0, right: 0, top: -5, height: 16 },
  holesBottom: { position: "absolute", left: 0, right: 0, bottom: -5, height: 16 },
  hole: { position: "absolute", top: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: C.bg },
  sideHole: { position: "absolute", top: 146, width: 16, height: 16, borderRadius: 8, backgroundColor: C.bg },
  sideHoleLeft: { left: -8 },
  sideHoleRight: { right: -8 },
  header: {
    marginHorizontal: 8,
    color: "#ffffff9f",
    fontSize: 35,
    fontWeight: "900",
    letterSpacing: 2,
    textAlign: "center",
    textShadowColor: "#000",
    textShadowRadius: 0,
    textShadowOffset: { width: 0, height: 0 },
  },
  body: { flex: 1, marginHorizontal: 16, padding: 8, zIndex: 1 },
  name: { color: "#171318", fontSize: 20, fontWeight: "900", lineHeight: 22 },
  copy: { color: "#171318", fontSize: 11, lineHeight: 15, marginTop: 10 },
  meta: { color: "#171318", fontSize: 10, lineHeight: 15, marginTop: 15 },
  footer: { marginHorizontal: 16, marginBottom: 8, zIndex: 1, alignItems: "center" },
  number: { color: "#000", fontSize: 10, textAlign: "center", marginBottom: 8 },
  barcode: { height: 32, flexDirection: "row", alignItems: "stretch", justifyContent: "center", gap: 2 },
  bar: { height: 32, backgroundColor: "#000" },
  button: { marginTop: 11, borderRadius: 18, backgroundColor: C.pink, paddingHorizontal: 14, paddingVertical: 8 },
  buttonText: { color: "#FFF", fontSize: 10, fontWeight: "900" },
});