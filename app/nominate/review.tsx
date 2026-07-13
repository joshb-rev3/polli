import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/Button";
import { IconArrow } from "../../components/Icon";
import { NavBar } from "../../components/NavBar";
import { Stepper } from "../../components/Stepper";
import { VoiceMessagePlayer } from "../../components/voice/VoiceMessageComposer";
import { success } from "../../lib/haptics";
import { CATEGORIES, TIMELINES } from "../../lib/mockData";
import { useNomination } from "../../lib/nomination";
import { colors, fonts, shadows } from "../../theme";

export default function Review() {
  const router = useRouter();
  const { draft } = useNomination();
  const cat = CATEGORIES.find((c) => c.id === draft.catId);
  const timeline = TIMELINES.find((t) => t.id === draft.timeline);

  const launch = () => {
    // Phase 4 wires real Stripe PaymentSheet for the nominator's $1
    success();
    router.replace("/launch-complete");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <NavBar back title="Back" variant="paper" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <Stepper step={4} total={5} />
        <View style={styles.card}>
          <Text style={styles.title}>Look good?</Text>
          <Text style={styles.sub}>You'll kick it off with a $1 donation, then share the link.</Text>

          <View style={styles.nameRow}>
            <View style={styles.catIcon}>
              <Text style={{ fontSize: 22 }}>{cat?.emoji}</Text>
            </View>
            <View>
              <Text style={styles.nameText}>
                {draft.first} {draft.last}
              </Text>
              <Text style={styles.roleText}>{cat?.title}</Text>
            </View>
          </View>

          <View style={styles.storyBox}>
            {draft.storyMode === "speak" && draft.storyAudioUri ? (
              <>
                <Text style={styles.voiceLabel}>Voice message</Text>
                <VoiceMessagePlayer
                  uri={draft.storyAudioUri}
                  words={draft.storyWords}
                  signatures={draft.storySignatures}
                  durationMs={draft.storyAudioDurationMs ?? 0}
                  compact
                />
                <Text style={styles.story}>"{draft.story}"</Text>
              </>
            ) : (
              <Text style={styles.story}>"{draft.story}"</Text>
            )}
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>TIMELINE</Text>
            <Text style={styles.metaValue}>{timeline?.label}</Text>
          </View>

          <View style={styles.sage}>
            <Text style={styles.sageText}>
              <Text style={{ fontFamily: fonts.bodyBold }}>You'll start with $1.</Text> Then share the link so friends can pile on.
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 18 }}>
          <Button
            label="Give $1 & launch"
            iconRight={<IconArrow size={18} color={colors.green} />}
            onPress={launch}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 32,
    borderTopLeftRadius: 8,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.line2,
    marginTop: 14,
    ...shadows.card,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 28,
    color: colors.ink,
    lineHeight: 32,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink2,
    marginTop: 6,
  },
  nameRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: colors.cream,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(235,79,48,0.35)",
  },
  catIcon: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: colors.coralSoft,
    borderWidth: 1.5,
    borderColor: colors.coral,
    alignItems: "center",
    justifyContent: "center",
  },
  nameText: {
    fontFamily: fonts.serifBold,
    fontSize: 17,
    color: colors.ink,
  },
  roleText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink2,
    marginTop: 2,
  },
  storyBox: {
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.paper,
    borderRadius: 12,
  },
  story: {
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
    marginTop: 10,
  },
  voiceLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.green,
    marginBottom: 4,
  },
  metaRow: {
    marginTop: 14,
    padding: 14,
    backgroundColor: colors.paper,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.66,
    color: colors.ink2,
  },
  metaValue: {
    fontFamily: fonts.serifBold,
    fontSize: 18,
    color: colors.green,
  },
  sage: {
    marginTop: 16,
    padding: 14,
    backgroundColor: colors.sageSoft,
    borderWidth: 1,
    borderColor: "rgba(83,162,104,0.4)",
    borderRadius: 12,
  },
  sageText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink,
    lineHeight: 20,
  },
});
