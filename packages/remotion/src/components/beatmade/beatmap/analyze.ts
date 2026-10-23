/**
 * Beatmap analysis, after the lyric-video pipeline (apps/lyrics_videos/analysis)
 * but without Demucs, so it runs in the browser and inside a render:
 *
 * 1. Mono, resampled to 22.05 kHz. 1024-point STFT, 10 ms hop (100 fps), 64 mel bands.
 * 2. Harmonic / percussive split by median filtering the mel spectrogram
 *    (time median = sustained notes, frequency median = hits). The percussive
 *    part stands in for the drum stem.
 * 3. Log-mel spectral flux (lag 20 ms, 3-band max filter against vibrato) per band:
 *    kick <150 Hz, snare 1.5-5 kHz, hat >7 kHz, plus the full mix for accents.
 * 4. Tempo from the onset autocorrelation with a log-normal prior around 120 bpm,
 *    then Ellis dynamic-programming beat tracking, which follows tempo drift.
 *    Beat times are refined to sub-frame precision.
 * 5. Bar phase scored from kick on 1, snare on 2 and 4, and harmonic change on 1.
 * 6. Onsets peak-picked per band against a moving mean, timed to the attack.
 */

import { BEATMAP_ONSET_KINDS, type Beatmap, type BeatmapHit } from './types';
import {
  medianFilter,
  melBank,
  mixToMono,
  parabolicOffset,
  percentile,
  RealFFT,
  resample,
} from './dsp';

export interface AnalyzeBeatmapOptions {
  /** Beats per bar for downbeats. Default 4. */
  beatsPerBar?: number;
  /** Allowed tempo, bpm. Default [60, 200]. */
  tempoRange?: [number, number];
  /** Centre of the tempo prior, bpm. Default 120. */
  startBpm?: number;
  src?: string;
  source?: Beatmap['source'];
}

const FFT_SIZE = 1024;
const FPS = 100;
const N_MELS = 64;
const FLUX_LAG = 2;
/**
 * Seconds from a flux peak to the attack it marks. The STFT is centred, so log
 * energy jumps while the attack is still entering the window. Calibrated on
 * synthetic drum loops (90-140 bpm) to land within ±2 ms of the sample.
 */
const ATTACK_DELAY = 0.003;

const round = (n: number, digits = 3) => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

interface Spectra {
  frames: number;
  hop: number;
  sampleRate: number;
  mel: Float32Array; // frames x N_MELS power
  centers: Float32Array;
  rms: Float32Array;
}

const spectra = (channels: ArrayLike<number>[], sampleRate: number): Spectra => {
  const { samples, sampleRate: sr } = resample(mixToMono(channels), sampleRate);
  const hop = Math.max(1, Math.round(sr / FPS));
  const frames = Math.max(0, Math.floor(samples.length / hop) + 1);
  const fft = new RealFFT(FFT_SIZE);
  const bank = melBank(sr, FFT_SIZE, N_MELS, 25, 11000);
  const window = new Float32Array(FFT_SIZE);
  for (let i = 0; i < FFT_SIZE; i++) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / FFT_SIZE);
  const frame = new Float32Array(FFT_SIZE);
  const power = new Float32Array(FFT_SIZE / 2 + 1);
  const mel = new Float32Array(frames * N_MELS);
  const rms = new Float32Array(frames);
  const halfWin = FFT_SIZE / 2;

  for (let f = 0; f < frames; f++) {
    const start = f * hop - halfWin;
    let sq = 0;
    for (let i = 0; i < FFT_SIZE; i++) {
      const j = start + i;
      const v = j >= 0 && j < samples.length ? samples[j] : 0;
      sq += v * v;
      frame[i] = v * window[i];
    }
    rms[f] = Math.sqrt(sq / FFT_SIZE);
    fft.power(frame, power);
    const row = f * N_MELS;
    for (let m = 0; m < N_MELS; m++) {
      const { start: b0, weights } = bank.bands[m];
      let acc = 0;
      for (let k = 0; k < weights.length; k++) acc += power[b0 + k] * weights[k];
      mel[row + m] = acc;
    }
  }
  return { frames, hop, sampleRate: sr, mel, centers: bank.centers, rms };
};

