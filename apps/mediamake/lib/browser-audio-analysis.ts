/**
 * In-browser audio analysis.
 * Uses the same fetch + Web Audio decode path as the timeline waveform,
 * then builds energy frames locally (no analyze-audio worker).
 */

import type {
  AudioAnalysisClientDoc,
  AudioAnalysisFrame,
  AudioAnalysisSummary,
} from "./audio-analysis-types";
import { decodeBrowserAudio } from "./browser-waveform";

const memoryCache = new Map<string, AudioAnalysisClientDoc>();
const inflight = new Map<string, Promise<AudioAnalysisClientDoc>>();

const TARGET_RATE = 16000;
const WINDOW = 1024;
const HOP = 1024;

function sleepTick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function mixToMono(buffer: AudioBuffer): Float32Array {
  const length = buffer.length;
  const channels = Math.max(1, buffer.numberOfChannels);
  if (channels === 1) return buffer.getChannelData(0).slice();

  const mixed = new Float32Array(length);
  for (let c = 0; c < channels; c++) {
    const channel = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) mixed[i] += channel[i] || 0;
  }
  const scale = 1 / channels;
  for (let i = 0; i < length; i++) mixed[i] *= scale;
  return mixed;
}

function downsample(
  input: Float32Array,
  fromRate: number,
  toRate: number,
): { samples: Float32Array; sampleRate: number } {
  if (fromRate <= toRate + 1) {
    return { samples: input, sampleRate: fromRate };
  }
  const factor = Math.max(1, Math.round(fromRate / toRate));
  const outLen = Math.floor(input.length / factor);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    let sum = 0;
    const start = i * factor;
    for (let j = 0; j < factor; j++) sum += input[start + j] || 0;
    out[i] = sum / factor;
  }
  return { samples: out, sampleRate: Math.round(fromRate / factor) };
}

/** In-place radix-2 FFT. `real` and `imag` length must be a power of two. */
function fftRadix2(real: Float32Array, imag: Float32Array) {
  const n = real.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = real[i];
      real[i] = real[j];
      real[j] = tr;
      const ti = imag[i];
      imag[i] = imag[j];
      imag[j] = ti;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wlenRe = Math.cos(ang);
    const wlenIm = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let wRe = 1;
      let wIm = 0;
      for (let k = 0; k < half; k++) {
        const uRe = real[i + k];
        const uIm = imag[i + k];
        const vRe = real[i + k + half] * wRe - imag[i + k + half] * wIm;
        const vIm = real[i + k + half] * wIm + imag[i + k + half] * wRe;
        real[i + k] = uRe + vRe;
        imag[i + k] = uIm + vIm;
        real[i + k + half] = uRe - vRe;
        imag[i + k + half] = uIm - vIm;
        const nextRe = wRe * wlenRe - wIm * wlenIm;
        wIm = wRe * wlenIm + wIm * wlenRe;
        wRe = nextRe;
      }
    }
  }
}

function summarize(frames: AudioAnalysisFrame[]): AudioAnalysisSummary {
  if (!frames.length) {
    return {
      totalBeats: 0,
      averageIntensity: 0,
      lowBeats: 0,
      midBeats: 0,
      highBeats: 0,
    };
  }
  return {
    totalBeats: frames.length,
    averageIntensity:
      frames.reduce((sum, frame) => sum + frame.intensity, 0) / frames.length,
    lowBeats: frames.filter((frame) => frame.beatType === "low").length,
    midBeats: frames.filter((frame) => frame.beatType === "mid").length,
    highBeats: frames.filter((frame) => frame.beatType === "high").length,
  };
}

