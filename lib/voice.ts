export interface TranscriptWord {
  text: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface WordSignature {
  volumeNorm: number;
  pitchHz: number | null;
  hue: number;
}

export interface VoiceClip {
  uri: string;
  mimeType: string;
  durationMs: number;
  words: TranscriptWord[];
  signatures: WordSignature[];
}

export const FALLBACK_SIGNATURE: WordSignature = {
  volumeNorm: 0.4,
  pitchHz: null,
  hue: 45,
};

export function wordsToStory(words: TranscriptWord[]): string {
  return words.map((w) => w.text).join(" ").trim();
}

export function findActiveWordIndex(words: TranscriptWord[], timeMs: number): number {
  if (!words.length || timeMs < words[0].start) return -1;
  let lo = 0;
  let hi = words.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (words[mid].start <= timeMs) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (ans < 0 || timeMs > words[ans].end) return -1;
  return ans;
}

export function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Map Trace-style pitch hue (30–175) into Polli garden colors. */
export function polliColorFromHue(hue: number): string {
  const t = Math.min(1, Math.max(0, (hue - 30) / 145));
  if (t < 0.5) {
    const u = t / 0.5;
    return lerpHex("#EAAA00", "#53A268", u);
  }
  const u = (t - 0.5) / 0.5;
  return lerpHex("#53A268", "#EB4F30", u);
}

function lerpHex(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

export function fallbackSignatures(words: TranscriptWord[]): WordSignature[] {
  return words.map((_, i) => ({
    volumeNorm: 0.35 + (i % 5) * 0.12,
    pitchHz: null,
    hue: 35 + (i * 23) % 130,
  }));
}
