import z from 'zod';
import { PresetMetadata, PresetOutput } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';

/**
 * Beat Exposure Effect Preset
 *
 * SINGLE EFFECT:
 * Applies exposure/brightness effect that reacts to audio beats using waveform analysis.
 * The brightness intensity is driven by audio properties (bass, mid, treble, waveform).
 *
 * Usage:
 * Apply to media components (VideoAtom, ImageAtom) to create beat-synchronized brightness animations.
 */

const presetParams = z.object({
  targetId: z.string().describe('ID of the component to target'),
  audioSrc: z.string().describe('Audio source URL or ref:componentId'),
  effectStart: z.number().describe('Start time of the effect (relative)'),
  effectDuration: z.number().describe('Duration of the effect'),
  brightnessIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.5)
    .optional()
    .describe('Brightness intensity multiplier (0.1-2)'),
  baseBrightness: z
    .number()
    .min(0.5)
    .max(1.5)
    .default(1)
    .optional()
    .describe('Base brightness value (0.5-1.5)'),
  sensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.8)
    .optional()
    .describe('Beat detection sensitivity (0.1-5)'),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.18)
    .optional()
    .describe('Minimum audio value to trigger exposure change (0-1)'),
  audioProperty: z
    .enum(['bass', 'mid', 'treble', 'waveform'])
    .default('treble')
    .optional()
    .describe('Which audio property to react to'),
  smoothNormalisation: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .optional()
    .describe(
      'Frame-based smoothing control (0 = no smoothing, 1 = default, >1 = more smoothing)',
    ),
  effectId: z.string().optional().describe('Optional custom effect ID'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: any,
): PresetOutput => {
  const brightnessIntensity = params.brightnessIntensity ?? 0.5;
  const baseBrightness = params.baseBrightness ?? 1;
  const sensitivity = params.sensitivity ?? 1.8;
  const threshold = params.threshold ?? 0.18;
  const audioProperty = params.audioProperty ?? 'treble';
  const smoothNormalisation = params.smoothNormalisation ?? 1;

  // Construct waveform exposure effect
  const effectData: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty,
    effectType: 'exposure',
    intensity: brightnessIntensity,
    baseBrightness,
    sensitivity,
    threshold,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: [params.targetId],
    start: params.effectStart,
    duration: params.effectDuration,
    smoothNormalisation,
  };

  // Create single effect
  const effect = {
    id: params.effectId || `beat-exposure-${params.targetId}`,
    componentId: 'waveform',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'beat-exposure-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10,
            },
          },
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'beatExposureEffect',
  title: 'Beat Exposure Effect',
  description:
    'Applies exposure/brightness effect that reacts to audio beats using waveform analysis',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'exposure',
    'brightness',
    'beat',
    'waveform',
    'audio',
    'internal',
  ],
  dependencies: {},
  // Internal preset metadata - only used by other presets, not via insertPresetToComposition
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'media-1',
    audioSrc:
      'https://aidev.blr1.cdn.digitaloceanspaces.com/mediamake/sample-audio.mp3',
    effectStart: 0,
    effectDuration: 5,
    brightnessIntensity: 0.5,
    baseBrightness: 1,
    sensitivity: 1.8,
    threshold: 0.18,
    audioProperty: 'treble',
    smoothNormalisation: 1,
  },
};

export const beatExposureEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
