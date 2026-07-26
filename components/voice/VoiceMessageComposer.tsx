import { Audio, AVPlaybackStatus } from "expo-av";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { analyzeWords } from "../../lib/audioAnalysis";
import { selection, tap } from "../../lib/haptics";
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
import { IconClose } from "../Icon";
import { KaraokeTranscript } from "./KaraokeTranscript";
import { PlaybackControls } from "./PlaybackControls";
import { VoiceWaveform } from "./VoiceWaveform";

interface Props {
  clip: VoiceClip | null;
  onClipChange: (clip: VoiceClip | null, storyText: string) => void;
}

const COUNTDOWN_FROM = 3;

function RecordingPulse({ size = 18 }: { size?: number }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const ring = size;
  const dot = Math.round(size * 0.55);

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
    <View style={[styles.pulseWrap, { width: ring, height: ring }]} accessibilityElementsHidden>
      <Animated.View
        style={[
          styles.pulseRing,
          { width: ring, height: ring, borderRadius: ring / 2 },
          ringStyle,
        ]}
      />
      <View
        style={[styles.pulseDot, { width: dot, height: dot, borderRadius: dot / 2 }]}
      />
    </View>
  );
}

function CountdownDigit({ value }: { value: number }) {
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = 0.6;
    opacity.value = 0;
    scale.value = withSequence(
      withTiming(1.08, { duration: 180, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 220, easing: Easing.inOut(Easing.ease) })
    );
    opacity.value = withTiming(1, { duration: 160 });
  }, [value, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text style={[styles.countdownDigit, style]} accessibilityLiveRegion="assertive">
      {value}
    </Animated.Text>
  );
}

