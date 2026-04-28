import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";
import { IconBack } from "./Icon";
import { Logo } from "./Logo";

type Variant = "cream" | "green" | "paper";

interface Props {
  variant?: Variant;
  back?: boolean;
  title?: string;
  onBack?: () => void;
  onMenu?: () => void;
  right?: React.ReactNode;
}

export function NavBar({ variant = "cream", back, title, onBack, onMenu, right }: Props) {
  const dark = variant === "green";
  const bg =
    variant === "green" ? colors.green : variant === "paper" ? colors.paper : colors.cream;
  const fg = dark ? colors.cream : colors.ink;

  return (
    <View style={[styles.bar, { backgroundColor: bg }]}>
      {back ? (
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [
            styles.back,
            pressed && { backgroundColor: "rgba(0,0,0,0.05)" },
          ]}
        >
          <IconBack size={18} color={fg} />
          <Text style={[styles.backLabel, { color: fg }]}>{title || "Back"}</Text>
        </Pressable>
      ) : (
        <Logo dark={dark} />
      )}
      {right ? right : onMenu ? (
        <Pressable onPress={onMenu} style={styles.hamburger} hitSlop={8}>
          <View style={[styles.hbar, { backgroundColor: fg }]} />
          <View style={[styles.hbar, { backgroundColor: fg }]} />
          <View style={[styles.hbar, { backgroundColor: fg }]} />
        </Pressable>
      ) : (
        <View style={{ width: 32 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 64,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
  },
  hamburger: {
    flexDirection: "column",
    gap: 5,
    padding: 10,
  },
  hbar: {
    width: 22,
    height: 2,
    borderRadius: 2,
  },
});
