import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
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
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { Bzz } from "../components/Bzz";
import { Button } from "../components/Button";
import { IconArrow } from "../components/Icon";
import { Logo } from "../components/Logo";
import { SiteHead } from "../components/SiteHead";
import { usePolliDraft } from "../lib/polliDraft";
import { useSession } from "../lib/session";
import { colors, fonts, DESKTOP_BP, SPLASH_MAX } from "../theme";

const HOME_USE_CASES = [
  { emoji: "🎂", label: "A birthday", catId: "birthday" },
  { emoji: "🤍", label: "A little lift", catId: "hard-time" },
  { emoji: "🍎", label: "A teacher or coach", catId: "teacher" },
  { emoji: "🩺", label: "A healthcare hero", catId: "nurse" },
  { emoji: "🍼", label: "A new parent", catId: "new-parent" },
  { emoji: "🌼", label: "Just because", catId: "just-because" },
] as const;

const HERO_FLOWERS = [
  {
    id: "main",
    xRatio: 0.5,
    y: 84,
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
  const { userId } = useSession();
  const { set: setPolliDraft } = usePolliDraft();
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
  const isWide = width >= DESKTOP_BP;
  const heroWidth = isWide
    ? Math.min(520, Math.max(width * 0.42, 400))
    : Math.max(Math.min(width - 24, 560), 280);
  const compact = !isWide && (height < 720 || width < 380);
  const headlineSize = isWide ? 56 : width < 360 ? 34 : width < 400 ? 40 : 48;
  const ledeSize = isWide ? 18 : compact ? 15 : 17;

  const startPolli = (catId?: string) => {
    if (catId) setPolliDraft({ catId });
    if (userId) {
      router.push("/start/who");
      return;
    }
    router.push({ pathname: "/auth", params: { next: "start" } });
  };

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
    // Keep stem tip and flower head on the same x — frame is centered on this point.
    const centerX = f.xRatio * heroWidth;
    const fullStemHeight =
      MIN_VISIBLE_STEM_HEIGHT +
      visualProgress * (MAX_VISIBLE_STEM_HEIGHT - MIN_VISIBLE_STEM_HEIGHT);
    const stemHeight = 6 + introProgress * (fullStemHeight - 6);
    const centerY = SOIL_TOP_Y - stemHeight;
    // Attach under the bloom core so the visible shaft stays on the flower's centerline.
    const stemTipY = centerY + 30;
    const bloomScale = 0.12 + introProgress * (0.88 + normalized * 0.22);
    const leafScale = 0.08 + introProgress * (0.7 + normalized * 0.4);
    return {
      x: centerX,
      left: centerX - FLOWER_FRAME_SIZE / 2,
      centerY,
      stemTipY,
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
    const sway = Math.sin(pulse.value * Math.PI * 2);
    return {
      // Pivot at the stem attachment (bottom center) so sway stays planted.
      transformOrigin: "50% 100%",
      transform: [
        { translateY: -sway * 1.8 },
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

  const logo = (
    <View style={[styles.logoWrap, isWide && styles.logoWrapWide]}>
      <Logo size={isWide ? 42 : 34} style={isWide ? styles.logoWide : undefined} />
    </View>
  );

  const headlineBlock = (
    <View>
      <Text
        style={[
          styles.headline,
          { fontSize: headlineSize, lineHeight: headlineSize + (isWide ? 4 : 2) },
        ]}
      >
        Share Just $1 and{"\n"}
        <Text style={styles.headlineItalic}>Spread Endless Good</Text>
      </Text>
      <Text style={[styles.lede, { fontSize: ledeSize, lineHeight: ledeSize + 8 }]}>
        Start a Polli for a friend, teacher, neighbor, or anyone who deserves a little extra
        kindness. Everyone chips in just $1 — small contributions pollinate into a meaningful gift
        and message of support.
      </Text>
    </View>
  );

  const ctaBlock = (
    <View style={[styles.ctaBlock, isWide && styles.ctaBlockWide]}>
      <Button
        label="Start a Polli"
        full={!isWide}
        iconRight={<IconArrow size={20} color={colors.green} />}
        onPress={() => startPolli()}
        style={isWide ? styles.ctaButtonWide : undefined}
      />
      <View style={[styles.signInWrap, isWide && styles.signInWrapWide]}>
        <Text style={styles.signInLine}>
          Want to browse first?{" "}
          <Pressable onPress={() => router.push({ pathname: "/auth", params: { next: "feed" } })}>
            <Text style={styles.signInLink}>Sign in to see the feed</Text>
          </Pressable>
        </Text>
      </View>
    </View>
  );

  const stepsBlock = (
    <View style={[styles.steps, isWide && styles.stepsWide]}>
      {[
        "Start a Polli for someone you appreciate",
        "Share with friends, family, and your community — ask everyone to send only $1",
        "Your recipient receives a meaningful gift and messages once all Pollis have been collected. He or she can deposit the money into their bank account or select a digital gift card of their choice.",
      ].map((txt, i) => (
        <View key={i} style={[styles.step, isWide && styles.stepWide]}>
          <View style={styles.stepNum}>
            <Text style={styles.stepNumText}>{i + 1}</Text>
          </View>
          <Text style={[styles.stepText, isWide && styles.stepTextWide]}>{txt}</Text>
        </View>
      ))}
    </View>
  );

  const useCasesBlock = (
    <View style={[styles.useCases, isWide && styles.useCasesWide]}>
      <Text style={styles.useCasesEyebrow}>Made for everyday kindness</Text>
      <Text style={[styles.useCasesTitle, isWide && styles.useCasesTitleWide]}>
        Start a Polli for
      </Text>
      <View style={styles.useCaseGrid}>
        {HOME_USE_CASES.map((item) => (
          <Pressable
            key={item.label}
            style={({ pressed }) => [styles.useCaseChip, pressed && styles.useCaseChipPressed]}
            onPress={() => startPolli(item.catId)}
            accessibilityRole="button"
            accessibilityLabel={`Start a Polli for ${item.label}`}
          >
            <Text style={styles.useCaseEmoji}>{item.emoji}</Text>
            <Text style={styles.useCaseLabel}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const flowerScene = (
    <View
      style={[
        styles.hero,
        isWide && styles.heroWide,
        isWide && { width: heroWidth },
      ]}
    >
      <Animated.View
        style={[
          styles.rippleRing,
          styles.rippleOuter,
          isWide && styles.rippleOuterWide,
          rippleOuterStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.rippleRing,
          styles.rippleInner,
          isWide && styles.rippleInnerWide,
          rippleInnerStyle,
        ]}
      />

      <Animated.View style={[styles.heroArt, { width: heroWidth }, isWide && styles.heroArtWide]}>
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
        </Svg>

        {HERO_FLOWERS.map((f, i) => {
          const m = flowerMetrics[i];
          const stemTop = m.stemTipY - m.top;
          const stemLength = Math.max(STEM_ROOT_Y - m.stemTipY, 0);
          return (
          <Animated.View
            key={f.id}
            style={[
              styles.personFlower,
              {
                left: m.left,
                top: m.top,
              },
              flowerStyles[i],
            ]}
            pointerEvents="none"
          >
            {/* Stem lives in the flower frame so sway/position can't drift apart */}
            <View
              style={[
                styles.stem,
                {
                  top: stemTop,
                  height: stemLength,
                },
              ]}
            />
            <View
              style={[
                styles.leaf,
                styles.leafLeft,
                {
                  transform: [
                    { scale: m.leafScale },
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
                    { scale: m.leafScale },
                    { rotate: "28deg" },
                  ],
                },
              ]}
            />

            <View style={[styles.bloomWrap, { transform: [{ scale: m.bloomScale }] }]}>
              {m.bloomScale < 0.45 ? (
                <View style={styles.seed} />
              ) : (
                <>
                  <View style={[styles.petal, styles.petalTop]} />
                  <View style={[styles.petal, styles.petalBottom]} />
                  <View style={[styles.petal, styles.petalLeft]} />
                  <View style={[styles.petal, styles.petalRight]} />

                  <View style={styles.flowerCore}>
                    <View style={styles.flowerCoreRing} />
                    <View style={styles.flowerCoreDot} />
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
          );
        })}

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
  );

  return (
    <View style={styles.screen}>
      <SiteHead path="/" />
      <ScrollView
        contentContainerStyle={[styles.scroll, isWide && styles.scrollWide]}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {isWide ? (
          <View
            style={[
              styles.desktopShell,
              { width: Math.min(width, SPLASH_MAX + 96) },
            ]}
          >
            <View style={styles.desktopHero}>
              <View style={styles.desktopCopy}>
                {logo}
                {headlineBlock}
                {ctaBlock}
              </View>
              {flowerScene}
            </View>
            <View style={styles.desktopSecondary}>
              {stepsBlock}
              {useCasesBlock}
            </View>
          </View>
        ) : (
          <>
            {logo}
            {flowerScene}
            <View style={[styles.content, compact && styles.contentCompact]}>
              {headlineBlock}
              {stepsBlock}
              {useCasesBlock}
              {ctaBlock}
            </View>
          </>
        )}
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
  scrollWide: {
    paddingBottom: 64,
  },
  desktopShell: {
    width: "100%",
    maxWidth: SPLASH_MAX,
    alignSelf: "center",
    paddingHorizontal: 48,
    paddingTop: 28,
  },
  desktopHero: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 40,
    minHeight: 480,
    paddingBottom: 24,
  },
  desktopCopy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 320,
    maxWidth: 480,
    gap: 28,
    paddingRight: 8,
  },
  desktopSecondary: {
    gap: 36,
    paddingTop: 12,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: "rgba(27,77,62,0.1)",
  },
  logoWrap: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  logoWrapWide: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    paddingBottom: 4,
  },
  logoWide: {
    alignSelf: "flex-start",
  },
  hero: {
    height: HERO_SCENE_HEIGHT,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  heroWide: {
    flexShrink: 0,
    overflow: "visible",
  },
  heroArt: {
    position: "relative",
    height: HERO_SCENE_HEIGHT,
    maxWidth: 560,
    // Avoid alignItems:"center" — on web it skews absolute flower left offsets.
    alignItems: "stretch",
    justifyContent: "flex-start",
    overflow: "visible",
  },
  heroArtWide: {
    maxWidth: 520,
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
  rippleOuterWide: {
    width: 260,
    height: 260,
  },
  rippleInner: {
    width: 168,
    height: 168,
  },
  rippleInnerWide: {
    width: 210,
    height: 210,
  },
  personFlower: {
    position: "absolute",
    width: FLOWER_FRAME_SIZE,
    height: FLOWER_FRAME_SIZE,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  stem: {
    position: "absolute",
    left: FLOWER_FRAME_SIZE / 2 - 1.4,
    width: 2.8,
    borderRadius: 2,
    backgroundColor: "rgba(27,77,62,0.36)",
    zIndex: 0,
  },
  bloomWrap: {
    width: FLOWER_FRAME_SIZE,
    height: FLOWER_FRAME_SIZE,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
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
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#8A5A2B",
    borderWidth: 1.5,
    borderColor: "rgba(90, 50, 18, 0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  flowerCoreRing: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(120, 72, 28, 0.55)",
  },
  flowerCoreDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#5C3818",
    borderWidth: 1,
    borderColor: "rgba(50, 28, 8, 0.4)",
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
  stepsWide: {
    flexDirection: "row",
    gap: 20,
    alignItems: "stretch",
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  stepWide: {
    flex: 1,
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 8,
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
    flexShrink: 1,
  },
  stepTextWide: {
    fontSize: 16,
    lineHeight: 24,
  },
  useCases: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(27,77,62,0.1)",
    padding: 18,
    gap: 12,
  },
  useCasesWide: {
    padding: 28,
    gap: 14,
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
  useCasesTitleWide: {
    fontSize: 28,
    lineHeight: 32,
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
  useCaseChipPressed: {
    backgroundColor: colors.sageSoft,
    borderColor: "rgba(27,77,62,0.18)",
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
  ctaBlockWide: {
    gap: 12,
    marginTop: 4,
  },
  ctaButtonWide: {
    alignSelf: "flex-start",
    minWidth: 220,
  },
  signInWrap: {
    alignItems: "center",
  },
  signInWrapWide: {
    alignItems: "flex-start",
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