/** Soft-mask HPSS on the mel power spectrogram. */
const hpss = (mel: Float32Array, frames: number) => {
  const harmMed = medianFilter(mel, frames, N_MELS, 31, true);
  const percMed = medianFilter(mel, frames, N_MELS, 9, false);
  const perc = new Float32Array(mel.length);
  const harm = new Float32Array(mel.length);
  for (let i = 0; i < mel.length; i++) {
    const h2 = harmMed[i] * harmMed[i];
    const p2 = percMed[i] * percMed[i];
    const mask = p2 / (h2 + p2 + 1e-20);
    perc[i] = mel[i] * mask;
    harm[i] = mel[i] * (1 - mask);
  }
  return { perc, harm };
};

const toDb = (power: Float32Array): Float32Array => {
  let max = 1e-10;
  for (let i = 0; i < power.length; i++) if (power[i] > max) max = power[i];
  const floor = 10 * Math.log10(max) - 80;
  const out = new Float32Array(power.length);
  for (let i = 0; i < power.length; i++) {
    out[i] = Math.max(floor, 10 * Math.log10(power[i] + 1e-10));
  }
  return out;
};

/** Mean positive log-mel flux over the bands in [lo, hi) Hz. */
const bandFlux = (
  db: Float32Array,
  frames: number,
  centers: Float32Array,
  lo: number,
  hi: number,
): Float32Array => {
  const bands: number[] = [];
  for (let m = 0; m < N_MELS; m++) if (centers[m] >= lo && centers[m] < hi) bands.push(m);
  const out = new Float32Array(frames);
  if (bands.length === 0) return out;
  for (let f = FLUX_LAG; f < frames; f++) {
    const row = f * N_MELS;
    const ref = (f - FLUX_LAG) * N_MELS;
    let acc = 0;
    for (const m of bands) {
      let r = db[ref + m];
      if (m > 0 && db[ref + m - 1] > r) r = db[ref + m - 1];
      if (m < N_MELS - 1 && db[ref + m + 1] > r) r = db[ref + m + 1];
      const d = db[row + m] - r;
      if (d > 0) acc += d;
    }
    out[f] = acc / bands.length;
  }
  return out;
};

/** Divide by the 99th percentile (of the non-zero part) and clip to 0..1. */
const normalise = (env: Float32Array): Float32Array => {
  const p = percentile(env, 99) || 1;
  const out = new Float32Array(env.length);
  for (let i = 0; i < env.length; i++) out[i] = Math.min(1, env[i] / p);
  return out;
};

const estimatePeriod = (
  env: Float32Array,
  tempoRange: [number, number],
  startBpm: number,
): number => {
  const n = env.length;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += env[i];
  mean /= Math.max(1, n);
  const x = Float32Array.from(env, (v) => v - mean);
  const minLag = Math.max(2, Math.floor((60 * FPS) / tempoRange[1]));
  const maxLag = Math.ceil((60 * FPS) / tempoRange[0]);
  const ac = new Float32Array(2 * maxLag + 2);
  for (let lag = 1; lag < ac.length && lag < n; lag++) {
    let acc = 0;
    for (let i = lag; i < n; i++) acc += x[i] * x[i - lag];
    ac[lag] = acc / (n - lag);
  }
  const score = (lag: number) => {
    const bpm = (60 * FPS) / lag;
    const prior = Math.exp(-0.5 * Math.log2(bpm / startBpm) ** 2);
    const double = ac[Math.min(ac.length - 1, Math.round(lag * 2))];
    return (ac[lag] + 0.5 * Math.max(0, double)) * prior;
  };
  let best = minLag;
  for (let lag = minLag; lag <= maxLag; lag++) if (score(lag) > score(best)) best = lag;
  const off =
    best > minLag && best < maxLag
      ? parabolicOffset(score(best - 1), score(best), score(best + 1))
      : 0;
  return best + off;
};

/** Envelope at a fractional frame, max over ±1 frame so a grid tolerates ±10 ms. */
const sampleNear = (env: Float32Array, f: number): number => {
  let best = 0;
  for (let d = -1; d <= 1; d++) {
    const x = f + d;
    const i = Math.floor(x);
    if (i < 0 || i >= env.length - 1) continue;
    const v = env[i] + (env[i + 1] - env[i]) * (x - i);
    if (v > best) best = v;
  }
  return best;
};

/** Mean envelope at the grid positions (frames) that fall inside the song. */
const gridScore = (env: Float32Array, positions: number[]): number => {
  let acc = 0;
  let count = 0;
  for (const f of positions) {
    if (f < 2 || f > env.length - 3) continue;
    acc += sampleNear(env, f);
    count++;
  }
  return count ? acc / count : 0;
};

