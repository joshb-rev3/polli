import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Bzz, BzzPath } from "../components/Bzz";
import { Button } from "../components/Button";
import { Confetti } from "../components/Confetti";
import { IconClose, IconHeart, IconLink, IconShare } from "../components/Icon";
import { NavBar } from "../components/NavBar";
import { useNomination } from "../lib/nomination";
import { useShare } from "../lib/share";
import { useTone } from "../lib/tone";
import { colors, fonts } from "../theme";

export default function LaunchComplete() {
  const router = useRouter();
  const { draft, reset } = useNomination();
  const { copy } = useTone();
  const { openShare } = useShare();

  const firstName = draft.first || "their";
  const slug = `${(draft.first || "me").toLowerCase()}-${(draft.last || "x").toLowerCase()}`;
  const url = `polli.to/${slug}`;

  const home = () => {
    reset();
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
      <Confetti count={20} />
      <BzzPath variant="launch" size={44} />
      <BzzPath variant="launch" size={36} delay={1.8} style={{ left: "55%" }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <View style={styles.body}>
          <View style={styles.checkCircle}>
            <IconHeart size={44} color="#fff" />
            <View style={styles.waveBee}>
              <Bzz pose="wave" size={52} />
            </View>
          </View>

          <Text style={styles.title}>
            <Text style={styles.titleAccent}>{firstName}'s polli</Text>
            {"\n"}
            {copy.launch_title}
          </Text>
          <Text style={styles.sub}>{copy.launch_sub}</Text>

          <View style={styles.urlChip}>
            <IconLink size={14} color={colors.cream} />
            <Text style={styles.urlText}>{url}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <Button
            full
            label="Pass it along"
            variant="marigold"
            icon={<IconShare size={16} color={colors.ink} />}
            onPress={() => openShare({ name: `${draft.first} ${draft.last}`, slug })}
          />
          <Pressable style={styles.secondary} onPress={home}>
            <Text style={styles.secondaryText}>Later</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: "space-between",
  },
  body: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  checkCircle: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: colors.coral,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: colors.coral,
    shadowOpacity: 0.5,
    shadowRadius: 24,
  },
  waveBee: {
    position: "absolute",
    top: -24,
    right: -18,
  },
  title: {
    fontFamily: fonts.serifHeavy,
    fontSize: 42,
    lineHeight: 44,
    color: colors.cream,
    textAlign: "center",
    marginTop: 28,
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
  urlChip: {
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(248,249,244,0.12)",
    borderWidth: 1,
    borderColor: "rgba(248,249,244,0.35)",
    borderStyle: "dashed",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  urlText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.cream,
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