async function analyzeDecoded(
  buffer: AudioBuffer,
  onProgress?: (message: string) => void,
): Promise<{
  analysis: AudioAnalysisFrame[];
  durationInSeconds: number;
  sampleRate: number;
  summary: AudioAnalysisSummary;
}> {
  onProgress?.("Measuring energy…");
  const mono = mixToMono(buffer);
  const { samples, sampleRate } = downsample(
    mono,
    buffer.sampleRate,
    TARGET_RATE,
  );
  const numWindows = Math.floor((samples.length - WINDOW) / HOP);
  if (numWindows <= 0) {
    return {
      analysis: [],
      durationInSeconds: buffer.duration,
      sampleRate,
      summary: summarize([]),
    };
  }

  const rms = new Float32Array(numWindows);
  let minRms = Infinity;
  let maxRms = 0;
  for (let i = 0; i < numWindows; i++) {
    const start = i * HOP;
    let sumSq = 0;
    for (let n = 0; n < WINDOW; n++) {
      const sample = samples[start + n] || 0;
      sumSq += sample * sample;
    }
    const value = Math.sqrt(sumSq / WINDOW);
    rms[i] = value;
    if (value < minRms) minRms = value;
    if (value > maxRms) maxRms = value;
    if (i > 0 && i % 80 === 0) {
      onProgress?.(`Measuring energy… ${Math.round((i / numWindows) * 100)}%`);
      await sleepTick();
    }
  }

  const range = maxRms - minRms;
  const real = new Float32Array(WINDOW);
  const imag = new Float32Array(WINDOW);
  const frames: AudioAnalysisFrame[] = [];

  for (let i = 0; i < numWindows; i++) {
    const intensity = range > 0 ? (rms[i] - minRms) / range : 0;
    if (intensity < 0.05) continue;

    const start = i * HOP;
    imag.fill(0);
    for (let n = 0; n < WINDOW; n++) {
      const sample = samples[start + n] || 0;
      const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (WINDOW - 1));
      real[n] = sample * w;
    }
    fftRadix2(real, imag);

    let maxMag = 0;
    let dominantBin = 0;
    let weighted = 0;
    let magSum = 0;
    const half = WINDOW / 2;
    for (let bin = 1; bin < half; bin++) {
      const mag = Math.hypot(real[bin], imag[bin]);
      magSum += mag;
      weighted += bin * mag;
      if (mag > maxMag) {
        maxMag = mag;
        dominantBin = bin;
      }
    }

    const frequency = (dominantBin * sampleRate) / WINDOW;
    const beatType: AudioAnalysisFrame["beatType"] =
      frequency < 250 ? "low" : frequency < 2000 ? "mid" : "high";

    frames.push({
      timestamp: start / sampleRate,
      intensity,
      frequency,
      beatType,
      spectralCentroid: magSum > 0 ? weighted / magSum : 0,
    });

    if (i > 0 && i % 24 === 0) {
      onProgress?.(`Analyzing audio… ${Math.round((i / numWindows) * 100)}%`);
      await sleepTick();
    }
  }

  return {
    analysis: frames,
    durationInSeconds: buffer.duration,
    sampleRate,
    summary: summarize(frames),
  };
}

export async function analyzeAudioInBrowser(
  src: string,
  onProgress?: (message: string) => void,
): Promise<AudioAnalysisClientDoc> {
  const cached = memoryCache.get(src);
  if (cached) return cached;
  const pending = inflight.get(src);
  if (pending) return pending;

  const promise = (async () => {
    onProgress?.("Fetching audio…");
    const buffer = await decodeBrowserAudio(src);
    const analyzed = await analyzeDecoded(buffer, onProgress);
    if (!analyzed.analysis.length) {
      throw new Error("Browser audio analysis found no energy frames");
    }
    const doc: AudioAnalysisClientDoc = {
      id: "browser",
      analysisId: "browser",
      audioSrc: src,
      durationInSeconds: analyzed.durationInSeconds,
      summary: analyzed.summary,
      analysis: analyzed.analysis,
      frameCount: analyzed.analysis.length,
      sampleRate: analyzed.sampleRate,
      source: "browser",
    };
    memoryCache.set(src, doc);
    return doc;
  })();

  inflight.set(src, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(src);
  }
}
