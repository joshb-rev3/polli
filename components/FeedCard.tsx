import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { tap } from "../lib/haptics";
import { FeedItem } from "../lib/mockData";
import { colors, fonts, shadows } from "../theme";
import { IconHeart, IconShare } from "./Icon";

interface Props {
  n: FeedItem;
  viewerHasDonated?: boolean;
  onGive: (n: FeedItem) => void;
  onOpen: (n: FeedItem) => void;
  onShare: (n: FeedItem) => void;
}

/** Feed card — short color strip for identity; full “why” is the north star. */
export function FeedCard({ n, viewerHasDonated = false, onGive, onOpen, onShare }: Props) {
  const [bursts, setBursts] = useState<{ id: number; x: number }[]>([]);
  const first = n.name.split(" ")[0];

  const spawnBurst = () => {
    const id = Date.now() + Math.random();
    const x = Math.random() * 48 + 24;
    setBursts((b) => [...b, { id, x }]);
    setTimeout(() => setBursts((b) => b.filter((it) => it.id !== id)), 1100);
  };

  return (
    <View style={styles.card}>
      <Pressable onPress={() => onOpen(n)}>
        <LinearGradient
          colors={n.photo as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ph}
        >
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.35)"]}
            style={styles.scrim}
            pointerEvents="none"
          />

          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live · {n.daysLeft}d</Text>
          </View>

          <View style={styles.heroBottom}>
            <Text style={styles.heroCat}>
              {n.cat.emoji}  {n.cat.title}
            </Text>
            <Text style={styles.heroName} numberOfLines={1}>
              {n.name}
            </Text>
          </View>
        </LinearGradient>
      </Pressable>

      <View style={styles.body}>
        <View style={styles.who}>
          <View style={styles.avSm}>
            <Text style={styles.avSmText}>{n.nominatorAv}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.whoText} numberOfLines={1}>
              <Text style={styles.whoName}>{n.nominator}</Text>
              {" started this"}
            </Text>
            {viewerHasDonated ? (
              <Text style={styles.whoMeta} numberOfLines={1}>
                {n.backers} friends have chipped in
              </Text>
            ) : null}
          </View>
        </View>

        <Pressable onPress={() => onOpen(n)} style={styles.whyBlock}>
          <Text style={styles.whyLabel}>Why chip in</Text>
          <Text style={styles.storyText}>{n.story}</Text>
        </Pressable>

        <View style={styles.actions}>
          {bursts.map((b) => (
            <Burst key={b.id} x={b.x} />
          ))}
          {viewerHasDonated ? (
            <View style={styles.givenRow}>
              <IconHeart size={16} color={colors.green} />
              <Text style={styles.givenText}>Thank you for showing up for {first}</Text>
              <Pressable
                style={styles.shareBtn}
                onPress={() => onShare(n)}
                accessibilityRole="button"
                accessibilityLabel="Share"
                hitSlop={6}
              >
                <IconShare size={18} color={colors.ink2} />
              </Pressable>
            </View>
          ) : (
            <>
              <Pressable
                style={styles.giveBtn}
                onPress={() => {
                  tap();
                  spawnBurst();
                  onGive(n);
                }}
              >
                <IconHeart size={16} color={colors.green} />
                <Text style={styles.giveBtnText}>Send $1 to {first}</Text>
              </Pressable>
              <Pressable
                style={styles.shareBtn}
                onPress={() => onShare(n)}
                accessibilityRole="button"
                accessibilityLabel="Share"
                hitSlop={6}
              >
                <IconShare size={18} color={colors.ink2} />
              </Pressable>
            </>
          )}
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
    transform: [{ translateY: y.value }, { scale: 1 + ((80 + y.value) / 80) * 0.4 }],
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
    borderRadius: 20,
    overflow: "hidden",
    ...shadows.feed,
  },
  ph: {
    height: 96,
    justifyContent: "flex-end",
    position: "relative",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  liveRow: {
    position: "absolute",
    top: 10,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#5FE08A",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.85)",
  },
  liveText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: "#fff",
    letterSpacing: 0.2,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroBottom: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    zIndex: 1,
  },
  heroCat: {
    color: "rgba(255,255,255,0.88)",
    fontFamily: fonts.body,
    fontSize: 12,
  },
  heroName: {
    color: "#fff",
    fontFamily: fonts.serifHeavy,
    fontSize: 20,
    lineHeight: 24,
    marginTop: 1,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 14,
  },
  who: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avSm: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  avSmText: {
    color: "#fff",
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  whoText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink2,
  },
  whoName: {
    fontFamily: fonts.bodySemi,
    color: colors.ink,
  },
  whoMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 1,
  },
  whyBlock: {
    gap: 8,
  },
  whyLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: colors.ink2,
  },
  storyText: {
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 25,
    color: colors.ink,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    position: "relative",
    marginTop: 2,
  },
  burst: {
    position: "absolute",
    fontFamily: fonts.serifHeavy,
    fontSize: 26,
    color: colors.marigold,
    top: -4,
    zIndex: 10,
  },
  giveBtn: {
    flex: 1,
    backgroundColor: colors.marigold,
    paddingVertical: 13,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  giveBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.green,
  },
  givenRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  givenText: {
    flex: 1,
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.green,
  },
  shareBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line2,
  },
});
