import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/Button";
import { NavBar } from "../../components/NavBar";
import { formatCents, GIFT_CARD_BRANDS, useDemoWallet } from "../../lib/demoWallet";
import { colors, fonts, shadows } from "../../theme";

export default function PayoutGiftCard() {
  const router = useRouter();
  const { balanceCents, simulateGiftCard } = useDemoWallet();
  const [brandId, setBrandId] = useState(GIFT_CARD_BRANDS[0].id);
  const [busy, setBusy] = useState(false);

  const selected = GIFT_CARD_BRANDS.find((b) => b.id === brandId)!;

  const redeem = async () => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 800));
    simulateGiftCard(brandId);
    setBusy(false);
    router.replace({
      pathname: "/payout/complete",
      params: { method: "giftcard", brand: selected.name },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <NavBar back title="Back" variant="paper" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Pick a gift card</Text>
        <Text style={styles.sub}>
          Spend {formatCents(balanceCents)} at a place you love. Digital card lands in your account — simulated for
          this demo.
        </Text>

        <View style={styles.grid}>
          {GIFT_CARD_BRANDS.map((b) => {
            const on = b.id === brandId;
            return (
              <Pressable
                key={b.id}
                style={[styles.brand, on && styles.brandOn]}
                onPress={() => setBrandId(b.id)}
              >
                <View style={[styles.brandIcon, { backgroundColor: b.tint + "22" }]}>
                  <Text style={{ fontSize: 22 }}>{b.emoji}</Text>
                </View>
                <Text style={[styles.brandName, on && { color: colors.green }]}>{b.name}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>You'll get</Text>
          <Text style={styles.summaryValue}>
            {formatCents(balanceCents)} {selected.name} card
          </Text>
        </View>

        <Button
          full
          label={busy ? "Redeeming…" : `Redeem ${formatCents(balanceCents)}`}
          variant="marigold"
          onPress={redeem}
          disabled={busy || balanceCents < 100}
          icon={busy ? <ActivityIndicator color={colors.green} /> : undefined}
        />
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
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 30,
    color: colors.ink,
    marginTop: 4,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink2,
    marginBottom: 6,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  brand: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.line2,
    padding: 14,
    gap: 10,
    ...shadows.card,
  },
  brandOn: {
    borderColor: colors.green,
    backgroundColor: colors.sageSoft,
  },
  brandIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.ink,
  },
  summary: {
    marginTop: 8,
    padding: 18,
    backgroundColor: colors.cream,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line2,
  },
  summaryLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.ink2,
  },
  summaryValue: {
    fontFamily: fonts.serifBold,
    fontSize: 22,
    color: colors.ink,
    marginTop: 4,
  },
});
