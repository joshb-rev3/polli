import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Bzz, BzzPath } from "../components/Bzz";
import { Button } from "../components/Button";
import { Confetti } from "../components/Confetti";
import { IconClose, IconHeart, IconLink, IconShare } from "../components/Icon";
import { NavBar } from "../components/NavBar";
import { hasVoiceKeepsake, useNomination } from "../lib/nomination";
import { SITE_HOST } from "../lib/seo";
import { useShare } from "../lib/share";
import { useTone } from "../lib/tone";
import { colors, fonts } from "../theme";

function paramOne(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default function LaunchComplete() {
  const router = useRouter();
  const params = useLocalSearchParams<{ first?: string; last?: string; keepsake?: string }>();
  const { draft, reset } = useNomination();
  const { copy } = useTone();
  const { openShare } = useShare();
  const [copied, setCopied] = useState(false);

  // Stripe web redirects remount the app and wipe nomination context — prefer URL params.
  const firstName = paramOne(params.first).trim() || draft.first.trim();
  const lastName = paramOne(params.last).trim() || draft.last.trim();
  const keepsake =
    paramOne(params.keepsake) === "1" || hasVoiceKeepsake(draft);
  const titleName = firstName || "Your";
  const slug = `${(firstName || "me").toLowerCase()}-${(lastName || "x").toLowerCase()}`;
  const url = `${SITE_HOST}/${slug}`;
  const total = keepsake ? 2 : 1;

  const home = () => {
    reset();
    router.replace("/(tabs)/feed");
  };

  const copyLink = async () => {
    await Clipboard.setStringAsync(`https://${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <Text style={styles.titleAccent}>
              {firstName ? `${firstName}'s Polli` : "Your Polli"}
            </Text>
            {"\n"}
            {copy.launch_title}
          </Text>
          <Text style={styles.sub}>
            {total > 1
              ? `You kicked it off with $${total} (including your voice keepsake). Share the link so others can pile on.`
              : copy.launch_sub}
          </Text>

          <Pressable style={styles.urlChip} onPress={copyLink} accessibilityRole="button">
            <IconLink size={14} color={colors.cream} />
            <Text style={styles.urlText}>{url}</Text>
            <Text style={styles.copyHint}>{copied ? "Copied!" : "Tap to copy"}</Text>
          </Pressable>
        </View>
        <View style={styles.actions}>
          <Button
            full
            label="Pass it along"
            variant="marigold"
            icon={<IconShare size={16} color={colors.ink} />}
            onPress={() =>
              openShare({
                name: `${firstName} ${lastName}`.trim() || titleName,
                slug,
              })
            }
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
    backgroundColor: "rgba(255,251,245,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,251,245,0.35)",
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
  copyHint: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.marigold,
    marginLeft: 4,
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
