import React, { useRef, useState } from "react";
import { Alert, Animated, Easing, LayoutAnimation, Pressable, StyleSheet, Text, View } from "react-native";
import { C } from "../constants/theme";
import { I } from "./Icons";

type Transaction = { id: string; amount: number; status?: string; created_at: string; fulfillment_status?: string };
type Props = {
  available: number;
  pendingBalance: number;
  lifetimeEarnings: number;
  withdrawals: number;
  transactions: Transaction[];
  withdrawing: boolean;
  onConfirm: (amount: number) => Promise<void>;
};

const money = (value: number) => "GH₵ " + Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SellerBalancePayouts({ available, pendingBalance, lifetimeEarnings, withdrawals, transactions, withdrawing, onConfirm }: Props) {
  const cards = [
    { id: "available", title: "Available balance", value: money(available), icon: "wallet", color: C.pink },
    { id: "pending", title: "Pending balance", value: money(pendingBalance), icon: "receipt", color: C.plum },
    { id: "lifetime", title: "Lifetime earnings", value: money(lifetimeEarnings), icon: "chart", color: C.ink },
    { id: "withdrawals", title: "Withdrawals", value: money(withdrawals), icon: "arrow", color: "#B06B92" },
  ];
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = cards.find((card) => card.id === activeId);
  const visible = active ? cards.filter((card) => card.id !== active.id) : cards;
  const presets = Array.from(new Set([available, Math.round(available * 0.5 * 100) / 100, Math.min(100, available)].filter((value) => value > 0))).slice(0, 3);
  const [open, setOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(available);
  const [done, setDone] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  const close = () => {
    setOpen(false);
    setDone(false);
    progress.setValue(0);
  };

  const confirm = async () => {
    if (selectedAmount <= 0) return;
    Animated.timing(progress, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: false }).start();
    await onConfirm(selectedAmount);
    setDone(true);
    setTimeout(close, 1500);
  };

  return (
    <>
      <View style={s.carousel}>
        {active && (
          <View style={[s.expanded, { backgroundColor: active.color }]}>
            <View style={s.expandedTop}>
              <I name={active.icon} size={38} color="#FFF" filled />
              <Pressable style={s.copyPill} onPress={() => Alert.alert(active.title, active.value)}><Text style={s.copyText}>View</Text></Pressable>
            </View>
            <View style={s.expandedBottom}>
              <View><Text style={s.expandedTitle}>{active.title}</Text><Text style={s.expandedValue}>{active.value}</Text></View>
              <Pressable style={s.editPill} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.spring); setActiveId(null); }}><Text style={s.editText}>Edit</Text></Pressable>
            </View>
          </View>
        )}
        <View style={[s.grid, active && s.gridActive]}>
          {visible.map((card) => (
            <Pressable key={card.id} style={[s.smallCard, { backgroundColor: card.color }]} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.spring); setActiveId(card.id); }}>
              <View style={s.cardTop}><I name={card.icon} size={active ? 20 : 28} color="#FFF" filled /><View style={s.more}><Text style={s.moreText}>•••</Text></View></View>
              <View><Text style={[s.cardTitle, active && s.cardTitleSmall]}>{card.title}</Text><Text style={[s.cardValue, active && s.cardValueSmall]}>{card.value}</Text></View>
            </Pressable>
          ))}
        </View>
      </View>

      {!open ? (
        <Pressable style={s.walletDisclosure} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.spring); setOpen(true); setSelectedAmount(available); }}>
          <View style={s.walletIcon}><I name="wallet" size={24} color="#D1D0D7" filled /></View>
          <View style={{ flex: 1 }}><Text style={s.walletLabel}>Wallet</Text><Text style={s.walletBalance}>{money(available)}</Text></View>
          <View style={s.withdrawButton}><Text style={s.withdrawButtonText}>Withdraw</Text></View>
        </Pressable>
      ) : (
        <View style={s.walletExpanded}>
          <View style={s.walletHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><View style={s.walletIcon}><I name="wallet" size={22} color="#D1D0D7" filled /></View><View><Text style={s.walletLabel}>Wallet</Text><Text style={s.walletBalance}>{money(available)}</Text></View></View>
            <Pressable style={s.closeButton} onPress={close}><Text style={s.closeText}>×</Text></Pressable>
          </View>
          <View style={s.divider} />
          <Text style={s.amountLabel}>Amount</Text>
          <View style={s.amountRow}>{presets.length ? presets.map((amount) => <Pressable key={amount} style={[s.amountChoice, selectedAmount === amount && s.amountChoiceOn]} onPress={() => setSelectedAmount(amount)}><Text style={[s.amountText, selectedAmount === amount && s.amountTextOn]}>{money(amount)}</Text></Pressable>) : <Text style={s.muted}>No available balance yet.</Text>}</View>
          <Pressable style={[s.confirm, (withdrawing || done) && s.disabled]} onPress={confirm} disabled={withdrawing || done || selectedAmount <= 0}>
            {done ? <Text style={s.actionText}>Done ✓</Text> : withdrawing ? <View style={s.progressTrack}><Animated.View style={[s.progressFill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} /></View> : <><I name="arrow" size={18} color="#FFF" /><Text style={s.actionText}>Withdraw {money(selectedAmount)}</Text></>}
          </Pressable>
        </View>
      )}

      <Text style={s.section}>Transactions</Text>
      {transactions.length ? transactions.map((row) => <View key={row.id} style={s.transaction}><View style={s.transactionIcon}><I name="receipt" size={17} color="#FFF" filled /></View><View style={{ flex: 1 }}><Text style={s.transactionTitle}>{money(row.amount)}</Text><Text style={s.muted}>{row.status} · {new Date(row.created_at).toLocaleDateString()}</Text></View><Text style={s.status}>{String(row.fulfillment_status || "pending").replaceAll("_", " ")}</Text></View>) : <View style={s.empty}><Text style={s.muted}>No order transactions have been recorded for this shop yet.</Text></View>}
    </>
  );
}

