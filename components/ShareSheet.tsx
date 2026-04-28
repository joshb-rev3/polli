import * as Clipboard from "expo-clipboard";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts } from "../theme";
import { IconCopy, IconLink, IconMsg, IconShare } from "./Icon";

interface Props {
  open: boolean;
  onClose: () => void;
  url: string;
  name?: string;
}

const TARGETS = [
  { id: "messages", label: "Messages", bg: "#25D366", icon: "msg" },
  { id: "email", label: "Email", bg: "#EA4335", icon: "msg" },
  { id: "facebook", label: "Facebook", bg: "#1877F2", label2: "f" },
  {
    id: "instagram",
    label: "Instagram",
    bg: "linear",
    linear: ["#FD5B4F", "#C034A1", "#6A4CFF"],
    label2: "IG",
  },
  { id: "x", label: "X", bg: "#000", label2: "X" },
  { id: "linkedin", label: "LinkedIn", bg: "#0A66C2", label2: "in" },
  { id: "copy", label: "Copy", bg: colors.ink, icon: "copy" },
  { id: "more", label: "More", bg: colors.green, icon: "share" },
];

export function ShareSheet({ open, onClose, url, name }: Props) {
  const [copied, setCopied] = useState(false);
  const translate = useSharedValue(600);
  const bgOpacity = useSharedValue(0);

  useEffect(() => {
    if (open) {
      translate.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) });
      bgOpacity.value = withTiming(1, { duration: 200 });
    } else {
      translate.value = withTiming(600, { duration: 300 });
      bgOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [open]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translate.value }] }));
  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));

  const handleCopy = async () => {
    await Clipboard.setStringAsync(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: `Chip in $1 for ${name || "someone kind"}: ${url}` });
    } catch {}
    onClose();
  };

  const handleTarget = (id: string) => {
    if (id === "copy") handleCopy();
    else if (id === "more") handleShare();
    else {
      // For this MVP, all social targets fall back to system share
      handleShare();
    }
  };

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.bg, bgStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.sheet, sheetStyle]}>
        <SafeAreaView edges={["bottom"]}>
          <View style={styles.grab} />
          <Text style={styles.title}>Share {name ? `${name}'s` : ""} kindness</Text>
          <Text style={styles.subtitle}>The more shares, the more dollars add up.</Text>
          <View style={styles.linkRow}>
            <IconLink size={16} color={colors.ink} />
            <Text style={styles.linkText} numberOfLines={1}>
              {url}
            </Text>
            <Pressable style={styles.copyBtn} onPress={handleCopy}>
              <Text style={styles.copyText}>{copied ? "Copied" : "Copy"}</Text>
            </Pressable>
          </View>
          <View style={styles.grid}>
            {TARGETS.map((t) => (
              <Pressable key={t.id} style={styles.cell} onPress={() => handleTarget(t.id)}>
                <View style={[styles.ico, { backgroundColor: t.bg === "linear" ? "#C034A1" : t.bg }]}>
                  {t.icon === "msg" ? (
                    <IconMsg color="#fff" />
                  ) : t.icon === "copy" ? (
                    <IconCopy color="#fff" />
                  ) : t.icon === "share" ? (
                    <IconShare color="#fff" />
                  ) : (
                    <Text style={[styles.iconText]}>{t.label2}</Text>
                  )}
                </View>
                <Text style={styles.cellLabel}>{t.id === "copy" && copied ? "Copied" : t.label}</Text>
              </Pressable>
            ))}
          </View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: {
    backgroundColor: colors.overlay,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: -10 },
    shadowRadius: 40,
    elevation: 20,
  },
  grab: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line2,
    alignSelf: "center",
    marginBottom: 14,
  },
  title: {
    fontFamily: fonts.serifSemi,
    fontSize: 22,
    textAlign: "center",
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink2,
    textAlign: "center",
    marginTop: 4,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 10,
    marginVertical: 14,
  },
  linkText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink2,
  },
  copyBtn: {
    backgroundColor: colors.marigold,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  copyText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.green,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: "25%",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  ico: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    color: "#fff",
    fontFamily: fonts.bodyExtra,
    fontSize: 20,
  },
  cellLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.ink2,
  },
});
