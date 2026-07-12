import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatAudioTime } from "../../lib/voice";
import { colors, fonts } from "../../theme";

interface Props {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  compact?: boolean;
}

export function PlaybackControls({
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onSeek,
  compact,
}: Props) {
  const safeDuration = duration > 0 ? duration : 0;
  const progress = safeDuration > 0 ? currentTime / safeDuration : 0;

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <Pressable
        style={[styles.playBtn, isPlaying && styles.playBtnActive]}
        onPress={onPlayPause}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? "Pause" : "Play"}
      >
        <Text style={styles.playIcon}>{isPlaying ? "❚❚" : "▶"}</Text>
      </Pressable>

      <Pressable
        style={styles.seekTrack}
        onPress={(e) => {
          const { locationX } = e.nativeEvent;
          const width = compact ? 140 : 180;
          const ratio = Math.min(1, Math.max(0, locationX / width));
          onSeek(ratio * safeDuration);
        }}
      >
        <View style={styles.seekBg}>
          <View style={[styles.seekFill, { width: `${progress * 100}%` }]} />
        </View>
      </Pressable>

      <Text style={styles.time}>
        {formatAudioTime(currentTime)} / {formatAudioTime(safeDuration)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
  },
  rowCompact: {
    marginTop: 6,
    gap: 8,
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  playBtnActive: {
    backgroundColor: colors.green3,
  },
  playIcon: {
    color: colors.white,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    marginLeft: 2,
  },
  seekTrack: {
    flex: 1,
    height: 28,
    justifyContent: "center",
  },
  seekBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line2,
    overflow: "hidden",
  },
  seekFill: {
    height: "100%",
    backgroundColor: colors.marigold2,
    borderRadius: 2,
  },
  time: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink2,
    minWidth: 72,
    textAlign: "right",
  },
});
