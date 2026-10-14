export interface SpectrumLineOptions {
  /** Number of points the line is sampled at across its width. */
  pointCount: number;
  minFrequency: number;
  maxFrequency: number;
  frequencyScale: 'log' | 'linear';
  /** Boosts higher frequencies so treble peaks are visible next to the bass. */
  tilt: number;
  /** Applied before a tanh soft clip, so loud peaks round off instead of flat-topping. */
  gain: number;
  /** Values below this (0-1) are flattened onto the baseline. */
  noiseFloor: number;
  /** Exponent applied after the noise floor; higher values give narrower, spikier peaks. */
  sharpness: number;
  /** Number of neighbour-blur passes that round off each peak. */
  spread: number;
}

const TILT_REFERENCE_HZ = 1000;

const hannCache = new Map<number, Float32Array>();
const hannWindow = (size: number): Float32Array => {
  let w = hannCache.get(size);
  if (!w) {
    w = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1));
    }
    hannCache.set(size, w);
  }
  return w;
};

/** In-place iterative radix-2 FFT. `size` must be a power of two. */
const fftInPlace = (re: Float64Array, im: Float64Array) => {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    const wr = Math.cos(angle);
    const wi = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const next = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = next;
      }
    }
  }
};

/**
 * Hann-windowed magnitude spectrum of `fftSize` samples centred on `centerSample`,
 * with all channels mixed to mono.
 * Returns `fftSize / 2` bins spanning 0 Hz to Nyquist; a full-scale sine reads ~1.
 * Unlike `visualizeAudio`, the bins are not blurred, so tonal peaks stay narrow.
 */
export const computeMagnitudeSpectrum = (
  channels: Float32Array[],
  centerSample: number,
  fftSize: number
): number[] => {
  const re = new Float64Array(fftSize);
  const im = new Float64Array(fftSize);
  const window = hannWindow(fftSize);
  const start = Math.round(centerSample - fftSize / 2);
  const channelCount = Math.max(1, channels.length);
  for (let i = 0; i < fftSize; i++) {
    let sum = 0;
    for (const channel of channels) {
      sum += channel[start + i] ?? 0;
    }
    re[i] = (sum / channelCount) * window[i];
  }
  fftInPlace(re, im);
  const half = fftSize / 2;
  const scale = 4 / fftSize;
  const out = new Array<number>(half);
  for (let i = 0; i < half; i++) {
    out[i] = Math.hypot(re[i], im[i]) * scale;
  }
  return out;
};

export interface SmoothedSpectrumInput {
  channels: Float32Array[];
  sampleRate: number;
  /** Identifies the audio buffer so cached spectra are never shared between sources. */
  cacheKey: string;
  frame: number;
  fps: number;
  fftSize: number;
  /** 0 = no temporal smoothing; values towards 1 make peaks linger longer. */
  smoothing: number;
  /** How many previous frames feed the smoothing. */
  historyFrames: number;
}

const SPECTRUM_CACHE_LIMIT = 256;
const spectrumCache = new Map<string, number[]>();

const cachedSpectrum = (
  input: SmoothedSpectrumInput,
  frame: number
): number[] => {
  const key = `${input.cacheKey}|${input.fftSize}|${input.fps}|${frame}`;
  let spectrum = spectrumCache.get(key);
  if (!spectrum) {
    const centerSample = (frame / input.fps) * input.sampleRate;
    spectrum = computeMagnitudeSpectrum(input.channels, centerSample, input.fftSize);
    if (spectrumCache.size >= SPECTRUM_CACHE_LIMIT) {
      const oldest = spectrumCache.keys().next().value;
      if (oldest !== undefined) spectrumCache.delete(oldest);
    }
    spectrumCache.set(key, spectrum);
  }
  return spectrum;
};

/**
 * Spectrum for `frame`, exponentially averaged with the preceding `historyFrames`
 * (the same smoothing a WebAudio AnalyserNode applies). Deterministic per frame,
 * so renders stay consistent across Remotion workers.
 */
export const computeSmoothedSpectrum = (input: SmoothedSpectrumInput): number[] => {
  const smoothing = Math.min(0.95, Math.max(0, input.smoothing));
  const history = smoothing > 0 ? Math.max(0, Math.round(input.historyFrames)) : 0;
  let acc: number[] | null = null;
  for (let h = history; h >= 0; h--) {
    const spectrum = cachedSpectrum(input, input.frame - h);
    if (!acc) {
      acc = spectrum.slice();
    } else {
      for (let i = 0; i < acc.length; i++) {
        acc[i] = smoothing * acc[i] + (1 - smoothing) * spectrum[i];
      }
    }
  }
  return acc ?? [];
};

const sampleBins = (bins: number[], lo: number, hi: number): number => {
  const last = bins.length - 1;
  if (hi - lo < 1) {
    const center = Math.min(last, Math.max(0, (lo + hi) / 2));
    const i = Math.floor(center);
    const frac = center - i;
    return bins[i] * (1 - frac) + (bins[Math.min(last, i + 1)] ?? 0) * frac;
  }
  let max = 0;
  const start = Math.max(0, Math.floor(lo));
  const end = Math.min(last, Math.ceil(hi) - 1);
  for (let i = start; i <= end; i++) {
    if (bins[i] > max) max = bins[i];
  }
  return max;
};

const blur = (values: number[], passes: number): number[] => {
  let current = values;
  for (let p = 0; p < passes; p++) {
    const next = new Array(current.length);
    for (let i = 0; i < current.length; i++) {
      const left = current[Math.max(0, i - 1)];
      const right = current[Math.min(current.length - 1, i + 1)];
      next[i] = left * 0.25 + current[i] * 0.5 + right * 0.25;
    }
    current = next;
  }
  return current;
};

/**
 * Resamples a linear FFT magnitude spectrum (as returned by `visualizeAudio`)
 * into `pointCount` heights in the 0-1 range.
 */
export const computeSpectrumLineHeights = (
  frequencyData: number[],
  sampleRate: number,
  options: SpectrumLineOptions
): number[] => {
  const {
    pointCount,
    minFrequency,
    maxFrequency,
    frequencyScale,
    tilt,
    gain,
    noiseFloor,
    sharpness,
    spread,
  } = options;

  if (frequencyData.length === 0 || pointCount < 2) {
    return new Array(Math.max(0, pointCount)).fill(0);
  }

  const nyquist = sampleRate / 2;
  const binHz = nyquist / frequencyData.length;
  const fMin = Math.max(binHz, Math.min(minFrequency, nyquist));
  const fMax = Math.max(fMin + binHz, Math.min(maxFrequency, nyquist));
  const frequencyAt = (t: number) =>
    frequencyScale === 'log'
      ? fMin * Math.pow(fMax / fMin, t)
      : fMin + (fMax - fMin) * t;

  const floor = Math.min(0.99, Math.max(0, noiseFloor));
  const heights: number[] = [];
  for (let k = 0; k < pointCount; k++) {
    const f0 = frequencyAt(k / pointCount);
    const f1 = frequencyAt((k + 1) / pointCount);
    const raw = sampleBins(frequencyData, f0 / binHz, f1 / binHz);
    const weighted = raw * gain * Math.pow((f0 + f1) / 2 / TILT_REFERENCE_HZ, tilt);
    const compressed = Math.tanh(Math.max(0, weighted));
    const gated = Math.max(0, (compressed - floor) / (1 - floor));
    heights.push(Math.pow(gated, sharpness));
  }

  return blur(heights, Math.max(0, Math.round(spread)));
};
