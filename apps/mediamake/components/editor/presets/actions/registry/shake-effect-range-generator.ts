/**
 * @deprecated Prefer `shakeEffectMinorBeats` — kept for existing timeline actions.
 * Same per-beat hit logic as shakeEffectMinorBeats.
 */
import { shakeEffectMinorBeats } from "./shake-effect-minor-beats";
import type { ActionDefinition } from "../types";

export const shakeEffectRangeGenerator: ActionDefinition = {
  ...shakeEffectMinorBeats,
  metadata: {
    ...shakeEffectMinorBeats.metadata,
    id: "shakeEffectRangeGenerator",
    title: "Shake Effect Range Generator",
    description:
      "Analyze a track's audio beats and generate imageloop shake effects at impactful ranges. (Alias of Shake Effect Minor Beats)",
  },
};
