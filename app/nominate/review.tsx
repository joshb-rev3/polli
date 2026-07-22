import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { IconCheck } from "../../components/Icon";
import { NavBar } from "../../components/NavBar";
import { NominateFooter } from "../../components/NominateFooter";
import { Stepper } from "../../components/Stepper";
import { VoiceMessagePlayer } from "../../components/voice/VoiceMessageComposer";
import { createLiveNomination } from "../../lib/createNomination";
import { FEE_COVER_CENTS, formatDollars, giftTotals } from "../../lib/fees";
import { success } from "../../lib/haptics";
import { CATEGORIES, TIMELINES } from "../../lib/mockData";
import {
  launchChargeDollars,
  launchProductDollars,
  useNomination,
} from "../../lib/nomination";
import { payWithStripe } from "../../lib/paymentSheet";
import { useSession } from "../../lib/session";
import { stripeConfigured, supabaseConfigured } from "../../lib/supabase";
import { colors, fonts, shadows } from "../../theme";

export default function Review() {
  const router = useRouter();
  const { draft } = useNomination();
  const { userId } = useSession();
  const cat = CATEGORIES.find((c) => c.id === draft.catId);
  const timeline = TIMELINES.find((t) => t.id === draft.timeline);
  const speak = draft.noteMode === "speak";
  const firstName = draft.first || "them";

  const [coverFees, setCoverFees] = useState(true);
  const [loading, setLoading] = useState(false);

  const totals = giftTotals(coverFees, { keepsake: speak });
  const product = launchProductDollars(draft);
  const charge = launchChargeDollars(draft, coverFees);

  const finish = () => {
    success();
    router.replace("/launch-complete");
  };

  const launch = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (!supabaseConfigured) {
        console.warn("[nominate] simulating — supabase not configured");
        setTimeout(() => {
          setLoading(false);
          finish();
        }, 900);
        return;
      }

      if (!stripeConfigured) {
        setLoading(false);
        Alert.alert(
          "Stripe not configured",
          "Add EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_… to .env and restart Expo.",
        );
        return;
      }

      if (!userId || userId.startsWith("local-demo")) {
        setLoading(false);
        Alert.alert(
          "Sign in required",
          "Use Continue with Google so you have a real Supabase session, then try again.",
        );
        return;
      }

      const { nominationId } = await createLiveNomination(draft);
      const result = await payWithStripe({
        nominationId,
        coverFees,
        note: draft.note.trim() || undefined,
        voiceKeepsake: speak,
        successPath: "launch-complete",
        cancelPath: "nominate/review",
      });
      setLoading(false);
      if (result === "succeeded" && Platform.OS !== "web") finish();
    } catch (e: any) {
      setLoading(false);
      Alert.alert("Launch failed", e?.message ?? "Please try again.");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <NavBar back title="Back" variant="paper" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }}>
        <Stepper step={5} total={6} />
        <View style={styles.card}>
          <Text style={styles.title}>Look good?</Text>
          <Text style={styles.sub}>
            Kick it off with ${product.toFixed(2)}, cover fees so {firstName} gets the full
            dollar, then share the link.
          </Text>

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
            <Text style={styles.sectionLabel}>Public overview</Text>
            <Text style={styles.story}>"{draft.overview}"</Text>
          </View>

          <View style={[styles.storyBox, styles.privateBox]}>
            <Text style={styles.privateLabel}>Private note · only they see this</Text>
            {speak && draft.noteAudioUri ? (
              <>
                <VoiceMessagePlayer
                  uri={draft.noteAudioUri}
                  words={draft.noteWords}
                  signatures={draft.noteSignatures}
                  durationMs={draft.noteAudioDurationMs ?? 0}
                  compact
                />
                <Text style={styles.story}>"{draft.note}"</Text>
              </>
            ) : (
              <Text style={styles.story}>"{draft.note}"</Text>
            )}
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>TIMELINE</Text>
            <Text style={styles.metaValue}>{timeline?.label}</Text>
          </View>

          <Pressable
            style={[styles.feeCard, coverFees && styles.feeCardActive]}
            onPress={() => setCoverFees(!coverFees)}
          >
            <View
              style={[
                styles.checkbox,
                coverFees && { backgroundColor: colors.green, borderColor: colors.green },
              ]}
            >
              {coverFees && <IconCheck size={13} color="#fff" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.feeTitle}>
                Cover the {formatDollars(FEE_COVER_CENTS)} in fees
              </Text>
              <Text style={styles.feeDesc}>
                {coverFees
                  ? `${firstName} gets the full $1.00. You pay ${formatDollars(totals.totalCents)}.`
                  : `Without this, ${firstName} receives $0.57 after processing. You pay ${formatDollars(totals.totalCents)}.`}
              </Text>
            </View>
          </Pressable>

          <View style={styles.lineItems}>
            <Row label="Kick off their Polli" value="$1.00" />
            {speak ? <Row label="Voice keepsake" value="$1.00" /> : null}
            {coverFees ? (
              <Row label="Processing & platform" value={formatDollars(FEE_COVER_CENTS)} />
            ) : null}
            <View style={styles.lineDivider} />
            <Row label="Total charged to you" value={formatDollars(totals.totalCents)} bold />
            <Row
              label={`${firstName} receives`}
              value={formatDollars(totals.netCents)}
              green
            />
          </View>

          <Text style={styles.fine}>
            You'll choose how to pay on the next screen — securely handled by{" "}
            <Text style={{ fontFamily: fonts.bodyBold }}>Stripe</Text>.
          </Text>

          <View style={styles.sage}>
            <Text style={styles.sageText}>
              <Text style={{ fontFamily: fonts.bodyBold }}>
                You'll start with ${charge.toFixed(2)}.
              </Text>{" "}
              Then share the link so friends can pile on.
            </Text>
          </View>
        </View>
      </ScrollView>
      <NominateFooter
        label={loading ? "Opening Stripe…" : `Pay $${charge.toFixed(2)} & launch`}
        disabled={loading}
        onPress={launch}
      />
    </View>
  );
}

