import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { Button } from "../../components/Button";
import { Confetti } from "../../components/Confetti";
import { IconCheck, IconClose } from "../../components/Icon";
import { NavBar } from "../../components/NavBar";
import { formatCents, useDemoWallet } from "../../lib/demoWallet";
import { colors, fonts } from "../../theme";

export default function PayoutComplete() {
  const router = useRouter();
  const { method, brand } = useLocalSearchParams<{ method?: string; brand?: string }>();
  const { lastAmountCents, lastBrand } = useDemoWallet();

  const scale = useSharedValue(0.2);
  const op = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(80, withTiming(1, { duration: 560, easing: Easing.out(Easing.back()) }));
    op.value = withDelay(80, withTiming(1, { duration: 360 }));
  }, []);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: op.value,
  }));

  const isGift = method === "giftcard";
  const brandName = brand || lastBrand || "gift card";
  const amount = formatCents(lastAmountCents || 0);

  const done = () => router.replace("/(tabs)/profile");

  return (
    <View style={{ flex: 1, backgroundColor: colors.green }}>
      <NavBar
        variant="green"
        right={
          <Pressable onPress={done} style={{ padding: 8, opacity: 0.7 }}>
            <IconClose size={22} color={colors.green} />
          </Pressable>
        }
      />
      <Confetti count={20} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.checkCircle, checkStyle]}>
          <IconCheck size={44} color="#fff" />
        </Animated.View>

        <Text style={styles.title}>
          {isGift ? "Gift card on the way." : "Cash is on the way."}
        </Text>
        <Text style={styles.sub}>
          {isGift
            ? `Your ${amount} ${brandName} card is ready (simulated). Treat yourself — you earned this kindness.`
            : `${amount} is headed to your linked bank (simulated). It usually lands in 1–2 business days.`}
        </Text>

        <View style={styles.box}>
          <Text style={styles.boxLabel}>{isGift ? "Gift card" : "Bank transfer"}</Text>
          <Text style={styles.boxValue}>{amount}</Text>
          {isGift && <Text style={styles.boxMeta}>{brandName}</Text>}
        </View>

        <Button full label="Back to profile" variant="marigold" onPress={done} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 28,
    paddingTop: 40,
    alignItems: "center",
    gap: 16,
  },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.marigold,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.serifHeavy,
    fontSize: 32,
    lineHeight: 36,
    color: colors.cream,
    textAlign: "center",
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.cream,
    opacity: 0.85,
    textAlign: "center",
    maxWidth: 320,
  },
  box: {
    width: "100%",
    marginTop: 8,
    marginBottom: 8,
    padding: 20,
    borderRadius: 16,
    backgroundColor: "rgba(248,249,244,0.1)",
    borderWidth: 1,
    borderColor: "rgba(248,249,244,0.14)",
    alignItems: "center",
  },
  boxLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.cream,
    opacity: 0.65,
  },
  boxValue: {
    fontFamily: fonts.serifHeavy,
    fontSize: 36,
    color: colors.marigold,
    marginTop: 4,
  },
  boxMeta: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.cream,
    marginTop: 4,
    opacity: 0.8,
  },
});
