/**
 * Phrase shakes for the browser action.
 *
 * Remotion shake (`packages/remotion` ShakeEffect):
 *   time = frame * frequency
 *   offset = sin/cos(time) * amplitude   // amplitude is pixels
 * At 30fps, frequency 0.1 is about a 2s sway and 3 is a fast vibrate.
 * Amplitude here stays in the 1–4 pixel range used by the imageloop field.
 * Decay stays off and the axis stays both, matching a sustained groove.
 *
 * Cuts follow sustained changes in bass weight, brightness, and spectral
 * flux — not raw loudness. A breakdown that loses its attacks and then
 * comes back is left empty. The fade-out is left empty too.
 */

export type PhraseAnalysisFrame = {
  timestamp: number;
  intensity: number;
  rms?: number;
  bassRatio?: number;
  spectralFlux?: number;
  zeroCrossingRate?: number;
  spectralCentroid?: number;
};

export type PhraseShake = {
  start: number;
  end: number;
  amplitude: number;
  frequency: number;
  role: string;
};

/** Four readings of the same phrase cuts. */
export type PhraseStyle = "phrases" | "pulse" | "drift";

type Bin = {
  rms: number;
  zcr: number;
  bass: number;
  centroid: number;
  flux: number;
  n: number;
};

type Section = {
  start: number;
  end: number;
  rms: number;
  zcr: number;
  bass: number;
  flux: number;
  centroid: number;
};

const BIN = 0.5;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))] ?? 0;
}

function targetCount(duration: number, minRange: number, beatDetection: number) {
  const d = clamp(beatDetection, 0, 1);
  const maxRanges = Math.max(1, Math.floor(duration / Math.max(minRange, 0.5)));
  const minRanges = Math.max(1, Math.round(duration / (Math.max(minRange, 0.5) * 3)));
  return Math.max(1, Math.min(maxRanges, Math.round(minRanges + d * (maxRanges - minRanges))));
}

