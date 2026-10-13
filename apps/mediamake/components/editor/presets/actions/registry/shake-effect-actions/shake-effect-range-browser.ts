import type { ActionDefinition } from "../../types";
import { applyShakeEffectsOutput } from "./shake-helpers";
import { inputSchema, shakeEffectRange } from "./shake-effect-range";
import { executePhraseShakeRange } from "./shake-effect-phrase-run";

/**
 * Browser phrase shakes. Energy frames come from the Web Audio decode
 * (same fetch as the timeline waveform). Same readings as the server action.
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
  execute: (ctx) => executePhraseShakeRange(ctx, "browser"),
  applyOutput: applyShakeEffectsOutput,
};