const constantGrid = (n: number, period: number, offset: number): number[] => {
  const out: number[] = [];
  for (let f = offset; f < n - 1; f += period) out.push(f);
  return out;
};

/**
 * Constant-tempo grid: coarse tempo / phase search around the rough tempo,
 * then fine, then the phase is nudged onto the median kick attack.
 */
const fitConstantGrid = (
  env: Float32Array,
  roughPeriod: number,
  kicks: number[],
): { period: number; offset: number } => {
  const n = env.length;
  const score = (period: number, offset: number) => {
    let acc = 0;
    let count = 0;
    for (let f = offset; f < n - 3; f += period) {
      if (f < 2) continue;
      acc += sampleNear(env, f);
      count++;
    }
    return count ? acc / count : 0;
  };
  const bpm0 = (60 * FPS) / roughPeriod;
  let best = { s: -1, bpm: bpm0, off: 0 };
  for (let bpm = bpm0 * 0.96; bpm < bpm0 * 1.04; bpm += 0.02) {
    const period = (60 * FPS) / bpm;
    for (let off = 0; off < period; off += 0.4) {
      const s = score(period, off);
      if (s > best.s) best = { s, bpm, off };
    }
  }
  const coarse = best;
  for (let bpm = coarse.bpm - 0.02; bpm <= coarse.bpm + 0.02; bpm += 0.001) {
    const period = (60 * FPS) / bpm;
    for (let off = coarse.off - 1; off <= coarse.off + 1; off += 0.1) {
      const s = score(period, off);
      if (s > best.s) best = { s, bpm, off };
    }
  }
  const period = (60 * FPS) / best.bpm;
  let offset = best.off;
  const residuals = kicks
    .map((f) => f - (offset + Math.round((f - offset) / period) * period))
    .filter((r) => Math.abs(r) < 6)
    .sort((a, b) => a - b);
  if (residuals.length > 8) offset += residuals[residuals.length >> 1];
  offset -= period * Math.floor(offset / period);
  return { period, offset };
};

/**
 * Drift-following grid, for songs whose tempo wanders. Beat k keeps its integer
 * index; each window of 16 beats fits a local period (±1.5 % of its neighbour's)
 * and phase (±60 ms of the neighbour's extrapolation, so it never slips half a
 * beat). Tracking starts from the best-locked window and runs both ways;
 * overlapping predictions are blended with triangular weights.
 */
const trackGrid = (env: Float32Array, period0: number, offset0: number): number[] => {
  const win = 16;
  const hop = 4;
  const maxDp = 0.015;
  const maxDt = 6;
  const n = Math.floor((env.length - 1 - offset0) / period0) + 1;
  const starts: number[] = [];
  for (let s = 0; s < Math.max(1, n - win + 1); s += hop) starts.push(s);
  const centers = starts.map((s) => s + win / 2);

  type Fit = { s: number; period: number; t: number };
  const fit = (kc: number, tc: number, period: number, dp: number, dt: number): Fit => {
    let best: Fit = { s: -1, period, t: tc };
    const ks: number[] = [];
    for (let k = Math.floor(kc - win / 2); k < Math.floor(kc + win / 2); k++) ks.push(k - kc);
    const steps = dp > 0 ? 31 : 1;
    for (let i = 0; i < steps; i++) {
      const p = steps === 1 ? period : period * (1 - dp + (2 * dp * i) / (steps - 1));
      for (let d = -dt; d <= dt + 1e-9; d += 0.2) {
        const s = gridScore(env, ks.map((k) => tc + d + k * p));
        if (s > best.s) best = { s, period: p, t: tc + d };
      }
      if (dt === 0) break;
    }
    return best;
  };

  const sharp = centers.map((c) => fit(c, offset0 + c * period0, period0, 0, 0).s);
  let a = 0;
  for (let i = 1; i < sharp.length; i++) if (sharp[i] > sharp[a]) a = i;
  const fits = new Map<number, Fit>();
  fits.set(a, fit(centers[a], offset0 + centers[a] * period0, period0, maxDp, period0 / 2));
  for (const dir of [1, -1]) {
    let w = a;
    while (w + dir >= 0 && w + dir < starts.length) {
      const prev = fits.get(w)!;
      const next = w + dir;
      fits.set(next, fit(centers[next], prev.t + (centers[next] - centers[w]) * prev.period, prev.period, maxDp, maxDt));
      w = next;
    }
  }

  const num = new Float64Array(n);
  const den = new Float64Array(n);
  starts.forEach((s, w) => {
    const f = fits.get(w)!;
    for (let k = s; k < Math.min(n, s + win); k++) {
      const wt = (1 - Math.abs(k + 0.5 - centers[w]) / (win / 2 + 1)) * Math.max(f.s, 1e-3);
      num[k] += wt * (f.t + (k - centers[w]) * f.period);
      den[k] += wt;
    }
  });
  const beats: number[] = [];
  let lastKnown = -1;
  for (let k = 0; k < n; k++) {
    if (den[k] > 0) {
      beats.push(num[k] / den[k]);
      lastKnown = k;
    } else if (lastKnown >= 0) {
      const p = fits.get(starts.length - 1)!.period;
      beats.push(beats[lastKnown] + (k - lastKnown) * p);
    }
  }
  return beats.filter((f) => f >= 0 && f < env.length - 1);
};

