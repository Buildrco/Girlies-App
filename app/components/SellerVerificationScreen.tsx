import React, { useEffect, useRef, useState } from "react";
import { Animated, LayoutAnimation, Pressable, StyleSheet, Text, View } from "react-native";
import { C } from "../constants/theme";
import { I } from "./Icons";

type Feature = { text: string; hasInfo?: boolean };
type Plan = {
  id: string;
  name: string;
  description: string;
  priceMonthly: string;
  priceYearly: string;
  badge?: string;
  featuresLabel?: string;
  features: Feature[];
};

const plans: Plan[] = [
  {
    id: "verified",
    name: "Verified",
    description: "Build trust with a verified seller profile.",
    priceMonthly: "GH₵ 49",
    priceYearly: "GH₵ 39",
    badge: "Popular",
    featuresLabel: "Includes",
    features: [
      { text: "Verification badge on your seller profile" },
      { text: "Priority discovery in marketplace search" },
      { text: "Seller profile trust insights" },
    ],
  },
  {
    id: "verified-plus",
    name: "Verified Plus",
    description: "More visibility and tools for growing sellers.",
    priceMonthly: "GH₵ 99",
    priceYearly: "GH₵ 79",
    badge: "Best value",
    featuresLabel: "Everything in Verified, plus",
    features: [
      { text: "Featured placement opportunities" },
      { text: "Advanced audience insights" },
      { text: "Priority seller support" },
    ],
  },
];

export default function SellerVerificationScreen() {
  const [selectedPlan, setSelectedPlan] = useState("verified");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const billingProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(billingProgress, {
      toValue: billingCycle === "monthly" ? 0 : 1,
      useNativeDriver: true,
      bounciness: 8,
      speed: 16,
    }).start();
  }, [billingCycle, billingProgress]);

  return (
    <View style={s.card}>
      <View style={s.header}>
        <Text style={s.title}>Select a plan</Text>
        <View style={s.billingToggle}>
          <Animated.View
            pointerEvents="none"
            style={[s.billingIndicator, { transform: [{ translateX: billingProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 72] }) }] }]}
          />
          {(["monthly", "yearly"] as const).map((cycle) => (
            <Pressable
              key={cycle}
              style={s.billingButton}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setBillingCycle(cycle);
              }}
            >
              <Text style={[s.billingText, billingCycle === cycle && s.billingTextOn]}>{cycle.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={s.planList}>
        {plans.map((plan) => {
          const selected = selectedPlan === plan.id;
          return (
            <Pressable
              key={plan.id}
              style={[s.plan, selected && s.planSelected]}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setSelectedPlan(plan.id);
              }}
            >
              <View style={s.planTop}>
                <View style={s.planInfo}>
                  <View style={[s.radio, selected && s.radioSelected]}>{selected && <I name="check" size={11} color="#FFF" />}</View>
                  <View style={s.planCopy}>
                    <View style={s.nameRow}>
                      <Text style={s.planName}>{plan.name}</Text>
                      {plan.badge && <Text style={s.badge}>{plan.badge}</Text>}
                    </View>
                    <Text style={s.description}>{plan.description}</Text>
                  </View>
                </View>
                <View style={s.price}>
                  <Text style={s.priceText}>{billingCycle === "monthly" ? plan.priceMonthly : plan.priceYearly}</Text>
                  <Text style={s.perUser}>PER USER / MONTH</Text>
                </View>
              </View>
              {selected && (
                <View style={s.features}>
                  {plan.featuresLabel && <Text style={s.featuresLabel}>{plan.featuresLabel}</Text>}
                  {plan.features.map((feature) => (
                    <View key={feature.text} style={s.featureRow}>
                      <I name="check" size={14} color={C.pink} />
                      <Text style={s.featureText}>{feature.text}</Text>
                      {feature.hasInfo && <I name="spark" size={13} color="#D4D0D2" />}
                    </View>
                  ))}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={s.footer}>
        <Text style={s.footerText}>Cancel anytime. No long-term contract.</Text>
        <Pressable style={s.continueButton} onPress={() => undefined}>
          <Text style={s.continueText}>Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { width: "100%", borderRadius: 24, backgroundColor: "#F5F3F4", padding: 7 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 9, paddingVertical: 13 },
  title: { fontSize: 17, fontWeight: "500", color: C.ink, letterSpacing: -0.5 },
  billingToggle: { flexDirection: "row", backgroundColor: "#E5E1E3", borderRadius: 18, padding: 3 },
  billingIndicator: { position: "absolute", left: 3, top: 3, width: 72, height: 29, borderRadius: 15, backgroundColor: "#FFF" },
  billingButton: { width: 72, paddingVertical: 7, borderRadius: 15, alignItems: "center", zIndex: 1 },
  billingText: { fontSize: 8, fontWeight: "900", letterSpacing: 1, color: "#999" },
  billingTextOn: { color: C.pink },
  planList: { gap: 6 },
  plan: { borderRadius: 18, backgroundColor: "#FFF", padding: 14, borderWidth: 1, borderColor: "#E5E1E3" },
  planSelected: { borderColor: C.pink, shadowColor: C.pink, shadowOpacity: 0.12, shadowRadius: 10, elevation: 2 },
  planTop: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  planInfo: { flex: 1, flexDirection: "row", gap: 10 },
  radio: { width: 19, height: 19, borderRadius: 10, borderWidth: 1.5, borderColor: "#CCC", alignItems: "center", justifyContent: "center" },
  radioSelected: { borderColor: C.pink, backgroundColor: C.pink },
  planCopy: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  planName: { fontSize: 15, fontWeight: "500", color: C.ink },
  badge: { fontSize: 8, fontWeight: "900", color: C.pink, backgroundColor: "#FFF0F6", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 9, textTransform: "uppercase" },
  description: { fontSize: 10, color: C.muted, lineHeight: 15, marginTop: 5 },
  price: { alignItems: "flex-end" },
  priceText: { fontSize: 15, fontWeight: "500", color: C.ink },
  perUser: { fontSize: 8, fontWeight: "900", letterSpacing: 1, color: "#AAA", marginTop: 4 },
  features: { borderTopWidth: 1, borderTopColor: "#EEE", marginTop: 13, paddingTop: 13, gap: 8 },
  featuresLabel: { fontSize: 9, fontWeight: "900", letterSpacing: 1, color: "#AAA", textTransform: "uppercase", marginBottom: 2 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureText: { fontSize: 11, color: "#666", flex: 1 },
  footer: { alignItems: "center", gap: 10, paddingHorizontal: 9, paddingVertical: 15 },
  footerText: { fontSize: 9, color: "#AAA", textAlign: "center" },
  continueButton: { minHeight: 42, paddingHorizontal: 28, borderRadius: 22, backgroundColor: C.pink, alignItems: "center", justifyContent: "center" },
  continueText: { color: "#FFF", fontSize: 13, fontWeight: "500" },
});