function Row({
  label,
  value,
  bold,
  green,
}: {
  label: string;
  value: string;
  bold?: boolean;
  green?: boolean;
}) {
  return (
    <View style={styles.lineRow}>
      <Text
        style={[
          styles.lineLabel,
          bold && { color: colors.ink, fontFamily: fonts.bodyBold },
          green && { color: colors.green2, fontFamily: fonts.bodySemi },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.lineValue,
          bold && { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 16 },
          green && { color: colors.green2 },
        ]}
      >
        {value}
      </Text>
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
    borderColor: "rgba(242,85,61,0.35)",
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
  privateBox: {
    backgroundColor: colors.blossomSoft,
    borderWidth: 1,
    borderColor: "rgba(244,164,184,0.45)",
  },
  sectionLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.green,
    marginBottom: 4,
  },
  privateLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.ink2,
    marginBottom: 8,
  },
  story: {
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
    marginTop: 6,
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
  feeCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line2,
    backgroundColor: "#fff",
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  feeCardActive: {
    backgroundColor: "rgba(255,185,0,0.14)",
    borderColor: colors.marigold2,
    borderWidth: 1.5,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.line2,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  feeTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.ink,
  },
  feeDesc: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink2,
    marginTop: 4,
    lineHeight: 17,
  },
  lineItems: {
    marginTop: 14,
    padding: 14,
    backgroundColor: colors.paper,
    borderRadius: 12,
    gap: 8,
  },
  lineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lineLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink2,
  },
  lineValue: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink,
  },
  lineDivider: {
    height: 1,
    backgroundColor: colors.line2,
    marginVertical: 4,
  },
  fine: {
    marginTop: 12,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.ink2,
    textAlign: "center",
    lineHeight: 17,
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
