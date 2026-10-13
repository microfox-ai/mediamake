import type { ActionDefinition, ActionExecuteContext, ActionExecuteResult } from "../../types";
import { ACTION_GENERATED_KEY } from "../../engine/run-action";
import { applyShakeEffectsOutput, formatRange, loadTrackBeatsInBrowser } from "./shake-helpers";
import { inputSchema, shakeEffectRange } from "./shake-effect-range";
import { buildImpactShakes } from "./shake-impacts";
import { buildIntelligentShakes } from "./shake-intelligent";
import { buildPhraseShakes } from "./shake-phrase";

/**
 * Browser-only phrase shakes. Energy frames come from the Web Audio decode
 * (same fetch as the timeline waveform). Ranges follow bass, brightness, and
 * rhythm, then amplitude/frequency are chosen for Remotion's shake:
 * amplitude is pixels (about 1–4), frequency scales the frame clock
 * (0.1 sways, 3 vibrates).
 */
export const shakeEffectRangeBrowser: ActionDefinition = {
  metadata: {
    id: "shakeEffectRangeBrowser",
    title: "Shake Effect Range (Browser)",
    description:
      "Segment the track in the browser: short-phrase, short-pulse, short-drift, long-impact, and intelligent. Intelligent follows the beat with no song structure. See shake-effects-phrase-segmentation.md beside this action.",
    supportedPresetIds: shakeEffectRange.metadata.supportedPresetIds,
    supportedReferenceTypes: shakeEffectRange.metadata.supportedReferenceTypes,
    tags: ["shake", "range", "browser", "waveform", "imageloop"],
  },
  inputSchema,
  defaultInputParams: { ...shakeEffectRange.defaultInputParams },
  execute: (ctx) => executeBrowserPhraseShakes(ctx),
  applyOutput: applyShakeEffectsOutput,
};

async function executeBrowserPhraseShakes(
  ctx: ActionExecuteContext,
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

  const loaded = await loadTrackBeatsInBrowser({
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
    { id: "short-phrase", label: "short-phrase", favorite: true, phrases: buildPhraseShakes({ ...shared, style: "phrases" }) },
    { id: "short-pulse", label: "short-pulse", phrases: buildPhraseShakes({ ...shared, style: "pulse" }) },
    { id: "short-drift", label: "short-drift", phrases: buildPhraseShakes({ ...shared, style: "drift" }) },
    { id: "long-impact", label: "long-impact", phrases: buildImpactShakes(shared) },
    { id: "intelligent", label: "intelligent", phrases: buildIntelligentShakes(shared) },
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
    console.groupCollapsed(`[shakeEffectRangeBrowser] ${parsed.trackName}`);
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
