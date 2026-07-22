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
import { Button } from "../../components/Button";
import { IconArrow } from "../../components/Icon";
import { NavBar } from "../../components/NavBar";
import { Stepper } from "../../components/Stepper";
import { VoiceMessageComposer } from "../../components/voice/VoiceMessageComposer";
import { CATEGORIES, INSPO } from "../../lib/mockData";
import { useNomination } from "../../lib/nomination";
import { useTone } from "../../lib/tone";
import { VoiceClip } from "../../lib/voice";
import { colors, fonts, shadows } from "../../theme";

const MAX = 480;

export default function Story() {
  const router = useRouter();
  const { draft, set } = useNomination();
  const { copy } = useTone();
  const cat = CATEGORIES.find((c) => c.id === draft.catId);

  const voiceClip = useMemo<VoiceClip | null>(() => {
    if (!draft.storyAudioUri) return null;
    return {
      uri: draft.storyAudioUri,
      mimeType: "audio/m4a",
      durationMs: draft.storyAudioDurationMs ?? 0,
      words: draft.storyWords,
      signatures: draft.storySignatures,
    };
  }, [
    draft.storyAudioUri,
    draft.storyAudioDurationMs,
    draft.storyWords,
    draft.storySignatures,
  ]);

  const [mode, setMode] = useState<"type" | "speak">(draft.storyMode);

  const switchMode = (next: "type" | "speak") => {
    setMode(next);
    set({ storyMode: next });
  };

  const canContinue =
    mode === "type" ? Boolean(draft.story.trim()) : Boolean(draft.storyAudioUri && draft.story.trim());

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <NavBar back title="Back" variant="paper" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <Stepper step={2} total={5} />
        <View style={styles.card}>
          <Text style={styles.title}>Make their day with a message!</Text>
          <Text style={styles.sub}>Your words matter. Let them know why they're special.</Text>

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
              <Text style={[styles.modeText, mode === "speak" && styles.modeTextActive]}>Speak</Text>
            </Pressable>
          </View>

          {mode === "type" ? (
            <>
              <View style={styles.textareaBox}>
                <TextInput
                  value={draft.story}
                  onChangeText={(t) => set({ story: t.slice(0, MAX) })}
                  placeholder={copy.story_prompt(draft.first)}
                  placeholderTextColor={colors.inkMuted}
                  multiline
                  style={styles.textarea}
                />
              </View>
              <Text style={styles.counter}>
                {draft.story.length}/{MAX}
              </Text>

              <Text style={styles.inspoLabel}>Inspiration</Text>
              <View style={{ gap: 8 }}>
                {INSPO.slice(0, 3).map((t, i) => (
                  <Pressable
                    key={i}
                    style={styles.inspoRow}
                    onPress={() => set({ story: t.replace(/\{name\}/g, draft.first || "them") })}
                  >
                    <Text style={styles.inspoText}>{t}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.speakBox}>
              <Text style={styles.speakHint}>
                Record a short voice note — we'll transcribe it and bring your words to life.
              </Text>
              <VoiceMessageComposer
                clip={voiceClip}
                onClipChange={(clip, storyText) => {
                  set({
                    story: storyText.slice(0, MAX),
                    storyAudioUri: clip?.uri ?? null,
                    storyAudioDurationMs: clip?.durationMs ?? null,
                    storyWords: clip?.words ?? [],
                    storySignatures: clip?.signatures ?? [],
                  });
                }}
              />
              {draft.story ? (
                <Text style={styles.counter}>{draft.story.length}/{MAX} transcribed</Text>
              ) : null}
            </View>
          )}
        </View>

        <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 18 }}>
          <Button
            label="Continue"
            iconRight={<IconArrow size={18} color={colors.green} />}
            disabled={!canContinue}
            onPress={() => router.push("/nominate/timeline")}
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
    marginTop: 16,
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
  textareaBox: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.green3,
    borderRadius: 12,
    backgroundColor: "rgba(248,249,244,0.5)",
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
  speakHint: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink2,
    lineHeight: 20,
  },
});
