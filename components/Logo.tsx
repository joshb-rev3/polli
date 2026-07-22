import React from "react";
import { Image, StyleSheet } from "react-native";

// Aspect ratio derived from assets/polli logo.png (910 × 467)
const ASPECT = 910 / 467;

interface Props {
  size?: number;
  dark?: boolean;
}

export function Logo({ size = 34, dark = false }: Props) {
  return (
    <Image
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      source={require("../assets/polli logo.png")}
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
