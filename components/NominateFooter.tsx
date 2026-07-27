import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, CONTENT_MAX, CONTENT_PAD } from "../theme";
import { Button } from "./Button";
import { IconArrow } from "./Icon";

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

/** Sticky bottom action bar for the nominate wizard. */
export function NominateFooter({ label, onPress, disabled }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.inner}>
        <Button
          full
          label={label}
          iconRight={<IconArrow size={18} color={colors.green} />}
          disabled={disabled}
          onPress={onPress}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingTop: 12,
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.line2,
  },
  inner: {
    width: "100%",
    maxWidth: CONTENT_MAX,
    alignSelf: "center",
    paddingHorizontal: CONTENT_PAD,
  },
});