/** Constant grid unless a tracked grid fits some 12 s window clearly better. */
const fitGrid = (env: Float32Array, roughPeriod: number, kicks: number[]) => {
  const { period, offset } = fitConstantGrid(env, roughPeriod, kicks);
  const constant = constantGrid(env.length, period, offset);
  const tracked = trackGrid(env, period, offset);
  const span = 12 * FPS;
  let gain = 0;
  for (let w0 = 0; w0 < env.length - span / 2; w0 += span) {
    const inWindow = (b: number[]) => b.filter((f) => f >= w0 && f < w0 + span);
    const c = gridScore(env, inWindow(constant));
    const t = gridScore(env, inWindow(tracked));
    gain = Math.max(gain, t / (c + 1e-9));
  }
  return gain > 1.08 ? { beats: tracked, mode: 'tracked' as const } : { beats: constant, mode: 'constant' as const };
};

const valueNear = (env: Float32Array, frame: number, radius: number) => {
  const i = Math.round(frame);
  let peak = 0;
  for (let k = Math.max(0, i - radius); k <= Math.min(env.length - 1, i + radius); k++) {
    if (env[k] > peak) peak = env[k];
  }
  return peak;
};

/** Cosine distance between mean harmonic spectra before and after each beat. */
const harmonicChange = (harmDb: Float32Array, frames: number, beats: number[]): number[] => {
  const meanVec = (from: number, to: number) => {
    const v = new Float64Array(N_MELS);
    const a = Math.max(0, Math.round(from));
    const b = Math.min(frames, Math.round(to));
    for (let f = a; f < b; f++) for (let m = 0; m < N_MELS; m++) v[m] += harmDb[f * N_MELS + m] + 80;
    return v;
  };
  return beats.map((t, i) => {
    const prev = beats[Math.max(0, i - 2)];
    const next = beats[Math.min(beats.length - 1, i + 2)];
    if (prev >= t || next <= t) return 0;
    const a = meanVec(prev, t);
    const b = meanVec(t, next);
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let m = 0; m < N_MELS; m++) {
      dot += a[m] * b[m];
      na += a[m] * a[m];
      nb += b[m] * b[m];
    }
    return na > 0 && nb > 0 ? 1 - dot / Math.sqrt(na * nb) : 0;
  });
};

const barPhase = (
  beats: number[],
  beatsPerBar: number,
  kick: Float32Array,
  snare: Float32Array,
  change: number[],
): number => {
  const k = beats.map((f) => valueNear(kick, f, 4));
  const s = beats.map((f) => valueNear(snare, f, 4));
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  const scale = (xs: number[]) => {
    const m = avg(xs);
    return m > 0 ? xs.map((x) => x / m) : xs.map(() => 0);
  };
  const kn = scale(k);
  const sn = scale(s);
  const cn = scale(change);
  const at = (xs: number[], phase: number, pos: number) =>
    avg(xs.filter((_, i) => (((i - phase) % beatsPerBar) + beatsPerBar) % beatsPerBar === pos));

  let best = 0;
  let bestScore = -Infinity;
  for (let phase = 0; phase < beatsPerBar; phase++) {
    let score = at(kn, phase, 0) - avg(kn) + 1.5 * (at(cn, phase, 0) - avg(cn));
    if (beatsPerBar === 4) {
      score += 0.5 * (at(sn, phase, 1) + at(sn, phase, 3)) - 0.5 * (at(sn, phase, 0) + at(sn, phase, 2));
    }
    if (score > bestScore) {
      bestScore = score;
      best = phase;
    }
  }
  return best;
};

