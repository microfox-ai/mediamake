import type { ActionDefinition } from "../../types";
import { applyShakeEffectsOutput } from "./shake-helpers";
import {
  executePhraseShakeRange,
  inputSchema,
} from "./shake-effect-phrase-run";

export { inputSchema };

/**
 * Server phrase shakes. Frames come from the analyze-audio worker
 * (rms, bass, flux, brightness). Ranges match the browser action:
 * short-phrase, short-pulse, short-drift, long-impact, and intelligent.
 */

export const shakeEffectRange: ActionDefinition = {
  metadata: {
    id: "shakeEffectRange",
    title: "Shake Effect Range",
    description:
      "Segment the track on the server: short-phrase, short-pulse, short-drift, long-impact, and intelligent. Intelligent follows the beat with no song structure. See shake-effects-phrase-segmentation.md beside this action.",
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
  execute: (ctx) => executePhraseShakeRange(ctx, "server"),
  applyOutput: applyShakeEffectsOutput,
};
