import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { CONTENT_MAX, CONTENT_PAD } from "../theme/layout";

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Horizontal padding. Pass `0` when the parent already pads. Default `CONTENT_PAD`. */
  pad?: number;
  padBottom?: number;
  padTop?: number;
}

/**
 * Centers app content to CONTENT_MAX on wide screens.
 * Use inside ScrollView bodies or as a plain column wrapper.
 */
export function Content({
  children,
  style,
  pad = CONTENT_PAD,
  padBottom,
  padTop,
}: Props) {
  return (
    <View
      style={[
        styles.shell,
        {
          paddingHorizontal: pad,
          paddingBottom: padBottom,
          paddingTop: padTop,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: "100%",
    maxWidth: CONTENT_MAX,
    alignSelf: "center",
  },
});
