/**
 * Intelligent shake ranges.
 *
 * No intro, chorus, or landing. A range starts wherever the beat changes
 * and holds — at the top of the file, in the middle, or at the end.
 * Amplitude is how hard those beats hit. Frequency is how fast they come.
 * A hanging melody with almost no pulse sits near 0.05–0.1 so the picture
 * drifts instead of vibrating.
 *
 * Remotion: time = frame * frequency, offset = sin/cos(time) * amplitude px.
 * At 30fps, 0.05 is about a 4s sway and 3 is a fast vibrate.
 */

import type { PhraseAnalysisFrame, PhraseShake } from "./shake-phrase";

const BIN = 0.5;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function percentile(values: number[], p: number) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))] ?? 0;
}

export function buildIntelligentShakes(args: {
  frames: PhraseAnalysisFrame[];
  duration: number;
  minRange: number;
  beatDetection: number;
}): PhraseShake[] {
  const duration = Math.max(0, args.duration);
  if (args.beatDetection <= 0 || duration < 1 || !args.frames.length) return [];

  const frames = [...args.frames].sort((a, b) => a.timestamp - b.timestamp);
  const binCount = Math.max(1, Math.ceil(duration / BIN));
  const rmsBins = new Array(binCount).fill(0);
  const fluxBins = new Array(binCount).fill(0);
  const counts = new Array(binCount).fill(0);
  for (const frame of frames) {
    if (!Number.isFinite(frame.timestamp)) continue;
    const index = Math.min(binCount - 1, Math.max(0, Math.floor(frame.timestamp / BIN)));
    rmsBins[index] += frame.rms ?? frame.intensity ?? 0;
    fluxBins[index] += frame.spectralFlux ?? 0;
    counts[index] += 1;
  }
  for (let i = 0; i < binCount; i++) {
    if (!counts[i]) continue;
    rmsBins[i] /= counts[i];
    fluxBins[i] /= counts[i];
  }

  const fluxValues = frames.map((frame) => frame.spectralFlux ?? 0);
  const fluxGate = percentile(fluxValues.filter((value) => value > 0), 0.72);
  const onsetTimes: number[] = [];
  const onsetFlux: number[] = [];
  let lastOnset = -1;
  for (let i = 2; i < frames.length - 2; i++) {
    const flux = fluxValues[i];
    if (flux < fluxValues[i - 1] || flux < fluxValues[i + 1]) continue;
    if (flux < fluxValues[i - 2] || flux < fluxValues[i + 2]) continue;
    const time = frames[i].timestamp;
    if (lastOnset >= 0 && time - lastOnset < 0.32) continue;
    const neighbor = fluxValues.slice(Math.max(0, i - 6), Math.min(frames.length, i + 7));
    const bass = frames[i].bassRatio ?? 0;
    const kicked = bass >= 0.4 && flux >= median(neighbor) * 1.25;
    const strong = flux >= Math.max(fluxGate, median(neighbor) * 1.8);
    if (!kicked && !strong) continue;
    onsetTimes.push(time);
    onsetFlux.push(flux);
    lastOnset = time;
  }

  const rateBins = rmsBins.map((_, index) => {
    const t = index * BIN;
    let hits = 0;
    for (const time of onsetTimes) {
      if (time >= t - 2 && time < t + 2) hits += 1;
    }
    return hits / 4;
  });

  const smooth = (values: number[], half: number) =>
    values.map((_, index) => {
      let sum = 0;
      let n = 0;
      for (let k = Math.max(0, index - half); k <= Math.min(values.length - 1, index + half); k++) {
        sum += values[k];
        n += 1;
      }
      return sum / Math.max(n, 1);
    });
  const rate = smooth(rateBins, 2);
  const strength = smooth(rmsBins, 2);
  const attack = smooth(fluxBins, 2);

  const z = (values: number[]) => {
    const mean = values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
    const sd =
      Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(values.length, 1)) ||
      1;
    return values.map((value) => (value - mean) / sd);
  };
  const zRate = z(rate);
  const zStrength = z(strength);
  const zAttack = z(attack);
  const window = Math.max(4, Math.min(8, Math.floor(binCount / 8)));
  const score = new Array(binCount).fill(0);
  for (let i = window; i < binCount - window; i++) {
    const left = { rate: 0, strength: 0, attack: 0 };
    const right = { rate: 0, strength: 0, attack: 0 };
    for (let k = i - window; k < i; k++) {
      left.rate += zRate[k];
      left.strength += zStrength[k];
      left.attack += zAttack[k];
    }
    for (let k = i; k < i + window; k++) {
      right.rate += zRate[k];
      right.strength += zStrength[k];
      right.attack += zAttack[k];
    }
    const n = window;
    score[i] = Math.hypot(
      right.rate / n - left.rate / n,
      right.strength / n - left.strength / n,
      (right.attack / n - left.attack / n) * 0.8,
    );
  }

  const detection = clamp(args.beatDetection, 0, 1);
  const minSepSec = clamp(args.minRange * (1.15 - detection * 0.7), 4, 14);
  const minSep = Math.max(2, Math.round(minSepSec / BIN));
  const scoreCut = percentile(score.filter((value) => value > 0), clamp(0.82 - detection * 0.35, 0.4, 0.9));
  const peaks: Array<{ index: number; score: number }> = [];
  for (let i = 2; i < binCount - 2; i++) {
    if (score[i] < scoreCut) continue;
    if (score[i] < score[i - 1] || score[i] < score[i + 1]) continue;
    if (score[i] < score[i - 2] || score[i] < score[i + 2]) continue;
    peaks.push({ index: i, score: score[i] });
  }
  peaks.sort((a, b) => b.score - a.score);
  const kept: number[] = [];
  for (const peak of peaks) {
    if (kept.every((index) => Math.abs(index - peak.index) >= minSep)) kept.push(peak.index);
  }
  kept.sort((a, b) => a - b);

  const bounds = [0, ...kept, binCount];
  const musicRms = percentile(strength.filter((value) => value > 0), 0.55) || 0.01;
  const trackPeakFlux = percentile(onsetFlux, 0.9) || 0.0001;
  const regions: Array<{ start: number; end: number; bps: number; gap: number; strength01: number; attack01: number }> = [];

  for (let i = 0; i < bounds.length - 1; i++) {
    const start = bounds[i] * BIN;
    const end = Math.min(duration, bounds[i + 1] * BIN);
    if (end - start < 0.75) continue;
    const slice = strength.slice(bounds[i], bounds[i + 1]);
    const meanRms = slice.reduce((sum, value) => sum + value, 0) / Math.max(slice.length, 1);
    if (meanRms < musicRms * 0.28) continue;

    const hits = onsetTimes
      .map((time, index) => ({ time, flux: onsetFlux[index] }))
      .filter((hit) => hit.time >= start && hit.time < end);
    const gaps: number[] = [];
    for (let h = 1; h < hits.length; h++) gaps.push(hits[h].time - hits[h - 1].time);
    const gap = hits.length >= 2 ? median(gaps) : end - start;
    const bps = hits.length / Math.max(end - start, 0.001);
    const hitFlux = hits.length ? median(hits.map((hit) => hit.flux)) : 0;
    const attackSlice = attack.slice(bounds[i], bounds[i + 1]);
    const meanAttack =
      attackSlice.reduce((sum, value) => sum + value, 0) / Math.max(attackSlice.length, 1);
    regions.push({
      start,
      end,
      bps,
      gap,
      strength01: clamp(hitFlux / trackPeakFlux, 0, 1),
      attack01: clamp(meanAttack / (percentile(attack, 0.9) || 1), 0, 1),
    });
  }

  return regions.map((region) => {
    // Frequency follows the beat rate. A regular pulse maps about 1:1
    // (1.6 beats/sec → 1.6). When the pulse thins out, it sags toward 0.05
    // so a hanging melody drifts instead of ticking.
    const draggy = region.bps < 1.2;
    const frequency = draggy
      ? clamp(0.05 + (region.bps / 1.2) ** 2 * 1.15, 0.05, 1.2)
      : clamp(region.bps, 1.2, 3);
    const amplitude = clamp(0.4 + region.strength01 * 3.6, 0.4, 4);
    return {
      start: region.start,
      end: region.end,
      amplitude: round2(amplitude),
      frequency: round2(frequency),
      role: draggy ? "drift" : "beat",
    };
  });
}