export function VoiceMessageComposer({ clip, onClipChange }: Props) {
  const { isRecording, error: recordError, startRecording, stopRecording, clearError } =
    useVoiceRecorder();
  const [studioOpen, setStudioOpen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
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
  const studioGenRef = useRef(0);
  const armingRef = useRef(false);

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

  const closeStudio = useCallback(async (opts?: { discardRecording?: boolean }) => {
    studioGenRef.current += 1;
    armingRef.current = false;
    setCountdown(null);
    setStarting(false);
    if (isRecording || opts?.discardRecording) {
      await stopRecording().catch(() => null);
    }
    setStudioOpen(false);
  }, [isRecording, stopRecording]);

  const openStudio = async () => {
    tap();
    clearError();
    setTranscribeError(null);
    await unloadSound();
    abortRef.current?.abort();
    onClipChange(null, "");
    studioGenRef.current += 1;
    armingRef.current = false;
    setStudioOpen(true);
    setCountdown(COUNTDOWN_FROM);
    setStarting(false);
  };

  // 3–2–1 countdown ticks
  useEffect(() => {
    if (!studioOpen || countdown === null || countdown <= 0) return;
    selection();
    const gen = studioGenRef.current;
    const id = setTimeout(() => {
      if (studioGenRef.current !== gen) return;
      setCountdown((c) => (c === null || c <= 0 ? c : c - 1));
    }, 1000);
    return () => clearTimeout(id);
  }, [studioOpen, countdown]);

  // After countdown hits 0, arm the microphone once
  useEffect(() => {
    if (!studioOpen || countdown !== 0) return;
    if (armingRef.current) return;
    armingRef.current = true;
    const gen = studioGenRef.current;
    (async () => {
      setStarting(true);
      try {
        await startRecording();
        if (studioGenRef.current !== gen) {
          await stopRecording().catch(() => null);
        }
      } catch {
        if (studioGenRef.current === gen) setStudioOpen(false);
      } finally {
        armingRef.current = false;
        if (studioGenRef.current === gen) {
          setStarting(false);
          setCountdown(null);
        }
      }
    })();
  }, [studioOpen, countdown, startRecording, stopRecording]);

  const stopAndSave = async () => {
    tap();
    const gen = studioGenRef.current;
    const result = await stopRecording();
    setStudioOpen(false);
    setCountdown(null);
    setStarting(false);
    if (studioGenRef.current !== gen) return;
    if (result) {
      await processRecording(result.uri, result.mimeType, result.fileName, result.durationMs);
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
  const inCountdown = studioOpen && countdown !== null && countdown > 0;
  const studioLive = studioOpen && (isRecording || starting || countdown === 0);

  return (
    <View style={styles.wrap}>
      {!clip && !busy && (
        <Pressable
          style={styles.recordBtn}
          onPress={openStudio}
          accessibilityRole="button"
          accessibilityLabel="Record your message"
        >
          <View style={styles.recordIdleDot} />
          <Text style={styles.recordLabel}>Record your message</Text>
        </Pressable>
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

      {clip && !busy && (
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
              onPress={openStudio}
              accessibilityRole="button"
              accessibilityLabel="Re-record your message"
            >
              <View style={styles.recordIdleDot} />
              <Text style={styles.recordLabel}>Re-record</Text>
            </Pressable>
          </View>
        </View>
      )}

      <Modal
        visible={studioOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => closeStudio({ discardRecording: true })}
      >
        <View style={styles.studioRoot}>
          <SafeAreaView style={styles.studioSafe} edges={["top", "bottom"]}>
            <View style={styles.studioTop}>
              <Pressable
                style={styles.studioClose}
                onPress={() => closeStudio({ discardRecording: true })}
                accessibilityRole="button"
                accessibilityLabel="Cancel recording"
              >
                <IconClose size={22} color={colors.ink} />
              </Pressable>
              <Text style={styles.studioTitle}>
                {inCountdown ? "Get ready" : isRecording ? "Recording" : "Voice note"}
              </Text>
              <View style={styles.studioCloseSpacer} />
            </View>

            <View style={styles.studioBody}>
              {inCountdown ? (
                <View style={styles.countdownWrap}>
                  <Text style={styles.countdownHint}>Recording starts in</Text>
                  <CountdownDigit value={countdown!} />
                  <Text style={styles.countdownSub}>Take a breath — then speak from the heart.</Text>
                </View>
              ) : starting ? (
                <View style={styles.countdownWrap}>
                  <ActivityIndicator size="large" color={colors.coral} />
                  <Text style={styles.startingText}>Starting microphone…</Text>
                </View>
              ) : (
                <View style={styles.liveWrap}>
                  <View style={styles.liveHeader}>
                    <View style={styles.recordingStatus}>
                      <RecordingPulse size={22} />
                      <Text style={styles.recordingStatusText}>Recording</Text>
                    </View>
                    <Text style={styles.recordingTimer} accessibilityLiveRegion="polite">
                      {formatAudioTime(elapsedSec)}
                    </Text>
                  </View>

                  <VoiceWaveform
                    progress={0}
                    isPlaying={false}
                    isRecording={studioLive && isRecording}
                    seed={7}
                    height={140}
                  />

                  <Text style={styles.recordingHint}>
                    Speak clearly — tap stop when you're done.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.studioFooter}>
              {isRecording ? (
                <Pressable
                  style={styles.stopBtn}
                  onPress={stopAndSave}
                  accessibilityRole="button"
                  accessibilityLabel="Stop recording"
                >
                  <View style={styles.stopIcon} />
                  <Text style={styles.stopLabel}>Stop recording</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => closeStudio({ discardRecording: true })}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                >
                  <Text style={styles.cancelLabel}>Cancel</Text>
                </Pressable>
              )}
            </View>
          </SafeAreaView>
        </View>
      </Modal>
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
  studioRoot: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  studioSafe: {
    flex: 1,
  },
  studioTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  studioClose: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line2,
  },
  studioCloseSpacer: {
    width: 44,
  },
  studioTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.ink,
  },
  studioBody: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  studioFooter: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 8,
  },
  countdownWrap: {
    alignItems: "center",
    gap: 16,
  },
  countdownHint: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.ink2,
  },
  countdownDigit: {
    fontFamily: fonts.serifBold,
    fontSize: 120,
    lineHeight: 128,
    color: colors.coral,
    letterSpacing: -4,
  },
  countdownSub: {
    fontFamily: fonts.serifItalic,
    fontSize: 17,
    lineHeight: 24,
    color: colors.ink2,
    textAlign: "center",
    maxWidth: 280,
  },
  liveWrap: {
    gap: 20,
  },
  liveHeader: {
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
    fontSize: 18,
    color: colors.coral,
    letterSpacing: 0.2,
  },
  recordingTimer: {
    fontFamily: fonts.bodyBold,
    fontSize: 28,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  recordingHint: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink2,
    lineHeight: 22,
    textAlign: "center",
  },
  pulseWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    backgroundColor: colors.coral,
  },
  pulseDot: {
    backgroundColor: colors.coral,
  },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: colors.coral,
  },
  stopIcon: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  stopLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.white,
  },
  cancelBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line2,
    backgroundColor: colors.paper,
    alignItems: "center",
  },
  cancelLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.ink2,
  },
  startingText: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.ink2,
    marginTop: 12,
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
