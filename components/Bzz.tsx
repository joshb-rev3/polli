import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";
import { colors } from "../theme";

type Pose = "idle" | "flying" | "wave" | "cheer";

interface BzzProps {
  size?: number;
  pose?: Pose;
  style?: any;
}

// Each Bzz instance gets a unique gradient-ID prefix to avoid SVG ID
// collisions when multiple instances are rendered simultaneously (e.g. on web).
function useUniqueId() {
  return useRef(`b${Math.random().toString(36).slice(2, 7)}`).current;
}

export function Bzz({ size = 60, pose = "idle", style }: BzzProps) {
  const p = useUniqueId(); // gradient ID prefix

  const wingAngle = useSharedValue(0);
  const hindAngle = useSharedValue(0);
  const bodyY = useSharedValue(0);
  const bodyTilt = useSharedValue(0);

  useEffect(() => {
    const active = pose === "flying" || pose === "cheer";
    const flapDur = active ? 78 : 195;
    const up = active ? -30 : -20;
    const down = active ? 10 : 7;

    // Forewings beat: fast upstroke, slightly slower downstroke
    wingAngle.value = withRepeat(
      withSequence(
        withTiming(up, { duration: flapDur * 0.55, easing: Easing.out(Easing.cubic) }),
        withTiming(down, { duration: flapDur * 1.45, easing: Easing.in(Easing.cubic) }),
      ),
      -1,
      false,
    );

    // Hindwings follow forewings with a small phase delay
    hindAngle.value = withDelay(
      Math.round(flapDur * 0.28),
      withRepeat(
        withSequence(
          withTiming(up * 0.6, { duration: flapDur * 0.55, easing: Easing.out(Easing.cubic) }),
          withTiming(down * 0.6, { duration: flapDur * 1.45, easing: Easing.in(Easing.cubic) }),
        ),
        -1,
        false,
      ),
    );

    const bobDur = active ? 680 : 1380;
    bodyY.value = withRepeat(
      withSequence(
        withTiming(1, { duration: bobDur, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: bobDur, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );

    bodyTilt.value = withRepeat(
      withSequence(
        withTiming(1, { duration: bobDur * 1.12, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: bobDur * 1.12, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [pose]);

  // Left wings rotate counter-clockwise on upstroke; right wings mirror.
  // transformOrigin aligns with the wing root in SVG viewBox (100×100 units).
  const lForeStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wingAngle.value}deg` }],
  }));
  const rForeStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-wingAngle.value}deg` }],
  }));
  const lHindStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${hindAngle.value}deg` }],
  }));
  const rHindStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-hindAngle.value}deg` }],
  }));
  const bodyAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: (bodyY.value - 0.5) * 3.5 },
      { rotate: `${(bodyTilt.value - 0.5) * (pose === "cheer" ? 12 : 5)}deg` },
    ],
  }));

  return (
    <View style={[{ width: size, height: size }, style]}>
      {/* Soft ground shadow */}
      <View style={styles.shadowWrap} pointerEvents="none">
        <Svg width={size * 0.62} height={size * 0.1} viewBox="0 0 62 10">
          <Ellipse cx={31} cy={5} rx={31} ry={5} fill="rgba(0,0,0,0.08)" />
        </Svg>
      </View>

      {/* ── Left hindwing ── root at SVG (43, 59) → 43% 59% */}
      <Animated.View
        style={[StyleSheet.absoluteFill, lHindStyle, { transformOrigin: "43% 59%" } as any]}
      >
        <Svg viewBox="0 0 100 100" width="100%" height="100%">
          <Defs>
            <LinearGradient id={`${p}lhw`} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="rgba(232,247,255,0.95)" />
              <Stop offset="55%" stopColor="rgba(198,232,255,0.68)" />
              <Stop offset="100%" stopColor="rgba(175,215,255,0.30)" />
            </LinearGradient>
          </Defs>
          <Path
            d="M 43,59 C 33,57 20,52 15,44 C 10,36 18,30 28,37 C 35,42 39,52 43,59 Z"
            fill={`url(#${p}lhw)`}
            stroke="rgba(85,138,210,0.22)"
            strokeWidth={0.7}
          />
          <Path
            d="M 43,59 C 33,51 21,42 17,35"
            stroke="rgba(85,138,210,0.2)"
            strokeWidth={0.55}
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>

      {/* ── Right hindwing ── root at SVG (57, 59) → 57% 59% */}
      <Animated.View
        style={[StyleSheet.absoluteFill, rHindStyle, { transformOrigin: "57% 59%" } as any]}
      >
        <Svg viewBox="0 0 100 100" width="100%" height="100%">
          <Defs>
            <LinearGradient id={`${p}rhw`} x1="100%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="rgba(232,247,255,0.95)" />
              <Stop offset="55%" stopColor="rgba(198,232,255,0.68)" />
              <Stop offset="100%" stopColor="rgba(175,215,255,0.30)" />
            </LinearGradient>
          </Defs>
          <Path
            d="M 57,59 C 67,57 80,52 85,44 C 90,36 82,30 72,37 C 65,42 61,52 57,59 Z"
            fill={`url(#${p}rhw)`}
            stroke="rgba(85,138,210,0.22)"
            strokeWidth={0.7}
          />
          <Path
            d="M 57,59 C 67,51 79,42 83,35"
            stroke="rgba(85,138,210,0.2)"
            strokeWidth={0.55}
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>

      {/* ── Left forewing ── root at SVG (41, 50) → 41% 50% */}
      <Animated.View
        style={[StyleSheet.absoluteFill, lForeStyle, { transformOrigin: "41% 50%" } as any]}
      >
        <Svg viewBox="0 0 100 100" width="100%" height="100%">
          <Defs>
            <LinearGradient id={`${p}lfw`} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="rgba(245,252,255,0.97)" />
              <Stop offset="45%" stopColor="rgba(212,238,255,0.74)" />
              <Stop offset="100%" stopColor="rgba(182,220,255,0.35)" />
            </LinearGradient>
          </Defs>
          <Path
            d="M 41,50 C 29,41 13,26 10,13 C 7,3 18,1 28,9 C 36,16 39,35 41,50 Z"
            fill={`url(#${p}lfw)`}
            stroke="rgba(85,148,220,0.28)"
            strokeWidth={0.8}
          />
          {/* Veins */}
          <Path d="M 41,50 C 27,36 15,19 12,9" stroke="rgba(85,148,220,0.28)" strokeWidth={0.6} fill="none" strokeLinecap="round" />
          <Path d="M 40,47 C 29,35 23,21 26,11" stroke="rgba(85,148,220,0.18)" strokeWidth={0.5} fill="none" strokeLinecap="round" />
          <Path d="M 40,47 C 33,37 30,25 34,15" stroke="rgba(85,148,220,0.16)" strokeWidth={0.45} fill="none" strokeLinecap="round" />
        </Svg>
      </Animated.View>

      {/* ── Right forewing ── root at SVG (59, 50) → 59% 50% */}
      <Animated.View
        style={[StyleSheet.absoluteFill, rForeStyle, { transformOrigin: "59% 50%" } as any]}
      >
        <Svg viewBox="0 0 100 100" width="100%" height="100%">
          <Defs>
            <LinearGradient id={`${p}rfw`} x1="100%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="rgba(245,252,255,0.97)" />
              <Stop offset="45%" stopColor="rgba(212,238,255,0.74)" />
              <Stop offset="100%" stopColor="rgba(182,220,255,0.35)" />
            </LinearGradient>
          </Defs>
          <Path
            d="M 59,50 C 71,41 87,26 90,13 C 93,3 82,1 72,9 C 64,16 61,35 59,50 Z"
            fill={`url(#${p}rfw)`}
            stroke="rgba(85,148,220,0.28)"
            strokeWidth={0.8}
          />
          <Path d="M 59,50 C 73,36 85,19 88,9" stroke="rgba(85,148,220,0.28)" strokeWidth={0.6} fill="none" strokeLinecap="round" />
          <Path d="M 60,47 C 71,35 77,21 74,11" stroke="rgba(85,148,220,0.18)" strokeWidth={0.5} fill="none" strokeLinecap="round" />
          <Path d="M 60,47 C 67,37 70,25 66,15" stroke="rgba(85,148,220,0.16)" strokeWidth={0.45} fill="none" strokeLinecap="round" />
        </Svg>
      </Animated.View>

      {/* ── Body (bobs + tilts) ── */}
      <Animated.View style={[StyleSheet.absoluteFill, bodyAnimStyle]}>
        <Svg viewBox="0 0 100 100" width="100%" height="100%">
          <Defs>
            {/* Abdomen — warm amber, lit from upper-left */}
            <RadialGradient id={`${p}ab`} cx="36%" cy="28%" r="65%">
              <Stop offset="0%" stopColor="#FFF09A" />
              <Stop offset="32%" stopColor="#FFB900" />
              <Stop offset="68%" stopColor="#DF8800" />
              <Stop offset="100%" stopColor="#B46400" />
            </RadialGradient>
            {/* Thorax — slightly lighter, suggests fuzz */}
            <RadialGradient id={`${p}th`} cx="34%" cy="26%" r="65%">
              <Stop offset="0%" stopColor="#FFE8A8" />
              <Stop offset="44%" stopColor="#FFC030" />
              <Stop offset="100%" stopColor="#C88000" />
            </RadialGradient>
            {/* Head */}
            <RadialGradient id={`${p}hd`} cx="36%" cy="26%" r="65%">
              <Stop offset="0%" stopColor="#FFEC96" />
              <Stop offset="38%" stopColor="#FFB200" />
              <Stop offset="100%" stopColor="#BE7800" />
            </RadialGradient>
            {/* Eye — deep dark iris */}
            <RadialGradient id={`${p}ey`} cx="28%" cy="26%" r="76%">
              <Stop offset="0%" stopColor="#3A3A50" />
              <Stop offset="100%" stopColor="#0C0C1A" />
            </RadialGradient>
            {/* Specular gloss on body */}
            <RadialGradient id={`${p}gl`} cx="34%" cy="20%" r="40%">
              <Stop offset="0%" stopColor="rgba(255,255,255,0.52)" />
              <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </RadialGradient>
          </Defs>

          {/* ── Stinger ── */}
          <Path d="M 47,96 C 46,100 50,105 53,100 L 50,95 Z" fill="#7A4E00" />

          {/* ── Abdomen ── */}
          <Ellipse cx={50} cy={72} rx={22} ry={26} fill={`url(#${p}ab)`} />
          {/* Stripe 1 */}
          <Path
            d="M 31,64 Q 50,57 69,64 L 68,73 Q 50,79 32,73 Z"
            fill="#0E1808"
            opacity={0.9}
          />
          {/* Stripe 2 */}
          <Path
            d="M 29,79 Q 50,72 71,79 L 70,88 Q 50,94 30,88 Z"
            fill="#0E1808"
            opacity={0.9}
          />
          {/* Abdomen gloss */}
          <Ellipse cx={43} cy={62} rx={9} ry={6} fill={`url(#${p}gl)`} opacity={0.55} />

          {/* ── Thorax ── */}
          <Ellipse cx={50} cy={53} rx={15} ry={13} fill={`url(#${p}th)`} />
          {/* Fuzz highlight on thorax */}
          <Ellipse cx={45} cy={48} rx={7.5} ry={4.5} fill="rgba(255,238,170,0.30)" />

          {/* ── Head ── */}
          <Circle cx={50} cy={37} r={14} fill={`url(#${p}hd)`} />
          {/* Head gloss */}
          <Ellipse cx={44.5} cy={31} rx={5} ry={3.5} fill="rgba(255,255,255,0.26)" />

          {/* ── Antennae ── */}
          <Path
            d="M 44,24 C 40,15 36,9 39,5"
            stroke="#1A1A06"
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
          />
          <Circle cx={38.5} cy={4.5} r={3} fill={colors.coral} />
          <Circle cx={37.4} cy={3.4} r={1} fill="rgba(255,255,255,0.65)" />

          <Path
            d="M 56,24 C 60,15 64,9 61,5"
            stroke="#1A1A06"
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
          />
          <Circle cx={61.5} cy={4.5} r={3} fill={colors.coral} />
          <Circle cx={62.6} cy={3.4} r={1} fill="rgba(255,255,255,0.65)" />

          {/* ── Eyes ── */}
          <Circle cx={43.5} cy={35} r={4.8} fill={`url(#${p}ey)`} />
          {/* Primary specular */}
          <Circle cx={41.8} cy={33.2} r={1.7} fill="rgba(255,255,255,0.92)" />
          {/* Secondary micro-specular */}
          <Circle cx={45} cy={37} r={0.85} fill="rgba(255,255,255,0.50)" />

          <Circle cx={56.5} cy={35} r={4.8} fill={`url(#${p}ey)`} />
          <Circle cx={54.8} cy={33.2} r={1.7} fill="rgba(255,255,255,0.92)" />
          <Circle cx={58} cy={37} r={0.85} fill="rgba(255,255,255,0.50)" />

          {/* ── Cheeks ── */}
          <Ellipse cx={38.5} cy={40} rx={4} ry={2.4} fill={colors.coral} opacity={0.34} />
          <Ellipse cx={61.5} cy={40} rx={4} ry={2.4} fill={colors.coral} opacity={0.34} />

          {/* ── Smile ── */}
          <Path
            d="M 44,43.5 Q 50,49 56,43.5"
            stroke="#1A1A06"
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
          />

          {/* ── Legs (two pairs, add character) ── */}
          <Path d="M 34,64 Q 25,69 21,76" stroke="#1A1A06" strokeWidth={1.1} fill="none" strokeLinecap="round" />
          <Path d="M 31,74 Q 21,77 17,84" stroke="#1A1A06" strokeWidth={1.1} fill="none" strokeLinecap="round" />
          <Path d="M 66,64 Q 75,69 79,76" stroke="#1A1A06" strokeWidth={1.1} fill="none" strokeLinecap="round" />
          <Path d="M 69,74 Q 79,77 83,84" stroke="#1A1A06" strokeWidth={1.1} fill="none" strokeLinecap="round" />
        </Svg>
      </Animated.View>

      {/* ── Wave arm ── only rendered for wave pose */}
      {pose === "wave" && <WaveArm />}
    </View>
  );
}

