import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button } from "../components/Button";
import { Content } from "../components/Content";
import { IconCheck } from "../components/Icon";
import { NavBar } from "../components/NavBar";
import { TextInput } from "../components/TextInput";
import { VoiceMessageComposer } from "../components/voice/VoiceMessageComposer";
import { FEE_COVER_CENTS, formatDollars, giftTotals } from "../lib/fees";
import { success } from "../lib/haptics";
import { FEED, INSPO } from "../lib/mockData";
import { firstName as givenName } from "../lib/names";
import { savePayComplete } from "../lib/payComplete";
import { payWithStripe } from "../lib/paymentSheet";
import { ensureSandboxPolli } from "../lib/sandboxPolli";
import { useSession } from "../lib/session";
import { stripeConfigured, supabaseConfigured } from "../lib/supabase";
import { VoiceClip } from "../lib/voice";
import { colors, fonts, shadows, CONTENT_MAX, CONTENT_PAD } from "../theme";

type NoteMode = "type" | "speak";

export default function Checkout() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId, loading: sessionLoading } = useSession();
  const n = FEED.find((f) => f.id === id);

  const [mode, setMode] = useState<NoteMode>("type");
  const [note, setNote] = useState("");
  const [voiceClip, setVoiceClip] = useState<VoiceClip | null>(null);
  const [anon, setAnon] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const keepsake = mode === "speak" && Boolean(voiceClip?.uri);
  const totals = giftTotals({ keepsake });
  const MAX = 140;
  const firstName = givenName(n?.name, "them");

  useEffect(() => {
    if (sessionLoading) return;
    if (!supabaseConfigured) return;
    if (userId) return;
    router.replace({
      pathname: "/auth",
      params: { next: "checkout", ...(id ? { id: String(id) } : {}) },
    });
  }, [sessionLoading, userId, id, router]);

  const switchMode = (next: NoteMode) => {
    setMode(next);
    if (next === "type") {
      setVoiceClip(null);
    } else {
      setNoteOpen(true);
    }
  };

  const finish = async (opts?: { polliId?: string }) => {
    await savePayComplete({
      id: n?.id || "",
      name: n?.name,
      note: note.trim() || undefined,
      anon,
      keepsake,
      polliId: opts?.polliId,
    });
    success();
    router.replace({
      pathname: "/pay-complete",
      params: {
        id: n?.id || "",
        name: n?.name || "",
        note: note.trim(),
        anon: anon ? "1" : "0",
        ...(keepsake ? { keepsake: "1" } : {}),
      },
    });
  };

  const pay = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Offline / placeholder env → simulated checkout
      if (!supabaseConfigured) {
        console.warn("[checkout] simulating — supabase not configured");
        setTimeout(() => {
          setLoading(false);
          finish();
        }, 1200);
        return;
      }

      if (!stripeConfigured) {
        setLoading(false);
        Alert.alert(
          "Stripe not configured",
          "Add EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_… (or pk_live_…) to .env and restart Expo.",
        );
        return;
      }

      if (!userId || userId.startsWith("local-demo")) {
        setLoading(false);
        router.replace({
          pathname: "/auth",
          params: { next: "checkout", ...(id ? { id: String(id) } : {}) },
        });
        return;
      }

      if (!n) {
        setLoading(false);
        Alert.alert("Missing Polli", "Go back and pick someone to give to.");
        return;
      }

      const polliId = await ensureSandboxPolli(n);
      await savePayComplete({
        id: n.id,
        name: n.name,
        note: note.trim() || undefined,
        anon,
        keepsake,
        polliId,
      });

      const result = await payWithStripe({
        polliId,
        note: note.trim() || undefined,
        anonymous: anon,
        voiceKeepsake: keepsake,
        intent: "gift",
        returnId: n.id,
        successPath: "pay-complete",
        cancelPath: "checkout",
        successQuery: {
          name: n.name,
          note: note.trim(),
          anon: anon ? "1" : "0",
          ...(keepsake ? { keepsake: "1" } : {}),
        },
      });
      setLoading(false);
      // On web, payWithStripe redirects to Stripe — finish() happens on return via pay-complete
      if (result === "succeeded" && Platform.OS !== "web") {
        await finish({ polliId });
      }
    } catch (e: any) {
      setLoading(false);
      Alert.alert("Payment failed", e?.message ?? "Please try again.");
    }
  };

  if (!n) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper }}>
        <NavBar back title="Back" variant="paper" onBack={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <NavBar back title="Cancel" variant="paper" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Content padTop={12} padBottom={32}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>YOU'RE GIVING TO</Text>
          <Text style={styles.name}>{n.name}</Text>

          <View style={styles.amountCard}>
            <Text style={styles.eyebrow}>YOUR GIFT</Text>
            <Text style={styles.amount}>$1</Text>
            <Text style={styles.amountSub}>One dollar. That's the whole thing.</Text>
            <Text style={styles.amountNote}>
              {keepsake
                ? "Optional voice keepsake is +$1 — they still get the full gift dollar."
                : "Polli gifts are always $1 — no more, no less."}
            </Text>
          </View>

          <View style={styles.noteCard}>
            <View style={styles.noteHeadRow}>
              <View style={styles.noteEmoCircle}>
                <Text style={{ fontSize: 18 }}>💌</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.noteCardTitle}>Add a note for {firstName}</Text>
                <Text style={styles.noteCardSub}>
                  Only {firstName} will see what you share here
                  {mode === "speak" && note.length
                    ? ` · ${note.length}/${MAX} transcribed`
                    : " · optional"}
                </Text>
              </View>
            </View>

            <View style={styles.modeRow}>
              <Pressable
                style={[styles.modeBtn, mode === "type" && styles.modeBtnActive]}
                onPress={() => switchMode("type")}
              >
                <Text style={[styles.modeText, mode === "type" && styles.modeTextActive]}>Type</Text>
              </Pressable>
              <Pressable
                style={[styles.modeBtn, mode === "speak" && styles.modeBtnActive]}
                onPress={() => switchMode("speak")}
              >
                <View style={styles.speakTabInner}>
                  <Text style={[styles.modeText, mode === "speak" && styles.modeTextActive]}>
                    Speak
                  </Text>
                  <View style={[styles.plusBadge, mode === "speak" && styles.plusBadgeActive]}>
                    <Text
                      style={[styles.plusBadgeText, mode === "speak" && styles.plusBadgeTextActive]}
                    >
                      +$1
                    </Text>
                  </View>
                </View>
              </Pressable>
            </View>

            {mode === "type" ? (
              <>
                <View style={styles.textareaBox}>
                  <TextInput
                    value={note}
                    onChangeText={(t) => setNote(t.slice(0, MAX))}
                    onFocus={() => setNoteOpen(true)}
                    placeholder={`Say something nice to ${firstName}…`}
                    placeholderTextColor={colors.inkMuted}
                    multiline
                    spellCheck
                    autoCorrect
                    style={styles.textarea}
                  />
                </View>
                <Text style={styles.counter}>
                  {note.length}/{MAX}
                </Text>

                <Text style={styles.inspoLabel}>Inspiration — tap to use</Text>
                <View style={{ gap: 8 }}>
                  {INSPO.slice(0, 3).map((t, i) => (
                    <Pressable
                      key={i}
                      style={styles.inspoRow}
                      onPress={() => {
                        setNote(t.replace(/\{name\}/g, firstName).slice(0, MAX));
                        setNoteOpen(true);
                      }}
                    >
                      <Text style={styles.inspoText}>{t}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.speakBox}>
                <View style={styles.speakUpsell}>
                  <Text style={styles.speakUpsellTitle}>Voice keepsake · +$1</Text>
                  <Text style={styles.speakHint}>
                    Record a short voice note only {firstName} can keep and replay. We'll
                    transcribe it too.
                  </Text>
                </View>
                <VoiceMessageComposer
                  clip={voiceClip}
                  onClipChange={(clip, noteText) => {
                    setVoiceClip(clip);
                    setNote(noteText.slice(0, MAX));
                  }}
                />
              </View>
            )}

            {(noteOpen || note || mode === "speak") && (
              <Pressable style={styles.anonRow} onPress={() => setAnon(!anon)}>
                <View
                  style={[
                    styles.checkbox,
                    anon && { backgroundColor: colors.green, borderColor: colors.green },
                  ]}
                >
                  {anon && <IconCheck size={11} color="#fff" />}
                </View>
                <Text style={styles.anonText}>
                  Sign as <Text style={{ fontFamily: fonts.bodyBold }}>anonymous bee</Text> 🐝
                </Text>
              </Pressable>
            )}
          </View>

          <View style={styles.summary}>
            <Row label="Your $1 gift" value="$1.00" />
            {keepsake ? <Row label="Voice keepsake" value="$1.00" /> : null}
            <Row label="Processing fees & platform operations" value={formatDollars(FEE_COVER_CENTS)} />
            <View style={styles.summaryDivider} />
            <Row label="Total charged to you" value={formatDollars(totals.totalCents)} bold />
            <Row label={`${firstName} receives`} value={formatDollars(totals.netCents)} green />
          </View>

          <Text style={styles.fine}>
            You'll choose how to pay on the next screen — securely handled by{" "}
            <Text style={{ fontFamily: fonts.bodyBold }}>Stripe</Text>.
          </Text>
        </View>
        </Content>
      </ScrollView>
      <View style={styles.sticky}>
        <View style={styles.stickyInner}>
        <Button
          full
          label={loading ? "Opening Stripe…" : `Pay ${formatDollars(totals.totalCents)}`}
          variant="dark"
          disabled={loading}
          onPress={pay}
          style={{ backgroundColor: colors.green }}
        />
        </View>
      </View>
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
    <View style={rowStyles.row}>
      <Text
        style={[
          rowStyles.label,
          bold && { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 15 },
          green && { color: colors.green2, fontFamily: fonts.bodySemi },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          rowStyles.value,
          bold && { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 15 },
          green && { color: colors.green2 },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink2,
  },
  value: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink2,
  },
});

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 0,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.line2,
    ...shadows.card,
  },
  eyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.96,
    color: colors.ink2,
  },
  name: {
    fontFamily: fonts.serifBold,
    fontSize: 24,
    color: colors.ink,
    marginTop: 4,
  },
  amountCard: {
    marginTop: 24,
    padding: 22,
    backgroundColor: colors.cream,
    borderRadius: 16,
    alignItems: "center",
  },
  amount: {
    fontFamily: fonts.serifHeavy,
    fontSize: 88,
    lineHeight: 88,
    color: colors.green,
    marginTop: 10,
    letterSpacing: -2.64,
  },
  amountSub: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    color: colors.ink2,
    marginTop: 6,
  },
  amountNote: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.ink2,
    marginTop: 2,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  noteCard: {
    marginTop: 18,
    padding: 18,
    backgroundColor: "rgba(255,185,0,0.18)",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.marigold2,
  },
  noteHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  noteEmoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.marigold,
    alignItems: "center",
    justifyContent: "center",
  },
  noteCardTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.ink,
  },
  noteCardSub: {
    fontFamily: fonts.serifItalic,
    fontSize: 12,
    color: colors.ink2,
    marginTop: 1,
  },
  modeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    padding: 4,
    backgroundColor: colors.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line2,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  modeBtnActive: {
    backgroundColor: colors.green,
  },
  modeText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink2,
  },
  modeTextActive: {
    color: colors.white,
  },
  speakTabInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  plusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.marigold,
  },
  plusBadgeActive: {
    backgroundColor: colors.marigold2,
  },
  plusBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.green,
  },
  plusBadgeTextActive: {
    color: colors.green,
  },
  speakBox: {
    gap: 10,
  },
  speakUpsell: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: "rgba(245,184,0,0.55)",
    gap: 4,
  },
  speakUpsellTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.green,
  },
  speakHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink2,
    lineHeight: 18,
  },
  textareaBox: {
    borderWidth: 1,
    borderColor: colors.green3,
    borderRadius: 12,
    backgroundColor: "#fff",
    padding: 14,
  },
  textarea: {
    width: "100%",
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    minHeight: 100,
    textAlignVertical: "top",
    padding: 0,
  },
  counter: {
    textAlign: "right",
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink2,
  },
  inspoLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.ink,
    marginTop: 12,
    marginBottom: 8,
  },
  inspoRow: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line2,
  },
  inspoText: {
    fontFamily: fonts.serif,
    fontSize: 14,
    color: colors.ink,
    lineHeight: 20,
  },
  anonRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  anonText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink2,
  },
  summary: {
    marginTop: 18,
    padding: 14,
    backgroundColor: colors.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line2,
  },
  summaryDivider: {
    marginTop: 4,
    marginBottom: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line2,
  },
  fine: {
    marginTop: 12,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.ink2,
    textAlign: "center",
    lineHeight: 17,
  },
  sticky: {
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.line2,
  },
  stickyInner: {
    width: "100%",
    maxWidth: CONTENT_MAX,
    alignSelf: "center",
    paddingHorizontal: CONTENT_PAD,
  },
});
