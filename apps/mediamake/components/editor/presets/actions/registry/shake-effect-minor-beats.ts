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
 * Per-hit shake generator (copy of the original shakeEffectRangeGenerator).
 * Places short shake hits on impactful beats.
 */
const inputSchema = z.object({
  trackName: z
    .string()
    .describe("Track whose audio is analyzed for beat ranges")
    .meta({ [paramMetaTypes.linkTrackName]: true }),
  shakeType: z
    .enum(["simple"])
    .default("simple")
    .describe("Shake generation style"),
  minTimeDiff: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.5)
    .describe("Minimum seconds between shake ranges"),
  maxBeats: z
    .number()
    .min(0)
    .max(50)
    .default(0)
    .describe("Max shake hits (0 = auto from music)"),
});

function calculateOptimalBeatCount(beats: BeatPoint[], duration: number): number {
  if (beats.length === 0) return 10;

  const avgIntensity =
    beats.reduce((sum, b) => sum + b.intensity, 0) / beats.length;
  const avgFrequency =
    beats.reduce((sum, b) => sum + b.frequency, 0) / beats.length;
  const tempo = (beats.length / Math.max(duration, 0.1)) * 60;
  const intensityVariance =
    beats.reduce((sum, b) => sum + Math.pow(b.intensity - avgIntensity, 2), 0) /
    beats.length;
  const frequencyVariance =
    beats.reduce((sum, b) => sum + Math.pow(b.frequency - avgFrequency, 2), 0) /
    beats.length;

  let optimalBeats = 10;
  if (tempo > 140) {
    optimalBeats = Math.min(25, Math.floor(duration * 1.5));
  } else if (tempo > 100) {
    optimalBeats = Math.min(20, Math.floor(duration * 1.2));
  } else {
    optimalBeats = Math.min(15, Math.floor(duration * 0.8));
  }
  if (intensityVariance > 0.1) {
    optimalBeats = Math.min(optimalBeats + 5, 30);
  }
  if (frequencyVariance > 100000) {
    optimalBeats = Math.min(optimalBeats + 3, 30);
  }
  return Math.max(5, Math.min(optimalBeats, 30));
}

function selectImpactfulBeats(
  beats: BeatPoint[],
  maxBeatsCount: number,
  minTimeDiff: number,
): BeatPoint[] {
  if (beats.length === 0) return [];

  const beatsWithLocalPeaks = beats.map((beat, index) => {
    const windowSize = 10;
    const start = Math.max(0, index - windowSize);
    const end = Math.min(beats.length, index + windowSize + 1);
    const neighbors = beats.slice(start, end);
    const avgNeighborIntensity =
      neighbors.reduce((sum, b) => sum + b.intensity, 0) / neighbors.length;
    const localPeakStrength = beat.intensity - avgNeighborIntensity;
    return {
      ...beat,
      localPeakStrength,
      isLocalPeak: localPeakStrength > 0.05,
      avgNeighborIntensity,
    };
  });

  const scoredBeats = beatsWithLocalPeaks.map((beat) => {
    const intensityScore = beat.intensity * 0.3;
    const peakScore = beat.isLocalPeak ? beat.localPeakStrength * 0.4 : 0;
    const frequencyScore = Math.min(beat.frequency / 3000, 1) * 0.2;
    const spectralScore = (beat.spectralCentroid || 0) * 0.1;
    return {
      ...beat,
      totalScore: intensityScore + peakScore + frequencyScore + spectralScore,
    };
  });

  const sortedByImpact = [...scoredBeats].sort(
    (a, b) => (b.totalScore || 0) - (a.totalScore || 0),
  );

  const selected: BeatPoint[] = [];
  const usedTimestamps = new Set<number>();

  for (const beat of sortedByImpact) {
    const tooClose = Array.from(usedTimestamps).some(
      (t) => Math.abs(beat.timestamp - t) < minTimeDiff,
    );
    if (!tooClose && selected.length < maxBeatsCount) {
      selected.push(beat);
      usedTimestamps.add(beat.timestamp);
    }
  }

  return selected.sort((a, b) => a.timestamp - b.timestamp);
}

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

