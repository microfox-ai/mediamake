import type { ActionDefinition, ActionExecuteContext, ActionExecuteResult } from "../../types";
import { ACTION_GENERATED_KEY } from "../../engine/run-action";
import { applyShakeEffectsOutput, formatRange, loadTrackBeatsInBrowser } from "./shake-helpers";
import { inputSchema, shakeEffectRange } from "./shake-effect-range";
import { buildPhraseShakes, type PhraseStyle } from "./shake-phrase";

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
      "Segment the track in the browser into four shake readings: Phrases, Pulse, Drift, and Impact. Amplitude is travel in pixels; frequency is how fast that shake cycles. See shake-effects-phrase-segmentation.md beside this action.",
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
  ctx.browser.reportProgress("Segmenting phrases…");

  const styles: Array<{ style: PhraseStyle; label: string; favorite?: boolean }> = [
    { style: "phrases", label: "Phrases", favorite: true },
    { style: "pulse", label: "Pulse" },
    { style: "drift", label: "Drift" },
    { style: "impact", label: "Impact" },
  ];

  const built = styles.map(({ style, label, favorite }) => {
    const phrases = buildPhraseShakes({
      frames: loaded.beats,
      duration: loaded.durationInSeconds,
      minRange: parsed.minRange,
      beatDetection: parsed.beatDetection,
      style,
    });
    const shakeEffects = phrases.map((phrase, index) => ({
      type: "shake" as const,
      id: `${style}-${index}`,
      range: formatRange(phrase.start, phrase.end),
      shake: {
        amplitude: phrase.amplitude,
        frequency: phrase.frequency,
        decay: false,
        axis: "both" as const,
      },
      [ACTION_GENERATED_KEY]: ctx.action.id,
    }));
    return { style, label, favorite, phrases, shakeEffects };
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
          style: item.style,
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
