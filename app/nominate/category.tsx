import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { NavBar } from "../../components/NavBar";
import { NominateFooter } from "../../components/NominateFooter";
import { Stepper } from "../../components/Stepper";
import { CATEGORIES } from "../../lib/mockData";
import { useNomination } from "../../lib/nomination";
import { colors, fonts, shadows } from "../../theme";

export default function Category() {
  const router = useRouter();
  const { draft, set } = useNomination();

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <NavBar back title="Back" variant="paper" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }}>
        <Stepper step={1} total={6} />
        <View style={styles.card}>
          <Text style={styles.title}>What is the reason for this Polli?</Text>
          <Text style={styles.sub}>Why are you nominating {draft.first || "them"}?</Text>
          <View style={styles.chips}>
            {CATEGORIES.map((c) => {
              const active = draft.catId === c.id;
              return (
                <Pressable
                  key={c.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => set({ catId: c.id })}
                >
                  <View
                    style={[
                      styles.emo,
                      active && { backgroundColor: colors.coralSoft, borderColor: colors.coral, borderWidth: 1.5 },
                    ]}
                  >
                    <Text style={{ fontSize: 22 }}>{c.emoji}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.chipT}>{c.title}</Text>
                    <Text style={styles.chipS}>{c.sub}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
      <NominateFooter
        label="Continue"
        disabled={!draft.catId}
        onPress={() => router.push("/nominate/story")}
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
  },
  chips: {
    gap: 10,
    marginTop: 18,
  },
  chip: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: colors.line2,
  },
  chipActive: {
    borderColor: colors.green,
  },
  emo: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  chipT: {
    fontFamily: fonts.serifBold,
    fontSize: 17,
    color: colors.ink,
  },
  chipS: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink2,
    marginTop: 2,
  },
});
