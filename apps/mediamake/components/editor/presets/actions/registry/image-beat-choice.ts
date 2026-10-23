import { atomPresetId } from "@/components/editor/presets/define-atom-preset";
import { defineChoiceAction } from "./choice-action";

const CHOICES = ["fearless-beats", "kick-punch", "downbeat-slam", "tilt-hits"] as const;
type ImageBeatChoice = (typeof CHOICES)[number];

const round = (value: number, digits = 3) => Number(value.toFixed(digits));
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/**
 * Fills the beat-camera fields of ImageBeat. Image, audio, style and the
 * beatmap stay as the user set them. Every look writes the same keys, so a
 * saved look captures all of them.
 *
 * - FearlessBeats: the eccentric punch-zoom on bass hits, every punch the same.
 *   Impact 0.5 matches that visual.
 * - Kick Punch: kicks sized by how hard they hit, downbeats bigger, landing a frame early.
 * - Downbeat Slam: one big punch per bar with an exposure pop.
 * - Tilt Hits: the strongest accents of the mix, tilting side to side with a flash.
 */
export const imageBeatChoice = defineChoiceAction<ImageBeatChoice>({
  id: "imageBeatChoice",
  title: "Beat Look",
  description:
    "Pick a beat look and how hard it hits. Run Analyze Beats first for exact timing. Only motion and analysis values are filled; image, audio and style stay as they are.",
  supportedPresetIds: [atomPresetId("ImageBeat")],
  tags: ["beatmade", "image", "zoom"],
  choices: CHOICES,
  choiceLabels: {
    "fearless-beats": "FearlessBeats",
    "kick-punch": "Kick Punch",
    "downbeat-slam": "Downbeat Slam",
    "tilt-hits": "Tilt Hits",
  },
  defaultChoice: "fearless-beats",
  defaultImpact: 0.5,
  resolve: ({ choice, impact }) => {
    if (choice === "kick-punch") {
      return {
        audioProperty: "bass" as const,
        cueOn: "kick" as const,
        zoomIntensity: round(lerp(0.14, 0.5, impact)),
        baseScale: round(lerp(1.04, 1.1, impact)),
        originSpread: round(lerp(0.3, 0.8, impact)),
        punchSec: round(lerp(0.12, 0.06, impact)),
        settleSec: round(lerp(0.6, 0.3, impact)),
        sensitivity: 1.6,
        threshold: round(lerp(0.45, 0.2, impact)),
        minGapSec: round(lerp(0.3, 0.15, impact)),
        leadSec: 0.02,
        dynamics: 0.7,
        downbeatBoost: round(lerp(0.2, 0.6, impact)),
        tilt: 0,
        flash: 0,
      };
    }
    if (choice === "downbeat-slam") {
      return {
        audioProperty: "bass" as const,
        cueOn: "downbeats" as const,
        zoomIntensity: round(lerp(0.25, 0.8, impact)),
        baseScale: round(lerp(1.05, 1.12, impact)),
        originSpread: round(lerp(0.5, 1, impact)),
        punchSec: round(lerp(0.1, 0.05, impact)),
        settleSec: round(lerp(1, 0.6, impact)),
        sensitivity: 1.6,
        threshold: 0,
        minGapSec: 0.5,
        leadSec: 0.02,
        dynamics: 0.3,
        downbeatBoost: 0,
        tilt: round(lerp(0, 3, impact), 2),
        flash: round(lerp(0.15, 0.6, impact), 2),
      };
    }
    if (choice === "tilt-hits") {
      return {
        audioProperty: "waveform" as const,
        cueOn: "accent" as const,
        zoomIntensity: round(lerp(0.1, 0.35, impact)),
        baseScale: round(lerp(1.08, 1.16, impact)),
        originSpread: round(lerp(0.2, 0.6, impact)),
        punchSec: round(lerp(0.1, 0.05, impact)),
        settleSec: round(lerp(0.5, 0.3, impact)),
        sensitivity: 1.6,
        threshold: round(lerp(0.6, 0.3, impact)),
        minGapSec: round(lerp(0.4, 0.2, impact)),
        leadSec: 0.03,
        dynamics: 0.6,
        downbeatBoost: 0.3,
        tilt: round(lerp(2, 8, impact), 2),
        flash: round(lerp(0.1, 0.4, impact), 2),
      };
    }
    return {
      audioProperty: "bass" as const,
      cueOn: "kick" as const,
      zoomIntensity: round(lerp(0.12, 0.52, impact)),
      baseScale: round(lerp(1.04, 1.12, impact)),
      originSpread: round(lerp(0.4, 1, impact)),
      punchSec: round(lerp(0.26, 0.1, impact)),
      settleSec: round(lerp(0.72, 0.28, impact)),
      sensitivity: round(lerp(1.1, 2.1, impact), 2),
      threshold: round(lerp(0.28, 0.08, impact)),
      minGapSec: 0.18,
      leadSec: 0,
      dynamics: 0,
      downbeatBoost: 0,
      tilt: 0,
      flash: 0,
    };
  },
});
