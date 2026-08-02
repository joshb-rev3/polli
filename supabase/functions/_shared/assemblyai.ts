/// <reference path="../deno.d.ts" />

const BASE_URL = "https://api.assemblyai.com/v2";

export class AssemblyAIError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "AssemblyAIError";
    this.status = status;
  }
}

function apiKey(): string {
  const key = Deno.env.get("ASSEMBLYAI_API_KEY");
  if (!key) {
    throw new AssemblyAIError(
      "Voice transcription isn't set up yet. Please try again later.",
      500,
    );
  }
  return key;
}

/** Map provider/technical errors into copy people can act on. */
export function friendlyTranscriptionError(detail: string, fallbackStatus = 502): AssemblyAIError {
  const lower = detail.toLowerCase();

  if (
    lower.includes("no spoken audio") ||
    lower.includes("language_detection") ||
    lower.includes("no speech") ||
    lower.includes("silence")
  ) {
    return new AssemblyAIError(
      "We couldn't hear any speech in that recording. Try again a little closer to the mic, or speak a bit louder.",
      422,
    );
  }
  if (lower.includes("too large") || lower.includes("file size") || lower.includes("413")) {
    return new AssemblyAIError("That recording is a bit too long. Try a shorter clip.", 413);
  }
  if (lower.includes("unsupported") || lower.includes("format") || lower.includes("codec")) {
    return new AssemblyAIError(
      "We couldn't read that recording format. Please try recording again.",
      415,
    );
  }
  if (lower.includes("timed out") || lower.includes("timeout")) {
    return new AssemblyAIError(
      "Transcription is taking too long. Please try a shorter recording.",
      504,
    );
  }
  if (lower.includes("cancelled") || lower.includes("canceled") || lower.includes("aborted")) {
    return new AssemblyAIError("Transcription was cancelled.", 499);
  }
  if (lower.includes("api key") || lower.includes("unauthorized") || lower.includes("forbidden")) {
    return new AssemblyAIError(
      "Voice transcription isn't available right now. Please try again later.",
      401,
    );
  }

  return new AssemblyAIError(
    "We couldn't transcribe that recording. Please try again.",
    fallbackStatus,
  );
}

async function translateError(res: Response, _context: string): Promise<AssemblyAIError> {
  let detail = res.statusText;
  try {
    const body = await res.json();
    detail = body.error || body.message || detail;
  } catch {
    /* ignore */
  }
  if (res.status === 401 || res.status === 403) {
    return friendlyTranscriptionError("api key", 401);
  }
  if (res.status === 413) {
    return friendlyTranscriptionError("too large", 413);
  }
  return friendlyTranscriptionError(String(detail || "unknown"), res.status || 502);
}

export async function uploadAudio(buffer: ArrayBuffer): Promise<string> {
  const res = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    headers: {
      authorization: apiKey(),
      "content-type": "application/octet-stream",
    },
    body: buffer,
  });
  if (!res.ok) throw await translateError(res, "upload");
  const data = await res.json();
  if (!data.upload_url) {
    throw new AssemblyAIError("We couldn't upload that recording. Please try again.", 502);
  }
  return data.upload_url;
}

export async function submitTranscription(audioUrl: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/transcript`, {
    method: "POST",
    headers: {
      authorization: apiKey(),
      "content-type": "application/json",
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      speech_models: ["universal-3-5-pro", "universal-2"],
    }),
  });
  if (!res.ok) throw await translateError(res, "transcript submission");
  const data = await res.json();
  if (!data.id) {
    throw new AssemblyAIError("We couldn't start transcription. Please try again.", 502);
  }
  return data.id;
}

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_MS = 5 * 60 * 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pollTranscription(
  transcriptId: string,
  { signal }: { signal?: AbortSignal } = {},
) {
  const deadline = Date.now() + MAX_POLL_MS;

  while (Date.now() < deadline) {
    if (signal?.aborted) {
      throw friendlyTranscriptionError("cancelled", 499);
    }
    const res = await fetch(`${BASE_URL}/transcript/${transcriptId}`, {
      headers: { authorization: apiKey() },
      signal,
    });
    if (!res.ok) throw await translateError(res, "status poll");
    const data = await res.json();

    if (data.status === "completed") return data;
    if (data.status === "error") {
      throw friendlyTranscriptionError(String(data.error || "unknown error"), 422);
    }
    await sleep(POLL_INTERVAL_MS);
  }

  throw friendlyTranscriptionError("timed out", 504);
}
