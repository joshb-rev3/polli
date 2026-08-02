import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabaseConfigured } from "./supabase";
import { TranscriptWord } from "./voice";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  (Constants.expoConfig?.extra as { supabaseUrl?: string } | undefined)?.supabaseUrl ||
  "";

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  (Constants.expoConfig?.extra as { supabaseAnonKey?: string } | undefined)?.supabaseAnonKey ||
  "";

const useMockTranscribe =
  process.env.EXPO_PUBLIC_MOCK_TRANSCRIBE === "1" ||
  process.env.EXPO_PUBLIC_MOCK_TRANSCRIBE === "true";

export interface TranscribeResult {
  words: TranscriptWord[];
  audioDurationMs: number | null;
  /** Whether this came from AssemblyAI or the local demo fallback. */
  source: "live" | "mock";
}

export async function transcribeAudio(
  uri: string,
  mimeType: string,
  fileName: string,
  { signal }: { signal?: AbortSignal } = {}
): Promise<TranscribeResult> {
  if (!supabaseConfigured || useMockTranscribe) {
    return mockTranscribe();
  }

  const formData = new FormData();
  if (Platform.OS === "web") {
    const res = await fetch(uri);
    const blob = await res.blob();
    formData.append("audio", blob, fileName);
  } else {
    formData.append(
      "audio",
      { uri, type: mimeType, name: fileName } as unknown as Blob
    );
  }

  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/transcribe-story`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
      },
      body: formData,
      signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new Error(
      "We couldn't reach transcription right now. Check your connection and try again.",
    );
  }

  let data: { words?: TranscriptWord[]; audioDurationMs?: number | null; error?: string };
  try {
    data = await response.json();
  } catch {
    throw new Error(transcribeErrorMessage(response.status));
  }

  if (!response.ok) {
    throw new Error(
      friendlyClientTranscriptionError(data.error || transcribeErrorMessage(response.status)),
    );
  }

  return {
    words: data.words ?? [],
    audioDurationMs: data.audioDurationMs ?? null,
    source: "live",
  };
}

function transcribeErrorMessage(status: number): string {
  if (status === 404) {
    return "Voice transcription isn't available right now. Please try again later.";
  }
  if (status === 401 || status === 403) {
    return "Voice transcription isn't available right now. Please try again later.";
  }
  if (status === 413) {
    return "That recording is a bit too long. Try a shorter clip.";
  }
  if (status === 422) {
    return "We couldn't hear any speech in that recording. Try again a little closer to the mic, or speak a bit louder.";
  }
  if (status === 500) {
    return "Something went wrong while transcribing. Please try again.";
  }
  return "We couldn't transcribe that recording. Please try again.";
}

/** Soften any leftover provider jargon before showing it in the UI. */
export function friendlyClientTranscriptionError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("assemblyai") ||
    lower.includes("language_detection") ||
    lower.includes("no spoken audio") ||
    lower.includes("no speech")
  ) {
    return "We couldn't hear any speech in that recording. Try again a little closer to the mic, or speak a bit louder.";
  }
  if (lower.includes("network") || lower.includes("reach the transcription")) {
    return "We couldn't reach transcription right now. Check your connection and try again.";
  }
  return message;
}

/** Demo fallback — only when Supabase is unconfigured or EXPO_PUBLIC_MOCK_TRANSCRIBE=1. */
function mockTranscribe(): TranscribeResult {
  const words: TranscriptWord[] = [
    { text: "You", start: 0, end: 220, confidence: 0.99 },
    { text: "make", start: 240, end: 520, confidence: 0.98 },
    { text: "everything", start: 540, end: 980, confidence: 0.97 },
    { text: "feel", start: 1000, end: 1280, confidence: 0.98 },
    { text: "a", start: 1300, end: 1380, confidence: 0.99 },
    { text: "little", start: 1400, end: 1680, confidence: 0.98 },
    { text: "easier.", start: 1700, end: 2200, confidence: 0.97 },
  ];
  return { words, audioDurationMs: 2400, source: "mock" };
}
