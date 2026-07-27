import React from "react";
import { Image, ImageStyle, StyleProp, StyleSheet } from "react-native";

/** Exact brand wordmark — assets/polli logo.png (910 × 467). */
const ASPECT = 910 / 467;

interface Props {
  size?: number;
  /** Cream ink variant of the exact logo for green / dark surfaces. */
  onDark?: boolean;
  style?: StyleProp<ImageStyle>;
}

export function Logo({ size = 34, onDark = false, style }: Props) {
  return (
    <Image
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      source={
        onDark
          ? require("../assets/polli logo light.png")
          : require("../assets/polli logo.png")
      }
      style={[styles.image, { width: size * ASPECT, height: size }, style]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  image: {
    alignSelf: "center",
  },
});