/** Peak-pick an onset envelope (0..1) into [frame, strength] pairs at the attack. */
const pickOnsets = (
  env: Float32Array,
  options: { delta: number; wait: number; minStrength: number },
): [number, number][] => {
  const out: [number, number][] = [];
  let last = -Infinity;
  for (let i = 1; i < env.length - 1; i++) {
    const v = env[i];
    if (v < options.minStrength) continue;
    let isMax = true;
    for (let k = Math.max(0, i - 3); k <= Math.min(env.length - 1, i + 3); k++) {
      if (env[k] > v || (env[k] === v && k < i)) {
        isMax = false;
        break;
      }
    }
    if (!isMax) continue;
    let mean = 0;
    let count = 0;
    for (let k = Math.max(0, i - 10); k <= Math.min(env.length - 1, i + 3); k++) {
      mean += env[k];
      count++;
    }
    if (v < mean / count + options.delta) continue;
    if (i - last < options.wait) {
      if (out.length && v > out[out.length - 1][1]) {
        out[out.length - 1] = [i + parabolicOffset(env[i - 1], v, env[i + 1]), v];
        last = i;
      }
      continue;
    }
    out.push([i + parabolicOffset(env[i - 1], v, env[i + 1]), v]);
    last = i;
  }
  return out;
};

const smoothEnergy = (rms: Float32Array): Float32Array => {
  const attack = 1 - Math.exp(-1 / (0.01 * FPS));
  const release = 1 - Math.exp(-1 / (0.09 * FPS));
  const out = new Float32Array(rms.length);
  let y = 0;
  for (let i = 0; i < rms.length; i++) {
    const x = rms[i];
    y += (x > y ? attack : release) * (x - y);
    out[i] = y;
  }
  return normalise(out);
};

/**
 * Analysis steps. Each `yield` is a progress label, so a caller can let the UI
 * paint between steps; the return value is the beatmap.
 */
