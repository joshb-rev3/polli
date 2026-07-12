import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { polliColorFromHue, WordSignature } from "../../lib/voice";
import { colors, fonts } from "../../theme";

interface Props {
  word: string | null;
  signature?: WordSignature;
  visible: boolean;
}

export function KaraokeTranscript({ word, signature, visible }: Props) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (visible && word) {
      const vol = signature?.volumeNorm ?? 0.4;
      scale.value = withSpring(1.04 + vol * 0.35, { damping: 14, stiffness: 220 });
    } else {
      scale.value = withSpring(1, { damping: 14, stiffness: 220 });
    }
  }, [word, visible, signature?.volumeNorm, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const color = polliColorFromHue(signature?.hue ?? 45);

  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.glow} />
      {visible && word ? (
        <Animated.Text
          style={[styles.text, animStyle, { color }]}
          accessibilityLiveRegion="polite"
        >
          {word}
        </Animated.Text>
      ) : (
        <Text style={styles.empty}>Tap play to hear your words bloom</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    zIndex: 2,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(248,249,244,0.72)",
  },
  text: {
    fontFamily: fonts.serifBold,
    fontSize: 34,
    lineHeight: 38,
    textAlign: "center",
    letterSpacing: 0.3,
    maxWidth: "100%",
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink2,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
