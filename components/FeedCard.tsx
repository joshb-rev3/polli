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
import { colors, fonts } from "../theme";
import { IconHeart, IconShare } from "./Icon";

interface Props {
  n: FeedItem;
  viewerHasDonated?: boolean;
  onGive: (n: FeedItem) => void;
  onOpen: (n: FeedItem) => void;
  onShare: (n: FeedItem) => void;
}

/** Feed item — matches nominee detail: cream header, quiet meta, why-first body. */
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
      <Pressable onPress={() => onOpen(n)} style={styles.headerCard}>
        <View style={styles.headerText}>
          <Text style={styles.headerName}>{n.name}</Text>
          <Text style={styles.headerType}>{n.cat.title}</Text>
          {viewerHasDonated ? (
            <Text style={styles.headerSub}>
              Thank you — you're part of {first}'s Polli with {n.backers} others.
            </Text>
          ) : (
            <Text style={styles.headerSub}>
              A little from you goes a long way for {first}.
            </Text>
          )}
        </View>
        <View style={styles.typeEmoji}>
          <Text style={styles.typeEmojiText}>{n.cat.emoji}</Text>
        </View>
      </Pressable>

      <View style={styles.metaRow}>
        <View style={styles.liveDot} />
        <Text style={styles.metaText}>
          {viewerHasDonated
            ? `Live · ${n.daysLeft}d left · ${n.backers} chipping in`
            : `Live · ${n.daysLeft}d left`}
        </Text>
        <Pressable
          style={styles.shareIcon}
          onPress={() => onShare(n)}
          accessibilityRole="button"
          accessibilityLabel="Share"
          hitSlop={8}
        >
          <IconShare size={16} color={colors.ink2} />
        </Pressable>
      </View>

      <Pressable onPress={() => onOpen(n)} style={styles.whyBlock}>
        <Text style={styles.eyebrow}>WHY CHIP IN</Text>
        <View style={styles.nominator}>
          <View style={styles.nomAv}>
            <Text style={styles.nomAvText}>{n.nominatorAv}</Text>
          </View>
          <Text style={styles.nomText}>
            <Text style={{ fontFamily: fonts.bodyBold }}>{n.nominator}</Text> shared this overview:
          </Text>
        </View>
        <Text style={styles.story}>"{n.story}"</Text>
      </Pressable>

      <View style={styles.actions}>
        {bursts.map((b) => (
          <Burst key={b.id} x={b.x} />
        ))}
        {viewerHasDonated ? (
          <View style={styles.thanksBox}>
            <IconHeart size={16} color={colors.green} />
            <Text style={styles.thanksText}>Thank you for showing up for {first}</Text>
          </View>
        ) : (
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
        )}
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
    backgroundColor: colors.paper,
    borderRadius: 16,
    padding: 4,
    gap: 10,
  },
  headerCard: {
    padding: 12,
    backgroundColor: colors.cream,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line2,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerName: {
    fontFamily: fonts.serifHeavy,
    fontSize: 22,
    lineHeight: 26,
    color: colors.ink,
  },
  headerType: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.green,
    marginTop: 4,
  },
  headerSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink2,
    marginTop: 6,
    lineHeight: 18,
  },
  typeEmoji: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.line2,
    alignItems: "center",
    justifyContent: "center",
  },
  typeEmojiText: {
    fontSize: 26,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 2,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.sage,
  },
  metaText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink2,
  },
  shareIcon: {
    padding: 6,
  },
  whyBlock: {
    gap: 6,
  },
  eyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.ink2,
    letterSpacing: 0.88,
  },
  nominator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  nomAv: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.marigold,
    alignItems: "center",
    justifyContent: "center",
  },
  nomAvText: {
    color: "#fff",
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  nomText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink,
  },
  story: {
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 24,
    color: colors.ink,
    marginTop: 2,
  },
  actions: {
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
    backgroundColor: "#E8F0EA",
    borderWidth: 1.5,
    borderColor: colors.green,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
  },
  giveBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.green,
  },
  thanksBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(83,162,104,0.08)",
  },
  thanksText: {
    flex: 1,
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.green,
  },
});
