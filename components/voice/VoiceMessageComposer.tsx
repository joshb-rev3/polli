import { Audio, AVPlaybackStatus } from "expo-av";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { analyzeWords } from "../../lib/audioAnalysis";
import { tap } from "../../lib/haptics";
import { transcribeAudio } from "../../lib/transcribe";
import { useVoiceRecorder } from "../../lib/useVoiceRecorder";
import {
  fallbackSignatures,
  findActiveWordIndex,
  formatAudioTime,
  TranscriptWord,
  VoiceClip,
  WordSignature,
  wordsToStory,
} from "../../lib/voice";
import { colors, fonts } from "../../theme";
import { KaraokeTranscript } from "./KaraokeTranscript";
import { PlaybackControls } from "./PlaybackControls";
import { VoiceWaveform } from "./VoiceWaveform";

interface Props {
  clip: VoiceClip | null;
  onClipChange: (clip: VoiceClip | null, storyText: string) => void;
}

function RecordingPulse() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.55, { duration: 700, easing: Easing.out(Easing.ease) }),
      -1,
      true
    );
    opacity.value = withRepeat(
      withTiming(0.15, { duration: 700, easing: Easing.out(Easing.ease) }),
      -1,
      true
    );
  }, [opacity, scale]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.pulseWrap} accessibilityElementsHidden>
      <Animated.View style={[styles.pulseRing, ringStyle]} />
      <View style={styles.pulseDot} />
    </View>
  );
}

