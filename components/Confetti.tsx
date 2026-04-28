import React, { useEffect } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors } from "../theme";

const COLORS = [colors.marigold, colors.coral, colors.cream, "#7ED48A"];

export function Confetti({ count = 24 }: { count?: number }) {
  const pieces = Array.from({ length: count }).map((_, i) => i);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((i) => (
        <Piece key={i} i={i} />
      ))}
    </View>
  );
}

function Piece({ i }: { i: number }) {
  const fall = useSharedValue(-40);
  const height = Dimensions.get("window").height;
  const left = (i * 17) % 100;
  const delay = (i % 8) * 120;
  const dur = 2400 + (i % 5) * 250;
  const size = 6 + (i % 4) * 3;
  const color = COLORS[i % 4];

  useEffect(() => {
    fall.value = withDelay(
      delay,
      withRepeat(
        withTiming(height + 40, { duration: dur, easing: Easing.in(Easing.quad) }),
        -1,
        false
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: fall.value }, { rotate: `${(fall.value / height) * 720}deg` }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: 0,
          left: `${left}%`,
          width: size,
          height: size * 1.4,
          backgroundColor: color,
          borderRadius: 2,
        },
        style,
      ]}
    />
  );
}
