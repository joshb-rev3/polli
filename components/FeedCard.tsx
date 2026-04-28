import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { tap } from "../lib/haptics";
import { FeedItem } from "../lib/mockData";
import { ordinal } from "../lib/ordinal";
import { colors, fonts, shadows } from "../theme";
import { IconHeart, IconShare } from "./Icon";

interface Props {
  n: FeedItem;
  onGive: (n: FeedItem) => void;
  onOpen: (n: FeedItem) => void;
  onShare: (n: FeedItem) => void;
}

export function FeedCard({ n, onGive, onOpen, onShare }: Props) {
  const [bursts, setBursts] = useState<{ id: number; x: number }[]>([]);

  const spawnBurst = () => {
    const id = Date.now() + Math.random();
    const x = Math.random() * 40 + 20;
    setBursts((b) => [...b, { id, x }]);
    setTimeout(() => setBursts((b) => b.filter((it) => it.id !== id)), 1100);
  };

  return (
    <View style={styles.card}>
      <Pressable onPress={() => onOpen(n)}>
        <LinearGradient colors={n.photo as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ph}>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE · {n.daysLeft}d LEFT</Text>
          </View>
          <View style={styles.phBottom}>
            <View style={styles.bigGivers}>
              <Text style={styles.giversBig}>{n.backers}</Text>
              <Text style={styles.giversLbl}>friends chipped in</Text>
            </View>
          </View>
        </LinearGradient>
      </Pressable>

      <View style={styles.body}>
        <View style={styles.who}>
          <View style={styles.avSm}>
            <Text style={styles.avSmText}>{n.nominatorAv}</Text>
          </View>
          <Text style={styles.whoText}>
            <Text style={{ fontFamily: fonts.bodyBold }}>{n.nominator}</Text> shared kindness
          </Text>
        </View>

        <Pressable onPress={() => onOpen(n)} style={styles.nameRow}>
          <View style={styles.catIcon}>
            <Text style={{ fontSize: 22 }}>{n.cat.emoji}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.nameText} numberOfLines={1}>
              {n.name}
            </Text>
            <Text style={styles.roleText}>{n.role}</Text>
          </View>
        </Pressable>

        <Pressable onPress={() => onOpen(n)}>
          <Text style={styles.storyLabel}>What makes {n.name.split(" ")[0]} special:</Text>
          <Text style={styles.storyText} numberOfLines={5}>
            {n.story}
          </Text>
        </Pressable>

        <View style={styles.actions}>
          {bursts.map((b) => (
            <Burst key={b.id} x={b.x} />
          ))}
          <Pressable
            style={styles.giveBtn}
            onPress={() => {
              tap();
              spawnBurst();
              onGive(n);
            }}
          >
            <IconHeart size={16} color={colors.green} />
            <Text style={styles.giveBtnText}>
              Be the {n.backers + 1}
              <Text style={{ fontSize: 10 }}>{ordinal(n.backers + 1)}</Text>
            </Text>
          </Pressable>
          <Pressable style={styles.shareBtn} onPress={() => onShare(n)}>
            <IconShare size={14} color={colors.ink2} />
            <Text style={styles.shareBtnText}>Share</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Burst({ x }: { x: number }) {
  const y = useSharedValue(0);
  const op = useSharedValue(1);
  React.useEffect(() => {
    y.value = withTiming(-80, { duration: 1100, easing: Easing.out(Easing.quad) });
    op.value = withTiming(0, { duration: 1100 });
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { scale: 1 + (80 + y.value) / 80 * 0.4 }],
    opacity: op.value,
  }));
  return (
    <Animated.Text style={[styles.burst, style, { left: x }]}>
      +$1
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    ...shadows.feed,
  },
  ph: {
    height: 280,
    paddingHorizontal: 14,
    paddingBottom: 14,
    justifyContent: "flex-end",
  },
  livePill: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.sageSoft,
    borderWidth: 1,
    borderColor: "rgba(83,162,104,0.35)",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.sage,
  },
  liveText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.cream,
    letterSpacing: 0.22,
  },
  phBottom: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  bigGivers: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    flex: 1,
    flexWrap: "wrap",
  },
  giversBig: {
    fontFamily: fonts.serifHeavy,
    fontSize: 34,
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    lineHeight: 36,
  },
  giversLbl: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  body: {
    padding: 18,
    gap: 12,
  },
  who: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avSm: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.marigold,
    alignItems: "center",
    justifyContent: "center",
  },
  avSmText: {
    color: "#fff",
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  whoText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.cream,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(235,79,48,0.35)",
    minHeight: 66,
  },
  catIcon: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: colors.coralSoft,
    borderWidth: 1.5,
    borderColor: colors.coral,
    alignItems: "center",
    justifyContent: "center",
  },
  nameText: {
    fontFamily: fonts.serifBold,
    fontSize: 17,
    color: colors.ink,
    lineHeight: 20,
  },
  roleText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink2,
    marginTop: 2,
  },
  storyLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 6,
  },
  storyText: {
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
    position: "relative",
  },
  burst: {
    position: "absolute",
    fontFamily: fonts.serifHeavy,
    fontSize: 28,
    color: colors.marigold,
    top: 0,
    zIndex: 10,
  },
  giveBtn: {
    backgroundColor: colors.marigold,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 18,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  giveBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.green,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 4,
  },
  shareBtnText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.ink2,
  },
});
