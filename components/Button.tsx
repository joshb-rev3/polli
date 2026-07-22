import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { colors, fonts } from "../theme";
import { tap } from "../lib/haptics";

type Variant = "primary" | "secondary" | "ghost" | "dark" | "danger" | "marigold";
type Size = "default" | "sm";

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  full?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  style?: ViewStyle;
  hapticOnPress?: boolean;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "default",
  full,
  disabled,
  icon,
  iconRight,
  style,
  hapticOnPress = true,
}: Props) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const variantStyle = VARIANTS[variant];
  const sizeStyle = size === "sm" ? styles.sm : styles.default;

  const handlePress = () => {
    if (disabled) return;
    if (hapticOnPress) tap();
    onPress?.();
  };

  return (
    <Animated.View style={[full && { alignSelf: "stretch" }, animStyle]}>
      <Pressable
        onPressIn={() => (scale.value = withTiming(0.98, { duration: 80 }))}
        onPressOut={() => (scale.value = withTiming(1, { duration: 120 }))}
        onPress={handlePress}
        disabled={disabled}
        style={[
          styles.base,
          sizeStyle,
          variantStyle.container,
          disabled && { opacity: 0.5 },
          style,
        ]}
      >
        {icon}
        <Text style={[styles.label, variantStyle.text, size === "sm" && { fontSize: 14 }]}>
          {label}
        </Text>
        {iconRight}
      </Pressable>
    </Animated.View>
  );
}

const VARIANTS: Record<Variant, { container: ViewStyle; text: any }> = {
  primary: {
    container: {
      backgroundColor: colors.marigold,
    },
    text: { color: colors.green },
  },
  /** Quieter give / support action — doesn’t compete with Start a Polli */
  secondary: {
    container: {
      backgroundColor: "#E8F0EA",
      borderWidth: 1.5,
      borderColor: colors.green,
    },
    text: { color: colors.green },
  },
  marigold: {
    container: {
      backgroundColor: colors.marigold,
    },
    text: { color: colors.ink },
  },
  ghost: {
    container: {
      backgroundColor: "transparent",
      borderWidth: 1.5,
      borderColor: colors.green,
    },
    text: { color: colors.green },
  },
  dark: {
    container: {
      backgroundColor: colors.green,
    },
    text: { color: colors.cream },
  },
  danger: {
    container: {
      backgroundColor: colors.coral,
    },
    text: { color: "#fff" },
  },
};

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
  },
  default: {
    paddingVertical: 18,
    paddingHorizontal: 26,
    minHeight: 56,
  },
  sm: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    minHeight: 44,
    borderRadius: 11,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
});
