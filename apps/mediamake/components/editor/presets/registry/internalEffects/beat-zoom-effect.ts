import z from 'zod';
import { PresetMetadata, PresetOutput } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';

/**
 * Beat Zoom Effect Preset
 *
 * SINGLE EFFECT:
 * Applies zoom effect that reacts to audio beats using waveform analysis.
 * The zoom intensity is driven by audio properties (bass, mid, treble, waveform).
 *
 * Usage:
 * Apply to media components (VideoAtom, ImageAtom) to create beat-synchronized zoom animations.
 */

const presetParams = z.object({
  targetId: z.string().describe('ID of the component to target'),
  audioSrc: z.string().describe('Audio source URL or ref:componentId'),
  effectStart: z.number().describe('Start time of the effect (relative)'),
  effectDuration: z.number().describe('Duration of the effect'),
  zoomIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.3)
    .optional()
    .describe('Zoom intensity multiplier (0.1-2)'),
  baseScale: z
    .number()
    .min(0.5)
    .max(1.5)
    .default(1)
    .optional()
    .describe('Base scale value (0.5-1.5)'),
  sensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.5)
    .optional()
    .describe('Beat detection sensitivity (0.1-5)'),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .optional()
    .describe('Minimum audio value to trigger zoom (0-1)'),
  audioProperty: z
    .enum(['bass', 'mid', 'treble', 'waveform'])
    .default('bass')
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
  const zoomIntensity = params.zoomIntensity ?? 0.3;
  const baseScale = params.baseScale ?? 1;
  const sensitivity = params.sensitivity ?? 1.5;
  const threshold = params.threshold ?? 0.2;
  const audioProperty = params.audioProperty ?? 'bass';
  const smoothNormalisation = params.smoothNormalisation ?? 1;

  // Construct waveform zoom effect
  const effectData: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty,
    effectType: 'zoom',
    intensity: zoomIntensity,
    baseScale,
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
    id: params.effectId || `beat-zoom-${params.targetId}`,
    componentId: 'waveform',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'beat-zoom-effect-container',
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
  id: 'beatZoomEffect',
  title: 'Beat Zoom Effect',
  description:
    'Applies zoom effect that reacts to audio beats using waveform analysis',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'zoom', 'beat', 'waveform', 'audio', 'internal'],
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
    zoomIntensity: 0.3,
    baseScale: 1,
    sensitivity: 1.5,
    threshold: 0.2,
    audioProperty: 'bass',
    smoothNormalisation: 1,
  },
};

export const beatZoomEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
