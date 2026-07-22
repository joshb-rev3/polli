import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { NavBar } from "../../components/NavBar";
import { NominateFooter } from "../../components/NominateFooter";
import { Stepper } from "../../components/Stepper";
import { VoiceMessageComposer } from "../../components/voice/VoiceMessageComposer";
import { CATEGORIES, INSPO } from "../../lib/mockData";
import { useNomination } from "../../lib/nomination";
import { useTone } from "../../lib/tone";
import { VoiceClip } from "../../lib/voice";
import { colors, fonts, shadows } from "../../theme";

const MAX = 480;
const TOTAL = 6;

export default function Message() {
  const router = useRouter();
  const { draft, set } = useNomination();
  const { copy } = useTone();
  const cat = CATEGORIES.find((c) => c.id === draft.catId);

  const voiceClip = useMemo<VoiceClip | null>(() => {
    if (!draft.noteAudioUri) return null;
    return {
      uri: draft.noteAudioUri,
      mimeType: "audio/m4a",
      durationMs: draft.noteAudioDurationMs ?? 0,
      words: draft.noteWords,
      signatures: draft.noteSignatures,
    };
  }, [
    draft.noteAudioUri,
    draft.noteAudioDurationMs,
    draft.noteWords,
    draft.noteSignatures,
  ]);

  const [mode, setMode] = useState<"type" | "speak">(draft.noteMode);

  const switchMode = (next: "type" | "speak") => {
    setMode(next);
    set({ noteMode: next });
  };

  const canContinue =
    mode === "type"
      ? Boolean(draft.note.trim())
      : Boolean(draft.noteAudioUri && draft.note.trim());

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <NavBar back title="Back" variant="paper" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Stepper step={3} total={TOTAL} />
        <View style={styles.card}>
          <Text style={styles.title}>A private note for {draft.first || "them"}</Text>
          <Text style={styles.sub}>
            This is just for {draft.first || "your nominee"} — friends won't see it on the campaign.
          </Text>
          <Text style={styles.privatePill}>Private · only they will see this</Text>

          <View style={styles.nameRow}>
            <View style={styles.catIcon}>
              <Text style={{ fontSize: 22 }}>{cat?.emoji || "🌼"}</Text>
            </View>
            <View>
              <Text style={styles.nameText}>
                {draft.first} {draft.last}
              </Text>
              <Text style={styles.roleText}>{cat?.title}</Text>
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
                <Text style={[styles.modeText, mode === "speak" && styles.modeTextActive]}>Speak</Text>
                <View style={[styles.plusBadge, mode === "speak" && styles.plusBadgeActive]}>
                  <Text style={[styles.plusBadgeText, mode === "speak" && styles.plusBadgeTextActive]}>
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
                  value={draft.note}
                  onChangeText={(t) => set({ note: t.slice(0, MAX) })}
                  placeholder={copy.story_prompt(draft.first)}
                  placeholderTextColor={colors.inkMuted}
                  multiline
                  spellCheck
                  autoCorrect
                  style={styles.textarea}
                />
              </View>
              <Text style={styles.counter}>
                {draft.note.length}/{MAX}
              </Text>

              <Text style={styles.inspoLabel}>Inspiration — tap to use</Text>
              <View style={{ gap: 8 }}>
                {INSPO.slice(0, 3).map((t, i) => (
                  <Pressable
                    key={i}
                    style={styles.inspoRow}
                    onPress={() => set({ note: t.replace(/\{name\}/g, draft.first || "them") })}
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
                  Record a short voice note only {draft.first || "they"} can keep forever and replay
                  whenever they need a pick-me-up. We'll transcribe it too.
                </Text>
              </View>
              <VoiceMessageComposer
                clip={voiceClip}
                onClipChange={(clip, noteText) => {
                  set({
                    note: noteText.slice(0, MAX),
                    noteAudioUri: clip?.uri ?? null,
                    noteAudioDurationMs: clip?.durationMs ?? null,
                    noteWords: clip?.words ?? [],
                    noteSignatures: clip?.signatures ?? [],
                  });
                }}
              />
              {draft.note ? (
                <Text style={styles.counter}>{draft.note.length}/{MAX} transcribed</Text>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>
      <NominateFooter
        label="Continue"
        disabled={!canContinue}
        onPress={() => router.push("/nominate/timeline")}
      />
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
    lineHeight: 22,
  },
  privatePill: {
    alignSelf: "flex-start",
    marginTop: 12,
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.ink,
    backgroundColor: colors.blossomSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(244,164,184,0.45)",
  },
  nameRow: {
    marginTop: 16,
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
  modeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
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
  textareaBox: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.green3,
    borderRadius: 12,
    backgroundColor: "rgba(255,251,245,0.5)",
    padding: 16,
  },
  textarea: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    minHeight: 160,
    textAlignVertical: "top",
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
  speakBox: {
    marginTop: 16,
    gap: 8,
  },
  speakUpsell: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: "rgba(245,184,0,0.55)",
    gap: 6,
  },
  speakUpsellTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.green,
  },
  speakHint: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink2,
    lineHeight: 20,
  },
});
