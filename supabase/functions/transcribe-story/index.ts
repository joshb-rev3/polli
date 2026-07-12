// Transcribes a voice story clip via AssemblyAI word-level timestamps.
// Request: multipart/form-data with field "audio"
// Response: { words: [{ text, start, end, confidence }], audioDurationMs }

import {
  AssemblyAIError,
  pollTranscription,
  submitTranscription,
  uploadAudio,
} from "../_shared/assemblyai.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB — nomination clips should be short

const ALLOWED_MIME_PREFIXES = ["audio/"];
const ALLOWED_MIME_EXACT = new Set(["video/webm"]);

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  if (req.method !== "POST") {
    return jsonErr(405, "POST required");
  }

  const abortController = new AbortController();
  req.signal.addEventListener("abort", () => abortController.abort());

  try {
    const formData = await req.formData();
    const file = formData.get("audio");
    if (!(file instanceof File)) {
      return jsonErr(400, "No audio file was uploaded.");
    }

    const mime = file.type || "";
    const ok =
      ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p)) || ALLOWED_MIME_EXACT.has(mime);
    if (!ok) {
      return jsonErr(415, `Unsupported file type: ${mime || "unknown"}`);
    }
    if (file.size > MAX_FILE_BYTES) {
      return jsonErr(413, "File is too large (25MB limit).");
    }

    const buffer = await file.arrayBuffer();
    const uploadUrl = await uploadAudio(buffer);
    const transcriptId = await submitTranscription(uploadUrl);
    const transcript = await pollTranscription(transcriptId, {
      signal: abortController.signal,
    });

    const words = (transcript.words || []).map((w: { text: string; start: number; end: number; confidence?: number }) => ({
      text: w.text,
      start: w.start,
      end: w.end,
      confidence: w.confidence,
    }));

    return new Response(
      JSON.stringify({
        words,
        audioDurationMs: transcript.audio_duration ? transcript.audio_duration * 1000 : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (abortController.signal.aborted) return new Response(null, { status: 499 });
    if (error instanceof AssemblyAIError) {
      return jsonErr(error.status, error.message);
    }
    console.error("Unexpected transcription error:", error);
    return jsonErr(500, "An unexpected error occurred during transcription.");
  }
});

function jsonErr(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
