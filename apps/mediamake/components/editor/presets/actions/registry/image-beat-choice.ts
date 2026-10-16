import { atomPresetId } from "@/components/editor/presets/define-atom-preset";
import { defineChoiceAction } from "./choice-action";

const CHOICES = ["fearless-beats"] as const;
type ImageBeatChoice = (typeof CHOICES)[number];

const round = (value: number, digits = 3) => Number(value.toFixed(digits));
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/**
 * Fills the beat-camera fields of ImageBeat. Image, audio and style stay as the
 * user set them.
 *
 * FearlessBeats is the eccentric punch-zoom: each bass onset eases pan and zoom
 * together into a new off-centre crop, then eases out. Impact 0.5 matches that
 * visual; lower is quieter, higher punches harder and lands more hits.
 */
export const imageBeatChoice = defineChoiceAction<ImageBeatChoice>({
  id: "imageBeatChoice",
  title: "Beat Look",
  description:
    "Pick a beat look and how hard it hits. FearlessBeats is the eccentric punch-zoom on bass hits. Only motion and analysis values are filled; image, audio and style stay as they are.",
  supportedPresetIds: [atomPresetId("ImageBeat")],
  tags: ["beatmade", "image", "zoom"],
  choices: CHOICES,
  choiceLabels: {
    "fearless-beats": "FearlessBeats",
  },
  defaultChoice: "fearless-beats",
  defaultImpact: 0.5,
  resolve: ({ impact }) => ({
    audioProperty: "bass" as const,
    zoomIntensity: round(lerp(0.12, 0.52, impact)),
    baseScale: round(lerp(1.04, 1.12, impact)),
    originSpread: round(lerp(0.4, 1, impact)),
    punchSec: round(lerp(0.26, 0.1, impact)),
    settleSec: round(lerp(0.72, 0.28, impact)),
    sensitivity: round(lerp(1.1, 2.1, impact), 2),
    threshold: round(lerp(0.28, 0.08, impact)),
  }),
});
