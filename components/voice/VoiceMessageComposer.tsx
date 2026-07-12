import { Audio, AVPlaybackStatus } from "expo-av";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { analyzeWords } from "../../lib/audioAnalysis";
import { transcribeAudio } from "../../lib/transcribe";
import { useVoiceRecorder } from "../../lib/useVoiceRecorder";
import {
  fallbackSignatures,
  findActiveWordIndex,
  TranscriptWord,
  VoiceClip,
  WordSignature,
  wordsToStory,
} from "../../lib/voice";
import { tap } from "../../lib/haptics";
import { colors, fonts } from "../../theme";
import { KaraokeTranscript } from "./KaraokeTranscript";
import { PlaybackControls } from "./PlaybackControls";
import { VoiceWaveform } from "./VoiceWaveform";

interface Props {
  clip: VoiceClip | null;
  onClipChange: (clip: VoiceClip | null, storyText: string) => void;
}

export function VoiceMessageComposer({ clip, onClipChange }: Props) {
  const { isRecording, error: recordError, startRecording, stopRecording, clearError } =
    useVoiceRecorder();
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
      await unloadSound();
      abortRef.current?.abort();
      onClipChange(null, "");
      await startRecording();
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

  return (
    <View style={styles.wrap}>
      {!clip && (
        <Pressable
          style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
          onPress={handleRecordToggle}
          disabled={busy}
        >
          <Text style={[styles.recordLabel, isRecording && styles.recordLabelActive]}>
            {isRecording ? "■ Stop recording" : "● Record your message"}
          </Text>
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
              onPress={async () => {
                await discard();
                await startRecording();
              }}
            >
              <Text style={styles.recordLabel}>● Re-record</Text>
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
  recordBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.green3,
    backgroundColor: colors.sageSoft,
    alignItems: "center",
  },
  recordBtnActive: {
    borderColor: colors.coral,
    backgroundColor: colors.coralSoft,
  },
  recordLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.green,
  },
  recordLabelActive: {
    color: colors.coral,
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
    backgroundColor: colors.sageSoft,
  },
  playerCompact: {
    marginTop: 4,
  },
});
