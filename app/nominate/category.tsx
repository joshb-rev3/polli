import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/Button";
import { IconArrow } from "../../components/Icon";
import { NavBar } from "../../components/NavBar";
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
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <Stepper step={1} total={5} />
        <View style={styles.card}>
          <Text style={styles.title}>Choose your kindness</Text>
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
                    <Text style={styles.chipT} numberOfLines={1}>
                      {c.title}
                    </Text>
                    <Text style={styles.chipS}>{c.sub}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 18 }}>
          <Button
            label="Continue"
            iconRight={<IconArrow size={18} color={colors.green} />}
            disabled={!draft.catId}
            onPress={() => router.push("/nominate/story")}
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
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18,
  },
  chip: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: colors.line2,
  },
  chipActive: {
    borderColor: colors.green,
  },
  emo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  chipT: {
    fontFamily: fonts.serifBold,
    fontSize: 15,
    color: colors.ink,
  },
  chipS: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.ink2,
    marginTop: 2,
  },
});
