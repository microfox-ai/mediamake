import { z } from "zod";
import { paramMetaTypes } from "../../../dataTypes";
import type { ActionExecuteContext, ActionExecuteResult } from "../../types";
import { ACTION_GENERATED_KEY } from "../../engine/run-action";
import {
  formatRange,
  loadTrackBeats,
  loadTrackBeatsInBrowser,
} from "./shake-helpers";
import { buildImpactShakes } from "./shake-impacts";
import { buildIntelligentShakes } from "./shake-intelligent";
import { buildPhraseShakes } from "./shake-phrase";

export const inputSchema = z.object({
  trackName: z
    .string()
    .describe("Track name, or a direct audio URL")
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

/**
 * Same phrase readings for the server and browser shake actions.
 * Server frames come from analyze-audio. Browser frames come from the
 * Web Audio decode. Both carry rms, bass, flux, brightness, and loudness.
 */
export async function executePhraseShakeRange(
  ctx: ActionExecuteContext,
  source: "server" | "browser",
): Promise<ActionExecuteResult> {
  const parsed = inputSchema.parse(ctx.inputData);
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

  const loaded =
    source === "browser"
      ? await loadTrackBeatsInBrowser({
          timeline: ctx.timeline,
          trackName: parsed.trackName,
          browser: ctx.browser,
        })
      : await loadTrackBeats({
          timeline: ctx.timeline,
          trackName: parsed.trackName,
          browser: ctx.browser,
        });
  ctx.browser.reportProgress("Segmenting audio…");

  const shared = {
    frames: loaded.beats,
    duration: loaded.durationInSeconds,
    minRange: parsed.minRange,
    beatDetection: parsed.beatDetection,
  };
  const readings: Array<{
    id: string;
    label: string;
    favorite?: boolean;
    phrases: ReturnType<typeof buildPhraseShakes>;
  }> = [
    {
      id: "short-phrase",
      label: "short-phrase",
      favorite: true,
      phrases: buildPhraseShakes({ ...shared, style: "phrases" }),
    },
    {
      id: "short-pulse",
      label: "short-pulse",
      phrases: buildPhraseShakes({ ...shared, style: "pulse" }),
    },
    {
      id: "short-drift",
      label: "short-drift",
      phrases: buildPhraseShakes({ ...shared, style: "drift" }),
    },
    {
      id: "long-impact",
      label: "long-impact",
      phrases: buildImpactShakes(shared),
    },
    {
      id: "intelligent",
      label: "intelligent",
      phrases: buildIntelligentShakes(shared),
    },
  ];

  const built = readings.map(({ id, label, favorite, phrases }) => {
    const shakeEffects = phrases.map((phrase, index) => ({
      type: "shake" as const,
      id: `${id}-${index}`,
      range: formatRange(phrase.start, phrase.end),
      shake: {
        amplitude: phrase.amplitude,
        frequency: phrase.frequency,
        decay: false,
        axis: "both" as const,
      },
      [ACTION_GENERATED_KEY]: ctx.action.id,
    }));
    return { id, label, favorite, phrases, shakeEffects };
  });

  const outputs = built
    .filter((item) => item.shakeEffects.length > 0)
    .map((item) => ({
      label: `${item.label} (${item.shakeEffects.length} shakes)`,
      payload: { shakeEffects: item.shakeEffects },
      isFavorite: item.favorite,
    }));

  if (!outputs.length) {
    throw new Error(
      "No active ranges detected. Raise beatDetection or lower minRange.",
    );
  }
  if (!outputs.some((output) => output.isFavorite)) {
    outputs[0].isFavorite = true;
  }

  if (typeof window !== "undefined") {
    const logName =
      source === "browser" ? "shakeEffectRangeBrowser" : "shakeEffectRange";
    console.groupCollapsed(`[${logName}] ${parsed.trackName}`);
    for (const item of built) {
      console.table(
        item.phrases.map((phrase) => ({
          style: item.id,
          range: formatRange(phrase.start, phrase.end),
          role: phrase.role,
          amplitude: phrase.amplitude,
          frequency: phrase.frequency,
        })),
      );
    }
    console.groupEnd();
  }

  return { outputs };
}
