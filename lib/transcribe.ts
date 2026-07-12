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
      "Could not reach the transcription service. Check your network and EXPO_PUBLIC_SUPABASE_URL, then restart Expo."
    );
  }

  let data: { words?: TranscriptWord[]; audioDurationMs?: number | null; error?: string };
  try {
    data = await response.json();
  } catch {
    throw new Error(transcribeErrorMessage(response.status));
  }

  if (!response.ok) {
    throw new Error(data.error || transcribeErrorMessage(response.status));
  }

  return {
    words: data.words ?? [],
    audioDurationMs: data.audioDurationMs ?? null,
    source: "live",
  };
}

function transcribeErrorMessage(status: number): string {
  if (status === 404) {
    return (
      "The transcribe-story function is not deployed yet. Run: " +
      "supabase secrets set ASSEMBLYAI_API_KEY=your_key && supabase functions deploy transcribe-story"
    );
  }
  if (status === 401 || status === 403) {
    return "Supabase rejected the request. Check EXPO_PUBLIC_SUPABASE_ANON_KEY in .env and restart Expo.";
  }
  if (status === 500) {
    return "Transcription server error. Confirm ASSEMBLYAI_API_KEY is set in Supabase secrets.";
  }
  return `Transcription failed (status ${status}).`;
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
