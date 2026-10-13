import type { ActionDefinition, ActionExecuteContext, ActionExecuteResult } from "../types";
import { ACTION_GENERATED_KEY } from "../engine/run-action";
import { applyShakeEffectsOutput, formatRange, loadTrackBeatsInBrowser } from "./shake-helpers";
import { inputSchema, shakeEffectRange } from "./shake-effect-range";
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
      "Segment the track in the browser by phrase: bass pocket, brightness, and rhythmic flux. Amplitude is shake travel in pixels; frequency is how fast that shake cycles. A breakdown and the fade are left still.",
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

  const phrases = buildPhraseShakes({
    frames: loaded.beats,
    duration: loaded.durationInSeconds,
    minRange: parsed.minRange,
    beatDetection: parsed.beatDetection,
  });
  if (!phrases.length) {
    throw new Error(
      "No active ranges detected. Raise beatDetection or lower minRange.",
    );
  }

  const shakeEffects = phrases.map((phrase, index) => ({
    type: "shake" as const,
    id: `phrase-${index}`,
    range: formatRange(phrase.start, phrase.end),
    shake: {
      amplitude: phrase.amplitude,
      frequency: phrase.frequency,
      decay: false,
      axis: "both" as const,
    },
    [ACTION_GENERATED_KEY]: ctx.action.id,
  }));

  if (typeof window !== "undefined") {
    console.groupCollapsed(
      `[shakeEffectRangeBrowser] ${parsed.trackName} — ${shakeEffects.length} phrases`,
    );
    console.table(
      phrases.map((phrase) => ({
        range: formatRange(phrase.start, phrase.end),
        role: phrase.role,
        amplitude: phrase.amplitude,
        frequency: phrase.frequency,
      })),
    );
    console.groupEnd();
  }

  return {
    outputs: [
      {
        label: `Phrases (${shakeEffects.length} shakes)`,
        payload: { shakeEffects },
        isFavorite: true,
      },
    ],
  };
}
