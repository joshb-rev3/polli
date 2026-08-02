import React, { useState } from "react";
import {
  Platform,
  TextInput as RNTextInput,
  TextInputProps,
  StyleProp,
  StyleSheet,
  TextStyle,
} from "react-native";
import { colors } from "../theme";

type WebTextStyle = TextStyle & {
  outlineStyle?: "none" | "solid" | "dashed" | "dotted";
  outlineWidth?: number;
  outlineColor?: string;
  caretColor?: string;
  boxShadow?: string;
};

/**
 * Shared text field with a visible green caret.
 * When this input draws its own border, focus halo follows that radius.
 * Prefer wrapping borderless inputs in {@link Field} so the shell owns the ring.
 */
export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(
  function TextInput({ style, onFocus, onBlur, ...props }, ref) {
    const [focused, setFocused] = useState(false);
    const flat = StyleSheet.flatten(style) as TextStyle | undefined;
    const selfBordered =
      typeof flat?.borderWidth === "number" && flat.borderWidth > 0;

    const webBase: WebTextStyle | null =
      Platform.OS === "web"
        ? {
            outlineStyle: "none",
            outlineWidth: 0,
            outlineColor: "transparent",
            caretColor: colors.green,
          }
        : null;

    const webFocused: WebTextStyle | null =
      Platform.OS === "web" && focused && selfBordered
        ? {
            borderColor: "rgba(27, 77, 62, 0.55)",
            boxShadow: "0 0 0 3px rgba(245, 184, 0, 0.34)",
          }
        : null;

    return (
      <RNTextInput
        ref={ref}
        placeholderTextColor={props.placeholderTextColor ?? colors.inkMuted}
        selectionColor="rgba(245, 184, 0, 0.45)"
        cursorColor={colors.green}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={
          [
            styles.base,
            webBase,
            focused && selfBordered && styles.focusedBorder,
            webFocused,
            style,
          ] as StyleProp<TextStyle>
        }
        {...props}
      />
    );
  },
);

const styles = StyleSheet.create({
  base: {
    color: colors.ink,
  },
  focusedBorder: {
    borderColor: "rgba(27, 77, 62, 0.55)",
  },
});