export function VoiceMessageComposer({ clip, onClipChange }: Props) {
  const { isRecording, error: recordError, startRecording, stopRecording, clearError } =
    useVoiceRecorder();
  const [starting, setStarting] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const [transcribeSource, setTranscribeSource] = useState<"live" | "mock" | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);

  const soundRef = useRef<Audio.Sound | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestTokenRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const unloadSound = useCallback(async () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setActiveIndex(-1);
  }, []);

  useEffect(() => {
    if (!isRecording) {
      setElapsedSec(0);
      return;
    }
    setElapsedSec(0);
    const startedAt = Date.now();
    const id = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [isRecording]);

  useEffect(() => {
    if (isRecording) setStarting(false);
  }, [isRecording]);

  const processRecording = useCallback(
    async (uri: string, mimeType: string, fileName: string, durationMs: number) => {
      const token = ++requestTokenRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setTranscribing(true);
      setTranscribeError(null);
      setTranscribeSource(null);

      try {
        const { words, audioDurationMs, source } = await transcribeAudio(uri, mimeType, fileName, {
          signal: controller.signal,
        });
        if (token !== requestTokenRef.current) return;
        setTranscribeSource(source);

        const resolvedDuration = audioDurationMs ?? durationMs;
        let signatures: WordSignature[] = [];

        if (words.length > 0) {
          setAnalyzing(true);
          try {
            if (Platform.OS === "web") {
              const res = await fetch(uri);
              const buf = await res.arrayBuffer();
              if (token === requestTokenRef.current) {
                signatures = await analyzeWords(buf, words);
              }
            } else {
              signatures = fallbackSignatures(words);
            }
          } catch {
            signatures = fallbackSignatures(words);
          } finally {
            if (token === requestTokenRef.current) setAnalyzing(false);
          }
        }

        if (token !== requestTokenRef.current) return;

        const nextClip: VoiceClip = {
          uri,
          mimeType,
          durationMs: resolvedDuration,
          words,
          signatures,
        };
        onClipChange(nextClip, wordsToStory(words));
        setDuration(resolvedDuration / 1000);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        if (token === requestTokenRef.current) {
          setTranscribeError((err as Error).message || "Transcription failed.");
        }
      } finally {
        if (token === requestTokenRef.current) setTranscribing(false);
      }
    },
    [onClipChange]
  );

  const handleRecordToggle = async () => {
    tap();
    clearError();
    if (isRecording) {
      const result = await stopRecording();
      if (result) await processRecording(result.uri, result.mimeType, result.fileName, result.durationMs);
    } else {
      setStarting(true);
      await unloadSound();
      abortRef.current?.abort();
      onClipChange(null, "");
      try {
        await startRecording();
      } finally {
        setStarting(false);
      }
    }
  };

  const beginRecording = async () => {
    tap();
    clearError();
    setStarting(true);
    await unloadSound();
    abortRef.current?.abort();
    onClipChange(null, "");
    try {
      await startRecording();
    } finally {
      setStarting(false);
    }
  };

  const onPlaybackStatus = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) return;
      setIsPlaying(status.isPlaying);
      setCurrentTime(status.positionMillis / 1000);
      if (status.durationMillis) setDuration(status.durationMillis / 1000);
      if (clip?.words.length) {
        const idx = findActiveWordIndex(clip.words, status.positionMillis);
        setActiveIndex((prev) => (prev === idx ? prev : idx));
      }
      if (status.didJustFinish) setActiveIndex(-1);
    },
    [clip?.words]
  );

  const loadAndPlay = useCallback(async () => {
    if (!clip) return;
    if (!soundRef.current) {
      const { sound } = await Audio.Sound.createAsync(
        { uri: clip.uri },
        { shouldPlay: true },
        onPlaybackStatus
      );
      soundRef.current = sound;
    } else {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) await soundRef.current.pauseAsync();
        else await soundRef.current.playAsync();
      }
    }
  }, [clip, onPlaybackStatus]);

  useEffect(() => {
    if (!clip) {
      unloadSound();
      return;
    }
    setDuration(clip.durationMs / 1000);
    unloadSound().then(async () => {
      const { sound } = await Audio.Sound.createAsync(
        { uri: clip.uri },
        { shouldPlay: false },
        onPlaybackStatus
      );
      soundRef.current = sound;
    });
    return () => {
      unloadSound();
    };
  }, [clip?.uri, clip?.durationMs, onPlaybackStatus, unloadSound]);

  const discard = async () => {
    tap();
    abortRef.current?.abort();
    await unloadSound();
    onClipChange(null, "");
    setTranscribeError(null);
    setTranscribeSource(null);
  };

  const activeWord = activeIndex >= 0 && clip ? clip.words[activeIndex]?.text : null;
  const activeSig = activeIndex >= 0 && clip ? clip.signatures[activeIndex] : undefined;
  const progress = duration > 0 ? currentTime / duration : 0;
  const busy = transcribing || analyzing;
  const showRecorder = (!clip && !busy) || isRecording || starting;

  return (
    <View style={styles.wrap}>
      {showRecorder && (
        <View style={[styles.recorderPanel, (isRecording || starting) && styles.recorderPanelLive]}>
          {isRecording ? (
            <>
              <View style={styles.recordingHeader}>
                <View style={styles.recordingStatus}>
                  <RecordingPulse />
                  <Text style={styles.recordingStatusText}>Recording</Text>
                </View>
                <Text style={styles.recordingTimer} accessibilityLiveRegion="polite">
                  {formatAudioTime(elapsedSec)}
                </Text>
              </View>

              <VoiceWaveform
                progress={0}
                isPlaying={false}
                isRecording
                seed={7}
                height={88}
              />

              <Text style={styles.recordingHint}>Speak clearly — tap stop when you're done.</Text>

              <Pressable
                style={styles.stopBtn}
                onPress={handleRecordToggle}
                accessibilityRole="button"
                accessibilityLabel="Stop recording"
              >
                <View style={styles.stopIcon} />
                <Text style={styles.stopLabel}>Stop recording</Text>
              </Pressable>
            </>
          ) : starting ? (
            <View style={styles.startingRow}>
              <ActivityIndicator size="small" color={colors.coral} />
              <Text style={styles.startingText}>Starting microphone…</Text>
            </View>
          ) : (
            <Pressable
              style={styles.recordBtn}
              onPress={handleRecordToggle}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Record your message"
            >
              <View style={styles.recordIdleDot} />
              <Text style={styles.recordLabel}>Record your message</Text>
            </Pressable>
          )}
        </View>
      )}

      {(recordError || transcribeError) && (
        <Text style={styles.error}>{recordError || transcribeError}</Text>
      )}

      {busy && (
        <View style={styles.statusRow}>
          <ActivityIndicator size="small" color={colors.green} />
          <Text style={styles.statusText}>
            {transcribing ? "Transcribing your words…" : "Analyzing your voice…"}
          </Text>
        </View>
      )}

      {clip && !busy && !isRecording && !starting && (
        <View style={styles.preview}>
          <View style={styles.stage}>
            <VoiceWaveform progress={progress} isPlaying={isPlaying} seed={clip.uri.length} />
            <KaraokeTranscript
              word={activeWord}
              signature={activeSig}
              visible={isPlaying && activeIndex >= 0}
            />
          </View>

          <PlaybackControls
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onPlayPause={loadAndPlay}
            onSeek={async (t) => {
              if (soundRef.current) {
                await soundRef.current.setPositionAsync(t * 1000);
                setCurrentTime(t);
              }
            }}
          />

          {clip.words.length > 0 && (
            <Text style={styles.transcriptPreview}>{wordsToStory(clip.words)}</Text>
          )}

          {transcribeSource === "mock" && (
            <Text style={styles.demoNote}>
              Demo transcript — set EXPO_PUBLIC_MOCK_TRANSCRIBE=1 only for UI testing without Supabase.
            </Text>
          )}

          <View style={styles.actions}>
            <Pressable style={styles.secondaryBtn} onPress={discard}>
              <Text style={styles.secondaryText}>Discard</Text>
            </Pressable>
            <Pressable
              style={[styles.recordBtn, styles.rerecordBtn]}
              onPress={beginRecording}
              accessibilityRole="button"
              accessibilityLabel="Re-record your message"
            >
              <View style={styles.recordIdleDot} />
              <Text style={styles.recordLabel}>Re-record</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

interface PlayerProps {
  uri: string;
  words: TranscriptWord[];
  signatures: WordSignature[];
  durationMs: number;
  compact?: boolean;
}

export function VoiceMessagePlayer({ uri, words, signatures, durationMs, compact }: PlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationMs / 1000);
  const [activeIndex, setActiveIndex] = useState(-1);
  const soundRef = useRef<Audio.Sound | null>(null);

  const onStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setIsPlaying(status.isPlaying);
    setCurrentTime(status.positionMillis / 1000);
    if (status.durationMillis) setDuration(status.durationMillis / 1000);
    const idx = findActiveWordIndex(words, status.positionMillis);
    setActiveIndex((prev) => (prev === idx ? prev : idx));
    if (status.didJustFinish) setActiveIndex(-1);
  };

  useEffect(() => {
    Audio.Sound.createAsync({ uri }, { shouldPlay: false }, onStatus).then(({ sound }) => {
      soundRef.current = sound;
    });
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri]);

  const toggle = async () => {
    tap();
    if (!soundRef.current) return;
    const status = await soundRef.current.getStatusAsync();
    if (status.isLoaded) {
      if (status.isPlaying) await soundRef.current.pauseAsync();
      else await soundRef.current.playAsync();
    }
  };

  const activeWord = activeIndex >= 0 ? words[activeIndex]?.text : null;
  const activeSig = activeIndex >= 0 ? signatures[activeIndex] : undefined;
  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <View style={compact ? styles.playerCompact : undefined}>
      <View style={[styles.stage, compact && { height: 96 }]}>
        <VoiceWaveform
          progress={progress}
          isPlaying={isPlaying}
          seed={uri.length}
          height={compact ? 96 : 120}
        />
        <KaraokeTranscript
          word={activeWord}
          signature={activeSig}
          visible={isPlaying && activeIndex >= 0}
        />
      </View>
      <PlaybackControls
        compact={compact}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        onPlayPause={toggle}
        onSeek={async (t) => {
          if (soundRef.current) {
            await soundRef.current.setPositionAsync(t * 1000);
            setCurrentTime(t);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  recorderPanel: {
    gap: 12,
  },
  recorderPanelLive: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(242,85,61,0.5)",
    backgroundColor: colors.coralSoft,
  },
  recordingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recordingStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  recordingStatusText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.coral,
    letterSpacing: 0.2,
  },
  recordingTimer: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  recordingHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink2,
    lineHeight: 18,
  },
  pulseWrap: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.coral,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.coral,
  },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: colors.coral,
  },
  stopIcon: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: colors.white,
  },
  stopLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.white,
  },
  startingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  startingText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink2,
  },
  recordBtn: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.green3,
    backgroundColor: colors.sageSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  recordIdleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.coral,
  },
  recordLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.green,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.coral,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink2,
  },
  preview: { gap: 8 },
  stage: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
  },
  transcriptPreview: {
    fontFamily: fonts.serifItalic,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
    marginTop: 4,
  },
  demoNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.marigold,
    marginTop: 4,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line2,
    alignItems: "center",
    backgroundColor: colors.paper,
  },
  secondaryText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink2,
  },
  rerecordBtn: {
    flex: 1.4,
  },
  playerCompact: {
    marginTop: 4,
  },
});
