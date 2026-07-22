import { useRouter } from "expo-router";
import React from "react";
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
import { CATEGORIES, OVERVIEW_INSPO } from "../../lib/mockData";
import { useNomination } from "../../lib/nomination";
import { colors, fonts, shadows } from "../../theme";

const MAX = 480;
const TOTAL = 6;

export default function Story() {
  const router = useRouter();
  const { draft, set } = useNomination();
  const cat = CATEGORIES.find((c) => c.id === draft.catId);
  const canContinue = Boolean(draft.overview.trim());

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <NavBar back title="Back" variant="paper" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Stepper step={2} total={TOTAL} />
        <View style={styles.card}>
          <Text style={styles.title}>Why should people chip in?</Text>
          <Text style={styles.sub}>
            Write a short public overview for {draft.first || "them"}'s Polli — this is what friends
            see before they send $1.
          </Text>
          <Text style={styles.publicPill}>Public · everyone can read this</Text>

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

          <View style={styles.textareaBox}>
            <TextInput
              value={draft.overview}
              onChangeText={(t) => set({ overview: t.slice(0, MAX) })}
              placeholder={`Share why ${draft.first || "they"} deserve this — the story that makes people want to join in…`}
              placeholderTextColor={colors.inkMuted}
              multiline
              spellCheck
              autoCorrect
              style={styles.textarea}
            />
          </View>
          <Text style={styles.counter}>
            {draft.overview.length}/{MAX}
          </Text>

          <Text style={styles.inspoLabel}>Inspiration — tap to use</Text>
          <View style={{ gap: 8 }}>
            {OVERVIEW_INSPO.slice(0, 3).map((t, i) => (
              <Pressable
                key={i}
                style={styles.inspoRow}
                onPress={() =>
                  set({ overview: t.replace(/\{name\}/g, draft.first || "them") })
                }
              >
                <Text style={styles.inspoText}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
      <NominateFooter
        label="Continue"
        disabled={!canContinue}
        onPress={() => router.push("/nominate/message")}
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
  publicPill: {
    alignSelf: "flex-start",
    marginTop: 12,
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.green,
    backgroundColor: colors.sageSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: "hidden",
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
});
