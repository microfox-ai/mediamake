import { z } from "zod";
import { paramMetaTypes } from "../../dataTypes";
import type { ActionDefinition, ActionExecuteResult } from "../types";
import { ACTION_GENERATED_KEY } from "../engine/run-action";
import {
  applyShakeEffectsOutput,
  formatRange,
  loadTrackBeats,
  type BeatPoint,
} from "./shake-helpers";

/**
 * Shake Effect Range
 *
 * analyze-audio often returns ~10k+ micro energy frames (not musical beats).
 * We therefore:
 * 1) Build a smoothed intensity ENVELOPE
 * 2) Segment on envelope / pulse-character changes (musical phrases)
 * 3) Map amp from energy, freq from pulse rate (vibrate vs dance/sway)
 */
const inputSchema = z.object({
  trackName: z
    .string()
    .describe("Track whose audio is analyzed for rhythm ranges")
    .meta({ [paramMetaTypes.linkTrackName]: true }),
  shakeType: z
    .enum(["simple"])
    .default("simple")
    .describe("Shake generation style"),
  minRange: z
    .number()
    .min(1)
    .max(120)
    .default(10)
    .describe("Minimum length of each shake range in seconds"),
  beatDetection: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe(
      "0 = no ranges, 1 = maximum ranges (≈ duration/minRange). Default 0.5 ≈ mid count.",
    ),
});

type EnvelopeBin = {
  start: number;
  end: number;
  intensity: number;
};

type RhythmSegment = {
  start: number;
  end: number;
  /** Emit shake for this section. */
  active: boolean;
  avgIntensity: number;
  peakIntensity: number;
  /** Local envelope peaks per second (musical pulse, not micro-frames). */
  pulseRate: number;
  /** Median seconds between envelope peaks. */
  medianPeakGap: number;
  intensityVariance: number;
};

type ShakeStyle = "natural" | "soft" | "buzz" | "dance" | "contrast";

type ShakeEffect = {
  type: "shake";
  id: string;
  range: string;
  shake: {
    amplitude: number;
    frequency: number;
    decay: boolean;
    axis: "both";
  };
  [ACTION_GENERATED_KEY]: string;
};

const AMP_MAX = 4;
const FREQ_MAX = 3;
const AMP_MIN = 0.5;
const FREQ_MIN = 0.25; // user used 0.25 for hard dance
const ENVELOPE_BIN = 0.25; // seconds

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function percentileRank(sorted: number[], value: number): number {
  if (!sorted.length) return 0;
  if (sorted.length === 1) return 0.5;
  let below = 0;
  for (const v of sorted) {
    if (v < value) below += 1;
    else break;
  }
  return below / (sorted.length - 1);
}

/** Downsample analyze-audio micro-frames into an intensity envelope. */
function buildIntensityEnvelope(
  frames: BeatPoint[],
  duration: number,
): EnvelopeBin[] {
  const binCount = Math.max(1, Math.ceil(duration / ENVELOPE_BIN));
  const sums = new Array(binCount).fill(0);
  const counts = new Array(binCount).fill(0);

  for (const frame of frames) {
    const idx = Math.min(
      binCount - 1,
      Math.max(0, Math.floor(frame.timestamp / ENVELOPE_BIN)),
    );
    sums[idx] += frame.intensity || 0;
    counts[idx] += 1;
  }

  const raw: EnvelopeBin[] = Array.from({ length: binCount }, (_, i) => ({
    start: i * ENVELOPE_BIN,
    end: Math.min(duration, (i + 1) * ENVELOPE_BIN),
    intensity: counts[i] > 0 ? sums[i] / counts[i] : 0,
  }));

  // Smooth ~1s window so phrase structure emerges (not micro noise)
  const half = 2; // ±2 bins ≈ 1.25s
  return raw.map((bin, i) => {
    const slice = raw.slice(Math.max(0, i - half), Math.min(raw.length, i + half + 1));
    const intensity =
      slice.reduce((s, b) => s + b.intensity, 0) / Math.max(slice.length, 1);
    return { ...bin, intensity };
  });
}