function WaveArm() {
  const angle = useSharedValue(0);

  useEffect(() => {
    angle.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 370, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 370, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, []);

  const armStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${angle.value * 42 - 14}deg` }],
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, armStyle, { transformOrigin: "32% 56%" } as any]}
    >
      <Svg viewBox="0 0 100 100" width="100%" height="100%">
        <Path
          d="M 32,56 Q 22,47 22,39 Q 24,33 28,35"
          stroke="#1A1A06"
          strokeWidth={2.2}
          fill="none"
          strokeLinecap="round"
        />
        <Circle cx={28} cy={35} r={3} fill="#1A1A06" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
});

interface BzzPathProps {
  variant: "splash" | "feed" | "pay" | "launch";
  size?: number;
  delay?: number;
  style?: any;
}

export function BzzPath({ variant, size = 46, delay = 0, style }: BzzPathProps) {
  const t = useSharedValue(0);

  useEffect(() => {
    const durations = {
      splash: 7000,
      feed: 14000,
      pay: 4500,
      launch: 5500,
    };
    t.value = withDelay(
      delay * 1000,
      withRepeat(withTiming(1, { duration: durations[variant], easing: Easing.inOut(Easing.quad) }), -1, false)
    );
  }, [variant, delay]);

  const animStyle = useAnimatedStyle(() => {
    const p = t.value;
    // Simple sinusoidal motion paths per variant
    if (variant === "splash") {
      // Spiral up around dollar
      const angle = p * Math.PI * 4;
      return {
        transform: [
          { translateX: Math.cos(angle) * 90 + 40 },
          { translateY: -p * 180 + 40 },
          { rotate: `${Math.sin(angle) * 15}deg` },
        ],
        opacity: p < 0.9 ? 1 : (1 - p) * 10,
      };
    }
    if (variant === "feed") {
      // Drift left-to-right within the feed flight lane
      return {
        transform: [
          { translateX: -40 + p * 360 },
          { translateY: 2 + Math.sin(p * Math.PI * 3) * 8 },
        ],
        opacity: p < 0.08 ? p * 12 : p > 0.92 ? (1 - p) * 12 : 1,
      };
    }
    if (variant === "pay") {
      // Zigzag up
      return {
        transform: [
          { translateX: Math.sin(p * Math.PI * 5) * 80 },
          { translateY: 400 - p * 500 },
        ],
        opacity: p < 0.1 ? p * 10 : p > 0.9 ? (1 - p) * 10 : 1,
      };
    }
    // launch: diagonal ascend
    return {
      transform: [
        { translateX: p * 320 - 40 },
        { translateY: 300 - p * 380 },
        { rotate: `${Math.sin(p * Math.PI * 4) * 18}deg` },
      ],
      opacity: p < 0.1 ? p * 10 : p > 0.9 ? (1 - p) * 10 : 1,
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: "absolute", top: 0, left: 0, zIndex: 20, elevation: 20 },
        animStyle,
        style,
      ]}
    >
      <Bzz pose="flying" size={size} />
    </Animated.View>
  );
}
