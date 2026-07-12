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
      "ASSEMBLYAI_API_KEY is not set. Add it to your Supabase project secrets.",
      500
    );
  }
  return key;
}

async function translateError(res: Response, context: string): Promise<AssemblyAIError> {
  let detail = res.statusText;
  try {
    const body = await res.json();
    detail = body.error || body.message || detail;
  } catch {
    /* ignore */
  }
  if (res.status === 401 || res.status === 403) {
    return new AssemblyAIError("AssemblyAI rejected the API key.", 401);
  }
  if (res.status === 413) {
    return new AssemblyAIError("The audio file is too large for AssemblyAI.", 413);
  }
  return new AssemblyAIError(`AssemblyAI ${context} failed: ${detail}`, res.status || 502);
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
    throw new AssemblyAIError("AssemblyAI upload did not return an upload_url.", 502);
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
    throw new AssemblyAIError("AssemblyAI did not return a transcript id.", 502);
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
  { signal }: { signal?: AbortSignal } = {}
) {
  const deadline = Date.now() + MAX_POLL_MS;

  while (Date.now() < deadline) {
    if (signal?.aborted) {
      throw new AssemblyAIError("Transcription request was cancelled.", 499);
    }
    const res = await fetch(`${BASE_URL}/transcript/${transcriptId}`, {
      headers: { authorization: apiKey() },
      signal,
    });
    if (!res.ok) throw await translateError(res, "status poll");
    const data = await res.json();

    if (data.status === "completed") return data;
    if (data.status === "error") {
      throw new AssemblyAIError(
        `AssemblyAI transcription failed: ${data.error || "unknown error"}`,
        422
      );
    }
    await sleep(POLL_INTERVAL_MS);
  }

  throw new AssemblyAIError("Transcription timed out after 5 minutes.", 504);
}
