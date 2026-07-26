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
  /** Live mic visualization — animates all bars, no playhead. */
  isRecording?: boolean;
  seed?: number;
  height?: number;
}

export function VoiceWaveform({
  progress,
  isPlaying,
  isRecording = false,
  seed = 1,
  height = 120,
}: Props) {
  const [tick, setTick] = useState(0);
  const barWidth = 3;
  const gap = 2;
  const totalWidth = BAR_COUNT * (barWidth + gap);
  const live = isPlaying || isRecording;

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setTick((t) => t + 1), 80);
    return () => clearInterval(id);
  }, [live]);

  const bars = useMemo(() => {
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      const base = seededHeight(i, seed) * (height - 24);
      if (isRecording) {
        const wave = 0.45 + 0.55 * Math.abs(Math.sin(tick / 3 + i * 0.45));
        const travel = 0.7 + 0.3 * Math.sin(tick / 5 - i * 0.2);
        return {
          h: Math.max(8, base * wave * travel),
          played: true,
          recording: true,
        };
      }
      const played = i / BAR_COUNT <= progress;
      const pulse = isPlaying && played ? 1 + Math.sin(tick / 2 + i) * 0.08 : 1;
      return { h: base * pulse, played, recording: false };
    });
  }, [progress, isPlaying, isRecording, seed, height, tick]);

  return (
    <View style={[styles.stage, { height }, isRecording && styles.stageRecording]}>
      <Svg width="100%" height={height} viewBox={`0 0 ${totalWidth} ${height}`} preserveAspectRatio="none">
        {bars.map((bar, i) => {
          const x = i * (barWidth + gap);
          const barH = Math.max(6, bar.h);
          const y = (height - barH) / 2;
          const fill = bar.recording
            ? colors.coral
            : bar.played
              ? colors.marigold2
              : colors.sage;
          const opacity = bar.recording ? 0.55 + (i % 3) * 0.12 : bar.played ? 0.95 : 0.45;
          return (
            <Rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx={1.5}
              fill={fill}
              opacity={opacity}
            />
          );
        })}
        {!isRecording && (
          <Line
            x1={progress * totalWidth}
            y1={8}
            x2={progress * totalWidth}
            y2={height - 8}
            stroke={colors.green}
            strokeWidth={2}
            strokeLinecap="round"
          />
        )}
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
  stageRecording: {
    backgroundColor: colors.coralSoft,
    borderColor: "rgba(242,85,61,0.45)",
  },
});
