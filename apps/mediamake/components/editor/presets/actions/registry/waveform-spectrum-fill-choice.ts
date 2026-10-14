import { atomPresetId } from "@/components/editor/presets/define-atom-preset";
import { defineChoiceAction } from "./choice-action";

const CHOICES = ["single-wave", "double-hit-wave", "triple-wave", "quadruple-wave"] as const;
type WaveChoice = (typeof CHOICES)[number];

const LAYERS: Record<WaveChoice, { layerCount: number; layerFrameOffset: number }> = {
  "single-wave": { layerCount: 1, layerFrameOffset: 0 },
  "double-hit-wave": { layerCount: 2, layerFrameOffset: 0 },
  "triple-wave": { layerCount: 3, layerFrameOffset: 2 },
  "quadruple-wave": { layerCount: 4, layerFrameOffset: 2 },
};

const round = (value: number, digits = 3) => Number(value.toFixed(digits));
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/**
 * Fills the motion and analysis fields of WaveformSpectrumFill. Colors, opacity,
 * outline, audio and size are left as the user set them.
 */
export const waveformSpectrumFillChoice = defineChoiceAction<WaveChoice>({
  id: "waveformSpectrumFillChoice",
  title: "Wave Look",
  description:
    "Pick a wave look and how hard it hits. double-hit-wave is two mirrored, interleaving waves that rise and fall together. Only motion and analysis values are filled; colors, opacity and outline stay as they are.",
  supportedPresetIds: [atomPresetId("WaveformSpectrumFill")],
  tags: ["waveform", "spectrum", "fill"],
  choices: CHOICES,
  choiceLabels: {
    "single-wave": "Single wave",
    "double-hit-wave": "Double hit wave",
    "triple-wave": "Triple wave",
    "quadruple-wave": "Quadruple wave",
  },
  defaultChoice: "double-hit-wave",
  defaultImpact: 0.5,
  resolve: ({ choice, impact, currentData }) => {
    // Without an explicit height the block spans the whole frame, so peaks must stay
    // a small slice of it; a set height is treated as a dedicated wave strip.
    const spansFrame = typeof currentData.height !== "number";
    return {
      ...LAYERS[choice],
      layerMirror: true,
      direction: "low-to-high",
      restHeight: 10,
      baselineOffset: 0,
      peakHeight: round(spansFrame ? lerp(0.06, 0.22, impact) : lerp(0.45, 1, impact)),
      pointCount: 24,
      fftSize: 4096,
      minFrequency: 40,
      maxFrequency: 5000,
      frequencyScale: "log",
      tilt: 0.25,
      gain: round(lerp(6, 24, impact), 2),
      noiseFloor: round(lerp(0.08, 0.02, impact)),
      sharpness: 0.85,
      spread: 8,
      temporalSmoothing: round(lerp(0.75, 0.45, impact)),
      smoothingFrames: 6,
    };
  },
});
