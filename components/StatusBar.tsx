import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";
import { IconBattery, IconSignal, IconWifi } from "./Icon";

interface Props {
  dark?: boolean;
}

export function FakeStatusBar({ dark = false }: Props) {
  const color = dark ? colors.cream : colors.ink;
  return (
    <View style={styles.bar}>
      <Text style={[styles.time, { color }]}>9:41</Text>
      <View style={styles.icons}>
        <IconSignal size={17} color={color} />
        <IconWifi size={17} color={color} />
        <IconBattery size={26} color={color} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 44,
    paddingHorizontal: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  time: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    letterSpacing: -0.15,
  },
  icons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});
