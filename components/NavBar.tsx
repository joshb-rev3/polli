import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, CONTENT_MAX, CONTENT_PAD } from "../theme";
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
 * Polli wordmark on the left; optional actions on the right (space-between).
 * `green` = cream masthead with marigold pollen edge for garden screens.
 * Optional back control sits before the logo.
 * Outer bar is full-bleed; inner row centers to CONTENT_MAX on desktop.
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
      <View style={styles.inner}>
        <View style={styles.left}>
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
          ) : (
            <Logo />
          )}
        </View>

        {rightNode ? <View style={styles.right}>{rightNode}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 64,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  inner: {
    flex: 1,
    width: "100%",
    maxWidth: CONTENT_MAX,
    alignSelf: "center",
    paddingHorizontal: Math.max(CONTENT_PAD - 8, 12),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gardenBar: {
    borderBottomWidth: 2,
    borderBottomColor: colors.marigold,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    flexShrink: 1,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexShrink: 0,
  },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
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