export function buildPhraseShakes(args: {
  frames: PhraseAnalysisFrame[];
  duration: number;
  minRange: number;
  beatDetection: number;
  style?: PhraseStyle;
}): PhraseShake[] {
  const style: PhraseStyle = args.style ?? "phrases";
  const duration = Math.max(0, args.duration);
  if (args.beatDetection <= 0 || duration < 0.5 || !args.frames.length) return [];

  const binCount = Math.max(1, Math.ceil(duration / BIN));
  const bins: Bin[] = Array.from({ length: binCount }, () => ({
    rms: 0,
    zcr: 0,
    bass: 0,
    centroid: 0,
    flux: 0,
    n: 0,
  }));

  for (const frame of args.frames) {
    if (!Number.isFinite(frame.timestamp)) continue;
    const index = Math.min(binCount - 1, Math.max(0, Math.floor(frame.timestamp / BIN)));
    const bin = bins[index];
    bin.rms += frame.rms ?? frame.intensity ?? 0;
    bin.zcr += frame.zeroCrossingRate ?? 0;
    bin.bass += frame.bassRatio ?? 0;
    bin.centroid += frame.spectralCentroid ?? 0;
    bin.flux += frame.spectralFlux ?? 0;
    bin.n += 1;
  }
  for (const bin of bins) {
    if (!bin.n) continue;
    bin.rms /= bin.n;
    bin.zcr /= bin.n;
    bin.bass /= bin.n;
    bin.centroid /= bin.n;
    bin.flux /= bin.n;
  }

  const smooth = (key: keyof Omit<Bin, "n">, half: number) =>
    bins.map((_, index) => {
      let sum = 0;
      let count = 0;
      for (let k = Math.max(0, index - half); k <= Math.min(bins.length - 1, index + half); k++) {
        sum += bins[k][key];
        count += 1;
      }
      return sum / Math.max(count, 1);
    });

  const series = {
    rms: smooth("rms", 2),
    zcr: smooth("zcr", 2),
    bass: smooth("bass", 3),
    centroid: smooth("centroid", 2),
    flux: smooth("flux", 2),
  };
  const keys = ["rms", "zcr", "bass", "centroid", "flux"] as const;
  const z = Object.fromEntries(
    keys.map((key) => {
      const values = series[key];
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      const sd =
        Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length) || 1;
      return [key, values.map((value) => (value - mean) / sd)];
    }),
  ) as Record<(typeof keys)[number], number[]>;

  const vectorAt = (index: number) => keys.map((key) => z[key][index]);
  const meanVector = (from: number, to: number) => {
    const out = new Array(keys.length).fill(0);
    const count = Math.max(1, to - from);
    for (let i = from; i < to; i++) {
      const vector = vectorAt(i);
      for (let d = 0; d < out.length; d++) out[d] += vector[d];
    }
    return out.map((value) => value / count);
  };
  const distance = (a: number[], b: number[]) => {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
    return Math.sqrt(sum);
  };
  const meanKey = (key: (typeof keys)[number], from: number, to: number) => {
    let sum = 0;
    const count = Math.max(1, to - from);
    for (let i = from; i < to; i++) sum += series[key][i] || 0;
    return sum / count;
  };

  const window = Math.max(4, Math.min(8, Math.floor(binCount / 6)));
  const score = new Array(binCount).fill(0);
  for (let i = window; i < binCount - window; i++) {
    const shift = distance(meanVector(i - window, i), meanVector(i, i + window));
    let persist = 1;
    if (i + 2 * window < binCount) {
      const far = meanVector(i + window, Math.min(binCount, i + 2 * window));
      const toFar = distance(meanVector(i - window, i), far);
      const stay = distance(meanVector(i, i + window), far);
      persist = toFar / (toFar + stay + 1e-6);
    }
    score[i] = shift * persist;
  }

  const minSep = Math.max(6, args.minRange * 0.7) / BIN;
  const peaks: Array<{ i: number; s: number }> = [];
  for (let i = 2; i < score.length - 2; i++) {
    if (score[i] < 0.55) continue;
    if (
      score[i] >= score[i - 1] &&
      score[i] >= score[i + 1] &&
      score[i] >= score[i - 2] &&
      score[i] >= score[i + 2]
    ) {
      peaks.push({ i, s: score[i] });
    }
  }
  peaks.sort((a, b) => b.s - a.s);
  const kept: Array<{ i: number; s: number }> = [];
  const target = targetCount(duration, args.minRange, args.beatDetection);
  for (const peak of peaks) {
    if (kept.length >= target) break;
    if (kept.every((item) => Math.abs(item.i - peak.i) >= minSep)) kept.push(peak);
  }
  kept.sort((a, b) => a.i - b.i);

  const rmsValues = series.rms.filter((value) => value > 0.02).sort((a, b) => a - b);
  const musicRms = rmsValues[Math.floor(rmsValues.length * 0.6)] || 0.1;
  let silenceAt: number | null = null;
  for (let i = Math.floor(binCount * 0.5); i < binCount; i++) {
    const rest = meanKey("rms", i, Math.min(binCount, i + 6));
    if (rest < musicRms * 0.45 && series.rms[i] < musicRms * 0.55) {
      silenceAt = i;
      break;
    }
  }

  let outroAt: number | null = null;
  if (silenceAt != null) {
    const loudBins = series.rms
      .map((value, index) => ({ value, index }))
      .filter((item) => item.value > musicRms * 0.5);
    const zMid = percentile(
      (loudBins.length ? loudBins : series.zcr.map((value, index) => ({ value, index }))).map(
        (item) => series.zcr[item.index],
      ),
      0.5,
    );
    const cMid = percentile(
      (loudBins.length ? loudBins : series.centroid.map((value, index) => ({ value, index }))).map(
        (item) => series.centroid[item.index],
      ),
      0.5,
    );
    const searchFrom = Math.max(0, silenceAt - Math.round(16 / BIN));
    for (let i = silenceAt - 1; i >= searchFrom; i--) {
      if (series.zcr[i] > zMid * 0.8 && series.centroid[i] > cMid * 0.7) {
        outroAt = i + 1;
        break;
      }
    }
  }

  let bounds = [0, ...kept.map((peak) => peak.i)];
  if (outroAt != null) {
    bounds = bounds.filter((bound) => bound <= outroAt! || bound > outroAt! + Math.round(6 / BIN));
    bounds.push(outroAt);
  }
  if (silenceAt != null) bounds.push(silenceAt);
  bounds.push(binCount);
  const uniq = [...new Set(bounds)].sort((a, b) => a - b);

  const sectionBetween = (from: number, to: number): Section => ({
    start: from * BIN,
    end: Math.min(duration, to * BIN),
    rms: meanKey("rms", from, to),
    zcr: meanKey("zcr", from, to),
    bass: meanKey("bass", from, to),
    flux: meanKey("flux", from, to),
    centroid: meanKey("centroid", from, to),
  });

  let sections: Section[] = [];
  for (let i = 0; i < uniq.length - 1; i++) {
    sections.push(sectionBetween(uniq[i], uniq[i + 1]));
  }

  const isSilent = (section: Section) =>
    section.rms < musicRms * 0.45 || section.end - section.start < 0.4;
  const isCollapse = (section: Section, prev?: Section, next?: Section) => {
    if (!prev || !next || isSilent(section) || isSilent(next)) return false;
    return (
      section.flux < prev.flux * 0.75 &&
      section.centroid < prev.centroid * 0.92 &&
      next.flux > section.flux * 1.12
    );
  };
  const mergePair = (prev: Section, cur: Section) =>
    sectionBetween(Math.round(prev.start / BIN), Math.round(cur.end / BIN));

  {
    const audible = sections.filter((section) => !isSilent(section));
    const maxNow = Math.max(...audible.map((section) => section.rms), 0.0001);
    const bassNow = percentile(
      audible.map((section) => section.bass),
      0.5,
    );
    const merged: Section[] = [];
    for (const cur of sections) {
      const prev = merged[merged.length - 1];
      const bothThin =
        prev &&
        !isSilent(prev) &&
        !isSilent(cur) &&
        prev.bass < bassNow * 0.85 &&
        cur.bass < bassNow * 0.85 &&
        prev.rms < maxNow * 0.82 &&
        cur.rms < maxNow * 0.82;
      if (bothThin && prev) merged[merged.length - 1] = mergePair(prev, cur);
      else merged.push(cur);
    }
    sections = merged;
  }

  // Pulse keeps a lift inside a phrase as its own range.
  // Phrases and Drift fold that lift back into the surrounding groove.
  if ((style === "phrases" || style === "drift") && args.beatDetection <= 0.65 && sections.length > 2) {
    const audible = sections.filter((section) => !isSilent(section));
    const maxNow = Math.max(...audible.map((section) => section.rms), 0.0001);
    const bassNow = percentile(
      audible.map((section) => section.bass),
      0.5,
    );
    const merged: Section[] = [sections[0]];
    for (let i = 1; i < sections.length; i++) {
      const prev = merged[merged.length - 1];
      const cur = sections[i];
      const next = sections[i + 1];
      const bassClose =
        Math.abs(cur.bass - prev.bass) / Math.max(cur.bass, prev.bass, 0.001) < 0.2;
      const fluxClose = Math.abs(cur.flux - prev.flux) / Math.max(prev.flux, 1) < 0.2;
      const sameGroove =
        !isSilent(prev) &&
        !isSilent(cur) &&
        !isCollapse(prev, merged[merged.length - 2], cur) &&
        !isCollapse(cur, prev, next) &&
        bassClose &&
        fluxClose &&
        prev.bass > bassNow * 0.75 &&
        cur.bass > bassNow * 0.75 &&
        prev.rms < maxNow * 0.995 &&
        cur.rms < maxNow * 0.995;
      if (sameGroove) merged[merged.length - 1] = mergePair(prev, cur);
      else merged.push(cur);
    }
    sections = merged;
  }

  let audible = sections.filter((section) => !isSilent(section));
  if (!audible.length) return [];
  let maxRms = Math.max(...audible.map((section) => section.rms), 0.0001);
  let bassMed = percentile(
    audible.map((section) => section.bass),
    0.5,
  );
  let zcrMed = percentile(
    audible.map((section) => section.zcr),
    0.5,
  );

  const isLanding = (section: Section, next?: Section) => {
    const air = section.zcr / (zcrMed || 0.01);
    return air < 0.72 && section.bass > bassMed && (!next || isSilent(next));
  };

  // Drift keeps the chorus and the breakdown as their own moments, and
  // joins everything else into long slow moves.
  if (style === "drift" && sections.length > 2) {
    const merged: Section[] = [sections[0]];
    for (let i = 1; i < sections.length; i++) {
      const prev = merged[merged.length - 1];
      const cur = sections[i];
      const next = sections[i + 1];
      const prevIsPeak = !isSilent(prev) && prev.rms >= maxRms * 0.995;
      const curIsPeak = !isSilent(cur) && cur.rms >= maxRms * 0.995;
      const join =
        !prevIsPeak &&
        !curIsPeak &&
        !isSilent(prev) &&
        !isSilent(cur) &&
        !isCollapse(prev, merged[merged.length - 2], cur) &&
        !isCollapse(cur, prev, next) &&
        !isLanding(cur, next);
      if (join) merged[merged.length - 1] = mergePair(prev, cur);
      else merged.push(cur);
    }
    sections = merged;
    audible = sections.filter((section) => !isSilent(section));
    maxRms = Math.max(...audible.map((section) => section.rms), 0.0001);
    bassMed = percentile(
      audible.map((section) => section.bass),
      0.5,
    );
    zcrMed = percentile(
      audible.map((section) => section.zcr),
      0.5,
    );
  }

  const peakIdx = sections.findIndex((section) => section.rms === maxRms && !isSilent(section));
  const fluxMax = Math.max(...audible.map((section) => section.flux), 0.0001);

  const shakes: PhraseShake[] = [];
  sections.forEach((section, index) => {
    const prev = sections[index - 1];
    const next = sections[index + 1];
    if (isSilent(section) || isCollapse(section, prev, next)) return;

    const energy = section.rms / maxRms;
    const motion = section.flux / fluxMax;
    const air = section.zcr / (zcrMed || 0.01);
    const landing = air < 0.72 && section.bass > bassMed && (!next || isSilent(next));
    const beforePeak = peakIdx >= 0 && index < peakIdx;
    const afterGap = sections.slice(0, index).some((item, itemIndex) =>
      isCollapse(item, sections[itemIndex - 1], sections[itemIndex + 1]),
    );
    let role = "drive";
    let frequency = round1(clamp(1.2 + energy * 1.8, 1.2, 3));
    let amplitude = round1(clamp(1 + energy * 2.2, 1, 4));

    if (style === "pulse") {
      role = "pulse";
      frequency = motion < 0.72 ? 1.5 : motion < 0.9 ? 2.5 : 3;
      amplitude = round1(clamp(1 + energy * 1.4, 1, 2.5));
    } else if (style === "drift") {
      if (index === peakIdx) {
        role = "wide";
        frequency = 0.5;
        amplitude = 4;
      } else if (landing) {
        role = "drift";
        frequency = 0.1;
        amplitude = 2;
      } else {
        role = "drift";
        frequency = 0.1;
        amplitude = energy > 0.8 ? 2.5 : 2;
      }
    } else if (beforePeak && index === 0 && section.bass < bassMed * 0.85 && energy < 0.8) {
      role = "sway";
      frequency = 0.1;
      amplitude = 2;
    } else if (landing) {
      role = "landing";
      frequency = 1.5;
      amplitude = 2;
    } else if (index === peakIdx) {
      role = "peak";
      frequency = 3;
      amplitude = 4;
    } else if (beforePeak && section.bass >= bassMed * 0.9 && energy < 0.92) {
      role = "pocket";
      frequency = 1.5;
      amplitude = 1;
    } else if (beforePeak && section.bass < bassMed) {
      role = "build";
      frequency = 2.5;
      amplitude = 2;
    } else if (afterGap && energy < 0.9 && section.end - section.start < 20) {
      role = "return";
      frequency = 2.5;
      amplitude = 2;
    } else if (afterGap) {
      role = "body";
      frequency = 3;
      amplitude = energy > 0.98 ? 3 : 2.5;
    }

    if (section.end - section.start < 0.75) return;
    shakes.push({
      start: section.start,
      end: section.end,
      amplitude,
      frequency,
      role,
    });
  });

  return shakes;
}
