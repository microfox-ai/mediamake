/**
 * Small DSP kit for beatmap analysis: decimation, real FFT, mel filters,
 * running medians and percentiles. Pure and allocation-light so it runs the
 * same in the editor, in a Remotion render and in node tests.
 */

export const mixToMono = (channels: ArrayLike<number>[]): Float32Array => {
  if (channels.length === 0) return new Float32Array(0);
  const len = channels[0].length;
  const out = new Float32Array(len);
  for (const ch of channels) {
    for (let i = 0; i < len; i++) out[i] += ch[i] ?? 0;
  }
  if (channels.length > 1) {
    const scale = 1 / channels.length;
    for (let i = 0; i < len; i++) out[i] *= scale;
  }
  return out;
};

/**
 * Band-limited resampling to `targetRate` (Blackman-windowed sinc, kernel
 * tabulated over 256 sub-sample phases). Every decode rate lands on the same
 * analysis rate, so 44.1 and 48 kHz files give the same beatmap.
 */
export const resample = (
  samples: Float32Array,
  sampleRate: number,
  targetRate = 22050,
): { samples: Float32Array; sampleRate: number } => {
  if (Math.abs(sampleRate - targetRate) < 0.5) return { samples, sampleRate };
  const ratio = sampleRate / targetRate; // input samples per output sample
  const cutoff = 0.9 * Math.min(1, 1 / ratio); // of the input Nyquist
  const half = Math.ceil(12 / cutoff); // kernel half-width in input samples
  const phases = 256;
  const taps = 2 * half;
  const table = new Float32Array(phases * taps);
  for (let ph = 0; ph < phases; ph++) {
    const frac = ph / phases;
    let sum = 0;
    for (let k = 0; k < taps; k++) {
      const x = k - half + 1 - frac; // distance from the output position
      const sinc = x === 0 ? 1 : Math.sin(Math.PI * cutoff * x) / (Math.PI * cutoff * x);
      const n = (x + half) / (2 * half);
      const w = n <= 0 || n >= 1 ? 0 : 0.42 - 0.5 * Math.cos(2 * Math.PI * n) + 0.08 * Math.cos(4 * Math.PI * n);
      table[ph * taps + k] = sinc * w;
      sum += sinc * w;
    }
    for (let k = 0; k < taps; k++) table[ph * taps + k] /= sum || 1;
  }

  const outLen = Math.floor(samples.length / ratio);
  const out = new Float32Array(outLen);
  const last = samples.length - 1;
  for (let o = 0; o < outLen; o++) {
    const pos = o * ratio;
    const base = Math.floor(pos);
    const row = Math.min(phases - 1, Math.round((pos - base) * phases)) * taps;
    const start = base - half + 1;
    let acc = 0;
    if (start >= 0 && start + taps - 1 <= last) {
      for (let k = 0; k < taps; k++) acc += samples[start + k] * table[row + k];
    } else {
      for (let k = 0; k < taps; k++) {
        const i = Math.min(last, Math.max(0, start + k));
        acc += samples[i] * table[row + k];
      }
    }
    out[o] = acc;
  }
  return { samples: out, sampleRate: targetRate };
};

/** Power spectrum of real frames of length `size` (power of two). */
export class RealFFT {
  readonly size: number;
  private readonly half: number;
  private readonly rev: Uint32Array;
  private readonly cos: Float64Array;
  private readonly sin: Float64Array;
  private readonly postCos: Float64Array;
  private readonly postSin: Float64Array;
  private readonly re: Float64Array;
  private readonly im: Float64Array;

  constructor(size: number) {
    if (size < 4 || (size & (size - 1)) !== 0) throw new Error('FFT size must be a power of two');
    this.size = size;
    const half = size >> 1;
    this.half = half;
    this.rev = new Uint32Array(half);
    const bits = Math.log2(half);
    for (let i = 0; i < half; i++) {
      let r = 0;
      for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
      this.rev[i] = r;
    }
    this.cos = new Float64Array(half / 2);
    this.sin = new Float64Array(half / 2);
    for (let i = 0; i < half / 2; i++) {
      this.cos[i] = Math.cos((2 * Math.PI * i) / half);
      this.sin[i] = -Math.sin((2 * Math.PI * i) / half);
    }
    this.postCos = new Float64Array(half + 1);
    this.postSin = new Float64Array(half + 1);
    for (let k = 0; k <= half; k++) {
      this.postCos[k] = Math.cos((2 * Math.PI * k) / size);
      this.postSin[k] = Math.sin((2 * Math.PI * k) / size);
    }
    this.re = new Float64Array(half);
    this.im = new Float64Array(half);
  }

