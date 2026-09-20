import React, { useState } from "react";
import { Alert, LayoutAnimation, Pressable, StyleSheet, Text, View } from "react-native";
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

const cardDefinitions = [
  { id: "available", title: "Available balance", color: C.pink, icon: "wallet" },
  { id: "pending", title: "Pending balance", color: C.plum, icon: "receipt" },
  { id: "lifetime", title: "Lifetime earnings", color: C.ink, icon: "chart" },
  { id: "withdrawals", title: "Withdrawals", color: "#B06B92", icon: "arrow" },
] as const;

export default function SellerBalancePayouts({
  available,
  pendingBalance,
  lifetimeEarnings,
  withdrawals,
  transactions,
  withdrawing,
  onConfirm,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(0);

  const values: Record<string, number> = {
    available,
    pending: pendingBalance,
    lifetime: lifetimeEarnings,
    withdrawals,
  };
  const cards = cardDefinitions.map((card) => ({ ...card, value: money(values[card.id]) }));
  const active = cards.find((card) => card.id === activeId);
  const secondary = cards.filter((card) => card.id !== activeId);
  const presets = Array.from(new Set([available, Math.round(available * 0.5 * 100) / 100, Math.min(100, available)].filter((value) => value > 0))).slice(0, 3);

  const selectCard = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    setActiveId((current) => (current === id ? null : id));
  };

  const selectWithdrawal = (amount: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedAmount(amount);
  };

  const confirmWithdrawal = async () => {
    if (selectedAmount <= 0) {
      Alert.alert("Nothing available to withdraw", "Paid order earnings will appear here when they clear.");
      return;
    }
    await onConfirm(selectedAmount);
    setWithdrawOpen(false);
  };

  return (
    <View style={s.wrap}>
      <View style={s.balanceWrap}>
        {active && (
          <View style={[s.balanceExpanded, { backgroundColor: active.color }]}>
            <View style={s.balanceTop}>
              <I name={active.icon} size={38} color="#FFF" filled />
              <Pressable style={s.copyPill} onPress={() => Alert.alert(active.title, active.value)}>
                <Text style={s.copyText}>View</Text>
              </Pressable>
            </View>
            <View style={s.balanceBottom}>
              <View style={s.balanceCopy}>
                <Text style={s.balanceExpandedTitle}>{active.title}</Text>
                <Text style={s.balanceExpandedValue}>{active.value}</Text>
              </View>
              <Pressable style={s.editPill} onPress={() => selectCard(active.id)}>
                <Text style={s.editText}>Close</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={[s.balanceGrid, active && s.balanceGridActive]}>
          {secondary.map((card) => (
            <Pressable key={card.id} style={[s.balanceCard, active && s.balanceCardActive, { backgroundColor: card.color }]} onPress={() => selectCard(card.id)}>
              <View style={s.balanceCardTop}>
                <I name={card.icon} size={active ? 20 : 27} color="#FFF" filled />
                <View style={s.morePill}><Text style={s.moreText}>•••</Text></View>
              </View>
              <View>
                <Text numberOfLines={1} style={[s.balanceCardTitle, active && s.balanceCardTitleSmall]}>{card.title}</Text>
                <Text numberOfLines={1} style={[s.balanceCardValue, active && s.balanceCardValueSmall]}>{card.value}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {!withdrawOpen ? (
        <Pressable style={[s.withdrawDisclosure, available <= 0 && s.withdrawDisabled]} onPress={() => { setWithdrawOpen(true); if (selectedAmount <= 0) setSelectedAmount(presets[1] || presets[0] || 0); }}>
          <View style={s.walletBadge}><I name="wallet" size={23} color={C.ink} filled /></View>
          <View style={s.withdrawCopy}>
            <Text style={s.withdrawDisclosureLabel}>AVAILABLE TO WITHDRAW</Text>
            <Text style={s.withdrawDisclosureBalance}>{money(available)}</Text>
          </View>
          <View style={s.withdrawOpen}><Text style={s.withdrawOpenText}>Withdraw</Text></View>
        </Pressable>
      ) : (
        <View style={s.withdrawExpanded}>
          <View style={s.withdrawHeader}>
            <View>
              <Text style={s.paymentLabel}>Withdraw available balance</Text>
              <Text style={s.muted}>{money(available)} ready to request</Text>
            </View>
            <Pressable style={s.closeButton} onPress={() => setWithdrawOpen(false)}><Text style={s.closeText}>×</Text></Pressable>
          </View>
          <View style={s.divider} />
          <Text style={s.paymentLabel}>Amount</Text>
          <View style={s.amountRow}>
            {presets.length ? presets.map((amount) => (
              <Pressable key={amount} style={[s.amountChoice, selectedAmount === amount && s.amountChoiceOn]} onPress={() => selectWithdrawal(amount)}>
                <Text style={[s.amountText, selectedAmount === amount && s.amountTextOn]}>{money(amount)}</Text>
              </Pressable>
            )) : <Text style={s.muted}>There are no cleared earnings to withdraw yet.</Text>}
          </View>
          <Pressable style={[s.confirmWithdraw, (withdrawing || !presets.length) && s.disabled]} disabled={withdrawing} onPress={confirmWithdrawal}>
            <Text style={s.withdrawText}>{withdrawing ? "Requesting…" : "Request withdrawal"}</Text>
            <I name="arrow" size={17} color="#FFF" />
          </Pressable>
        </View>
      )}

      <Text style={s.section}>Transactions</Text>
      {transactions.length ? transactions.map((row) => (
        <View key={row.id} style={s.row}>
          <View style={s.rowIcon}><I name="receipt" size={17} color="#FFF" filled /></View>
          <View style={s.rowCopy}>
            <Text style={s.rowTitle}>{money(row.amount)}</Text>
            <Text style={s.muted}>{row.status || "pending"} · {new Date(row.created_at).toLocaleDateString()}</Text>
          </View>
          <Text style={s.status}>{String(row.fulfillment_status || "pending").replaceAll("_", " ")}</Text>
        </View>
      )) : (
        <View style={s.empty}>
          <View style={s.emptyIcon}><I name="receipt" size={21} color="#FFF" filled /></View>
          <Text style={s.emptyTitle}>No transactions yet</Text>
          <Text style={s.muted}>Paid orders and recorded withdrawals will appear here.</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { width: "100%" },
  balanceWrap: { gap: 10 },
  balanceExpanded: { minHeight: 192, borderRadius: 30, padding: 18, justifyContent: "space-between" },
  balanceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  copyPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#FFFFFF22" },
  copyText: { color: "#FFF", fontWeight: "900", fontSize: 11 },
  balanceBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 28 },
  balanceCopy: { flex: 1, paddingRight: 8 },
  balanceExpandedTitle: { fontSize: 19, fontWeight: "900", color: "#FFF" },
  balanceExpandedValue: { fontSize: 17, fontWeight: "800", color: "#FFFFFFAA", marginTop: 3 },
  editPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: "#FFFFFF55" },
  editText: { fontSize: 11, fontWeight: "900", color: "#FFF" },
  balanceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  balanceGridActive: { flexWrap: "nowrap" },
  balanceCard: { flex: 1, minWidth: "47%", height: 132, borderRadius: 24, padding: 14, justifyContent: "space-between" },
  balanceCardActive: { minWidth: 0, height: 100, borderRadius: 20, padding: 10 },
  balanceCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  balanceCardTitle: { fontSize: 13, fontWeight: "800", color: "#FFF" },
  balanceCardValue: { fontSize: 15, fontWeight: "900", color: "#FFFFFFAA", marginTop: 4 },
  balanceCardTitleSmall: { fontSize: 10 },
  balanceCardValueSmall: { fontSize: 11 },
  morePill: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#FFFFFF22", alignItems: "center", justifyContent: "center" },
  moreText: { color: "#FFF", fontWeight: "900", fontSize: 12, letterSpacing: -1 },
  withdrawDisclosure: { minHeight: 78, borderRadius: 24, backgroundColor: C.pink, padding: 10, flexDirection: "row", alignItems: "center", gap: 10, marginTop: 13 },
  withdrawDisabled: { opacity: 0.72 },
  walletBadge: { width: 48, height: 48, borderRadius: 15, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center" },
  withdrawCopy: { flex: 1 },
  withdrawDisclosureLabel: { fontSize: 10, color: "#FFFFFFAA", fontWeight: "800", letterSpacing: 1 },
  withdrawDisclosureBalance: { fontSize: 17, fontWeight: "900", color: "#FFF", marginTop: 2 },
  withdrawOpen: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 20, backgroundColor: "#FFFFFF33" },
  withdrawOpenText: { fontSize: 11, fontWeight: "900", color: "#FFF" },
  withdrawExpanded: { borderRadius: 24, backgroundColor: "#FFF", padding: 13, marginTop: 13 },
  withdrawHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  closeButton: { width: 31, height: 31, borderRadius: 16, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 22, color: C.muted, lineHeight: 25 },
  divider: { height: 1, backgroundColor: "#EEE", marginVertical: 13 },
  paymentLabel: { fontSize: 12, fontWeight: "900", color: C.muted },
  amountRow: { flexDirection: "row", gap: 7, marginTop: 8, minHeight: 39, alignItems: "center" },
  amountChoice: { flex: 1, minHeight: 39, borderRadius: 12, borderWidth: 1, borderColor: "#ECE7EA", alignItems: "center", justifyContent: "center", backgroundColor: C.bg, paddingHorizontal: 4 },
  amountChoiceOn: { borderColor: C.pink, backgroundColor: "#FFF0F6" },
  amountText: { fontSize: 11, fontWeight: "800", color: C.ink },
  amountTextOn: { color: C.pink },
  confirmWithdraw: { minHeight: 45, borderRadius: 23, backgroundColor: C.pink, paddingHorizontal: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 13 },
  withdrawText: { color: "#FFF", fontWeight: "900" },
  disabled: { opacity: 0.6 },
  section: { fontSize: 17, fontWeight: "900", marginTop: 22, marginBottom: 9, color: C.ink },
  row: { minHeight: 64, borderRadius: 19, backgroundColor: "#FFF", padding: 12, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 10 },
  rowIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" },
  rowCopy: { flex: 1 },
  rowTitle: { fontSize: 13, fontWeight: "900", color: C.ink },
  status: { color: C.ink, fontSize: 11, fontWeight: "900", textTransform: "capitalize", maxWidth: 90, textAlign: "right" },
  empty: { padding: 25, borderRadius: 22, backgroundColor: "#FFF", alignItems: "center" },
  emptyIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "900", marginTop: 8, color: C.ink },
  muted: { fontSize: 11, color: C.muted, marginTop: 4 },
});