import React from "react";
import { Image, StyleSheet } from "react-native";

/** Exact brand wordmark — assets/polli logo.png (910 × 467). */
const ASPECT = 910 / 467;

interface Props {
  size?: number;
  /** Cream ink variant of the exact logo for green / dark surfaces. */
  onDark?: boolean;
}

export function Logo({ size = 34, onDark = false }: Props) {
  return (
    <Image
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      source={
        onDark
          ? require("../assets/polli logo light.png")
          : require("../assets/polli logo.png")
      }
      style={[styles.image, { width: size * ASPECT, height: size }]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  image: {
    alignSelf: "center",
  },
});
