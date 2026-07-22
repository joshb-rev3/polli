import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/Button";
import { IconArrow } from "../../components/Icon";
import { NavBar } from "../../components/NavBar";
import { formatCents, useDemoWallet } from "../../lib/demoWallet";
import { colors, fonts, shadows } from "../../theme";

export default function PayoutCashout() {
  const router = useRouter();
  const { balanceCents, connectReady, markConnectReady, simulateCashout } = useDemoWallet();
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"setup" | "confirm">(connectReady ? "confirm" : "setup");

  const runSetup = async () => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 900));
    markConnectReady();
    setStep("confirm");
    setBusy(false);
  };

  const runCashout = async () => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 700));
    simulateCashout();
    setBusy(false);
    router.replace({ pathname: "/payout/complete", params: { method: "cashout" } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <NavBar back title="Back" variant="paper" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {step === "setup" ? (
            <>
              <Text style={styles.title}>Link your bank</Text>
              <Text style={styles.sub}>
                To cash out {formatCents(balanceCents)}, we'll simulate Stripe Connect onboarding — ID check and
                a debit card or bank account.
              </Text>
              <View style={styles.bullets}>
                <Text style={styles.bullet}>• Takes under 2 minutes</Text>
                <Text style={styles.bullet}>• Stripe handles verification</Text>
                <Text style={styles.bullet}>• Funds usually arrive in 1–2 business days</Text>
              </View>
              <Button
                full
                label={busy ? "Connecting…" : "Simulate Stripe setup"}
                onPress={runSetup}
                disabled={busy}
                iconRight={busy ? <ActivityIndicator color={colors.green} /> : <IconArrow size={18} color={colors.green} />}
              />
            </>
          ) : (
            <>
              <View style={styles.readyPill}>
                <Text style={styles.readyText}>✓ Bank linked (simulated)</Text>
              </View>
              <Text style={styles.title}>Send to your bank</Text>
              <Text style={styles.sub}>
                Confirm cashing out your full Polli balance. This is a simulation — no real transfer will be made.
              </Text>
              <View style={styles.amountBox}>
                <Text style={styles.amountLabel}>You'll receive</Text>
                <Text style={styles.amountValue}>{formatCents(balanceCents)}</Text>
              </View>
              <Button
                full
                label={busy ? "Sending…" : `Cash out ${formatCents(balanceCents)}`}
                variant="marigold"
                onPress={runCashout}
                disabled={busy || balanceCents < 100}
              />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 32,
    borderTopLeftRadius: 8,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.line2,
    gap: 16,
    ...shadows.card,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 28,
    color: colors.ink,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink2,
    lineHeight: 22,
  },
  bullets: {
    gap: 6,
    marginBottom: 4,
  },
  bullet: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },
  readyPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.sageSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  readyText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.green,
  },
  amountBox: {
    backgroundColor: colors.cream,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line2,
    marginBottom: 4,
  },
  amountLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.ink2,
  },
  amountValue: {
    fontFamily: fonts.serifHeavy,
    fontSize: 36,
    color: colors.green,
    marginTop: 4,
  },
});
