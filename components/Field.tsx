import React, { useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { colors, fonts } from "../theme";

type Props = {
  label?: string;
  children: React.ReactElement<TextInputProps>;
  style?: ViewStyle;
};

/**
 * Rounded field shell that owns the focus ring.
 * Put a borderless TextInput inside — the halo follows this container’s radius,
 * not the smaller inner input.
 */
export function Field({ label, children, style }: Props) {
  const [focused, setFocused] = useState(false);

  const child = React.cloneElement(children, {
    onFocus: (e: any) => {
      setFocused(true);
      children.props.onFocus?.(e);
    },
    onBlur: (e: any) => {
      setFocused(false);
      children.props.onBlur?.(e);
    },
  });

  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.box,
          focused && styles.boxFocused,
          focused && Platform.OS === "web" && boxFocusedWeb,
        ]}
      >
        {child}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.ink2,
    letterSpacing: 0.72,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  box: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line2,
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 54,
    justifyContent: "center",
  },
  boxFocused: {
    borderColor: "rgba(27, 77, 62, 0.55)",
  },
});

const boxFocusedWeb: ViewStyle = {
  // RN web accepts CSS box-shadow for the soft marigold halo
  boxShadow: "0 0 0 3px rgba(245, 184, 0, 0.34)",
};
