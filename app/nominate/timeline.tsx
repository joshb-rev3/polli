import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { NavBar } from "../../components/NavBar";
import { NominateFooter } from "../../components/NominateFooter";
import { Stepper } from "../../components/Stepper";
import { TIMELINES } from "../../lib/mockData";
import { useNomination } from "../../lib/nomination";
import { colors, fonts, shadows } from "../../theme";

export default function Timeline() {
  const router = useRouter();
  const { draft, set } = useNomination();

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <NavBar back title="Back" variant="paper" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }}>
        <Stepper step={4} total={6} />
        <View style={styles.card}>
          <Text style={styles.title}>How long should it run?</Text>
          <Text style={styles.sub}>
            Every $1 matters. No goals, no pressure — just a window for friends to pile on.
          </Text>
          <Text style={styles.fieldLabel}>TIMELINE</Text>
          <View style={{ gap: 8, marginTop: 6 }}>
            {TIMELINES.map((t) => {
              const active = draft.timeline === t.id;
              return (
                <Pressable
                  key={t.id}
                  style={[styles.row, active && styles.rowActive]}
                  onPress={() => set({ timeline: t.id as any })}
                >
                  <Text style={styles.rowLabel}>{t.label}</Text>
                  {"hint" in t && t.hint ? <Text style={styles.rowHint}>{t.hint}</Text> : null}
                </Pressable>
              );
            })}
          </View>
          <View style={styles.sage}>
            <Text style={styles.sageText}>
              💚 Each giver contributes exactly $1 — that's the whole thing. After the window closes, funds pay out within 5 business days.
            </Text>
          </View>
        </View>
      </ScrollView>
      <NominateFooter label="Continue" onPress={() => router.push("/nominate/review")} />
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
  fieldLabel: {
    marginTop: 22,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.ink2,
    letterSpacing: 0.72,
    textTransform: "uppercase",
  },
  row: {
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line2,
    backgroundColor: colors.paper,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowActive: {
    borderWidth: 1.5,
    borderColor: colors.green,
    backgroundColor: "rgba(255,185,0,0.16)",
  },
  rowLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.ink,
  },
  rowHint: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.green,
  },
  sage: {
    marginTop: 18,
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
