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

/**
 * Always shows the Polli wordmark centered.
 * `green` = cream masthead with marigold pollen edge for garden screens.
 * Optional back control sits on the left; `right` / menu on the right.
 */
export function NavBar({ variant = "cream", back, title, onBack, onMenu, right }: Props) {
  const garden = variant === "green";
  const bg = variant === "paper" ? colors.paper : colors.cream;
  const fg = colors.ink;

  const rightNode = right ? (
    right
  ) : onMenu ? (
    <Pressable onPress={onMenu} style={styles.hamburger} hitSlop={8}>
      <View style={[styles.hbar, { backgroundColor: fg }]} />
      <View style={[styles.hbar, { backgroundColor: fg }]} />
      <View style={[styles.hbar, { backgroundColor: fg }]} />
    </Pressable>
  ) : null;

  return (
    <View style={[styles.bar, { backgroundColor: bg }, garden && styles.gardenBar]}>
      <View style={styles.side}>
        {back ? (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [
              styles.back,
              pressed && { backgroundColor: "rgba(0,0,0,0.05)" },
            ]}
            hitSlop={8}
          >
            <IconBack size={18} color={fg} />
            {title ? (
              <Text style={[styles.backLabel, { color: fg }]}>{title}</Text>
            ) : null}
          </Pressable>
        ) : null}
      </View>

      <View style={styles.logoWrap} pointerEvents="none">
        <Logo />
      </View>

      <View style={[styles.side, styles.sideRight]}>{rightNode}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 64,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  gardenBar: {
    borderBottomWidth: 2,
    borderBottomColor: colors.marigold,
  },
  side: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  sideRight: {
    justifyContent: "flex-end",
  },
  logoWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    zIndex: 1,
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