export function* analyzeBeatmapSteps(
  channels: ArrayLike<number>[],
  sampleRate: number,
  options: AnalyzeBeatmapOptions = {},
): Generator<string, Beatmap, void> {
  const beatsPerBar = Math.max(2, Math.round(options.beatsPerBar ?? 4));
  const tempoRange = options.tempoRange ?? [60, 200];
  const startBpm = options.startBpm ?? 120;
  const duration = channels[0] && sampleRate > 0 ? channels[0].length / sampleRate : 0;
  const empty: Beatmap = {
    version: 1,
    src: options.src,
    source: options.source,
    duration: round(duration),
    bpm: 0,
    beatsPerBar,
    beats: [],
    beatStrength: [],
    downbeats: [],
    onsets: { kick: [], snare: [], hat: [], accent: [] },
  };
  if (!(sampleRate > 0) || duration < 0.5) return empty;

  yield 'Computing spectrogram…';
  const spec = spectra(channels, sampleRate);
  const { frames, centers } = spec;
  const toSec = (frame: number) => (frame * spec.hop) / spec.sampleRate;

  yield 'Separating drums from harmony…';
  const { perc, harm } = hpss(spec.mel, frames);

  yield 'Measuring attacks…';
  const percDb = toDb(perc);
  const fullDb = toDb(spec.mel);
  const harmDb = toDb(harm);
  const kickRaw = bandFlux(percDb, frames, centers, 0, 150);
  const snareRaw = bandFlux(percDb, frames, centers, 1500, 5000);
  const hatRaw = bandFlux(percDb, frames, centers, 7000, 1e9);
  const percRaw = bandFlux(percDb, frames, centers, 0, 1e9);
  const fullRaw = bandFlux(fullDb, frames, centers, 0, 1e9);
  const energy = smoothEnergy(spec.rms);
  let peakRms = 0;
  for (let i = 0; i < frames; i++) peakRms = Math.max(peakRms, spec.rms[i]);
  if (peakRms < 1e-4) return empty;

  const clickRaw = bandFlux(percDb, frames, centers, 1000, 8000);
  const kickGeo = new Float32Array(frames);
  {
    const lowN = normalise(kickRaw);
    const clickN = normalise(clickRaw);
    for (let i = 0; i < frames; i++) kickGeo[i] = Math.sqrt(lowN[i] * clickN[i]);
  }
  const kick = normalise(kickGeo);
  const snare = normalise(snareRaw);
  const hat = normalise(hatRaw);
  const track = new Float32Array(frames);
  const accentEnv = new Float32Array(frames);
  const percN = normalise(percRaw);
  const fullN = normalise(fullRaw);
  for (let i = 0; i < frames; i++) {
    track[i] = percN[i] + fullN[i];
    accentEnv[i] = (0.5 * percN[i] + 0.3 * fullN[i] + 0.2 * kick[i]) * (0.35 + 0.65 * energy[i]);
  }

  yield 'Finding the tempo…';
  const period = estimatePeriod(track, tempoRange, startBpm);

  yield 'Fitting the beat grid…';
  const kickFrames = pickOnsets(kick, { delta: 0.1, wait: 20, minStrength: 0.2 }).map(([f]) => f);
  const { beats: beatFrames } = fitGrid(track, period, kickFrames);
  const strengthRaw = beatFrames.map((f) => valueNear(track, f, 3));
  const strengthTop = percentile(strengthRaw, 95) || 1;

  yield 'Finding downbeats…';
  const change = harmonicChange(harmDb, frames, beatFrames);
  const phase = barPhase(beatFrames, beatsPerBar, kick, snare, change);

  yield 'Picking hits…';
  const kicks = pickOnsets(kick, { delta: 0.06, wait: 8, minStrength: 0.08 });
  const snares = pickOnsets(snare, { delta: 0.06, wait: 8, minStrength: 0.08 });
  const drumFrames = [...kicks, ...snares].map(([f]) => f).sort((a, b) => a - b);
  const nearDrum = (f: number) => {
    let lo = 0;
    let hi = drumFrames.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (Math.abs(drumFrames[mid] - f) <= 3) return true;
      if (drumFrames[mid] < f) lo = mid + 1;
      else hi = mid - 1;
    }
    return false;
  };
  const hats = pickOnsets(hat, { delta: 0.05, wait: 5, minStrength: 0.08 }).filter(([f]) => !nearDrum(f));
  const accents = pickOnsets(normalise(accentEnv), { delta: 0.08, wait: 10, minStrength: 0.1 });

  const hits = (list: [number, number][]): BeatmapHit[] =>
    list.map(([f, s]) => [round(Math.max(0, toSec(f) + ATTACK_DELAY)), round(s, 2)]);
  const beatTimes = beatFrames.map((f) => round(Math.max(0, toSec(f) + ATTACK_DELAY)));
  const bpm =
    beatTimes.length > 1
      ? (60 * (beatTimes.length - 1)) / (beatTimes[beatTimes.length - 1] - beatTimes[0])
      : (60 * FPS) / period;

  const energyFps = 20;
  const step = FPS / energyFps;
  const energyValues: number[] = [];
  for (let i = 0; i < frames; i += step) {
    let acc = 0;
    let count = 0;
    for (let k = Math.floor(i); k < Math.min(frames, Math.floor(i + step)); k++) {
      acc += energy[k];
      count++;
    }
    energyValues.push(round(count ? acc / count : 0, 2));
  }

  const onsets: Beatmap['onsets'] = {};
  const byKind: Record<(typeof BEATMAP_ONSET_KINDS)[number], [number, number][]> = {
    kick: kicks,
    snare: snares,
    hat: hats,
    accent: accents,
  };
  for (const kind of BEATMAP_ONSET_KINDS) onsets[kind] = hits(byKind[kind]);

  return {
    version: 1,
    src: options.src,
    source: options.source,
    duration: round(duration),
    bpm: round(bpm, 2),
    beatsPerBar,
    beats: beatTimes,
    beatStrength: strengthRaw.map((s) => round(Math.min(1, s / strengthTop), 2)),
    downbeats: beatTimes.filter((_, i) => (i - phase) % beatsPerBar === 0 && i >= phase),
    onsets,
    energy: { fps: energyFps, values: energyValues },
  };
}

/** Synchronous analysis. Used inside renders, where nothing needs to paint. */
export const analyzeBeatmap = (
  channels: ArrayLike<number>[],
  sampleRate: number,
  options: AnalyzeBeatmapOptions = {},
): Beatmap => {
  const steps = analyzeBeatmapSteps(channels, sampleRate, options);
  for (;;) {
    const next = steps.next();
    if (next.done) return next.value;
  }
};

/** Same analysis, yielding to the event loop between steps so progress can paint. */
export const analyzeBeatmapAsync = async (
  channels: ArrayLike<number>[],
  sampleRate: number,
  options: AnalyzeBeatmapOptions & { onProgress?: (label: string) => void } = {},
): Promise<Beatmap> => {
  const steps = analyzeBeatmapSteps(channels, sampleRate, options);
  for (;;) {
    const next = steps.next();
    if (next.done) return next.value;
    options.onProgress?.(next.value as string);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};
