import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, shadows } from "../theme";
import { tap } from "../lib/haptics";
import { IconHome, IconPlus, IconProfile } from "./Icon";

export type Tab = "home" | "give-start" | "profile";

interface Props {
  active: Tab;
  onGo: (t: Tab) => void;
}

export function TabBar({ active, onGo }: Props) {
  const go = (t: Tab) => {
    tap();
    onGo(t);
  };
  return (
    <View style={styles.bar}>
      <Tab
        icon={<IconHome color={active === "home" ? colors.green : colors.ink2} />}
        label="Feed"
        active={active === "home"}
        onPress={() => go("home")}
      />
      <Pressable style={styles.center} onPress={() => go("give-start")}>
        <View style={[styles.fab, shadows.fab]}>
          <IconPlus size={28} color={colors.green} />
        </View>
        <Text
          style={[styles.label, styles.centerLabel, { color: colors.green }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          Start a Polli
        </Text>
      </Pressable>
      <Tab
        icon={<IconProfile color={active === "profile" ? colors.green : colors.ink2} />}
        label="You"
        active={active === "profile"}
        onPress={() => go("profile")}
      />
    </View>
  );
}

function Tab({
  icon,
  label,
  active,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.tab} onPress={onPress}>
      {icon}
      <Text style={[styles.label, active && { color: colors.green }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 84,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 14,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  center: {
    flex: 1,
    alignItems: "center",
  },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.marigold,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -22,
  },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 10.5,
    letterSpacing: 0.2,
    color: colors.ink2,
  },
  centerLabel: {
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 2,
  },
});
