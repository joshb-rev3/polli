import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { Bzz, BzzPath } from "../components/Bzz";
import { Button } from "../components/Button";
import { Confetti } from "../components/Confetti";
import { Content } from "../components/Content";
import { IconCheck, IconClose, IconShare } from "../components/Icon";
import { NavBar } from "../components/NavBar";
import { FEED } from "../lib/mockData";
import {
  clearPayComplete,
  readPayComplete,
  type PayCompletePayload,
} from "../lib/payComplete";
import { useShare } from "../lib/share";
import { colors, fonts } from "../theme";

function paramOne(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default function PayComplete() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    note?: string;
    anon?: string;
    keepsake?: string;
  }>();
  const { openShare } = useShare();
  const [shown, setShown] = useState(false);
  const [stored, setStored] = useState<PayCompletePayload | null>(null);

  useEffect(() => {
    let alive = true;
    readPayComplete().then((payload) => {
      if (alive) setStored(payload);
    });
    return () => {
      alive = false;
    };
  }, []);

  const scale = useSharedValue(0.2);
  const rot = useSharedValue(-20);
  const op = useSharedValue(0);

  useEffect(() => {
    setTimeout(() => setShown(true), 80);
    scale.value = withDelay(80, withTiming(1, { duration: 600, easing: Easing.out(Easing.back()) }));
    rot.value = withDelay(80, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));
    op.value = withDelay(80, withTiming(1, { duration: 400 }));
  }, []);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rot.value}deg` }],
    opacity: op.value,
  }));

  const id = paramOne(params.id).trim() || stored?.id || "";
  const feedItem = FEED.find((f) => f.id === id);
  const name =
    paramOne(params.name).trim() || stored?.name || feedItem?.name || "them";
  const note = paramOne(params.note) || stored?.note || "";
  const anon = paramOne(params.anon) === "1" || Boolean(stored?.anon);
  const hasKeepsake = paramOne(params.keepsake) === "1" || Boolean(stored?.keepsake);
  const firstName = name.split(" ")[0] || name;

  const home = async () => {
    await clearPayComplete();
    router.replace("/(tabs)/feed");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.green }}>
      <NavBar
        variant="green"
        right={
          <Pressable onPress={home} style={{ padding: 8, opacity: 0.7 }}>
            <IconClose size={22} color={colors.green} />
          </Pressable>
        }
      />
      <Confetti count={24} />
      <BzzPath variant="pay" size={42} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <Content pad={0} style={styles.contentShell}>
        <View style={styles.body}>
          <Animated.View style={[styles.checkCircle, checkStyle]}>
            <IconCheck size={48} color="#fff" />
            {shown && (
              <View style={styles.cheerBee}>
                <Bzz pose="cheer" size={56} />
              </View>
            )}
          </Animated.View>

          <Text style={styles.title}>
            You just made{"\n"}
            <Text style={styles.titleAccent}>{firstName}'s day.</Text>
          </Text>
          <Text style={styles.sub}>
            Your $1 is on its way to{" "}
            <Text style={{ fontFamily: fonts.bodyBold }}>{name}</Text>
            {hasKeepsake ? ", along with your voice keepsake" : ""}. Pass the link along so it
            spreads.
          </Text>

          {note ? (
            <View style={styles.noteCard}>
              <Text style={styles.noteLbl}>YOUR NOTE</Text>
              <Text style={styles.noteText}>"{note}"</Text>
              <Text style={styles.noteMeta}>— {anon ? "anonymous bee 🐝" : "you"}</Text>
            </View>
          ) : null}

          <View style={styles.gardenCard}>
            <Text style={styles.gardenText}>
              🌼 <Text style={{ fontFamily: fonts.bodyBold }}>You're in the garden.</Text> For 12
              months, someone can pollinate{" "}
              <Text style={{ fontFamily: fonts.serifItalic }}>your</Text> day too.
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            full
            label="Pass it along"
            variant="marigold"
            icon={<IconShare size={16} color={colors.ink} />}
            onPress={() => openShare({ name })}
          />
          <Pressable style={styles.secondary} onPress={home}>
            <Text style={styles.secondaryText}>Back to feed</Text>
          </Pressable>
        </View>
        </Content>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: "space-between",
  },
  contentShell: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingBottom: 24,
  },
  body: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  checkCircle: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.sage,
    shadowOpacity: 0.4,
    shadowRadius: 24,
  },
  cheerBee: {
    position: "absolute",
    top: -26,
    right: -20,
  },
  title: {
    fontFamily: fonts.serifHeavy,
    fontSize: 44,
    lineHeight: 46,
    color: colors.cream,
    textAlign: "center",
    marginTop: 30,
    letterSpacing: -0.44,
  },
  titleAccent: {
    fontFamily: fonts.serifItalic,
    color: colors.marigold,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.cream,
    opacity: 0.85,
    marginTop: 14,
    textAlign: "center",
    maxWidth: 320,
    lineHeight: 24,
  },
  noteCard: {
    marginTop: 22,
    padding: 18,
    backgroundColor: "rgba(248,249,244,0.12)",
    borderWidth: 1,
    borderColor: "rgba(248,249,244,0.25)",
    borderRadius: 14,
    maxWidth: 340,
  },
  noteLbl: {
    color: colors.marigold,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 6,
  },
  noteText: {
    fontFamily: fonts.serifItalic,
    fontSize: 15,
    color: colors.cream,
    lineHeight: 22,
  },
  noteMeta: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.cream,
    opacity: 0.7,
    marginTop: 8,
  },
  gardenCard: {
    marginTop: 28,
    padding: 16,
    backgroundColor: "rgba(248,249,244,0.12)",
    borderWidth: 1,
    borderColor: "rgba(248,249,244,0.2)",
    borderRadius: 14,
  },
  gardenText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.cream,
    lineHeight: 20,
    textAlign: "center",
  },
  actions: {
    padding: 24,
    paddingBottom: 40,
    gap: 10,
  },
  secondary: {
    borderWidth: 1,
    borderColor: "rgba(248,249,244,0.3)",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  secondaryText: {
    color: colors.cream,
    fontFamily: fonts.bodySemi,
    fontSize: 15,
  },
});
