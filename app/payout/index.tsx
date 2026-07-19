import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { NavBar } from "../../components/NavBar";
import {
  DEMO_NOMINATION_FROM,
  DEMO_NOMINATION_REASON,
  formatCents,
  useDemoWallet,
} from "../../lib/demoWallet";
import { colors, fonts, shadows } from "../../theme";

export default function PayoutChoose() {
  const router = useRouter();
  const { balanceCents } = useDemoWallet();

  const skip = () => router.replace("/(tabs)/profile");

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <NavBar
        variant="paper"
        right={
          <Pressable onPress={skip} style={{ padding: 8 }}>
            <Text style={styles.later}>Later</Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>YOUR NOMINATION CLOSED</Text>
        <Text style={styles.title}>
          Kindness{"\n"}
          <Text style={{ color: colors.green }}>found you.</Text>
        </Text>
        <Text style={styles.sub}>
          {DEMO_NOMINATION_FROM} nominated you for {DEMO_NOMINATION_REASON}. Friends piled on — here's what's
          yours to use.
        </Text>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available balance</Text>
          <Text style={styles.balanceValue}>{formatCents(balanceCents)}</Text>
          <Text style={styles.balanceHint}>Every dollar went straight to you. Choose how you'd like it.</Text>
        </View>

        <Text style={styles.chooseLabel}>How would you like it?</Text>

        <Pressable
          style={styles.option}
          onPress={() => router.push("/payout/cashout")}
        >
          <View style={[styles.optionIcon, { backgroundColor: colors.sageSoft }]}>
            <Text style={{ fontSize: 22 }}>🏦</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>Cash out to bank</Text>
            <Text style={styles.optionSub}>Link a debit card or bank account via Stripe. Usually 1–2 business days.</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Pressable
          style={styles.option}
          onPress={() => router.push("/payout/gift-card")}
        >
          <View style={[styles.optionIcon, { backgroundColor: colors.coralSoft }]}>
            <Text style={{ fontSize: 22 }}>🎁</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>Get a gift card</Text>
            <Text style={styles.optionSub}>Pick a brand and spend it today. Digital delivery to this account.</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Text style={styles.fine}>
          This is a simulated payout experience for Apple Sign In. You can finish later from Profile.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 24,
    paddingBottom: 48,
    gap: 14,
  },
  later: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink2,
  },
  eyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.88,
    color: colors.ink2,
    marginTop: 8,
  },
  title: {
    fontFamily: fonts.serifHeavy,
    fontSize: 36,
    lineHeight: 38,
    color: colors.ink,
    marginTop: 4,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink2,
    marginBottom: 8,
  },
  balanceCard: {
    backgroundColor: colors.green,
    borderRadius: 20,
    padding: 22,
    gap: 6,
    ...shadows.card,
  },
  balanceLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.cream,
    opacity: 0.7,
  },
  balanceValue: {
    fontFamily: fonts.serifHeavy,
    fontSize: 44,
    color: colors.marigold,
    letterSpacing: -1,
  },
  balanceHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.cream,
    opacity: 0.8,
    marginTop: 4,
  },
  chooseLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.ink,
    marginTop: 12,
    letterSpacing: 0.2,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line2,
    padding: 16,
    ...shadows.card,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.ink,
  },
  optionSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.ink2,
    marginTop: 3,
  },
  chevron: {
    fontFamily: fonts.serifBold,
    fontSize: 28,
    color: colors.ink2,
    opacity: 0.5,
    marginTop: -4,
  },
  fine: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink2,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 17,
  },
});
