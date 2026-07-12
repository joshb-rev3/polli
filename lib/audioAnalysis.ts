import { TranscriptWord, WordSignature } from "./voice";

const ENVELOPE_WINDOW_SEC = 0.02;
const PITCH_WINDOW_SAMPLES = 1024;
const MIN_PITCH_HZ = 70;
const MAX_PITCH_HZ = 400;
const PITCH_HUE_LOW = 30;
const PITCH_HUE_HIGH = 175;
const CONFIDENCE_THRESHOLD = 0.35;

function toMonoFloat32(audioBuffer: AudioBuffer): Float32Array {
  const channels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  if (channels === 1) return audioBuffer.getChannelData(0);

  const mono = new Float32Array(length);
  for (let c = 0; c < channels; c++) {
    const data = audioBuffer.getChannelData(c);
    for (let i = 0; i < length; i++) mono[i] += data[i] / channels;
  }
  return mono;
}

function computeEnvelope(mono: Float32Array, sampleRate: number) {
  const windowSize = Math.max(1, Math.round(sampleRate * ENVELOPE_WINDOW_SEC));
  const numWindows = Math.ceil(mono.length / windowSize);
  const envelope = new Float32Array(numWindows);

  for (let w = 0; w < numWindows; w++) {
    const start = w * windowSize;
    const end = Math.min(start + windowSize, mono.length);
    let sumSquares = 0;
    for (let i = start; i < end; i++) sumSquares += mono[i] * mono[i];
    envelope[w] = Math.sqrt(sumSquares / Math.max(1, end - start));
  }

  return { envelope, windowSize };
}

function averageRmsInRange(
  envelope: Float32Array,
  windowSize: number,
  sampleRate: number,
  startMs: number,
  endMs: number
) {
  const startSample = (startMs / 1000) * sampleRate;
  const endSample = Math.max(startSample + 1, (endMs / 1000) * sampleRate);
  const startWindow = Math.max(0, Math.floor(startSample / windowSize));
  const endWindow = Math.min(envelope.length - 1, Math.ceil(endSample / windowSize));

  let sum = 0;
  let count = 0;
  for (let w = startWindow; w <= endWindow; w++) {
    sum += envelope[w];
    count++;
  }
  return count > 0 ? sum / count : 0;
}

function estimatePitch(mono: Float32Array, sampleRate: number, startMs: number): number | null {
  const startSample = Math.floor((startMs / 1000) * sampleRate);
  const windowLen = Math.min(PITCH_WINDOW_SAMPLES, mono.length - startSample);
  if (windowLen < 256) return null;

  const frame = mono.subarray(startSample, startSample + windowLen);
  let mean = 0;
  for (let i = 0; i < frame.length; i++) mean += frame[i];
  mean /= frame.length;

  const minLag = Math.floor(sampleRate / MAX_PITCH_HZ);
  const maxLag = Math.min(Math.floor(sampleRate / MIN_PITCH_HZ), frame.length - 1);
  if (maxLag <= minLag) return null;

  let bestLag = -1;
  let bestCorr = 0;
  let zeroLagEnergy = 0;
  for (let i = 0; i < frame.length; i++) {
    const v = frame[i] - mean;
    zeroLagEnergy += v * v;
  }
  if (zeroLagEnergy < 1e-6) return null;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    for (let i = 0; i < frame.length - lag; i++) {
      corr += (frame[i] - mean) * (frame[i + lag] - mean);
    }
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  if (bestLag <= 0) return null;
  const normalizedCorr = bestCorr / zeroLagEnergy;
  if (normalizedCorr < CONFIDENCE_THRESHOLD) return null;
  return sampleRate / bestLag;
}

function pitchToHue(pitchHz: number): number {
  const clamped = Math.min(MAX_PITCH_HZ, Math.max(MIN_PITCH_HZ, pitchHz));
  const t = (clamped - MIN_PITCH_HZ) / (MAX_PITCH_HZ - MIN_PITCH_HZ);
  return PITCH_HUE_LOW + t * (PITCH_HUE_HIGH - PITCH_HUE_LOW);
}

export async function analyzeWords(
  arrayBuffer: ArrayBuffer,
  words: TranscriptWord[]
): Promise<WordSignature[]> {
  const AudioContextClass =
    typeof window !== "undefined"
      ? window.AudioContext || (window as any).webkitAudioContext
      : null;
  if (!AudioContextClass) {
    throw new Error("Web Audio API unavailable");
  }

  const ctx = new AudioContextClass();
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    ctx.close();
  }

  const mono = toMonoFloat32(audioBuffer);
  const sampleRate = audioBuffer.sampleRate;
  const { envelope, windowSize } = computeEnvelope(mono, sampleRate);

  const rawVolumes = words.map((word) =>
    averageRmsInRange(envelope, windowSize, sampleRate, word.start, word.end)
  );
  const pitches = words.map((word) => estimatePitch(mono, sampleRate, word.start));

  const sorted = [...rawVolumes].sort((a, b) => a - b);
  const ceilingIdx = Math.floor(sorted.length * 0.95);
  const ceiling = sorted[Math.min(sorted.length - 1, ceilingIdx)] || 0.0001;
  const floor = sorted[0] || 0;

  const detectedPitches = pitches.filter((p): p is number => p !== null);
  const fallbackHue = detectedPitches.length
    ? pitchToHue(detectedPitches.reduce((a, b) => a + b, 0) / detectedPitches.length)
    : 100;

  return words.map((_, i) => {
    const norm = ceiling > floor ? (rawVolumes[i] - floor) / (ceiling - floor) : 0;
    const volumeNorm = Math.min(1, Math.max(0, norm));
    const pitchHz = pitches[i];
    const hue = pitchHz !== null ? pitchToHue(pitchHz) : fallbackHue;
    return { volumeNorm, pitchHz, hue };
  });
}