/** Local maxima on the envelope → musical pulse candidates. */
function findEnvelopePeaks(
  envelope: EnvelopeBin[],
  minPeakIntensity: number,
): number[] {
  const peaks: number[] = [];
  for (let i = 2; i < envelope.length - 2; i++) {
    const cur = envelope[i].intensity;
    if (cur < minPeakIntensity) continue;
    if (
      cur >= envelope[i - 1].intensity &&
      cur >= envelope[i + 1].intensity &&
      cur >= envelope[i - 2].intensity &&
      cur >= envelope[i + 2].intensity
    ) {
      // Require a bit of prominence vs local mean
      const local = envelope.slice(Math.max(0, i - 4), Math.min(envelope.length, i + 5));
      const mean =
        local.reduce((s, b) => s + b.intensity, 0) / Math.max(local.length, 1);
      if (cur >= mean * 1.08) {
        peaks.push((envelope[i].start + envelope[i].end) / 2);
      }
    }
  }
  return peaks;
}

function targetSegmentCount(
  duration: number,
  minRange: number,
  beatDetection: number,
): number {
  const d = Math.max(0, Math.min(1, beatDetection));
  if (d <= 0) return 0;
  // For 180s / minRange 5 / detection 0.25 → ~10–15 phrases (matches user edits)
  const maxRanges = Math.max(1, Math.floor(duration / minRange));
  const minRanges = Math.max(1, Math.round(duration / (minRange * 3)));
  const target = Math.round(minRanges + d * (maxRanges - minRanges));
  return Math.max(1, Math.min(maxRanges, target));
}

function changeScores(envelope: EnvelopeBin[], lookBins: number): number[] {
  const scores = new Array(envelope.length).fill(0);
  const w = Math.max(2, lookBins);
  for (let i = w; i < envelope.length - w; i++) {
    const left = envelope.slice(i - w, i);
    const right = envelope.slice(i, i + w);
    const leftAvg =
      left.reduce((s, b) => s + b.intensity, 0) / Math.max(left.length, 1);
    const rightAvg =
      right.reduce((s, b) => s + b.intensity, 0) / Math.max(right.length, 1);
    const leftVar =
      left.reduce((s, b) => s + Math.pow(b.intensity - leftAvg, 2), 0) /
      Math.max(left.length, 1);
    const rightVar =
      right.reduce((s, b) => s + Math.pow(b.intensity - rightAvg, 2), 0) /
      Math.max(right.length, 1);
    scores[i] =
      Math.abs(rightAvg - leftAvg) * 1.6 +
      Math.abs(Math.sqrt(rightVar) - Math.sqrt(leftVar)) * 0.8;
  }
  return scores;
}

function summarizeWindow(
  envelope: EnvelopeBin[],
  peaks: number[],
  start: number,
  end: number,
): Omit<RhythmSegment, "start" | "end" | "active"> {
  const bins = envelope.filter((b) => b.start >= start && b.start < end);
  const duration = Math.max(end - start, 0.001);
  if (!bins.length) {
    return {
      avgIntensity: 0,
      peakIntensity: 0,
      pulseRate: 0,
      medianPeakGap: duration,
      intensityVariance: 0,
    };
  }
  const intensities = bins.map((b) => b.intensity);
  const avgIntensity =
    intensities.reduce((s, v) => s + v, 0) / intensities.length;
  const peakIntensity = Math.max(...intensities);
  const mean = avgIntensity;
  const intensityVariance =
    intensities.reduce((s, v) => s + Math.pow(v - mean, 2), 0) /
    intensities.length;

  const segPeaks = peaks.filter((t) => t >= start && t < end).sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < segPeaks.length; i++) {
    gaps.push(segPeaks[i] - segPeaks[i - 1]);
  }
  gaps.sort((a, b) => a - b);
  const medianPeakGap =
    gaps.length === 0 ? duration : gaps[Math.floor(gaps.length / 2)] ?? duration;
  const pulseRate = segPeaks.length / duration;

  return {
    avgIntensity,
    peakIntensity,
    pulseRate,
    medianPeakGap,
    intensityVariance,
  };
}