function buildShakeEffects(args: {
  beats: BeatPoint[];
  actionId: string;
  amplitudeScale: number;
  frequencyScale: number;
  hitDuration: number;
  labelPrefix: string;
}): ShakeEffect[] {
  const intensities = args.beats.map((b) => b.intensity);
  const minI = Math.min(...intensities, 0);
  const maxI = Math.max(...intensities, 1);
  const span = Math.max(maxI - minI, 0.0001);

  return args.beats.map((beat, index) => {
    const norm = (beat.intensity - minI) / span;
    const amplitude =
      Math.round((6 + norm * 18) * args.amplitudeScale * 10) / 10;
    const frequency =
      Math.round((0.06 + norm * 0.16) * args.frequencyScale * 1000) / 1000;
    const half = args.hitDuration / 2;
    const start = Math.max(0, beat.timestamp - half);
    const end = beat.timestamp + half;

    return {
      type: "shake" as const,
      id: `${args.labelPrefix}-${index}`,
      range: formatRange(start, end),
      shake: {
        amplitude,
        frequency,
        decay: true,
        axis: "both" as const,
      },
      [ACTION_GENERATED_KEY]: args.actionId,
    };
  });
}

export const shakeEffectMinorBeats: ActionDefinition = {
  metadata: {
    id: "shakeEffectMinorBeats",
    title: "Shake Effect Minor Beats",
    description:
      "Place short imageloop shake hits on impactful audio beats (per-beat style).",
    supportedPresetIds: ["imageloop"],
    supportedReferenceTypes: ["object", "objects"],
    tags: ["shake", "beats", "imageloop", "minor"],
  },
  inputSchema,
  defaultInputParams: {
    trackName: "",
    shakeType: "simple",
    minTimeDiff: 0.5,
    maxBeats: 0,
  },
  execute: async (ctx): Promise<ActionExecuteResult> => {
    const parsed = inputSchema.parse(ctx.inputData);
    const { beats: clipped, durationInSeconds } = await loadTrackBeats({
      timeline: ctx.timeline,
      trackName: parsed.trackName,
      fetcher: ctx.fetcher,
    });

    const autoCount = calculateOptimalBeatCount(
      clipped,
      Math.max(durationInSeconds, 1),
    );
    const maxBeats =
      parsed.maxBeats && parsed.maxBeats > 0 ? parsed.maxBeats : autoCount;

    const selected = selectImpactfulBeats(
      clipped,
      maxBeats,
      parsed.minTimeDiff,
    );
    if (!selected.length) {
      throw new Error("No impactful beats selected with current settings");
    }

    const actionInstanceId = ctx.action.id;
    const hitDuration = Math.min(
      Math.max(parsed.minTimeDiff * 0.7, 0.25),
      0.9,
    );

    const balanced = buildShakeEffects({
      beats: selected,
      actionId: actionInstanceId,
      amplitudeScale: 1,
      frequencyScale: 1,
      hitDuration,
      labelPrefix: "minor-balanced",
    });
    const subtle = buildShakeEffects({
      beats: selected,
      actionId: actionInstanceId,
      amplitudeScale: 0.55,
      frequencyScale: 0.85,
      hitDuration: hitDuration * 0.85,
      labelPrefix: "minor-subtle",
    });
    const intense = buildShakeEffects({
      beats: selectImpactfulBeats(
        clipped,
        Math.min(maxBeats + 4, 40),
        Math.max(parsed.minTimeDiff * 0.75, 0.2),
      ),
      actionId: actionInstanceId,
      amplitudeScale: 1.35,
      frequencyScale: 1.2,
      hitDuration: hitDuration * 1.1,
      labelPrefix: "minor-intense",
    });

    return {
      outputs: [
        {
          label: `Balanced (${balanced.length} hits)`,
          payload: { shakeEffects: balanced },
          isFavorite: true,
        },
        {
          label: `Subtle (${subtle.length} hits)`,
          payload: { shakeEffects: subtle },
        },
        {
          label: `Intense (${intense.length} hits)`,
          payload: { shakeEffects: intense },
        },
      ],
    };
  },
  applyOutput: applyShakeEffectsOutput,
};