  /** Writes |X[k]|^2 for k = 0..size/2 into `out` (length size/2 + 1). */
  power(frame: ArrayLike<number>, out: Float32Array): void {
    const { half, re, im, rev } = this;
    for (let k = 0; k < half; k++) {
      const j = rev[k];
      re[j] = frame[2 * k];
      im[j] = frame[2 * k + 1];
    }
    for (let len = 2; len <= half; len <<= 1) {
      const step = half / len;
      const h = len >> 1;
      for (let i = 0; i < half; i += len) {
        for (let k = 0; k < h; k++) {
          const wr = this.cos[k * step];
          const wi = this.sin[k * step];
          const a = i + k;
          const b = a + h;
          const tr = re[b] * wr - im[b] * wi;
          const ti = re[b] * wi + im[b] * wr;
          re[b] = re[a] - tr;
          im[b] = im[a] - ti;
          re[a] += tr;
          im[a] += ti;
        }
      }
    }
    // Split the packed spectrum into the real input's spectrum.
    for (let k = 0; k <= half; k++) {
      const a = re[k % half];
      const b = im[k % half];
      const c = re[(half - k) % half];
      const d = im[(half - k) % half];
      const er = (a + c) / 2;
      const ei = (b - d) / 2;
      const or = (b + d) / 2;
      const oi = -(a - c) / 2;
      const cs = this.postCos[k];
      const sn = this.postSin[k];
      const xr = er + cs * or + sn * oi;
      const xi = ei + cs * oi - sn * or;
      out[k] = xr * xr + xi * xi;
    }
  }
}

const hzToMel = (hz: number) => 2595 * Math.log10(1 + hz / 700);
const melToHz = (mel: number) => 700 * (10 ** (mel / 2595) - 1);

export interface MelBank {
  /** Per band: first bin and weights from that bin on. */
  bands: { start: number; weights: Float32Array }[];
  /** Centre frequency of each band in Hz. */
  centers: Float32Array;
}

/**
 * Triangular mel filters over an FFT of `fftSize` bins. A band narrower than
 * one bin takes its nearest bin, so low bands are never empty.
 */
export const melBank = (
  sampleRate: number,
  fftSize: number,
  nMels: number,
  fmin: number,
  fmax: number,
): MelBank => {
  const binHz = sampleRate / fftSize;
  const nBins = fftSize / 2 + 1;
  const lo = hzToMel(fmin);
  const hi = hzToMel(Math.min(fmax, sampleRate / 2));
  const edges: number[] = [];
  for (let i = 0; i < nMels + 2; i++) edges.push(melToHz(lo + ((hi - lo) * i) / (nMels + 1)));
  const bands: MelBank['bands'] = [];
  const centers = new Float32Array(nMels);
  for (let m = 0; m < nMels; m++) {
    const [f0, f1, f2] = [edges[m], edges[m + 1], edges[m + 2]];
    centers[m] = f1;
    const first = Math.max(0, Math.ceil(f0 / binHz));
    const last = Math.min(nBins - 1, Math.floor(f2 / binHz));
    const weights: number[] = [];
    let total = 0;
    for (let b = first; b <= last; b++) {
      const f = b * binHz;
      const w = f <= f1 ? (f - f0) / (f1 - f0) : (f2 - f) / (f2 - f1);
      const v = Math.max(0, w);
      weights.push(v);
      total += v;
    }
    if (total <= 1e-9) {
      bands.push({ start: Math.min(nBins - 1, Math.round(f1 / binHz)), weights: Float32Array.of(1) });
      continue;
    }
    bands.push({ start: first, weights: Float32Array.from(weights, (w) => w / total) });
  }
  return { bands, centers };
};

/**
 * Running median along one axis of a row-major [rows x cols] matrix.
 * `alongRows` true filters each column over time (rows); false filters each row.
 */
export const medianFilter = (
  data: Float32Array,
  rows: number,
  cols: number,
  size: number,
  alongRows: boolean,
): Float32Array => {
  const out = new Float32Array(data.length);
  const k = Math.max(1, size | 1);
  const r = k >> 1;
  const n = alongRows ? rows : cols;
  const lanes = alongRows ? cols : rows;
  const at = (lane: number, i: number) =>
    alongRows ? i * cols + lane : lane * cols + i;
  const win = new Float32Array(k);

  // Insert into a sorted window of `len` items.
  const insert = (len: number, v: number) => {
    let i = len;
    while (i > 0 && win[i - 1] > v) {
      win[i] = win[i - 1];
      i--;
    }
    win[i] = v;
  };
  const remove = (len: number, v: number) => {
    let lo = 0;
    let hi = len - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (win[mid] < v) lo = mid + 1;
      else hi = mid;
    }
    for (let i = lo; i < len - 1; i++) win[i] = win[i + 1];
  };
  const clampIndex = (i: number) => (i < 0 ? 0 : i >= n ? n - 1 : i);

  for (let lane = 0; lane < lanes; lane++) {
    let len = 0;
    for (let i = -r; i <= r; i++) insert(len++, data[at(lane, clampIndex(i))]);
    for (let i = 0; i < n; i++) {
      out[at(lane, i)] = win[r];
      remove(len, data[at(lane, clampIndex(i - r))]);
      insert(len - 1, data[at(lane, clampIndex(i + r + 1))]);
    }
  }
  return out;
};

/** p-th percentile (0-100) of the values, without mutating them. */
export const percentile = (values: ArrayLike<number>, p: number): number => {
  if (values.length === 0) return 0;
  const sorted = Float64Array.from(values).sort();
  const idx = Math.min(sorted.length - 1, Math.max(0, (p / 100) * (sorted.length - 1)));
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
};

/** Vertex offset (-0.5..0.5) of the parabola through three samples. */
export const parabolicOffset = (a: number, b: number, c: number): number => {
  const d = a - 2 * b + c;
  if (Math.abs(d) < 1e-12) return 0;
  return Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / d));
};