/**
 * Cut the track into ~targetCount phrase-like ranges using envelope change-points.
 * Enforces minRange; prefers longer musical sections over tiny slices.
 */
function segmentEnvelope(args: {
  envelope: EnvelopeBin[];
  peaks: number[];
  duration: number;
  minRange: number;
  targetCount: number;
  quietThreshold: number;
}): RhythmSegment[] {
  const { envelope, peaks, duration, minRange, targetCount, quietThreshold } =
    args;
  if (!envelope.length || targetCount <= 0) return [];

  const minBins = Math.max(1, Math.round(minRange / ENVELOPE_BIN));
  const lookBins = Math.max(2, Math.floor(minBins / 2));
  const scores = changeScores(envelope, lookBins);

  if (targetCount === 1 || duration < minRange * 2) {
    const stats = summarizeWindow(envelope, peaks, 0, duration);
    return [
      {
        start: 0,
        end: duration,
        active: stats.avgIntensity >= quietThreshold,
        ...stats,
      },
    ];
  }

  const cuts = new Set<number>([0, envelope.length]);
  const candidates = scores
    .map((score, index) => ({ score, index }))
    .filter((c) => c.index >= minBins && c.index <= envelope.length - minBins)
    .sort((a, b) => b.score - a.score);

  const canPlace = (idx: number) => {
    const sorted = Array.from(cuts).sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (idx > sorted[i] && idx < sorted[i + 1]) {
        return idx - sorted[i] >= minBins && sorted[i + 1] - idx >= minBins;
      }
    }
    return false;
  };

  for (const c of candidates) {
    if (cuts.size - 1 >= targetCount) break;
    if (c.score <= 0.01) continue;
    if (canPlace(c.index)) cuts.add(c.index);
  }

  // Fill remaining by splitting longest phrases at best internal change
  while (cuts.size - 1 < targetCount) {
    const sorted = Array.from(cuts).sort((a, b) => a - b);
    let best: { idx: number; score: number; len: number } | null = null;
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      const len = b - a;
      if (len < minBins * 2) continue;
      let localBest = { idx: -1, score: -1 };
      for (let j = a + minBins; j <= b - minBins; j++) {
        if (scores[j] >= localBest.score) localBest = { idx: j, score: scores[j] };
      }
      if (
        localBest.idx >= 0 &&
        (!best || len > best.len || (len === best.len && localBest.score > best.score))
      ) {
        best = { ...localBest, len };
      }
    }
    if (!best || best.idx < 0) break;
    cuts.add(best.idx);
  }

  const boundaries = Array.from(cuts).sort((a, b) => a - b);
  const segments: RhythmSegment[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = envelope[boundaries[i]]?.start ?? boundaries[i] * ENVELOPE_BIN;
    const end =
      i === boundaries.length - 2
        ? duration
        : (envelope[boundaries[i + 1]]?.start ??
          boundaries[i + 1] * ENVELOPE_BIN);
    const stats = summarizeWindow(envelope, peaks, start, end);
    segments.push({
      start,
      end,
      active: stats.avgIntensity >= quietThreshold,
      ...stats,
    });
  }

  // Snap boundaries slightly toward nearby envelope valleys for cleaner phrases
  return snapToValleys(segments, envelope, duration);
}

