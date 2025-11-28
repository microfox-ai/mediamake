/**
 * PulseFocus Internal Effect Preset
 *
 * This is an INTERNAL EFFECT PRESET that creates rhythmic attention-grabbing pulses
 * by combining opacity flickers (0.5-1 range) with subtle blur breathing (0-5px).
 * Designed for highlighting key text moments or image focal points in sync with audio beats.
 *
 * SINGLE EFFECT (or ARRAY if targeting multiple elements):
 * - Waveform-based audio-reactive effect
 * - Reacts to bass frequencies to drive opacity and blur oscillations
 * - Supports 'breathe' mode (smooth sine-wave transitions) vs 'punch' mode (sharp staccato)
 * - Configurable sensitivity, pulse intensity, and base opacity floor
 * - Phase offsets allow wave-like focus patterns across multiple targets
 *
 * INTERNAL PRESET - Called by other presets programmatically.
 * NOT used directly via insertPresetToComposition.
 *
 * Features:
 * - Audio-reactive opacity oscillation (0.5-1 range)
 * - Audio-reactive blur oscillation (0-5px)
 * - Sensitivity control for audio reactivity (0.1-1.0)
 * - Pulse intensity multiplier
 * - Base opacity floor control
 * - Breathe mode (smooth) vs punch mode (sharp)
 * - Phase offset for wave-like patterns across elements
 *
 * Use cases:
 * - Highlighting text in sync with audio beats
 * - Drawing attention to key image focal points
 * - Creating wave-like focus patterns across composition
 * - Building audio-reactive UI elements
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { WaveformEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the pulse effect to'),
  audioSrc: z.string().describe('Audio source URL or ref:componentId'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect in seconds (relative to parent)'),
  effectDuration: z
    .number()
    .describe('Duration of the effect in seconds'),
  sensitivity: z
    .number()
    .min(0.1)
    .max(1.0)
    .default(0.5)
    .describe('Audio reactivity sensitivity (0.1-1.0)'),
  blurMax: z
    .number()
    .max(10)
    .default(5)
    .describe('Maximum blur intensity in pixels (0-10)'),
  baseOpacity: z
    .number()
    .min(0.3)
    .max(0.9)
    .default(0.5)
    .describe('Base opacity floor (0.3-0.9)'),
  breatheMode: z
    .boolean()
    .default(true)
    .describe(
      'Breathe mode (smooth sine-wave transitions) vs punch mode (sharp staccato emphasis)',
    ),
  phaseOffset: z
    .number()
    .default(0)
    .describe('Phase offset in seconds for wave-like patterns'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID (defaults to auto-generated)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    audioSrc,
    effectStart,
    effectDuration,
    sensitivity,
    blurMax,
    baseOpacity,
    breatheMode,
    phaseOffset,
    effectId,
  } = params;

  // Construct waveform effect data
  const waveformEffectData: WaveformEffectData = {
    // Audio configuration
    audioSrc,
    audioProperty: 'bass',
    sensitivity: sensitivity,
    threshold: 0.3,
    smoothing: breatheMode ? 0.8 : 0.1, // Smooth for breathe, sharp for punch
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,

    // Effect type and mode
    effectType: 'custom',
    mode: 'provider',
    targetIds,

    // Timing
    start: effectStart,
    duration: effectDuration,

    // Phase offset for wave patterns
    dataOffsetInSeconds: phaseOffset,

    // Custom props for opacity and blur
    props: {
      opacity: {
        min: baseOpacity,
        max: 1,
        smooth: breatheMode,
      },
      filter: {
        blur: {
          min: 0,
          max: blurMax,
          unit: 'px',
        },
      },
    },
  };

  // Create single waveform effect
  const effect = {
    id: effectId || `pulse-focus-effect-${targetIds.join('-')}`,
    componentId: 'waveform',
    data: waveformEffectData,
  };

  // Return effect wrapped in container structure
  return {
    output: {
      childrenData: [
        {
          id: 'pulse-focus-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10, // Placeholder duration
            },
          },
        } as RenderableComponentData,
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'pulseFocusEffect',
  title: 'PulseFocus Internal Effect',
  description:
    'Audio-reactive internal effect preset that creates rhythmic attention-grabbing pulses by combining opacity flickers (0.5-1 range) with subtle blur breathing (0-5px). Designed for highlighting key text moments or image focal points in sync with audio beats. Features breathe mode for smooth sine-wave transitions and punch mode for sharp staccato emphasis. Supports targeting multiple elements with phase offsets to create wave-like focus patterns across the composition.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'audio-reactive',
    'waveform',
    'pulse',
    'focus',
    'opacity',
    'blur',
    'bass',
    'internal',
    'generic',
  ],
  dependencies: {},
  // Mark as internal preset
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['text-1'],
    audioSrc: 'https://example.com/audio.mp3',
    effectStart: 0,
    effectDuration: 10,
    sensitivity: 0.5,
    blurMax: 5,
    baseOpacity: 0.5,
    breatheMode: true,
    phaseOffset: 0,
  },
};

// Export preset
export const pulseFocusEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
