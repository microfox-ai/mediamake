/**
 * Impact ranges for the browser shake action.
 *
 * This does not use the phrase roles (intro, pocket, one chorus, landing).
 * A hit is a stretch that gets louder and busier than the section before it
 * and stays that way. A later chorus can be its own hit even when an earlier
 * one was quieter. The shake ends when the loudness or the attacks fall back.
 *
 * Amplitude is pixels (about 2–4). Frequency follows how busy the hit is
 * (2, 2.5, or 3 on Remotion's frame clock).
 */

import type { PhraseAnalysisFrame, PhraseShake } from "./shake-phrase";

const BIN = 0.5;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function percentile(values: number[], p: number) {
  const sorted = values.filter((value) => value > 0.02).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))] ?? 0;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

export function buildImpactShakes(args: {
  frames: PhraseAnalysisFrame[];
  duration: number;
  minRange: number;
  beatDetection: number;
}): PhraseShake[] {
  const duration = Math.max(0, args.duration);
  if (args.beatDetection <= 0 || duration < 1 || !args.frames.length) return [];

  const binCount = Math.max(1, Math.ceil(duration / BIN));
  const sums = Array.from({ length: binCount }, () => ({ rms: 0, flux: 0, n: 0 }));
  for (const frame of args.frames) {
    if (!Number.isFinite(frame.timestamp)) continue;
    const index = Math.min(binCount - 1, Math.max(0, Math.floor(frame.timestamp / BIN)));
    sums[index].rms += frame.rms ?? frame.intensity ?? 0;
    sums[index].flux += frame.spectralFlux ?? 0;
    sums[index].n += 1;
  }
  const rawRms = sums.map((bin) => (bin.n ? bin.rms / bin.n : 0));
  const rawFlux = sums.map((bin) => (bin.n ? bin.flux / bin.n : 0));
  const smooth = (values: number[], half: number) =>
    values.map((_, index) => {
      let sum = 0;
      let count = 0;
      for (let k = Math.max(0, index - half); k <= Math.min(values.length - 1, index + half); k++) {
        sum += values[k];
        count += 1;
      }
      return sum / Math.max(count, 1);
    });
  const rms = smooth(rawRms, 3);
  const flux = smooth(rawFlux, 3);

  const floor = percentile(rms, 0.4);
  const loudCut = percentile(rms, 0.84);
  const loudFlux = percentile(flux, 0.72);
  // 0.5 → about a 22% rise over the previous 15s. Higher detection catches smaller hits.
  const riseFactor = clamp(1.38 - clamp(args.beatDetection, 0, 1) * 0.28, 1.1, 1.4);
  const minSeconds = Math.max(6, Math.min(args.minRange, 8));

  const on = new Array(binCount).fill(false);
  let active = false;
  let frozen = 0;
  let entryFlux = 0;
  let heldFlux = 0;
  let hotRun = 0;
  let coolRun = 0;

  for (let i = 0; i < binCount; i++) {
    const from = Math.max(0, i - 36);
    const to = Math.max(0, i - 6);
    const base = median(rms.slice(from, to));
    const fluxBase = median(flux.slice(from, to));
    if (!active) {
      const rise =
        to - from >= 8 &&
        rms[i] > Math.max(floor, base * riseFactor) &&
        flux[i] > fluxBase * 1.1;
      const top = rms[i] >= loudCut && flux[i] >= loudFlux;
      hotRun = rise || top ? hotRun + 1 : 0;
      if (hotRun >= 4) {
        active = true;
        const byTop = rms[i] >= loudCut;
        frozen = byTop ? loudCut * 0.72 : base;
        entryFlux = byTop ? loudFlux * 0.7 : fluxBase;
        heldFlux = flux[i];
        let back = i - 3;
        for (let k = i - 4; k >= Math.max(0, i - 8); k--) {
          if (rms[k] < rms[Math.max(0, back)] * 0.82) break;
          back = k;
        }
        for (let k = Math.max(0, back); k <= i; k++) on[k] = true;
        coolRun = 0;
      }
    } else {
      heldFlux = Math.max(heldFlux, flux[i]);
      const hold =
        rms[i] > Math.max(frozen * 0.98, floor) &&
        flux[i] > Math.max(entryFlux * 0.85, heldFlux * 0.62);
      if (hold) {
        coolRun = 0;
        on[i] = true;
      } else {
        coolRun += 1;
        if (coolRun <= 3) on[i] = true;
        else {
          active = false;
          hotRun = 0;
          for (let k = 1; k <= 3; k++) if (i - k >= 0) on[i - k] = false;
        }
      }
    }
  }

  const regions: Array<{ start: number; end: number }> = [];
  let start: number | null = null;
  for (let i = 0; i <= binCount; i++) {
    if (i < binCount && on[i]) {
      if (start == null) start = i;
    } else if (start != null) {
      let end = i;
      const peak = Math.max(...rms.slice(start, end), 0);
      while (end - start > 4 && rms[end - 1] < peak * 0.72) end -= 1;
      if ((end - start) * BIN >= minSeconds) {
        regions.push({ start: start * BIN, end: Math.min(duration, end * BIN) });
      }
      start = null;
    }
  }

  if (!regions.length) return [];
  const stats = regions.map((region) => {
    const a = Math.max(0, Math.floor(region.start / BIN));
    const b = Math.min(binCount, Math.ceil(region.end / BIN));
    const sliceR = rms.slice(a, b);
    const sliceF = flux.slice(a, b);
    const mean = (values: number[]) =>
      values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
    return { ...region, rms: mean(sliceR), flux: mean(sliceF) };
  });
  const maxRms = Math.max(...stats.map((region) => region.rms), 0.0001);
  const maxFlux = Math.max(...stats.map((region) => region.flux), 0.0001);

  return stats.map((region) => {
    const energy = region.rms / maxRms;
    const motion = region.flux / maxFlux;
    const amplitude = energy > 0.9 ? 4 : energy > 0.75 ? 3 : energy > 0.6 ? 2.5 : 2;
    const frequency = motion > 0.85 ? 3 : motion > 0.65 ? 2.5 : 2;
    return {
      start: region.start,
      end: region.end,
      amplitude,
      frequency,
      role: "impact",
    };
  });
}