function snapToValleys(
  segments: RhythmSegment[],
  envelope: EnvelopeBin[],
  duration: number,
): RhythmSegment[] {
  if (segments.length <= 1) return segments;
  const next = segments.map((s) => ({ ...s }));
  for (let i = 1; i < next.length; i++) {
    const boundary = next[i].start;
    const searchRadius = 1.5; // seconds
    let best = boundary;
    let bestIntensity = Number.POSITIVE_INFINITY;
    for (const bin of envelope) {
      const t = (bin.start + bin.end) / 2;
      if (Math.abs(t - boundary) > searchRadius) continue;
      if (bin.intensity < bestIntensity) {
        bestIntensity = bin.intensity;
        best = bin.start;
      }
    }
    // Keep order + min length roughly
    if (best > next[i - 1].start + 1 && best < next[i].end - 1) {
      next[i - 1].end = best;
      next[i].start = best;
    }
  }
  next[0].start = 0;
  next[next.length - 1].end = duration;
  return next;
}

/**
 * Natural mapping from user-tuned examples:
 * - amp follows energy (up to ~3)
 * - freq follows pulse: slow pulse → dance/sway (0.25–0.75), fast pulse → vibrate (2–3)
 */
function mapNaturalParams(seg: {
  energy01: number;
  pulse01: number;
  peak01: number;
}): { amplitude: number; frequency: number; character: string } {
  const energy = clamp(seg.energy01, 0, 1);
  const pulse = clamp(seg.pulse01, 0, 1);
  const peak = clamp(seg.peak01, 0, 1);

  // Soft / near-quiet
  if (energy < 0.22) {
    return {
      amplitude: round2(clamp(0.5 + energy * 1.2, AMP_MIN, 1.1)),
      frequency: round2(clamp(0.5 + energy * 0.3, FREQ_MIN, 0.7)),
      character: "quiet",
    };
  }

  // Amplitude: ride energy + peak (user often pushed loud sections to 2–3)
  const amplitude = round2(
    clamp(0.9 + energy * 1.7 + peak * 0.5, 1.0, 3.2),
  );

  // Frequency: low pulse → dance/sway; high pulse → vibrate
  let frequency: number;
  let character: string;
  if (pulse < 0.35) {
    character = "dance";
    frequency = round2(clamp(0.25 + pulse * 1.2 + energy * 0.15, FREQ_MIN, 0.9));
  } else if (pulse > 0.65) {
    character = "vibrate";
    frequency = round2(clamp(1.8 + pulse * 1.2, 1.8, FREQ_MAX));
  } else {
    character = "mid";
    frequency = round2(clamp(0.9 + pulse * 1.4, 0.9, 2.4));
  }

  return {
    amplitude: round2(clamp(amplitude, AMP_MIN, AMP_MAX)),
    frequency: round2(clamp(frequency, FREQ_MIN, FREQ_MAX)),
    character,
  };
}

function mapStyledParams(
  seg: { energy01: number; pulse01: number; peak01: number },
  style: Exclude<ShakeStyle, "natural">,
): { amplitude: number; frequency: number; character: string } {
  const natural = mapNaturalParams(seg);
  let { amplitude, frequency, character } = natural;

  switch (style) {
    case "soft":
      amplitude = clamp(AMP_MIN + (amplitude - AMP_MIN) * 0.4, AMP_MIN, 1.3);
      frequency = clamp(0.4 + frequency * 0.35, FREQ_MIN, 1.0);
      character = "soft";
      break;
    case "buzz":
      amplitude = clamp(Math.max(amplitude, 1.6) * 1.15, AMP_MIN, AMP_MAX);
      frequency = clamp(Math.max(frequency, 2.0) * 1.15, 1.8, FREQ_MAX);
      character = "vibrate";
      break;
    case "dance":
      amplitude = clamp(Math.max(amplitude, 1.6) * 1.2, AMP_MIN, AMP_MAX);
      frequency = clamp(Math.min(frequency, 0.75), FREQ_MIN, 0.9);
      character = "dance";
      break;
    case "contrast":
      if (natural.character === "quiet") {
        amplitude = AMP_MIN;
        frequency = 0.5;
      } else if (natural.character === "dance") {
        amplitude = clamp(amplitude * 1.35, AMP_MIN, AMP_MAX);
        frequency = clamp(frequency * 0.7, FREQ_MIN, 0.6);
      } else {
        amplitude = clamp(amplitude * 1.35, AMP_MIN, AMP_MAX);
        frequency = clamp(Math.max(frequency, 2.3), 2.0, FREQ_MAX);
      }
      break;
  }

  return {
    amplitude: round2(clamp(amplitude, AMP_MIN, AMP_MAX)),
    frequency: round2(clamp(frequency, FREQ_MIN, FREQ_MAX)),
    character,
  };
}

