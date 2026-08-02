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
  /**
   * Center the Polli wordmark. Defaults to true whenever `back` is set so every
   * header shows the logo (back on the left, wordmark centered).
   */
  centerLogo?: boolean;
}

/**
 * Optional back on the left; Polli wordmark left or centered; optional right actions.
 * Every NavBar shows the logo. With back, logo is centered; without, left-aligned.
 * `green` = cream masthead with marigold pollen edge for garden screens.
 * Outer bar is full-bleed; inner row centers to CONTENT_MAX on desktop.
 */
export function NavBar({
  variant = "cream",
  back,
  title,
  onBack,
  onMenu,
  right,
  centerLogo,
}: Props) {
  const garden = variant === "green";
  const bg = variant === "paper" ? colors.paper : colors.cream;
  const fg = colors.ink;
  // Always show logo when navigating with back; otherwise left-align.
  const showCenterLogo = centerLogo ?? Boolean(back);

  const rightNode = right ? (
    right
  ) : onMenu ? (
    <Pressable onPress={onMenu} style={styles.hamburger} hitSlop={8}>
      <View style={[styles.hbar, { backgroundColor: fg }]} />
      <View style={[styles.hbar, { backgroundColor: fg }]} />
      <View style={[styles.hbar, { backgroundColor: fg }]} />
    </Pressable>
  ) : null;

  const backControl = back ? (
    <Pressable
      onPress={onBack}
      style={({ pressed }) => [styles.back, pressed && { backgroundColor: "rgba(0,0,0,0.05)" }]}
      hitSlop={8}
    >
      <IconBack size={18} color={fg} />
      {title && !showCenterLogo ? (
        <Text style={[styles.backLabel, { color: fg }]}>{title}</Text>
      ) : null}
    </Pressable>
  ) : null;

  return (
    <View style={[styles.bar, { backgroundColor: bg }, garden && styles.gardenBar]}>
      <View style={styles.inner}>
        <View style={[styles.side, styles.left]}>
          {backControl}
          {!back && !showCenterLogo ? <Logo /> : null}
        </View>

        {showCenterLogo ? (
          <View style={styles.centerLogo} pointerEvents="none">
            <Logo />
          </View>
        ) : null}

        <View style={[styles.side, styles.right]}>
          {rightNode}
          {/* Balance the back control so the logo stays visually centered */}
          {showCenterLogo && back && !rightNode ? <View style={styles.balance} /> : null}
        </View>
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
    position: "relative",
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
  left: {
    justifyContent: "flex-start",
    flexShrink: 1,
  },
  right: {
    justifyContent: "flex-end",
    flexShrink: 0,
  },
  centerLogo: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  balance: {
    width: 40,
    height: 40,
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
