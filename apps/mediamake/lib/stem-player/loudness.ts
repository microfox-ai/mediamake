import type { MeasuredLevels } from './types';

/*
 * Loudness of decoded audio, measured in the browser so a ladder can be compared without a
 * sidecar: ITU-R BS.1770-4 integrated loudness (K-weighting = a high shelf at 1.5 kHz and a
 * high-pass at 38 Hz, 400 ms blocks every 100 ms, gated at -70 LUFS absolute and -10 LU relative),
 * plus the sample peak and a waveform of peaks for the timeline. The same method pyloudnorm uses
 * in the remaster skill's measure.py, so the numbers agree to about 0.1 LU.
 */

interface Biquad {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

/** RBJ cookbook coefficients, normalised by a0. */
function coefficients(type: 'high-shelf' | 'high-pass', rate: number, fc: number, q: number, gainDb: number): Biquad {
  const A = 10 ** (gainDb / 40);
  const w0 = (2 * Math.PI * fc) / rate;
  const cos = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * q);
  let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;
  if (type === 'high-shelf') {
    const s = 2 * Math.sqrt(A) * alpha;
    b0 = A * (A + 1 + (A - 1) * cos + s);
    b1 = -2 * A * (A - 1 + (A + 1) * cos);
    b2 = A * (A + 1 + (A - 1) * cos - s);
    a0 = A + 1 - (A - 1) * cos + s;
    a1 = 2 * (A - 1 - (A + 1) * cos);
    a2 = A + 1 - (A - 1) * cos - s;
  } else {
    b0 = (1 + cos) / 2;
    b1 = -(1 + cos);
    b2 = (1 + cos) / 2;
    a0 = 1 + alpha;
    a1 = -2 * cos;
    a2 = 1 - alpha;
  }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

/** Direct form II transposed, in place. */
function filter(x: Float32Array, c: Biquad) {
  let z1 = 0;
  let z2 = 0;
  for (let i = 0; i < x.length; i++) {
    const input = x[i];
    const out = c.b0 * input + z1;
    z1 = c.b1 * input - c.a1 * out + z2;
    z2 = c.b2 * input - c.a2 * out;
    x[i] = out;
  }
}

/** Integrated loudness and sample peak of a decoded buffer. */
export function measureLoudness(buffer: AudioBuffer): MeasuredLevels {
  const rate = buffer.sampleRate;
  const shelf = coefficients('high-shelf', rate, 1500, 1 / Math.SQRT2, 4);
  const highPass = coefficients('high-pass', rate, 38, 0.5, 0);
  const hop = Math.round(rate * 0.1);
  const hops = Math.floor(buffer.length / hop);
  // mean square of each 100 ms hop, summed over channels (surround channels would weigh 1.41; stereo and mono weigh 1)
  const hopPower = new Float64Array(hops);
  let peak = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const raw = buffer.getChannelData(ch);
    for (let i = 0; i < raw.length; i++) {
      const a = Math.abs(raw[i]);
      if (a > peak) peak = a;
    }
    const x = new Float32Array(raw);
    filter(x, shelf);
    filter(x, highPass);
    for (let h = 0; h < hops; h++) {
      let sum = 0;
      const from = h * hop;
      for (let i = from; i < from + hop; i++) sum += x[i] * x[i];
      hopPower[h] += sum / hop;
    }
  }
  // 400 ms blocks every 100 ms
  const blocks: number[] = [];
  for (let h = 0; h + 4 <= hops; h++) blocks.push((hopPower[h] + hopPower[h + 1] + hopPower[h + 2] + hopPower[h + 3]) / 4);
  const loudness = (z: number) => -0.691 + 10 * Math.log10(z);
  const mean = (zs: number[]) => zs.reduce((a, b) => a + b, 0) / zs.length;
  const absGated = blocks.filter(z => loudness(z) > -70);
  if (!absGated.length) return { lufs: -Infinity, peak: peak > 0 ? 20 * Math.log10(peak) : -Infinity };
  const relative = loudness(mean(absGated)) - 10;
  const gated = absGated.filter(z => loudness(z) > relative);
  return { lufs: loudness(mean(gated.length ? gated : absGated)), peak: peak > 0 ? 20 * Math.log10(peak) : -Infinity };
}

/** The biggest sample in each of `n` slices of the song, 0–1, for drawing the waveform. */
export function waveformPeaks(buffer: AudioBuffer, n: number): Float32Array {
  const peaks = new Float32Array(n);
  const per = buffer.length / n;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let b = 0; b < n; b++) {
      const from = Math.floor(b * per);
      const to = Math.min(data.length, Math.floor((b + 1) * per));
      let max = peaks[b];
      for (let i = from; i < to; i++) {
        const a = Math.abs(data[i]);
        if (a > max) max = a;
      }
      peaks[b] = max;
    }
  }
  return peaks;
}

/** 10 ** (dB / 20): a gain from decibels. */
export const dbToGain = (db: number) => 10 ** (db / 20);