function normalizeSegments(segments: RhythmSegment[]) {
  const active = segments.filter((s) => s.active);
  const pool = active.length ? active : segments;
  const energies = pool.map((s) => s.avgIntensity).sort((a, b) => a - b);
  const peaks = pool.map((s) => s.peakIntensity).sort((a, b) => a - b);
  const pulses = pool.map((s) => s.pulseRate).sort((a, b) => a - b);

  return segments.map((seg) => {
    const energy01 = clamp(
      0.4 * clamp(seg.avgIntensity / 0.6, 0, 1) +
        0.6 * percentileRank(energies, seg.avgIntensity),
      0,
      1,
    );
    const peak01 = clamp(
      0.4 * clamp(seg.peakIntensity, 0, 1) +
        0.6 * percentileRank(peaks, seg.peakIntensity),
      0,
      1,
    );
    // pulseRate ~0.2–2 peaks/sec typical for phrases; normalize
    const pulse01 = clamp(
      0.35 * clamp(seg.pulseRate / 1.5, 0, 1) +
        0.65 * percentileRank(pulses, seg.pulseRate),
      0,
      1,
    );
    return { seg, energy01, peak01, pulse01 };
  });
}

function buildRangeShakeEffects(args: {
  segments: RhythmSegment[];
  actionId: string;
  style: ShakeStyle;
  labelPrefix: string;
  includeQuiet?: boolean;
}): { effects: ShakeEffect[]; debugRows: Array<Record<string, unknown>> } {
  const features = normalizeSegments(args.segments);
  const includeQuiet = args.includeQuiet ?? args.style === "natural";
  const debugRows: Array<Record<string, unknown>> = [];

  const effects = features
    .filter(({ seg, energy01 }) => {
      if (!seg.active && !includeQuiet) return false;
      // Natural still skips near-silent intro/gaps (user dropped 0:00-0:05 etc.)
      if (!seg.active && energy01 < 0.12) return false;
      if (args.style === "soft" && energy01 < 0.2) return false;
      return true;
    })
    .map(({ seg, energy01, peak01, pulse01 }, index) => {
      const mapped =
        args.style === "natural"
          ? mapNaturalParams({ energy01, pulse01, peak01 })
          : mapStyledParams({ energy01, pulse01, peak01 }, args.style);

      debugRows.push({
        index,
        range: formatRange(seg.start, seg.end),
        startSec: round2(seg.start),
        endSec: round2(seg.end),
        durationSec: round2(seg.end - seg.start),
        active: seg.active,
        character: mapped.character,
        amplitude: mapped.amplitude,
        frequency: mapped.frequency,
        avgIntensity: round2(seg.avgIntensity),
        peakIntensity: round2(seg.peakIntensity),
        pulseRate: round2(seg.pulseRate),
        medianPeakGap: round2(seg.medianPeakGap),
        energy01: round2(energy01),
        pulse01: round2(pulse01),
        peak01: round2(peak01),
      });

      return {
        type: "shake" as const,
        id: `${args.labelPrefix}-${index}`,
        range: formatRange(seg.start, seg.end),
        shake: {
          amplitude: mapped.amplitude,
          frequency: mapped.frequency,
          decay: false,
          axis: "both" as const,
        },
        [ACTION_GENERATED_KEY]: args.actionId,
      };
    });

  return { effects, debugRows };
}

