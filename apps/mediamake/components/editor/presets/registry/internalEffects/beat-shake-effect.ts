import z from 'zod';
import { PresetMetadata, PresetOutput } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';

/**
 * Beat Shake Effect Preset
 *
 * SINGLE EFFECT:
 * Applies shake effect that reacts to audio beats using waveform analysis.
 * The shake intensity is driven by audio properties (bass, mid, treble, waveform).
 *
 * Usage:
 * Apply to media components (VideoAtom, ImageAtom) to create beat-synchronized shake animations.
 */

const presetParams = z.object({
  targetId: z.string().describe('ID of the component to target'),
  audioSrc: z.string().describe('Audio source URL or ref:componentId'),
  effectStart: z.number().describe('Start time of the effect (relative)'),
  effectDuration: z.number().describe('Duration of the effect'),
  shakeIntensity: z
    .number()
    .min(5)
    .max(100)
    .default(20)
    .optional()
    .describe('Shake intensity in pixels (5-100)'),
  shakeAxis: z
    .enum(['x', 'y', 'both'])
    .default('both')
    .optional()
    .describe('Which axis to shake'),
  sensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(2)
    .optional()
    .describe('Beat detection sensitivity (0.1-5)'),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .optional()
    .describe('Minimum audio value to trigger shake (0-1)'),
  audioProperty: z
    .enum(['bass', 'mid', 'treble', 'waveform'])
    .default('mid')
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
  const shakeIntensity = params.shakeIntensity ?? 20;
  const shakeAxis = params.shakeAxis ?? 'both';
  const sensitivity = params.sensitivity ?? 2;
  const threshold = params.threshold ?? 0.15;
  const audioProperty = params.audioProperty ?? 'mid';
  const smoothNormalisation = params.smoothNormalisation ?? 1;

  // Construct waveform shake effect
  const effectData: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty,
    effectType: 'shake',
    intensity: shakeIntensity,
    shakeAxis,
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
    id: params.effectId || `beat-shake-${params.targetId}`,
    componentId: 'waveform',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'beat-shake-effect-container',
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
  id: 'beatShakeEffect',
  title: 'Beat Shake Effect',
  description:
    'Applies shake effect that reacts to audio beats using waveform analysis',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'shake', 'beat', 'waveform', 'audio', 'internal'],
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
    shakeIntensity: 20,
    shakeAxis: 'both',
    sensitivity: 2,
    threshold: 0.15,
    audioProperty: 'mid',
    smoothNormalisation: 1,
  },
};

export const beatShakeEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
