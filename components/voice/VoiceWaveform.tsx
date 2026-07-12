import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Line, Rect } from "react-native-svg";
import { colors } from "../../theme";

const BAR_COUNT = 48;

function seededHeight(i: number, seed: number): number {
  const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return 0.25 + (x - Math.floor(x)) * 0.75;
}

interface Props {
  progress: number;
  isPlaying: boolean;
  seed?: number;
  height?: number;
}

export function VoiceWaveform({ progress, isPlaying, seed = 1, height = 120 }: Props) {
  const [tick, setTick] = useState(0);
  const barWidth = 3;
  const gap = 2;
  const totalWidth = BAR_COUNT * (barWidth + gap);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => setTick((t) => t + 1), 80);
    return () => clearInterval(id);
  }, [isPlaying]);

  const bars = useMemo(() => {
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      const h = seededHeight(i, seed) * (height - 24);
      const played = i / BAR_COUNT <= progress;
      const pulse = isPlaying && played ? 1 + Math.sin(tick / 2 + i) * 0.08 : 1;
      return { h: h * pulse, played };
    });
  }, [progress, isPlaying, seed, height, tick]);

  return (
    <View style={[styles.stage, { height }]}>
      <Svg width="100%" height={height} viewBox={`0 0 ${totalWidth} ${height}`} preserveAspectRatio="none">
        {bars.map((bar, i) => {
          const x = i * (barWidth + gap);
          const barH = Math.max(6, bar.h);
          const y = (height - barH) / 2;
          return (
            <Rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx={1.5}
              fill={bar.played ? colors.marigold2 : colors.sage}
              opacity={bar.played ? 0.95 : 0.45}
            />
          );
        })}
        <Line
          x1={progress * totalWidth}
          y1={8}
          x2={progress * totalWidth}
          y2={height - 8}
          stroke={colors.green}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: "100%",
    borderRadius: 12,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line2,
    overflow: "hidden",
  },
});