function runSegmentation(
  frames: BeatPoint[],
  duration: number,
  minRange: number,
  beatDetection: number,
): { segments: RhythmSegment[]; envelope: EnvelopeBin[]; peaks: number[] } {
  if (beatDetection <= 0) {
    return { segments: [], envelope: [], peaks: [] };
  }
  const envelope = buildIntensityEnvelope(frames, duration);
  const intensities = envelope.map((b) => b.intensity).sort((a, b) => a - b);
  const p40 = intensities[Math.floor((intensities.length - 1) * 0.4)] ?? 0.15;
  const quietThreshold = Math.max(0.08, p40 * 0.55);
  const peakFloor = Math.max(0.12, p40 * 0.7);
  const peaks = findEnvelopePeaks(envelope, peakFloor);
  const target = targetSegmentCount(duration, minRange, beatDetection);
  const segments = segmentEnvelope({
    envelope,
    peaks,
    duration,
    minRange,
    targetCount: target,
    quietThreshold,
  });
  return { segments, envelope, peaks };
}

export const shakeEffectRange: ActionDefinition = {
  metadata: {
    id: "shakeEffectRange",
    title: "Shake Effect Range",
    description:
      "Segment audio by intensity-envelope phrases. Amp follows energy; freq follows pulse (dance vs vibrate).",
    supportedPresetIds: ["imageloop"],
    supportedReferenceTypes: ["object", "objects"],
    tags: ["shake", "range", "imageloop", "rhythm"],
  },
  inputSchema,
  defaultInputParams: {
    trackName: "",
    shakeType: "simple",
    minRange: 10,
    beatDetection: 0.5,
  },
  execute: async (ctx): Promise<ActionExecuteResult> => {
    const parsed = inputSchema.parse(ctx.inputData);
    const loaded = await loadTrackBeats({
      timeline: ctx.timeline,
      trackName: parsed.trackName,
      fetcher: ctx.fetcher,
    });
    const { beats, durationInSeconds } = loaded;

    if (parsed.beatDetection <= 0) {
      return {
        outputs: [
          {
            label: "No ranges (beatDetection = 0)",
            payload: { shakeEffects: [] },
            isFavorite: true,
          },
        ],
      };
    }

    const actionInstanceId = ctx.action.id;
    const duration = Math.max(durationInSeconds, parsed.minRange);

    const base = runSegmentation(
      beats,
      duration,
      parsed.minRange,
      parsed.beatDetection,
    );
    const denser = runSegmentation(
      beats,
      duration,
      Math.max(1, parsed.minRange * 0.85),
      Math.min(1, parsed.beatDetection * 1.25),
    );
    const looser = runSegmentation(
      beats,
      duration,
      parsed.minRange * 1.15,
      Math.max(0.12, parsed.beatDetection * 0.7),
    );

    const naturalBuilt = buildRangeShakeEffects({
      segments: base.segments,
      actionId: actionInstanceId,
      style: "natural",
      labelPrefix: "range-natural",
      includeQuiet: false,
    });
    const softBuilt = buildRangeShakeEffects({
      segments: base.segments,
      actionId: actionInstanceId,
      style: "soft",
      labelPrefix: "range-soft",
    });
    const buzzBuilt = buildRangeShakeEffects({
      segments: denser.segments,
      actionId: actionInstanceId,
      style: "buzz",
      labelPrefix: "range-buzz",
    });
    const danceBuilt = buildRangeShakeEffects({
      segments: looser.segments,
      actionId: actionInstanceId,
      style: "dance",
      labelPrefix: "range-dance",
    });
    const contrastBuilt = buildRangeShakeEffects({
      segments: denser.segments,
      actionId: actionInstanceId,
      style: "contrast",
      labelPrefix: "range-contrast",
    });

    const natural = naturalBuilt.effects;
    const soft = softBuilt.effects;
    const buzz = buzzBuilt.effects;
    const dance = danceBuilt.effects;
    const contrast = contrastBuilt.effects;

    const outputs = [
      {
        label: `Natural (${natural.length} shakes)`,
        payload: { shakeEffects: natural },
        isFavorite: true,
      },
      {
        label: `Soft drift (${soft.length} shakes)`,
        payload: { shakeEffects: soft },
      },
      {
        label: `Buzz / fast vibrate (${buzz.length} shakes)`,
        payload: { shakeEffects: buzz },
      },
      {
        label: `Dance / spaced (${dance.length} shakes)`,
        payload: { shakeEffects: dance },
      },
      {
        label: `Hard contrast (${contrast.length} shakes)`,
        payload: { shakeEffects: contrast },
      },
    ].filter((o) => (o.payload.shakeEffects as ShakeEffect[]).length > 0);

    if (!outputs.length) {
      throw new Error(
        "No active ranges detected. Raise beatDetection or lower minRange.",
      );
    }
    if (!outputs.some((o) => o.isFavorite)) {
      outputs[0].isFavorite = true;
    }

    const debugPayload = {
      generatedAt: new Date().toISOString(),
      actionId: actionInstanceId,
      inputs: { ...parsed },
      note:
        "analyze-audio micro-frames are aggregated into an intensity envelope; pulseRate uses envelope peaks (not frame density).",
      audio: {
        src: loaded.audioSrc,
        start: loaded.audioStart,
        durationClip: loaded.audioDuration,
        durationUsedSec: duration,
        frameCount: beats.length,
        envelopeBins: base.envelope.length,
        envelopePeaks: base.peaks.length,
        summary: loaded.summary,
      },
      rawBeats: loaded.rawAnalysis,
      clippedBeats: beats,
      envelopeSample: base.envelope.filter((_, i) => i % 4 === 0).map((b) => ({
        t: round2(b.start),
        intensity: round2(b.intensity),
      })),
      segments: {
        naturalBase: base.segments.map((s) => ({
          range: formatRange(s.start, s.end),
          startSec: round2(s.start),
          endSec: round2(s.end),
          active: s.active,
          avgIntensity: round2(s.avgIntensity),
          peakIntensity: round2(s.peakIntensity),
          pulseRate: round2(s.pulseRate),
          medianPeakGap: round2(s.medianPeakGap),
        })),
      },
      naturalMappedRows: naturalBuilt.debugRows,
      generatedOutputs: {
        natural: natural.map((e) => ({
          range: e.range,
          amplitude: e.shake.amplitude,
          frequency: e.shake.frequency,
        })),
        soft: soft.map((e) => ({
          range: e.range,
          amplitude: e.shake.amplitude,
          frequency: e.shake.frequency,
        })),
        buzz: buzz.map((e) => ({
          range: e.range,
          amplitude: e.shake.amplitude,
          frequency: e.shake.frequency,
        })),
        dance: dance.map((e) => ({
          range: e.range,
          amplitude: e.shake.amplitude,
          frequency: e.shake.frequency,
        })),
        contrast: contrast.map((e) => ({
          range: e.range,
          amplitude: e.shake.amplitude,
          frequency: e.shake.frequency,
        })),
      },
      expectedNaturalTemplate: natural.map((e) => ({
        range: e.range,
        amplitude: e.shake.amplitude,
        frequency: e.shake.frequency,
      })),
    };

    if (typeof window !== "undefined") {
      (window as any).__shakeEffectRangeDebug = debugPayload;
      console.groupCollapsed(
        `[shakeEffectRange] debug — ${parsed.trackName} (${beats.length} frames → ${base.envelope.length} envelope bins, ${natural.length} natural ranges)`,
      );
      console.log("Full debug object → window.__shakeEffectRangeDebug");
      console.log("inputs", debugPayload.inputs);
      console.log("audio", debugPayload.audio);
      console.log("segments.naturalBase", debugPayload.segments.naturalBase);
      console.table(debugPayload.naturalMappedRows);
      console.table(debugPayload.generatedOutputs.natural);
      console.log(
        "Edit expectedNaturalTemplate / compare to your hand-tuned shakeEffects and share back",
      );
      console.groupEnd();
    }

    return { outputs };
  },
  applyOutput: applyShakeEffectsOutput,
};
