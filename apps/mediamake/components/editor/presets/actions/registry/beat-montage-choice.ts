import { atomPresetId } from "@/components/editor/presets/define-atom-preset";
import { defineChoiceAction } from "./choice-action";

const CHOICES = ["sideways-cuts", "flash-cuts", "punch-cuts", "whip-cuts", "dreamy-dissolve"] as const;
type BeatMontageChoice = (typeof CHOICES)[number];

const round = (value: number, digits = 3) => Number(value.toFixed(digits));
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/**
 * Fills the cut and motion fields of BeatMontage. Media, audio, style and the
 * beatmap stay as the user set them. Every look writes the same keys.
 *
 * - Sideways Cuts: the anime-edit look. Landscape stills turned a quarter to fill
 *   a vertical frame, black until the first hit, hard cuts on the strongest
 *   accents landing 85 ms early (measured off a reference edit), a slow push-in
 *   per shot. Higher impact cuts on more hits.
 * - Flash Cuts: kicks and snares with an exposure pop.
 * - Punch Cuts: accents with a zoom that settles into each shot.
 * - Whip Cuts: every other beat, motion-blurred slides.
 * - Dreamy Dissolve: crossfades on downbeats with a slow drift.
 */
export const beatMontageChoice = defineChoiceAction<BeatMontageChoice>({
  id: "beatMontageChoice",
  title: "Montage Look",
  description:
    "Pick how the montage cuts and moves, and how many hits it cuts on. Run Analyze Beats first for exact timing. Media, audio and style stay as they are.",
  supportedPresetIds: [atomPresetId("BeatMontage")],
  tags: ["beatmade", "montage", "cuts"],
  choices: CHOICES,
  choiceLabels: {
    "sideways-cuts": "Sideways Cuts",
    "flash-cuts": "Flash Cuts",
    "punch-cuts": "Punch Cuts",
    "whip-cuts": "Whip Cuts",
    "dreamy-dissolve": "Dreamy Dissolve",
  },
  defaultChoice: "sideways-cuts",
  defaultImpact: 0.5,
  resolve: ({ choice, impact }) => {
    const base = {
      cueOn: "accent" as const,
      threshold: round(lerp(0.7, 0.3, impact)),
      minShotSec: round(lerp(0.6, 0.3, impact)),
      maxShotSec: 0,
      every: 1,
      leadSec: 0.04,
      startOnFirstCue: false,
      rotate: "none" as const,
      transition: "cut" as const,
      transitionSec: 0.2,
      transitionStrength: 0.6,
      baseScale: 1.04,
      driftScale: 0.05,
      driftPan: 0.02,
      beatPulse: 0,
      vignette: 0,
    };
    switch (choice) {
      case "sideways-cuts":
        return {
          ...base,
          leadSec: 0.085,
          startOnFirstCue: true,
          rotate: "auto" as const,
          transitionStrength: 0,
          driftScale: round(lerp(0.03, 0.08, impact)),
          driftPan: round(lerp(0.01, 0.03, impact)),
          vignette: 0.25,
        };
      case "flash-cuts":
        return {
          ...base,
          cueOn: "kick+snare" as const,
          threshold: round(lerp(0.6, 0.3, impact)),
          minShotSec: round(lerp(0.5, 0.25, impact)),
          leadSec: 0.02,
          transition: "flash" as const,
          transitionSec: round(lerp(0.12, 0.25, impact)),
          transitionStrength: round(lerp(0.4, 0.9, impact)),
        };
      case "punch-cuts":
        return {
          ...base,
          leadSec: 0.02,
          transition: "punch" as const,
          transitionSec: round(lerp(0.3, 0.18, impact)),
          transitionStrength: round(lerp(0.3, 0.8, impact)),
          driftScale: 0.04,
          beatPulse: round(lerp(0, 0.03, impact)),
        };
      case "whip-cuts":
        return {
          ...base,
          cueOn: "beats" as const,
          threshold: 0,
          minShotSec: 0.2,
          every: impact > 0.66 ? 1 : 2,
          leadSec: 0,
          transition: "whip" as const,
          transitionSec: round(lerp(0.28, 0.16, impact)),
          transitionStrength: round(lerp(0.5, 1, impact)),
          driftScale: 0.03,
        };
      case "dreamy-dissolve":
        return {
          ...base,
          cueOn: "downbeats" as const,
          threshold: 0,
          minShotSec: 1,
          every: impact > 0.5 ? 1 : 2,
          leadSec: 0,
          transition: "dissolve" as const,
          transitionSec: round(lerp(1, 0.5, impact)),
          transitionStrength: 1,
          driftScale: round(lerp(0.06, 0.12, impact)),
          driftPan: round(lerp(0.02, 0.05, impact)),
          vignette: 0.35,
        };
    }
  },
});