const s = StyleSheet.create({
  carousel: { gap: 10 },
  expanded: { minHeight: 192, borderRadius: 30, padding: 18, justifyContent: "space-between" },
  expandedTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  copyPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#FFFFFF22" },
  copyText: { color: "#FFF", fontWeight: "900", fontSize: 11 },
  expandedBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 28 },
  expandedTitle: { fontSize: 19, fontWeight: "900", color: "#FFF" },
  expandedValue: { fontSize: 17, fontWeight: "800", color: "#FFFFFFAA", marginTop: 3 },
  editPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: "#FFFFFF55" },
  editText: { fontSize: 11, fontWeight: "900", color: "#FFF" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  gridActive: { flexWrap: "nowrap" },
  smallCard: { flex: 1, minWidth: "47%", height: 132, borderRadius: 24, padding: 14, justifyContent: "space-between" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardTitle: { fontSize: 13, fontWeight: "800", color: "#FFF" },
  cardValue: { fontSize: 15, fontWeight: "900", color: "#FFFFFFAA", marginTop: 4 },
  cardTitleSmall: { fontSize: 10 },
  cardValueSmall: { fontSize: 11 },
  more: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#FFFFFF22", alignItems: "center", justifyContent: "center" },
  moreText: { color: "#FFF", fontWeight: "900", fontSize: 12, letterSpacing: -1 },
  walletDisclosure: { minHeight: 78, borderRadius: 24, borderWidth: 1, borderColor: "#ECECEC", backgroundColor: "#FFF", padding: 10, flexDirection: "row", alignItems: "center", gap: 10, marginTop: 13 },
  walletExpanded: { borderRadius: 24, borderWidth: 1, borderColor: "#ECECEC", backgroundColor: "#FFF", padding: 13, marginTop: 13 },
  walletHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  walletIcon: { width: 48, height: 48, borderRadius: 15, borderWidth: 1.5, borderColor: "#ECECEC", backgroundColor: "#F4F4F4", alignItems: "center", justifyContent: "center" },
  walletLabel: { fontSize: 10, color: "#9C9BA2", fontWeight: "800", letterSpacing: 1 },
  walletBalance: { fontSize: 17, fontWeight: "900", color: "#010103", marginTop: 2 },
  withdrawButton: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 20, backgroundColor: "#262629" },
  withdrawButtonText: { fontSize: 11, fontWeight: "900", color: "#FEFEFE" },
  closeButton: { width: 31, height: 31, borderRadius: 16, backgroundColor: "#F0EFF8", alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 22, color: "#ACABB7", lineHeight: 25 },
  divider: { height: 1, backgroundColor: "#ECECEC", marginVertical: 13 },
  amountLabel: { fontSize: 12, fontWeight: "900", color: "#848488" },
  amountRow: { flexDirection: "row", gap: 7, marginTop: 8 },
  amountChoice: { flex: 1, minHeight: 39, borderRadius: 12, borderWidth: 1, borderColor: "#ECECEC", alignItems: "center", justifyContent: "center", backgroundColor: "#F6F5FA" },
  amountChoiceOn: { borderColor: "#010103", backgroundColor: "#FEFEFE" },
  amountText: { fontSize: 11, fontWeight: "800", color: "#000" },
  amountTextOn: { color: "#000" },
  confirm: { minHeight: 45, borderRadius: 23, backgroundColor: "#262629", paddingHorizontal: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 13 },
  progressTrack: { height: 45, flex: 1, borderRadius: 23, backgroundColor: "#AFAEB8", overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#FEFEFE" },
  actionText: { color: "#FFF", fontWeight: "900" },
  disabled: { opacity: 0.6 },
  section: { fontSize: 17, fontWeight: "900", marginTop: 22, marginBottom: 9, color: C.ink },
  transaction: { minHeight: 64, borderRadius: 19, backgroundColor: "#FFF", padding: 12, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 10 },
  transactionIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" },
  transactionTitle: { fontSize: 13, fontWeight: "900", color: C.ink },
  status: { color: C.ink, fontSize: 11, fontWeight: "900", textTransform: "capitalize" },
  muted: { fontSize: 11, color: C.muted, marginTop: 4 },
  empty: { padding: 25, borderRadius: 22, backgroundColor: "#FFF", alignItems: "center" },
});