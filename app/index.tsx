import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { Bzz } from "../components/Bzz";
import { Button } from "../components/Button";
import { IconArrow } from "../components/Icon";
import { Logo } from "../components/Logo";
import { colors, fonts } from "../theme";

const HERO_FLOWERS = [
  {
    id: "main",
    xRatio: 0.5,
    y: 84,
    avatar: "https://i.pravatar.cc/96?img=32",
  },
] as const;

const MIN_FLOWER_COUNT = 20;
const MAX_FLOWER_COUNT = 600;
const STEM_BASELINE_COUNT = 200;
const MIN_VISIBLE_STEM_HEIGHT = 62;
const MAX_VISIBLE_STEM_HEIGHT = 110;
const INTRO_GROWTH_MS = 2800;
const HERO_SCENE_HEIGHT = 320;
const SOIL_TOP_Y = 246;
const STEM_ROOT_Y = 294;
const FLOWER_FRAME_SIZE = 120;

function randomFlowerCount() {
  return Math.floor(Math.random() * (MAX_FLOWER_COUNT - MIN_FLOWER_COUNT + 1)) + MIN_FLOWER_COUNT;
}

export default function Splash() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [introProgress, setIntroProgress] = useState(0);
  const [beesArrived, setBeesArrived] = useState(0);
  const [flowerCounts, setFlowerCounts] = useState<number[]>(
    HERO_FLOWERS.map(() => MIN_FLOWER_COUNT)
  );
  const pulse = useSharedValue(0);
  const supportFlow = useSharedValue(0);
  const beeArrivalA = useSharedValue(false);
  const beeArrivalB = useSharedValue(false);
  const beeArrivalC = useSharedValue(false);
  const heroWidth = Math.max(Math.min(width - 24, 560), 280);
  const compact = height < 720 || width < 380;
  const headlineSize = width < 360 ? 34 : width < 400 ? 40 : 48;
  const ledeSize = compact ? 15 : 17;

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(elapsed / INTRO_GROWTH_MS, 1);
      const eased = Easing.inOut(Easing.cubic)(progress);
      setIntroProgress(eased);
      if (progress >= 1) clearInterval(timer);
    }, 16);

    return () => clearInterval(timer);
  }, []);

  const flowerMetrics = HERO_FLOWERS.map((f, i) => {
    const normalized = (flowerCounts[i] - MIN_FLOWER_COUNT) / (MAX_FLOWER_COUNT - MIN_FLOWER_COUNT);
    const baselineProgress =
      (STEM_BASELINE_COUNT - MIN_FLOWER_COUNT) / (MAX_FLOWER_COUNT - MIN_FLOWER_COUNT);
    const visualProgress = Math.max(baselineProgress, normalized);
    const centerX = 42 + f.xRatio * (heroWidth - 84);
    const fullStemHeight =
      MIN_VISIBLE_STEM_HEIGHT +
      visualProgress * (MAX_VISIBLE_STEM_HEIGHT - MIN_VISIBLE_STEM_HEIGHT);
    const stemHeight = 6 + introProgress * (fullStemHeight - 6);
    const centerY = SOIL_TOP_Y - stemHeight;
    const bloomScale = 0.12 + introProgress * (0.88 + normalized * 0.22);
    const leafScale = 0.08 + introProgress * (0.7 + normalized * 0.4);
    return {
      x: centerX,
      centerY,
      top: centerY - FLOWER_FRAME_SIZE / 2,
      bloomScale,
      leafScale,
    };
  });

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.linear }),
      -1,
      true
    );

    supportFlow.value = withRepeat(
      withTiming(1, { duration: 4500, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  useEffect(() => {
    const targets = HERO_FLOWERS.map(() => randomFlowerCount());
    const startTimers: Array<ReturnType<typeof setTimeout>> = [];
    const frameTimers: Array<ReturnType<typeof setInterval>> = [];

    targets.forEach((target, index) => {
      const startTimer = setTimeout(() => {
        const speedFactor = (target - MIN_FLOWER_COUNT) / (MAX_FLOWER_COUNT - MIN_FLOWER_COUNT);
        const duration = Math.round(3400 - speedFactor * 1200);
        const startedAt = Date.now();
        const timer = setInterval(() => {
          const elapsed = Date.now() - startedAt;
          const progress = Math.min(elapsed / duration, 1);
          const eased = Easing.inOut(Easing.cubic)(progress);
          const value = Math.round(
            MIN_FLOWER_COUNT + (target - MIN_FLOWER_COUNT) * eased
          );

          setFlowerCounts((prev) => {
            if (prev[index] === value) return prev;
            const next = [...prev];
            next[index] = value;
            return next;
          });

          if (progress >= 1) clearInterval(timer);
        }, 16);

        frameTimers.push(timer);
      }, index * 280);

      startTimers.push(startTimer);
    });

    return () => {
      startTimers.forEach((t) => clearTimeout(t));
      frameTimers.forEach((t) => clearInterval(t));
    };
  }, []);

  const rippleOuterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.88 + pulse.value * 0.24 }],
    opacity: 0.36 - pulse.value * 0.28,
  }));

  const rippleInnerStyle = useAnimatedStyle(() => {
    const phase = pulse.value > 0.5 ? pulse.value - 0.5 : pulse.value + 0.5;
    return {
      transform: [{ scale: 0.88 + phase * 0.24 }],
      opacity: 0.3 - phase * 0.22,
    };
  });

  const flowerStyle = useAnimatedStyle(() => {
    const sway = Math.sin((pulse.value + 0.0) * Math.PI * 2);
    return {
      transform: [
        { translateY: -sway * 1.8 },
        { scale: 1 },
        { rotate: `${sway * 1.1}deg` },
      ],
    };
  });

  const beeAStyle = useAnimatedStyle(() => {
    const t = supportFlow.value;
    const source = { x: heroWidth * 0.14, y: HERO_SCENE_HEIGHT - 84 };
    const target = flowerMetrics[0];
    const x = source.x + (target.x - source.x) * t;
    const y = source.y + (target.centerY - source.y) * t - Math.sin(t * Math.PI) * 24;
    const rot = -18 + t * 30;
    return {
      transform: [{ translateX: x - 12 }, { translateY: y - 12 }, { rotate: `${rot}deg` }],
      opacity: t < 0.08 ? t * 8 : t > 0.92 ? (1 - t) * 10 : 1,
    };
  });

  const beeBStyle = useAnimatedStyle(() => {
    const raw = supportFlow.value + 0.33;
    const t = raw > 1 ? raw - 1 : raw;
    const source = { x: heroWidth * 0.86, y: HERO_SCENE_HEIGHT - 92 };
    const target = flowerMetrics[0];
    const x = source.x + (target.x - source.x) * t;
    const y = source.y + (target.centerY - source.y) * t - Math.sin(t * Math.PI) * 20;
    const rot = 20 - t * 36;
    return {
      transform: [{ translateX: x - 11 }, { translateY: y - 11 }, { rotate: `${rot}deg` }],
      opacity: t < 0.08 ? t * 8 : t > 0.92 ? (1 - t) * 10 : 1,
    };
  });

  const beeCStyle = useAnimatedStyle(() => {
    const raw = supportFlow.value + 0.66;
    const t = raw > 1 ? raw - 1 : raw;
    const source = { x: heroWidth * 0.5, y: HERO_SCENE_HEIGHT - 74 };
    const target = flowerMetrics[0];
    const x = source.x + (target.x - source.x) * t;
    const y = source.y + (target.centerY - source.y) * t - Math.sin(t * Math.PI) * 28;
    const rot = -6 + Math.sin(t * Math.PI) * 22;
    return {
      transform: [{ translateX: x - 10 }, { translateY: y - 10 }, { rotate: `${rot}deg` }],
      opacity: t < 0.08 ? t * 8 : t > 0.92 ? (1 - t) * 10 : 1,
    };
  });

  const burstAStyle = useAnimatedStyle(() => {
    const t = supportFlow.value;
    const active = t < 0.34;
    const rise = t / 0.34;
    return {
      transform: [{ translateY: -rise * 28 }, { scale: 0.92 + rise * 0.12 }],
      opacity: active ? Math.max(0, 1 - rise) : 0,
    };
  });

  const burstStyles = [burstAStyle];

  const flowerStyles = [flowerStyle];

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces
      >
      <View style={styles.logoWrap}>
        <Logo size={34} />
      </View>

      <View style={styles.hero}>
        <Animated.View style={[styles.rippleRing, styles.rippleOuter, rippleOuterStyle]} />
        <Animated.View style={[styles.rippleRing, styles.rippleInner, rippleInnerStyle]} />

        <Animated.View style={[styles.heroArt, { width: heroWidth }]}>
          <Svg width={heroWidth} height={HERO_SCENE_HEIGHT} viewBox={`0 0 ${heroWidth} ${HERO_SCENE_HEIGHT}`}>
            <Defs>
              <RadialGradient id="heroGlow" cx="50%" cy="42%" r="62%">
                <Stop offset="0%" stopColor="rgba(255,185,0,0.42)" />
                <Stop offset="60%" stopColor="rgba(255,185,0,0.16)" />
                <Stop offset="100%" stopColor="rgba(255,185,0,0)" />
              </RadialGradient>
              <RadialGradient id="groundDirt" cx="50%" cy="30%" r="80%">
                <Stop offset="0%" stopColor="#8B6F47" />
                <Stop offset="50%" stopColor="#6B5344" />
                <Stop offset="100%" stopColor="#4A3728" />
              </RadialGradient>
              <RadialGradient id="groundGrass" cx="50%" cy="40%" r="85%">
                <Stop offset="0%" stopColor="#7BA465" />
                <Stop offset="60%" stopColor="#5D8A48" />
                <Stop offset="100%" stopColor="#4A6B38" />
              </RadialGradient>
            </Defs>
            <Circle cx={heroWidth / 2} cy={128} r={Math.min(132, heroWidth * 0.42)} fill="url(#heroGlow)" />

            {/* Ground dirt layer */}
            <Ellipse
              cx={heroWidth / 2}
              cy={HERO_SCENE_HEIGHT - 12}
              rx={Math.min(220, heroWidth * 0.47)}
              ry={18}
              fill="url(#groundDirt)"
            />
            {/* Ground grass layer */}
            <Ellipse
              cx={heroWidth / 2}
              cy={HERO_SCENE_HEIGHT - 16}
              rx={Math.min(210, heroWidth * 0.45)}
              ry={10}
              fill="url(#groundGrass)"
              opacity={0.8}
            />
            {flowerMetrics.map((c, idx) => (
              <Path
                key={`stem-${idx}`}
                d={`M ${c.x - 8} ${STEM_ROOT_Y} Q ${c.x - 18} ${Math.max(c.centerY + 68, 184)} ${c.x} ${c.centerY}`}
                stroke="rgba(27,77,62,0.36)"
                strokeWidth={2.8}
                fill="none"
              />
            ))}
          </Svg>

          {HERO_FLOWERS.map((f, i) => (
            <Animated.View
              key={f.id}
              style={[
                styles.personFlower,
                {
                  left: f.xRatio * (heroWidth - FLOWER_FRAME_SIZE),
                  top: flowerMetrics[i].top,
                },
                flowerStyles[i],
              ]}
              pointerEvents="none"
            >
              <View
                style={[
                  styles.leaf,
                  styles.leafLeft,
                  {
                    transform: [
                      { scale: flowerMetrics[i].leafScale },
                      { rotate: "-28deg" },
                    ],
                  },
                ]}
              />
              <View
                style={[
                  styles.leaf,
                  styles.leafRight,
                  {
                    transform: [
                      { scale: flowerMetrics[i].leafScale },
                      { rotate: "28deg" },
                    ],
                  },
                ]}
              />

              <View style={[styles.bloomWrap, { transform: [{ scale: flowerMetrics[i].bloomScale }] }]}> 
                {flowerMetrics[i].bloomScale < 0.45 ? (
                  <View style={styles.seed} />
                ) : (
                  <>
                    <View style={[styles.petal, styles.petalTop]} />
                    <View style={[styles.petal, styles.petalBottom]} />
                    <View style={[styles.petal, styles.petalLeft]} />
                    <View style={[styles.petal, styles.petalRight]} />

                    <View style={styles.flowerCore}>
                      <Image source={{ uri: f.avatar }} style={styles.flowerAvatar} />
                    </View>

                    <View style={styles.plusBud}>
                      <Text style={styles.plusBudText}>{`+${flowerCounts[i]}`}</Text>
                    </View>

                    <Animated.View style={[styles.burstBubble, burstStyles[i]]}>
                      <Text style={styles.burstBubbleText}>+1</Text>
                    </Animated.View>
                  </>
                )}
              </View>
            </Animated.View>
          ))}

          <Animated.View style={[styles.pollinator, beeAStyle]} pointerEvents="none">
            <Bzz size={24} pose="flying" />
          </Animated.View>
          <Animated.View style={[styles.pollinator, beeBStyle]} pointerEvents="none">
            <Bzz size={22} pose="flying" />
          </Animated.View>
          <Animated.View style={[styles.pollinator, beeCStyle]} pointerEvents="none">
            <Bzz size={20} pose="flying" />
          </Animated.View>
        </Animated.View>
      </View>

      <View style={[styles.content, compact && styles.contentCompact]}>
        <View>
          <Text
            style={[
              styles.headline,
              { fontSize: headlineSize, lineHeight: headlineSize + 2 },
            ]}
          >
            Share $1 and{"\n"}
            <Text style={styles.headlineItalic}>endless good…</Text>
            {"\n"}
            with everyone.
          </Text>
          <Text style={[styles.lede, { fontSize: ledeSize, lineHeight: ledeSize + 8 }]}>
            Nominate a friend, teacher, neighbor, or anyone who deserves a little extra kindness.
            Everyone chips in just $1 — small contributions pollinate into a meaningful gift and
            message of support.
          </Text>
        </View>

        <View style={styles.steps}>
          {[
            "Nominate someone special",
            "Share with friends, family, and your community — ask everyone to send only $1",
            "Your nominee receives a meaningful gift and message",
          ].map((txt, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{txt}</Text>
            </View>
          ))}
        </View>

        <View style={styles.useCases}>
          <Text style={styles.useCasesEyebrow}>Made for everyday kindness</Text>
          <Text style={styles.useCasesTitle}>Start a Polli for</Text>
          <View style={styles.useCaseGrid}>
            {[
              { emoji: "🎂", label: "A birthday" },
              { emoji: "🤍", label: "A little lift" },
              { emoji: "🍎", label: "A teacher or coach" },
              { emoji: "🩺", label: "A healthcare hero" },
              { emoji: "🍼", label: "A new parent" },
              { emoji: "🌼", label: "Just because" },
            ].map((item) => (
              <View key={item.label} style={styles.useCaseChip}>
                <Text style={styles.useCaseEmoji}>{item.emoji}</Text>
                <Text style={styles.useCaseLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.ctaBlock}>
          <Button
            label="Start a Polli"
            full
            iconRight={<IconArrow size={20} color={colors.green} />}
            onPress={() => router.push("/auth")}
          />
          <View style={styles.signInWrap}>
            <Text style={styles.signInLine}>
              Already here?{" "}
              <Pressable onPress={() => router.push("/auth")}>
                <Text style={styles.signInLink}>Sign in</Text>
              </Pressable>
            </Text>
          </View>
        </View>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  logoWrap: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  hero: {
    height: HERO_SCENE_HEIGHT,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  heroArt: {
    height: HERO_SCENE_HEIGHT,
    maxWidth: 560,
    alignItems: "center",
    justifyContent: "center",
  },
  rippleRing: {
    position: "absolute",
    borderWidth: 1.5,
    borderColor: "rgba(27,77,62,0.18)",
    borderRadius: 999,
  },
  rippleOuter: {
    width: 208,
    height: 208,
  },
  rippleInner: {
    width: 168,
    height: 168,
  },
  personFlower: {
    position: "absolute",
    width: FLOWER_FRAME_SIZE,
    height: FLOWER_FRAME_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  bloomWrap: {
    width: FLOWER_FRAME_SIZE,
    height: FLOWER_FRAME_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  leaf: {
    position: "absolute",
    width: 42,
    height: 20,
    borderRadius: 20,
    backgroundColor: "rgba(83,162,104,0.62)",
    borderWidth: 1,
    borderColor: "rgba(63,130,81,0.75)",
  },
  leafLeft: {
    left: 18,
    top: 64,
  },
  leafRight: {
    right: 18,
    top: 68,
  },
  seed: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#8A5A2B",
    borderWidth: 1,
    borderColor: "#6A431F",
  },
  petal: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,185,0,0.42)",
    borderWidth: 1.3,
    borderColor: "rgba(234,170,0,0.52)",
  },
  petalTop: {
    top: 1,
  },
  petalBottom: {
    bottom: 1,
  },
  petalLeft: {
    left: 1,
  },
  petalRight: {
    right: 1,
  },
  flowerCore: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: colors.paper,
    borderWidth: 1.8,
    borderColor: "rgba(27,77,62,0.28)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  flowerAvatar: {
    width: "100%",
    height: "100%",
  },
  plusBud: {
    position: "absolute",
    right: -14,
    top: -10,
    minWidth: 52,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  plusBudText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.cream,
  },
  burstBubble: {
    position: "absolute",
    top: -40,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.marigold2,
    borderWidth: 1,
    borderColor: "rgba(234,170,0,0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(234,170,0,0.5)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.38,
    shadowRadius: 6,
    elevation: 2,
  },
  burstBubbleText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.green,
  },
  pollinator: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  content: {
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 44,
    gap: 28,
    backgroundColor: "transparent",
  },
  contentCompact: {
    paddingHorizontal: 20,
    gap: 20,
    paddingBottom: 32,
  },
  headline: {
    fontFamily: fonts.serif,
    fontSize: 48,
    lineHeight: 50,
    letterSpacing: -0.48,
    color: colors.green,
  },
  headlineItalic: {
    fontFamily: fonts.serifItalic,
  },
  lede: {
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 25,
    color: colors.ink2,
    marginTop: 14,
  },
  steps: {
    gap: 10,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cream,
    borderWidth: 1.5,
    borderColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: {
    color: colors.green,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  stepText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
  },
  useCases: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(27,77,62,0.1)",
    padding: 18,
    gap: 12,
  },
  useCasesEyebrow: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.ink2,
  },
  useCasesTitle: {
    fontFamily: fonts.serifBold,
    fontSize: 24,
    lineHeight: 28,
    color: colors.green,
    marginTop: -4,
  },
  useCaseGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  useCaseChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: "rgba(27,77,62,0.08)",
  },
  useCaseEmoji: {
    fontSize: 16,
  },
  useCaseLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.ink,
  },
  ctaBlock: {
    gap: 10,
  },
  signInWrap: {
    alignItems: "center",
  },
  signInLine: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink2,
  },
  signInLink: {
    color: colors.green,
    fontFamily: fonts.bodyBold,
  },
});
