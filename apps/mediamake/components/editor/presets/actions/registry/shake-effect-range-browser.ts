import type { ActionDefinition } from "../types";
import { applyShakeEffectsOutput } from "./shake-helpers";
import {
  executeShakeEffectRange,
  shakeEffectRange,
} from "./shake-effect-range";

/**
 * Same range shakes as Shake Effect Range, but the energy frames are built in
 * the browser (Web Audio fetch + decode, like the timeline waveform).
 */
export const shakeEffectRangeBrowser: ActionDefinition = {
  metadata: {
    id: "shakeEffectRangeBrowser",
    title: "Shake Effect Range (Browser)",
    description:
      "Segment audio in the browser with the Web Audio API, the same way the timeline draws a waveform. Amp follows energy; freq follows pulse. No server worker.",
    supportedPresetIds: shakeEffectRange.metadata.supportedPresetIds,
    supportedReferenceTypes: shakeEffectRange.metadata.supportedReferenceTypes,
    tags: ["shake", "range", "browser", "waveform", "imageloop"],
  },
  inputSchema: shakeEffectRange.inputSchema,
  defaultInputParams: { ...shakeEffectRange.defaultInputParams },
  execute: (ctx) => executeShakeEffectRange(ctx, "browser"),
  applyOutput: applyShakeEffectsOutput,
};
