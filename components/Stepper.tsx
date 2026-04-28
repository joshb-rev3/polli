import React from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "../theme";

export function Stepper({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.bar}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.pip, i <= step && styles.done]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    gap: 6,
    paddingBottom: 8,
  },
  pip: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line2,
  },
  done: {
    backgroundColor: colors.green,
  },
});
